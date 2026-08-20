import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  deleteUser as firebaseDeleteUser,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sample-firebase-ai-app-228f1.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sample-firebase-ai-app-228f1",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sample-firebase-ai-app-228f1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "767058687564",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:767058687564:web:8e16972e2cf66f0ee826e9",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

// ── Google Sign-In ────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err: any) {
    const isCancelled = err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request";
    if (!isCancelled) {
      console.error("Google Sign-In Failed", err);
      throw new Error(err.message || "Google Sign-In Failed");
    }
    return null;
  }
}

// ── Email Sign Up ─────────────────────────────────────────────────
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(result.user, { displayName: displayName.trim() });
    }
    return { user: result.user, error: null };
  } catch (err: any) {
    const msg =
      err.code === "auth/email-already-in-use" ? "This email is already registered." :
      err.code === "auth/weak-password" ? "Password must be at least 6 characters." :
      err.code === "auth/invalid-email" ? "Please enter a valid email." :
      err.message || "Sign up failed. Please try again.";
    return { user: null, error: msg };
  }
}

// ── Email Sign In ─────────────────────────────────────────────────
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { user: result.user, error: null };
  } catch (err: any) {
    const msg =
      err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
        ? "Incorrect email or password." :
      err.code === "auth/invalid-email" ? "Please enter a valid email." :
      err.code === "auth/too-many-requests" ? "Too many attempts. Try again later." :
      err.message || "Sign in failed. Please try again.";
    return { user: null, error: msg };
  }
}

// ── Password Reset ────────────────────────────────────────────────
export async function resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (err: any) {
    const msg = 
      err.code === "auth/user-not-found" ? "No account found with this email." :
      err.code === "auth/invalid-email" ? "Please enter a valid email." :
      err.message || "Failed to send reset email. Please try again.";
    return { success: false, error: msg };
  }
}

// ── Sign Out ──────────────────────────────────────────────────────
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

// ── Auth state listener ───────────────────────────────────────────
export function onAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export type { User };

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
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
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sample-firebase-ai-app-228f1.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sample-firebase-ai-app-228f1",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sample-firebase-ai-app-228f1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "767058687564",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:767058687564:web:8e16972e2cf66f0ee826e9",
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

export function assertFirebaseConfigured(): void {
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_API_KEY environment variable. Firebase features cannot initialize without a valid API key.");
  }
}

function getFirebaseApp(): FirebaseApp | null {
  if (cachedApp) return cachedApp;
  try {
    if (getApps().length > 0) {
      cachedApp = getApp();
      return cachedApp;
    }
    if (!firebaseConfig.apiKey) {
      if (typeof window !== "undefined") {
        console.error("[Firebase Startup Error] Missing NEXT_PUBLIC_FIREBASE_API_KEY environment variable.");
      }
      return null;
    }
    cachedApp = initializeApp(firebaseConfig);
    return cachedApp;
  } catch (err) {
    return null;
  }
}

function getSafeAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;
  try {
    const app = getFirebaseApp();
    if (!app) return null;
    cachedAuth = getAuth(app);
    return cachedAuth;
  } catch (err) {
    return null;
  }
}

function getSafeDb(): Firestore | null {
  if (cachedDb) return cachedDb;
  try {
    const app = getFirebaseApp();
    if (!app) return null;
    cachedDb = getFirestore(app);
    return cachedDb;
  } catch (err) {
    return null;
  }
}

// Lazy safe proxies for auth and db so static SSR/prerender without live credentials never crashes
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) {
    const instance = getSafeAuth();
    if (!instance) return undefined;
    const val = (instance as any)[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) {
    const instance = getSafeDb();
    if (!instance) return undefined;
    const val = (instance as any)[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  },
});

// ── Google Sign-In ────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User | null> {
  const authInstance = getSafeAuth();
  if (!authInstance) throw new Error("Firebase Auth is not initialized. Please configure NEXT_PUBLIC_FIREBASE_API_KEY.");
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(authInstance, provider);
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
  const authInstance = getSafeAuth();
  if (!authInstance) return { user: null, error: "Firebase Auth not configured." };
  try {
    const result = await createUserWithEmailAndPassword(authInstance, email, password);
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
  const authInstance = getSafeAuth();
  if (!authInstance) return { user: null, error: "Firebase Auth not configured." };
  try {
    const result = await signInWithEmailAndPassword(authInstance, email, password);
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
  const authInstance = getSafeAuth();
  if (!authInstance) return { success: false, error: "Firebase Auth not configured." };
  try {
    await sendPasswordResetEmail(authInstance, email);
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
  const authInstance = getSafeAuth();
  if (authInstance) {
    await firebaseSignOut(authInstance);
  }
}

// ── Auth state listener ───────────────────────────────────────────
export function onAuth(callback: (user: User | null) => void) {
  if (typeof window === 'undefined') return () => {};
  const authInstance = getSafeAuth();
  if (!authInstance) return () => {};
  return onAuthStateChanged(authInstance, callback);
}

export type { User };

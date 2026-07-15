import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  initializeAuth,
  // @ts-ignore
  getReactNativePersistence,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  signInWithCredential,
  deleteUser as firebaseDeleteUser,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

import { Platform, Alert } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

if (Platform.OS !== "web") {
  GoogleSignin.configure({
    webClientId: "767058687564-un5r6dhtske1dk07ao7v25tns21v9087.apps.googleusercontent.com",
  });
}

const firebaseConfig = {
  apiKey: "AIzaSyCxsSF2pL0uA7NkVPZcNwtjric6LVUGrK8",
  authDomain: "sample-firebase-ai-app-228f1.firebaseapp.com",
  projectId: "sample-firebase-ai-app-228f1",
  storageBucket: "sample-firebase-ai-app-228f1.firebasestorage.app",
  messagingSenderId: "767058687564",
  appId: "1:767058687564:android:5546bf83bba280b8e826e9",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let authInstance;
if (Platform.OS === "web") {
  authInstance = getAuth(app);
} else {
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (error: any) {
    if (error.code === "auth/already-initialized") {
      authInstance = getAuth(app);
    } else {
      console.warn("Firebase Auth Error:", error);
      authInstance = getAuth(app);
    }
  }
}

export const auth = authInstance;

// ── Google Sign-In ────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User | null> {
  try {
    if (Platform.OS === "web") {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } else {
      await GoogleSignin.hasPlayServices();
      // Force account picker by signing out first
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore if already signed out
      }
      const userInfo = await GoogleSignin.signIn();
      const idToken = (userInfo as any)?.data?.idToken || (userInfo as any)?.idToken;
      if (!idToken) throw new Error("No ID token found");
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    }
  } catch (err: any) {
    const isCancelled = err.code === "auth/popup-closed-by-user" || 
                        err.code === "SIGN_IN_CANCELLED" || 
                        err.code === "12501" || 
                        err.code === "-5" ||
                        String(err.message).includes("CANCELLED");
    if (!isCancelled) {
      Alert.alert("Google Sign-In Failed", typeof __DEV__ !== 'undefined' && __DEV__ ? (err.message || "Could not connect.") : require('../utils/errors').getUserErrorMessage(err));
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
  if (Platform.OS !== "web") {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.warn("Google Signin signout error:", error);
    }
  }
}

// ── Auth state listener ───────────────────────────────────────────
export function onAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function deleteAccount(): Promise<void> {
  if (auth.currentUser) {
    await firebaseDeleteUser(auth.currentUser);
  }
}

export const db = getFirestore(app);

export type { User };

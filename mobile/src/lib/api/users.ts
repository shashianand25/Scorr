import { apiFetch } from "./client";

// ── Types ──────────────────────────────────────────────────────────────
export interface NeonUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  xp: number;
  level: number;
  streak: number;
  createdAt: string;
}

// ── API calls ──────────────────────────────────────────────────────────

/**
 * Upserts a Firebase-authenticated user into Neon.
 * Call this once per sign-in (and on each app launch if user is already signed in).
 */
export async function syncUserToNeon(params: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<{ user: NeonUser | null; error: string | null }> {
  const { data, error } = await apiFetch<{ user: NeonUser }>(
    "/api/sync-user",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
  return { user: data?.user ?? null, error };
}

/**
 * Permanently deletes a user and all their data from Neon.
 */
export async function deleteUserFromNeon(userId: string): Promise<{ error: string | null }> {
  const { error } = await apiFetch<{ ok: boolean }>(
    `/api/sync-user?userId=${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
  return { error };
}

/**
 * Sends user feedback to the backend, which stores it in the DB and emails it via Resend.
 */
export async function sendFeedback(params: {
  userId?: string;
  userEmail?: string;
  message: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await apiFetch<{ ok: boolean }>(
    "/api/feedback",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
  return { ok: !error, error };
}

// ── Email Passcode / OTP Verification ──────────────────────────────────────
export async function sendOtpEmail(email: string): Promise<{ ok: boolean; error?: string; devCode?: string }> {
  try {
    const { data, error } = await apiFetch<{ ok?: boolean; error?: string; devCode?: string }>("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      timeoutMs: 12000,
    });
    if (error) {
      if (error.includes("404") || error.toLowerCase().includes("not found")) {
        return { ok: false, error: "OTP service endpoint not found on production server yet. Please push your backend git commit to Vercel." };
      }
      return { ok: false, error };
    }
    if (data?.error) return { ok: false, error: data.error };
    return { ok: true, devCode: data?.devCode };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to send passcode" };
  }
}

export async function verifyOtpCode(email: string, code: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data, error } = await apiFetch<{ valid: boolean; error?: string }>("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      timeoutMs: 8000,
    });
    if (error) return { valid: false, error };
    if (!data?.valid) return { valid: false, error: data?.error || "Invalid verification code" };
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err?.message || "Verification failed" };
  }
}

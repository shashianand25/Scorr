/**
 * Mobile API client – bridges Firebase-authenticated users to the
 * Neon/Postgres backend running in the Next.js app.
 *
 * The Next.js app must be running (or deployed) for these calls to work.
 * In development, update BASE_URL to match your local machine IP/port.
 */

// ── Configuration ──────────────────────────────────────────────────────
// During dev, replace with your local machine's IP:
//   e.g. "http://192.168.1.100:3000"
// In production, set to your deployed URL.
import { logger } from "../logger";

export const BASE_URL = "https://api.scorrapp.com";

// ── Helpers ────────────────────────────────────────────────────────────
export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<{ data: T | null; error: string | null }> {
  const timeout = options?.timeoutMs ?? 6000; // 6-second timeout for fast failure on dead networks
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let responseClone: Response | null = null;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);
    
    responseClone = res.clone();
    let json: any;
    try {
      json = await res.json();
    } catch (parseErr: any) {
      const text = await responseClone.text();
      logger.warn("App", `[API Parse Error] Failed to parse JSON from ${path}. Status: ${res.status}. Response text (first 800 chars):`, text.substring(0, 800));
      if (res.status === 404) {
        return { data: null, error: `Service endpoint not found (Status 404). Please ensure backend is updated on server.` };
      }
      return { data: null, error: `Server response error (Status ${res.status}). Please try again.` };
    }

    if (!res.ok) {
      return { data: null, error: json?.error ?? `Server error (Status ${res.status})` };
    }
    return { data: json as T, error: null };
  } catch (err: any) {
    clearTimeout(timeoutId);
    let errMsg = err?.message ?? "Network error";
    
    if (err.name === 'AbortError' || errMsg.toLowerCase().includes('canceled') || errMsg.toLowerCase().includes('aborted')) {
      logger.warn("API Timeout", path);
      return { data: null, error: "Network timeout: Server took too long to respond (might be a cold start). Please try again." };
    }
    
    // Sanitize to prevent exposing the backend URL on DNS/Network failures
    if (errMsg.includes(BASE_URL) || errMsg.includes("scorrapp") || errMsg.includes("UnknownHostException") || errMsg.includes("Network request failed")) {
      errMsg = "Network error: Please check your internet connection.";
    }
    
    logger.warn("API", path, errMsg);
    return { data: null, error: errMsg };
  }
}

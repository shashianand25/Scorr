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
import { Platform } from "react-native";

import { extractText } from "expo-pdf-text-extract";

const BASE_URL = "https://recall-backend-wheat.vercel.app";

// ── Helpers ────────────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout to allow for Gemini generation

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
      console.warn(`[API Parse Error] Failed to parse JSON from ${path}. Status: ${res.status}. Response text (first 800 chars):`, text.substring(0, 800));
      return { data: null, error: `JSON Parse error from server (Status ${res.status}): ${parseErr.message}` };
    }

    if (!res.ok) {
      return { data: null, error: json?.error ?? `HTTP ${res.status}` };
    }
    return { data: json as T, error: null };
  } catch (err: any) {
    clearTimeout(timeoutId);
    let errMsg = err?.message ?? "Network error";
    
    if (err.name === 'AbortError' || errMsg.toLowerCase().includes('canceled') || errMsg.toLowerCase().includes('aborted')) {
      console.warn("[API Timeout]", path);
      return { data: null, error: "Network timeout: Server took too long to respond (might be a cold start). Please try again." };
    }
    
    // Sanitize to prevent exposing the backend URL on DNS/Network failures
    if (errMsg.includes(BASE_URL) || errMsg.includes("recall-backend") || errMsg.includes("UnknownHostException") || errMsg.includes("Network request failed")) {
      errMsg = "Network error: Please check your internet connection.";
    }
    
    console.warn("[API]", path, errMsg);
    return { data: null, error: errMsg };
  }
}

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

export interface QuizHistoryEvent {
  id: string;
  metadata: {
    quizTitle: string;
    totalQuestions: number;
    correct: number;
    wrong: number;
    score: number;
    durationSec: number | null;
    wrongQuestions: any[];
  };
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

/**
 * Saves a completed quiz result against the authenticated user in Neon.
 */
export async function saveQuizHistory(params: {
  userId: string;
  quizTitle: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  score: number;
  durationSec?: number;
  wrongQuestions?: any[];
}): Promise<{ eventId: string | null; xpGain: number; error: string | null }> {
  const { data, error } = await apiFetch<{ eventId: string; xpGain: number }>(
    "/api/quiz-history",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
  return { eventId: data?.eventId ?? null, xpGain: data?.xpGain ?? 0, error };
}

/**
 * Fetches recent quiz history for a user from Neon.
 */
export async function fetchQuizHistory(
  userId: string,
  limit = 20
): Promise<{ history: QuizHistoryEvent[]; error: string | null }> {
  const { data, error } = await apiFetch<{ history: QuizHistoryEvent[] }>(
    `/api/quiz-history?userId=${encodeURIComponent(userId)}&limit=${limit}`
  );
  return { history: data?.history ?? [], error };
}

// ── Battle History ───────────────────────────────────────────────────────

export interface BattleHistoryEvent {
  id: string;
  user_id: string;
  room_code: string;
  quiz_title: string;
  my_score: number;
  opponent_score: number;
  opponent_name: string;
  won: boolean;
  my_time?: number;
  opponent_time?: number;
  created_at: string;
}

export async function saveBattleHistory(params: {
  userId: string;
  roomCode: string;
  quizTitle: string;
  myScore: number;
  opponentScore: number;
  opponentName: string;
  won: boolean;
  myTime?: number;
  opponentTime?: number;
}): Promise<{ eventId: string | null; error: string | null }> {
  const { data, error } = await apiFetch<{ eventId: string }>(
    "/api/battle-history",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
  return { eventId: data?.eventId ?? null, error };
}

export async function fetchBattleHistory(
  userId: string,
  limit = 50
): Promise<{ history: BattleHistoryEvent[]; error: string | null }> {
  const { data, error } = await apiFetch<{ history: BattleHistoryEvent[] }>(
    `/api/battle-history?userId=${encodeURIComponent(userId)}&limit=${limit}`
  );
  return { history: data?.history ?? [], error };
}

// ── Mobile Quizzes ─────────────────────────────────────────────────────

export interface NeonMobileQuiz {
  id: string;
  title: string;
  category: string;
  questionCount: number;
  sourceText: string;
  attempts: any[];
  wrongQuestions: any[];
  uniqueCorrectIds?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetches all quizzes saved in Neon for this user.
 */
export async function fetchMobileQuizzes(
  userId: string
): Promise<{ quizzes: NeonMobileQuiz[]; error: string | null }> {
  const { data, error } = await apiFetch<{ quizzes: NeonMobileQuiz[] }>(
    `/api/mobile-quizzes?userId=${encodeURIComponent(userId)}`
  );
  return { quizzes: data?.quizzes ?? [], error };
}

/**
 * Saves a new quiz to Neon. Returns the quiz with its server-assigned id.
 */
export async function createMobileQuiz(params: {
  userId: string;
  title: string;
  category: string;
  questionCount: number;
  sourceText: string;
  attempts?: any[];
  wrongQuestions?: any[];
  uniqueCorrectIds?: string[];
}): Promise<{ quiz: NeonMobileQuiz | null; error: string | null }> {
  const { data, error } = await apiFetch<{ quiz: NeonMobileQuiz }>(
    "/api/mobile-quizzes",
    { method: "POST", body: JSON.stringify(params) }
  );
  return { quiz: data?.quiz ?? null, error };
}

/**
 * Updates an existing quiz in Neon (attempts, wrongQuestions, title, etc.).
 */
export async function updateMobileQuiz(params: {
  userId: string;
  quizId: string;
  title?: string;
  category?: string;
  attempts?: any[];
  wrongQuestions?: any[];
  uniqueCorrectIds?: string[];
}): Promise<{ quiz: NeonMobileQuiz | null; error: string | null }> {
  const { data, error } = await apiFetch<{ quiz: NeonMobileQuiz }>(
    "/api/mobile-quizzes",
    { method: "PUT", body: JSON.stringify(params) }
  );
  return { quiz: data?.quiz ?? null, error };
}

/**
 * Permanently deletes a quiz from Neon.
 */
export async function deleteMobileQuiz(
  userId: string,
  quizId: string
): Promise<{ error: string | null }> {
  const { error } = await apiFetch<{ ok: boolean }>(
    `/api/mobile-quizzes?userId=${encodeURIComponent(userId)}&quizId=${encodeURIComponent(quizId)}`,
    { method: "DELETE" }
  );
  return { error };
}

// ── AI Generation ────────────────────────────────────────────────────────

/**
 * Fetches the Gemini API key from the backend to securely use on the client.
 */
export async function fetchGeminiKey(): Promise<{ key: string | null; error: string | null }> {
  const { data, error } = await apiFetch<{ key: string }>("/api/gemini-config");
  return { key: data?.key ?? null, error };
}

// ── App Updates ────────────────────────────────────────────────────────

export interface VersionConfig {
  latestVersion: string;
  minimumVersion: string;
}

/**
 * Fetches the version configuration to determine if an update is required.
 */
export async function fetchVersionConfig(): Promise<{ config: VersionConfig | null; error: string | null }> {
  const { data, error } = await apiFetch<VersionConfig>("/api/version-config");
  return { config: data ?? null, error };
}

import * as FileSystem from "expo-file-system/legacy";

export async function parsePdfFromBackend(fileUri: string, fileName: string): Promise<{ text: string; error?: string }> {
  try {
    const text = await extractText(fileUri);
    if (!text || text.trim() === "") {
      return { text: "", error: "Could not extract text from this PDF. It might be a scanned document containing only images." };
    }
    return { text };
  } catch (err: any) {
    let errMsg = err?.message || "Local PDF parsing failed";
    return { text: "", error: `Failed to extract text locally: ${errMsg}` };
  }
}

export async function parsePptFromBackend(fileUri: string, fileName: string): Promise<{ text: string; error?: string }> {
  try {
    const uploadResult = await FileSystem.uploadAsync(`${BASE_URL}/api/parse-ppt`, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
    });

    if (uploadResult.status !== 200) {
      let msg = uploadResult.body;
      try {
        const parsed = JSON.parse(uploadResult.body);
        if (parsed.error) msg = parsed.error;
      } catch (e) {}
      if (msg.includes("OfficeParser currently supports")) {
        return { text: "", error: "Unsupported file format. Please upload a modern Office file (.docx, .pptx) or PDF." };
      }
      return { text: "", error: `Server error: ${msg}` };
    }
    
    const data = JSON.parse(uploadResult.body);
    if (data.error) return { text: "", error: data.error };
    return { text: data.text || "" };
  } catch (err: any) {
    let errMsg = err?.message || "Upload failed";
    if (errMsg.includes(BASE_URL) || errMsg.includes("recall-backend") || errMsg.includes("UnknownHostException") || errMsg.includes("Network request failed")) {
      errMsg = "Network error: Please check your internet connection.";
    }
    return { text: "", error: errMsg };
  }
}

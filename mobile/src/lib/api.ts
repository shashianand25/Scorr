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

const BASE_URL = "https://api.scorrapp.com";

// ── Helpers ────────────────────────────────────────────────────────────
async function apiFetch<T>(
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
      console.warn(`[API Parse Error] Failed to parse JSON from ${path}. Status: ${res.status}. Response text (first 800 chars):`, text.substring(0, 800));
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
      console.warn("[API Timeout]", path);
      return { data: null, error: "Network timeout: Server took too long to respond (might be a cold start). Please try again." };
    }
    
    // Sanitize to prevent exposing the backend URL on DNS/Network failures
    if (errMsg.includes(BASE_URL) || errMsg.includes("scorrapp") || errMsg.includes("UnknownHostException") || errMsg.includes("Network request failed")) {
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
  questions?: any[];
  answers?: Record<string, string[]>;
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
  questions?: any[];
  answers?: Record<string, string[]>;
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

export interface MasterQuiz {
  id: string;
  title: string;
  category: string;
  questionCount: number;
  flashcardCount: number;
  sourceText: string;
  language?: string;
  isMaster?: boolean;
  createdAt?: string;
}

export interface NeonMobileQuiz {
  id: string;
  masterQuizId?: string | null;
  master_quiz_id?: string | null;
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
 * Checks if a canonical quiz already exists in the backend for the given exact content hash.
 */
export async function checkMasterQuizCache(
  contentHash: string,
  lang: string = "en"
): Promise<{ hit: boolean; masterQuiz: MasterQuiz | null; error: string | null }> {
  const { data, error } = await apiFetch<{ hit: boolean; masterQuiz?: MasterQuiz }>(
    "/api/master-quizzes/cache-check",
    { method: "POST", body: JSON.stringify({ contentHash, lang }) }
  );
  return {
    hit: !!data?.hit,
    masterQuiz: data?.masterQuiz ?? null,
    error,
  };
}

/**
 * Saves a newly generated canonical quiz into master_quizzes.
 */
export async function saveMasterQuiz(params: {
  id?: string;
  contentHash: string;
  generationVersion?: string;
  language?: string;
  title: string;
  category?: string;
  questionCount?: number;
  flashcardCount?: number;
  sourceText: string;
  userId?: string;
}): Promise<{ masterQuiz: MasterQuiz | null; error: string | null }> {
  const { data, error } = await apiFetch<{ masterQuiz: MasterQuiz }>(
    "/api/master-quizzes",
    { method: "POST", body: JSON.stringify(params) }
  );
  return { masterQuiz: data?.masterQuiz ?? null, error };
}

export async function fetchSharedQuiz(
  quizId: string
): Promise<{ quiz: (NeonMobileQuiz & { isMaster?: boolean; flashcardCount?: number }) | null; error: string | null }> {
  const { data, error } = await apiFetch<{ quiz: any }>(
    `/api/share/quiz/${encodeURIComponent(quizId)}`
  );
  if (data?.quiz) {
    const q = data.quiz;
    return {
      quiz: {
        ...q,
        questionCount: q.questionCount ?? q.question_count,
        sourceText: q.sourceText ?? q.source_text ?? "",
      },
      error: null,
    };
  }
  return { quiz: null, error };
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
  id?: string;
  userId: string;
  masterQuizId?: string | null;
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
  masterQuizId?: string | null;
  title?: string;
  category?: string;
  questionCount?: number;
  sourceText?: string;
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
 * Fetches the Gemini API key and prompt from the backend to securely use on the client.
 */
/**
 * Fetches the gemini key directly (deprecated/legacy).
 */
export async function fetchGeminiKey(lang?: string): Promise<{ key: string | null; prompt: string | null; promptRu?: string | null; error: string | null }> {
  const query = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  const { data, error } = await apiFetch<{ key: string; prompt: string; promptRu?: string }>("/api/gemini-config" + query);
  return { key: data?.key ?? null, prompt: data?.prompt ?? null, promptRu: data?.promptRu ?? null, error };
}

export interface AppConfig {
  featureFlags: {
    maintenanceMode: boolean;
    disableAI: boolean;
    disableBattles: boolean;
  };
  aiConfig: {
    geminiKey: string;
    modelUrl: string;
    promptTemplate: string;
    promptTemplateRu?: string;
    promptTemplateVisual?: string;
    chunkSize: number;
    maxChunks: number;
    maxOutputTokens: number;
    temperature: number;
    generationTimeoutMs: number;
    concurrencyLimit?: number;
    maxDailyGenerations?: number;
    generationRanges: Array<{ max: number; minF: string; expF: string }>;
  };
  fileLimits: {
    pdfExtractThresholdMB: number;
    pptMaxMB: number;
  };
  appLinks: {
    shareBaseUrl: string;
    playStoreUrl: string;
    tutorialUrl: string;
  };
}

export async function fetchAppConfig(): Promise<{ config: AppConfig | null; error: string | null }> {
  const { data, error } = await apiFetch<AppConfig>("/api/app-config");
  return { config: data ?? null, error };
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

export async function parsePdfFromBackend(fileUri: string, fileName: string, fileSize: number = 0, extractThresholdMB: number): Promise<{ text: string; isVisual?: boolean; error?: string }> {
  try {
    if (fileSize > 0 && fileSize < extractThresholdMB * 1024 * 1024) {
      try {
        const uploadResult = await FileSystem.uploadAsync(`${BASE_URL}/api/parse-pdf`, fileUri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
        });
        
        if (uploadResult.status === 200) {
          const data = JSON.parse(uploadResult.body);
          if (data.text) {
            return { text: data.text };
          }
        }
      } catch (backendErr) {
        console.log("[parsePdfFromBackend] Backend parsing failed, falling back to local...", backendErr);
      }
    }

    const text = await extractText(fileUri);
    if (!text || text.trim() === "") {
      // No text extracted — likely a scanned/image-only PDF.
      // Signal the caller to use visual mode (send file directly to Gemini).
      console.log("[parsePdfFromBackend] No text extracted — flagging as visual PDF");
      return { text: "", isVisual: true };
    }
    return { text };
  } catch (err: any) {
    let errMsg = err?.message || "Local PDF parsing failed";
    return { text: "", error: `Failed to extract text locally: ${errMsg}` };
  }
}

export async function parsePptFromBackend(fileUri: string, fileName: string): Promise<{ text: string; isVisual?: boolean; error?: string }> {
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
      if (uploadResult.status === 413 || msg.includes("413") || msg.toLowerCase().includes("payload_too_large") || msg.toLowerCase().includes("request entity too large")) {
        return { text: "", error: "PPT upload limit is 4.5 MB. Try uploading as a PDF for larger files." };
      }
      if (msg.includes("OfficeParser currently supports")) {
        return { text: "", error: "Unsupported file format. Please upload a modern Office file (.docx, .pptx) or PDF." };
      }
      return { text: "", error: `Server error: ${msg}` };
    }
    
    const data = JSON.parse(uploadResult.body);
    if (data.error) return { text: "", error: data.error };
    
    const textString = typeof data.text === 'string' ? data.text : String(data.text || "");
    if (!textString || textString.trim() === "") {
      // No text extracted — likely an image-only PPTX.
      // Signal the caller to use visual mode (send file directly to Gemini).
      console.log("[parsePptFromBackend] No text extracted — flagging as visual PPTX");
      return { text: "", isVisual: true };
    }
    
    return { text: textString };
  } catch (err: any) {
    let errMsg = err?.message || "Upload failed";
    if (errMsg.includes(BASE_URL) || errMsg.includes("scorrapp") || errMsg.includes("UnknownHostException") || errMsg.includes("Network request failed")) {
      errMsg = "Network error: Please check your internet connection.";
    }
    return { text: "", error: errMsg };
  }
}

// ── AI Generation Rate Limiting ────────────────────────────────────────────
/**
 * Checks the user's daily AI generation quota and increments if within limit.
 * Returns { allowed, used, limit }.
 * Fails open — if the server is unreachable, allows generation.
 */
export async function checkAiDailyLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/use`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { allowed: true, used: 0, limit: 0 };
    return await res.json();
  } catch {
    // Fail open — don't block generation when the check can't reach the server
    return { allowed: true, used: 0, limit: 0 };
  }
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

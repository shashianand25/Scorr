/**
 * Web API client — mirrors mobile/src/lib/api.ts for Next.js web.
 * All calls communicate with https://api.scorrapp.com
 */

const BASE_URL = "https://api.scorrapp.com";

// ── Types ──────────────────────────────────────────────────────────────

export interface QuestionAnswer {
  id?: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  question?: string;
  prompt?: string;
  answers: QuestionAnswer[];
  explanation?: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  sm2_interval?: number;
  sm2_repetition?: number;
  sm2_easeFactor?: number;
  sm2_nextReviewDate?: number;
  starred?: boolean;
}

export interface Attempt {
  id?: string | number;
  date?: number;
  timestamp?: number;
  score?: number;
  correct?: number;
  total?: number;
  durationSec?: number | null;
  timeSpent?: number | null;
  answers?: any[];
}

export interface WrongQuestion {
  id: string;
  question?: string;
  prompt?: string;
  selectedTexts?: string[];
  correctTexts?: string[];
  explanation?: string;
  answers?: QuestionAnswer[];
}

export interface Quiz {
  id: string;
  neonId?: string | null;
  masterQuizId?: string | null;
  master_quiz_id?: string | null;
  userId?: string | null;
  title: string;
  category: string;
  questions: number;
  questionsList: Question[];
  flashcards: Flashcard[];
  sourceText: string;
  attempts: Attempt[];
  wrongQuestions: WrongQuestion[];
  uniqueCorrectIds: string[];
  createdAt: string | number;
  updatedAt: string | number;
  isSample?: boolean;
  time?: string;
}

export interface MasterQuiz {
  id: string;
  contentHash: string;
  generationVersion?: string;
  language: string;
  title: string;
  category: string;
  questionCount: number;
  flashcardCount: number;
  sourceText: string;
  createdAt: string;
}

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

export interface BattleHistoryEvent {
  id: string;
  room_code: string;
  quiz_title: string;
  my_score: number;
  opponent_score: number;
  opponent_name: string;
  won: boolean;
  created_at: string;
}

export interface AppConfig {
  aiConfig: {
    geminiKey: string;
    modelUrl: string;
    promptTemplate: string;
    chunkSize: number;
    maxChunks: number;
    concurrencyLimit?: number;
    maxOutputTokens?: number;
    temperature?: number;
    generationRanges?: Array<{
      max: number;
      minF: number;
      expF: number;
    }>;
    maxDailyGenerations?: number;
  };
  featureFlags?: {
    disableBattles?: boolean;
    maintenanceMode?: boolean;
  };
  fileLimits?: {
    pdfExtractThresholdMB: number;
    pptMaxMB: number;
  };
  appLinks?: {
    shareBaseUrl: string;
    playStoreUrl: string;
    downloadUrl?: string;
    tutorialUrl: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { timeoutMs?: number }
): Promise<{ data: T | null; error: string | null }> {
  const timeout = options?.timeoutMs ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeoutId);

    const json = await res.json();
    if (!res.ok) {
      return { data: null, error: json?.error ?? `Server error (${res.status})` };
    }
    return { data: json as T, error: null };
  } catch (err: any) {
    clearTimeout(timeoutId);
    let errMsg = err?.message ?? "Network error";
    if (err.name === "AbortError" || errMsg.toLowerCase().includes("timeout")) {
      errMsg = "Network timeout: Server took too long to respond.";
    }
    return { data: null, error: errMsg };
  }
}

// ── Master Quiz Cache Endpoints ────────────────────────────────────────

export async function checkMasterQuizCache(
  contentHash: string,
  language: string = "en"
): Promise<{ hit: boolean; masterQuiz: MasterQuiz | null; error: string | null }> {
  const { data, error } = await apiFetch<{ hit: boolean; masterQuiz: MasterQuiz | null }>(
    `/api/master-quizzes/cache-check?contentHash=${encodeURIComponent(contentHash)}&language=${encodeURIComponent(language)}`
  );
  return {
    hit: data?.hit ?? false,
    masterQuiz: data?.masterQuiz ?? null,
    error,
  };
}

export async function saveMasterQuiz(params: {
  id?: string;
  contentHash: string;
  generationVersion?: string;
  language?: string;
  title: string;
  category?: string;
  questionCount: number;
  flashcardCount?: number;
  sourceText: string;
  userId?: string;
}): Promise<{ masterQuiz: MasterQuiz | null; error: string | null }> {
  const { data, error } = await apiFetch<{ masterQuiz: MasterQuiz }>("/api/master-quizzes", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return { masterQuiz: data?.masterQuiz ?? null, error };
}

// ── User Sync ──────────────────────────────────────────────────────────

export async function syncUser(params: {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}): Promise<{ user: NeonUser | null; error: string | null }> {
  const { data, error } = await apiFetch<{ user: NeonUser }>("/api/sync-user", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return { user: data?.user ?? null, error };
}

// ── Quizzes (Neon) ─────────────────────────────────────────────────────

export async function fetchQuizzes(userId: string): Promise<{ quizzes: Quiz[]; error: string | null }> {
  const { data, error } = await apiFetch<{ quizzes: Quiz[] }>(
    `/api/mobile-quizzes?userId=${encodeURIComponent(userId)}`
  );
  return { quizzes: data?.quizzes ?? [], error };
}

export async function createQuiz(params: {
  id?: string;
  userId: string;
  masterQuizId?: string | null;
  title: string;
  category: string;
  questionCount: number;
  sourceText: string;
  questionsList?: Question[];
  flashcards?: Flashcard[];
  attempts?: Attempt[];
  wrongQuestions?: WrongQuestion[];
  uniqueCorrectIds?: string[];
}): Promise<{ quiz: Quiz | null; error: string | null }> {
  const { data, error } = await apiFetch<{ quiz: Quiz }>("/api/mobile-quizzes", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return { quiz: data?.quiz ?? null, error };
}

export async function updateQuiz(params: {
  userId: string;
  quizId: string;
  masterQuizId?: string | null;
  title?: string;
  attempts?: Attempt[];
  wrongQuestions?: WrongQuestion[];
  uniqueCorrectIds?: string[];
}): Promise<{ quiz: Quiz | null; error: string | null }> {
  const { data, error } = await apiFetch<{ quiz: Quiz }>("/api/mobile-quizzes", {
    method: "PUT",
    body: JSON.stringify(params),
  });
  return { quiz: data?.quiz ?? null, error };
}

export async function deleteQuiz(userId: string, quizId: string): Promise<{ error: string | null }> {
  const { error } = await apiFetch<{ ok: boolean }>(
    `/api/mobile-quizzes?userId=${encodeURIComponent(userId)}&quizId=${encodeURIComponent(quizId)}`,
    { method: "DELETE" }
  );
  return { error };
}

// ── Shared Quiz Link ───────────────────────────────────────────────────

export async function fetchSharedQuiz(
  id: string
): Promise<{ quiz: any | null; error: string | null }> {
  const { data, error } = await apiFetch<{ quiz: any }>(`/api/share/quiz/${encodeURIComponent(id)}`);
  return { quiz: data?.quiz ?? null, error };
}

// ── Quiz History ───────────────────────────────────────────────────────

export async function saveQuizHistory(params: {
  userId: string;
  quizTitle: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  score: number;
  durationSec?: number | null;
  wrongQuestions?: WrongQuestion[];
}): Promise<{ error: string | null }> {
  const { error } = await apiFetch<{ eventId: string }>("/api/quiz-history", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return { error };
}

export async function fetchQuizHistory(userId: string): Promise<{ history: QuizHistoryEvent[]; error: string | null }> {
  const { data, error } = await apiFetch<{ history: QuizHistoryEvent[] }>(
    `/api/quiz-history?userId=${encodeURIComponent(userId)}&limit=50`
  );
  return { history: data?.history ?? [], error };
}

// ── Battle History ─────────────────────────────────────────────────────

export async function saveBattleHistory(params: {
  userId: string;
  roomCode: string;
  quizTitle: string;
  myScore: number;
  opponentScore: number;
  opponentName: string;
  won: boolean;
}): Promise<{ error: string | null }> {
  const { error } = await apiFetch<{ eventId: string }>("/api/battle-history", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return { error };
}

export async function fetchBattleHistory(userId: string): Promise<{ history: BattleHistoryEvent[]; error: string | null }> {
  const { data, error } = await apiFetch<{ history: BattleHistoryEvent[] }>(
    `/api/battle-history?userId=${encodeURIComponent(userId)}&limit=50`
  );
  return { history: data?.history ?? [], error };
}

// ── Daily Limit ────────────────────────────────────────────────────────

export async function checkAiDailyLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number; limit: number; error: string | null }> {
  const { data, error } = await apiFetch<{ allowed: boolean; remaining: number; limit: number }>(
    `/api/daily-limit?userId=${encodeURIComponent(userId)}`
  );
  return {
    allowed: data?.allowed ?? true,
    remaining: data?.remaining ?? 10,
    limit: data?.limit ?? 10,
    error,
  };
}

export async function recordAiGeneration(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await apiFetch<{ success: boolean }>("/api/daily-limit/record", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  return { success: !error, error };
}

// ── App & AI Config ────────────────────────────────────────────────────

export async function fetchAppConfig(): Promise<{ config: AppConfig | null; error: string | null }> {
  const { data, error } = await apiFetch<AppConfig>("/api/app-config");
  return { config: data ?? null, error };
}

// ── Feedback ───────────────────────────────────────────────────────────

export async function sendFeedback(params: {
  userId?: string;
  userEmail?: string;
  message: string;
}): Promise<{ error: string | null }> {
  const { error } = await apiFetch<{ ok: boolean }>("/api/feedback", {
    method: "POST",
    body: JSON.stringify(params),
  });
  return { error };
}

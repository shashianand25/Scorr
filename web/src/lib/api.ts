/**
 * Web API client — mirrors mobile/src/lib/api.ts but for Next.js web.
 * All calls go to https://api.scorrapp.com
 */

const BASE_URL = "https://api.scorrapp.com";

// ── Types ──────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  prompt: string;
  answers: { id: string; text: string; isCorrect: boolean }[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface Quiz {
  id: string;
  title: string;
  category: string;
  questions: number;             // count
  questionsList: Question[];
  flashcards: Flashcard[];
  sourceText: string;
  attempts: Attempt[];
  wrongQuestions: WrongQuestion[];
  uniqueCorrectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Attempt {
  date?: number;
  timestamp?: number;
  score: number;
  correct: number;
  total: number;
  durationSec?: number;
}

export interface WrongQuestion {
  id: string;
  prompt: string;
  selectedTexts: string[];
  correctTexts: string[];
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
    wrongQuestions: WrongQuestion[];
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

// ── Helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const json = await res.json();
    if (!res.ok) return { data: null, error: json?.error ?? `HTTP ${res.status}` };
    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message ?? "Network error" };
  }
}

// ── User ───────────────────────────────────────────────────────────────

export async function syncUser(params: {
  uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null;
}): Promise<{ user: NeonUser | null; error: string | null }> {
  const { data, error } = await apiFetch<{ user: NeonUser }>("/api/sync-user", {
    method: "POST", body: JSON.stringify(params),
  });
  return { user: data?.user ?? null, error };
}

// ── Quizzes ────────────────────────────────────────────────────────────

export async function fetchQuizzes(userId: string): Promise<{ quizzes: Quiz[]; error: string | null }> {
  const { data, error } = await apiFetch<{ quizzes: Quiz[] }>(
    `/api/mobile-quizzes?userId=${encodeURIComponent(userId)}`
  );
  return { quizzes: data?.quizzes ?? [], error };
}

export async function createQuiz(params: {
  userId: string; title: string; category: string;
  questionCount: number; sourceText: string;
  questionsList?: Question[]; flashcards?: Flashcard[];
}): Promise<{ quiz: Quiz | null; error: string | null }> {
  const { data, error } = await apiFetch<{ quiz: Quiz }>("/api/mobile-quizzes", {
    method: "POST", body: JSON.stringify(params),
  });
  return { quiz: data?.quiz ?? null, error };
}

export async function updateQuiz(params: {
  userId: string; quizId: string;
  attempts?: Attempt[]; wrongQuestions?: WrongQuestion[]; uniqueCorrectIds?: string[];
}): Promise<{ quiz: Quiz | null; error: string | null }> {
  const { data, error } = await apiFetch<{ quiz: Quiz }>("/api/mobile-quizzes", {
    method: "PUT", body: JSON.stringify(params),
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

// ── Quiz History ───────────────────────────────────────────────────────

export async function saveQuizHistory(params: {
  userId: string; quizTitle: string; totalQuestions: number;
  correct: number; wrong: number; score: number;
  durationSec?: number; wrongQuestions?: WrongQuestion[];
}): Promise<{ error: string | null }> {
  const { error } = await apiFetch<{ eventId: string }>("/api/quiz-history", {
    method: "POST", body: JSON.stringify(params),
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
    method: "POST", body: JSON.stringify(params),
  });
  return { error };
}

export async function fetchBattleHistory(userId: string): Promise<{ history: BattleHistoryEvent[]; error: string | null }> {
  const { data, error } = await apiFetch<{ history: BattleHistoryEvent[] }>(
    `/api/battle-history?userId=${encodeURIComponent(userId)}&limit=50`
  );
  return { history: data?.history ?? [], error };
}

// ── AI Config ──────────────────────────────────────────────────────────

export interface AppConfig {
  aiConfig: {
    geminiKey: string;
    modelUrl: string;
    promptTemplate: string;
    chunkSize: number;
    maxChunks: number;
  };
}

export async function fetchAppConfig(): Promise<{ config: AppConfig | null; error: string | null }> {
  const { data, error } = await apiFetch<AppConfig>("/api/app-config");
  return { config: data ?? null, error };
}

// ── Feedback ───────────────────────────────────────────────────────────

export async function sendFeedback(params: {
  userId?: string; userEmail?: string; message: string;
}): Promise<{ error: string | null }> {
  const { error } = await apiFetch<{ ok: boolean }>("/api/feedback", {
    method: "POST", body: JSON.stringify(params),
  });
  return { error };
}

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

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 
  (Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000");

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
    if (!res.ok) {
      return { data: null, error: json?.error ?? `HTTP ${res.status}` };
    }
    return { data: json as T, error: null };
  } catch (err: any) {
    console.warn("[API]", path, err?.message);
    return { data: null, error: err?.message ?? "Network error" };
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

// ── Flashcard Decks ────────────────────────────────────────────────────

export interface NeonFlashcardCard {
  id: string;
  front: string;
  back: string;
  order: number;
}

export interface NeonFlashcardDeck {
  id: string;
  title: string;
  cardType: string;
  updatedAt: string;
  createdAt: string;
  cards: NeonFlashcardCard[];
}

/**
 * Fetches all flashcard decks for the logged-in user from Neon.
 */
export async function fetchFlashcardDecks(
  userId: string
): Promise<{ decks: NeonFlashcardDeck[]; error: string | null }> {
  const { data, error } = await apiFetch<{ decks: NeonFlashcardDeck[] }>(
    `/api/flashcard-decks?userId=${encodeURIComponent(userId)}`
  );
  return { decks: data?.decks ?? [], error };
}

/**
 * Creates a new flashcard deck in Neon.
 * Returns the deck with its server-assigned id.
 */
export async function createFlashcardDeck(params: {
  userId: string;
  title: string;
  cardType: string;
  cards: { front: string; back: string }[];
}): Promise<{ deck: NeonFlashcardDeck | null; error: string | null }> {
  const { data, error } = await apiFetch<{ deck: NeonFlashcardDeck }>(
    "/api/flashcard-decks",
    { method: "POST", body: JSON.stringify(params) }
  );
  return { deck: data?.deck ?? null, error };
}

/**
 * Updates an existing deck in Neon (replaces cards wholesale).
 */
export async function updateFlashcardDeck(params: {
  userId: string;
  deckId: string;
  title?: string;
  cardType?: string;
  cards?: { front: string; back: string }[];
}): Promise<{ deck: NeonFlashcardDeck | null; error: string | null }> {
  const { data, error } = await apiFetch<{ deck: NeonFlashcardDeck }>(
    "/api/flashcard-decks",
    { method: "PUT", body: JSON.stringify(params) }
  );
  return { deck: data?.deck ?? null, error };
}

/**
 * Permanently deletes a deck from Neon.
 */
export async function deleteFlashcardDeck(
  userId: string,
  deckId: string
): Promise<{ error: string | null }> {
  const { error } = await apiFetch<{ ok: boolean }>(
    `/api/flashcard-decks?userId=${encodeURIComponent(userId)}&deckId=${encodeURIComponent(deckId)}`,
    { method: "DELETE" }
  );
  return { error };
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


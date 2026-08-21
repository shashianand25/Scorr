import { apiFetch } from "./client";

// ── Types ──────────────────────────────────────────────────────────────

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

// ── API calls ──────────────────────────────────────────────────────────

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

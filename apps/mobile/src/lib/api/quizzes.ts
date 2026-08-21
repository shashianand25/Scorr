import { apiFetch } from "./client";

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

import { computeQuizFingerprint, FingerprintableQuiz } from "./quizFingerprint";

export interface QuizAttempt {
  id?: string | number;
  score?: number;
  total?: number;
  date?: number;
  timestamp?: number;
  durationSec?: number | null;
  timeSpent?: number | null;
  answers?: any[];
  [key: string]: any;
}

export interface QuizRecord extends FingerprintableQuiz {
  id: string;
  neonId?: string | null;
  masterQuizId?: string | null;
  master_quiz_id?: string | null;
  userId?: string | null;
  user_id?: string | null;
  title: string;
  category?: string;
  questions?: number;
  questionsList?: any[];
  flashcards?: any[];
  sourceText?: string;
  attempts?: QuizAttempt[];
  wrongQuestions?: any[];
  uniqueCorrectIds?: string[];
  createdAt?: string | number;
  updatedAt?: string | number;
  time?: string;
  isSample?: boolean;
  [key: string]: any;
}

export interface DeduplicationResult {
  deduplicatedQuizzes: QuizRecord[];
  removedQuizIds: string[];
  neonDeletions: Array<{ quizId: string; neonId: string }>;
  hasChanges: boolean;
}

/**
 * Deterministically chooses which quiz to retain as the canonical copy:
 * 1. Prefer a quiz already linked to a master_quiz_id
 * 2. Prefer a quiz synced to cloud (has neonId)
 * 3. Prefer the quiz with more study attempts / history
 * 4. Prefer the oldest record (earliest createdAt or creation timestamp)
 * 5. Deterministic tie-breaker: sorted by id
 */
export function chooseCanonicalQuiz(duplicates: QuizRecord[]): QuizRecord {
  if (!duplicates || duplicates.length === 0) {
    throw new Error("chooseCanonicalQuiz requires at least one quiz");
  }
  if (duplicates.length === 1) return duplicates[0];

  const sorted = [...duplicates].sort((a, b) => {
    // 1. Master Quiz ID preference
    const aHasMaster = Boolean(a.masterQuizId || a.master_quiz_id);
    const bHasMaster = Boolean(b.masterQuizId || b.master_quiz_id);
    if (aHasMaster !== bHasMaster) return aHasMaster ? -1 : 1;

    // 2. Neon ID (synced to cloud) preference
    const aHasNeon = Boolean(a.neonId && !String(a.neonId).startsWith("local_"));
    const bHasNeon = Boolean(b.neonId && !String(b.neonId).startsWith("local_"));
    if (aHasNeon !== bHasNeon) return aHasNeon ? -1 : 1;

    // 3. Most study history / attempts
    const aAttemptsCount = Array.isArray(a.attempts) ? a.attempts.length : 0;
    const bAttemptsCount = Array.isArray(b.attempts) ? b.attempts.length : 0;
    if (aAttemptsCount !== bAttemptsCount) return bAttemptsCount - aAttemptsCount;

    // 4. Oldest creation timestamp
    const getTimestamp = (q: QuizRecord): number => {
      if (q.createdAt) {
        const t = typeof q.createdAt === "number" ? q.createdAt : new Date(q.createdAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      const match = String(q.id).match(/quiz_(\d+)_/);
      if (match && match[1]) {
        const t = Number(match[1]);
        if (!isNaN(t) && t > 0) return t;
      }
      return Number.MAX_SAFE_INTEGER;
    };

    const aTime = getTimestamp(a);
    const bTime = getTimestamp(b);
    if (aTime !== bTime) return aTime - bTime;

    // 5. Deterministic string tie-breaker
    return String(a.id).localeCompare(String(b.id));
  });

  return sorted[0];
}

/**
 * Merges personal study state (attempts, wrong questions, correct question IDs,
 * flashcard metrics) from redundant duplicates into the canonical quiz.
 * Guarantees no study progress is lost.
 */
export function mergeQuizPersonalState(canonical: QuizRecord, duplicates: QuizRecord[]): QuizRecord {
  const allQuizzes = [canonical, ...duplicates.filter((d) => d.id !== canonical.id)];

  // 1. Merge Attempts (de-duplicate by attempt ID or timestamp+score)
  const attemptMap = new Map<string, QuizAttempt>();
  for (const q of allQuizzes) {
    if (Array.isArray(q.attempts)) {
      for (const a of q.attempts) {
        const key = a.id ? String(a.id) : `${a.date || a.timestamp || 0}_${a.score || 0}_${a.total || 0}`;
        if (!attemptMap.has(key)) {
          attemptMap.set(key, a);
        }
      }
    }
  }
  const mergedAttempts = Array.from(attemptMap.values()).sort(
    (a, b) => Number(b.id || b.date || b.timestamp || 0) - Number(a.id || a.date || a.timestamp || 0)
  );

  // 2. Merge Unique Correct IDs (union)
  const correctIdSet = new Set<string>();
  for (const q of allQuizzes) {
    if (Array.isArray(q.uniqueCorrectIds)) {
      for (const cid of q.uniqueCorrectIds) {
        if (cid) correctIdSet.add(String(cid));
      }
    }
  }
  const mergedUniqueCorrectIds = Array.from(correctIdSet);

  // 3. Merge Wrong Questions (union minus known correct IDs)
  const wrongMap = new Map<string, any>();
  for (const q of allQuizzes) {
    if (Array.isArray(q.wrongQuestions)) {
      for (const w of q.wrongQuestions) {
        const wId = typeof w === "object" && w !== null ? (w.id || w.question || w.prompt) : String(w);
        if (wId && !correctIdSet.has(String(wId))) {
          wrongMap.set(String(wId), w);
        }
      }
    }
  }
  const mergedWrongQuestions = Array.from(wrongMap.values());

  // 4. Merge Master Quiz ID reference
  const masterId =
    canonical.masterQuizId ||
    canonical.master_quiz_id ||
    allQuizzes.find((q) => q.masterQuizId || q.master_quiz_id)?.masterQuizId ||
    null;

  // 5. Merge Neon ID reference
  const neonId =
    canonical.neonId ||
    allQuizzes.find((q) => q.neonId && !String(q.neonId).startsWith("local_"))?.neonId ||
    null;

  // 6. Merge Flashcards state (preserve highest review state)
  let mergedFlashcards = canonical.flashcards || [];
  if (Array.isArray(canonical.flashcards) && canonical.flashcards.length > 0) {
    mergedFlashcards = canonical.flashcards.map((cf, idx) => {
      let bestCard = { ...cf };
      for (const q of allQuizzes) {
        if (Array.isArray(q.flashcards) && q.flashcards[idx]) {
          const otherCard = q.flashcards[idx];
          if ((otherCard.sm2_interval || otherCard.interval || 0) > (bestCard.sm2_interval || bestCard.interval || 0)) {
            bestCard.sm2_interval = otherCard.sm2_interval || otherCard.interval;
            bestCard.sm2_repetition = otherCard.sm2_repetition || otherCard.repetition;
            bestCard.sm2_easeFactor = otherCard.sm2_easeFactor || otherCard.easeFactor;
            bestCard.sm2_nextReviewDate = otherCard.sm2_nextReviewDate || otherCard.dueDate;
          }
          if (otherCard.starred) bestCard.starred = true;
        }
      }
      return bestCard;
    });
  }

  return {
    ...canonical,
    masterQuizId: masterId,
    master_quiz_id: masterId,
    neonId: neonId,
    attempts: mergedAttempts,
    uniqueCorrectIds: mergedUniqueCorrectIds,
    wrongQuestions: mergedWrongQuestions,
    flashcards: mergedFlashcards,
    questions: canonical.questionsList?.length || canonical.questions || 0,
    updatedAt: Date.now(),
  };
}

/**
 * Detects and de-duplicates identical quizzes within the user's library.
 * Scoped to the given user's library (user-local only).
 */
export async function deduplicateUserQuizzes(
  quizzes: QuizRecord[],
  options?: { currentUserId?: string | null }
): Promise<DeduplicationResult> {
  if (!Array.isArray(quizzes) || quizzes.length <= 1) {
    return {
      deduplicatedQuizzes: quizzes || [],
      removedQuizIds: [],
      neonDeletions: [],
      hasChanges: false,
    };
  }

  const targetQuizzes = quizzes.filter((q) => {
    if (q.id === "sample_quiz" || q.isSample) return true;
    if (options?.currentUserId && q.userId && q.userId !== options.currentUserId) {
      return false;
    }
    return true;
  });

  const untouchedQuizzes = quizzes.filter((q) => !targetQuizzes.includes(q));

  // Step 1: Compute fingerprints & master IDs
  const groupMap = new Map<string, QuizRecord[]>();
  const unhashableQuizzes: QuizRecord[] = [];

  for (const quiz of targetQuizzes) {
    if (quiz.id === "sample_quiz" || quiz.isSample) {
      unhashableQuizzes.push(quiz);
      continue;
    }

    try {
      const masterId = quiz.masterQuizId || quiz.master_quiz_id;
      const fp = await computeQuizFingerprint(quiz);
      const key = fp ? `fp_${fp}` : (masterId ? `master_${masterId}` : null);

      if (!key) {
        unhashableQuizzes.push(quiz);
        continue;
      }

      const existing = groupMap.get(key) || [];
      existing.push(quiz);
      groupMap.set(key, existing);
    } catch (err) {
      console.warn(`[QuizDeduplication] Failed to fingerprint quiz ${quiz.id}:`, err);
      unhashableQuizzes.push(quiz);
    }
  }

  // Step 2: Cross-merge groups that share the same masterQuizId
  const finalGroups: QuizRecord[][] = [];
  const processedKeys = new Set<string>();

  for (const [key, group] of groupMap) {
    if (processedKeys.has(key)) continue;
    processedKeys.add(key);

    const mergedGroup = [...group];
    const groupMasterIds = new Set<string>(
      group.map((q) => q.masterQuizId || q.master_quiz_id).filter(Boolean) as string[]
    );

    if (groupMasterIds.size > 0) {
      for (const [otherKey, otherGroup] of groupMap) {
        if (processedKeys.has(otherKey)) continue;
        const otherHasMatchingMaster = otherGroup.some((q) => {
          const mid = q.masterQuizId || q.master_quiz_id;
          return mid && groupMasterIds.has(mid);
        });
        if (otherHasMatchingMaster) {
          processedKeys.add(otherKey);
          mergedGroup.push(...otherGroup);
        }
      }
    }
    finalGroups.push(mergedGroup);
  }

  const deduplicatedQuizzes: QuizRecord[] = [...unhashableQuizzes];
  const removedQuizIds: string[] = [];
  const neonDeletions: Array<{ quizId: string; neonId: string }> = [];
  let hasChanges = false;

  for (const group of finalGroups) {
    if (group.length === 1) {
      deduplicatedQuizzes.push(group[0]);
    } else {
      hasChanges = true;
      const canonical = chooseCanonicalQuiz(group);
      const redundant = group.filter((q) => q.id !== canonical.id);

      const mergedCanonical = mergeQuizPersonalState(canonical, redundant);
      deduplicatedQuizzes.push(mergedCanonical);

      for (const red of redundant) {
        removedQuizIds.push(red.id);
        if (red.neonId && !String(red.neonId).startsWith("local_")) {
          neonDeletions.push({ quizId: red.id, neonId: red.neonId });
        }
      }
    }
  }

  // Preserve original relative ordering
  const finalIdOrder = new Map(quizzes.map((q, idx) => [q.id, idx]));
  const finalCombined = [...untouchedQuizzes, ...deduplicatedQuizzes].sort((a, b) => {
    const idxA = finalIdOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const idxB = finalIdOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return idxA - idxB;
  });

  return {
    deduplicatedQuizzes: finalCombined,
    removedQuizIds,
    neonDeletions,
    hasChanges,
  };
}

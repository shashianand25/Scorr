export interface ScoringEvaluationResult {
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  correctIds: string[];
  wrongIds: string[];
  scorePct: number;
}

/**
 * Evaluates user answers against expected correct options in a quiz session.
 */
export function evaluateAnswers(
  questionsList: any[],
  userAnswers: Record<string, string[]>
): ScoringEvaluationResult {
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  const correctIds: string[] = [];
  const wrongIds: string[] = [];

  questionsList.forEach((q) => {
    const selected = userAnswers[q.id] || [];
    const expectedCorrect = (q.answers || [])
      .filter((a: any) => a.isCorrect)
      .map((a: any) => a.id);

    if (selected.length === 0) {
      skippedCount++;
      return;
    }

    const isCorrect =
      selected.length === expectedCorrect.length &&
      selected.every((id: string) => expectedCorrect.includes(id));

    if (isCorrect) {
      correctCount++;
      correctIds.push(q.id);
    } else {
      wrongCount++;
      wrongIds.push(q.id);
    }
  });

  const total = questionsList.length;
  const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return { correctCount, wrongCount, skippedCount, correctIds, wrongIds, scorePct };
}

/**
 * Calculates raw accuracy percentage.
 */
export function calculateAccuracyPercentage(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

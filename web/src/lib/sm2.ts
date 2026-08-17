export interface SM2State {
  sm2_interval?: number; // In days
  sm2_repetition?: number;
  sm2_easeFactor?: number; // Default 2.5
  sm2_nextReviewDate?: number; // Epoch timestamp
}

export type SM2Rating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy

/**
 * Computes next review schedule using SuperMemo-2 (SM-2) algorithm.
 * Rating:
 * 1 -> Again (reset repetition, interval = 1 day)
 * 2 -> Hard (ease factor decreases, interval *= 1.2)
 * 3 -> Good (standard progression)
 * 4 -> Easy (ease factor increases, interval *= 1.5)
 */
export function calculateSM2(
  rating: SM2Rating,
  prevState: SM2State = {}
): SM2State {
  const prevRepetition = prevState.sm2_repetition ?? 0;
  const prevInterval = prevState.sm2_interval ?? 1;
  const prevEaseFactor = prevState.sm2_easeFactor ?? 2.5;

  let repetition = prevRepetition;
  let interval = prevInterval;
  let easeFactor = prevEaseFactor;

  // Grade mapping for SM-2 formula (grade: 0 to 5)
  // 1 (Again) -> 2
  // 2 (Hard)  -> 3
  // 3 (Good)  -> 4
  // 4 (Easy)  -> 5
  const grade = rating + 1;

  if (rating === 1) {
    // Again -> Reset repetition, review tomorrow
    repetition = 0;
    interval = 1;
  } else {
    // Success -> Advance interval
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = rating === 2 ? 3 : 6;
    } else {
      const modifier = rating === 2 ? 1.2 : rating === 4 ? 1.5 : 1.0;
      interval = Math.max(1, Math.round(prevInterval * easeFactor * modifier));
    }
    repetition += 1;
  }

  // Calculate new Ease Factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  const newEaseFactor = prevEaseFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  easeFactor = Math.max(1.3, Math.min(3.5, Math.round(newEaseFactor * 100) / 100));

  const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    sm2_interval: interval,
    sm2_repetition: repetition,
    sm2_easeFactor: easeFactor,
    sm2_nextReviewDate: nextReviewDate,
  };
}

/**
 * Checks if a card is due for review based on its next review date.
 */
export function isCardDue(card: SM2State): boolean {
  if (!card.sm2_nextReviewDate) return true;
  return card.sm2_nextReviewDate <= Date.now();
}

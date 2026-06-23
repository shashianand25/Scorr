export function calculateSM2(card: any, rating: "again" | "hard" | "good" | "easy") {
  let { sm2_interval: interval, sm2_repetition: repetition, sm2_easeFactor: easeFactor } = card;
  let nextReviewDate = Date.now();

  if (rating === "again") {
    repetition = 0;
    interval = 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    nextReviewDate += 60 * 1000;
  } else if (rating === "hard") {
    interval = Math.max(1, interval * 1.2);
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    nextReviewDate = repetition === 0 ? Date.now() + 10 * 60 * 1000 : Date.now() + interval * 24 * 60 * 60 * 1000;
  } else if (rating === "good") {
    if (repetition === 0) interval = 1;
    else if (repetition === 1) interval = 6;
    else interval = interval * easeFactor;
    repetition += 1;
    nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;
  } else if (rating === "easy") {
    if (repetition === 0) interval = 4;
    else interval = interval * easeFactor * 1.3;
    easeFactor += 0.15;
    repetition += 1;
    nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;
  }
  return { ...card, sm2_interval: interval, sm2_repetition: repetition, sm2_easeFactor: easeFactor, sm2_nextReviewDate: nextReviewDate };
}

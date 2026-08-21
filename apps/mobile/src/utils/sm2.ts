export enum CardState {
    NEW = "NEW",
    LEARNING = "LEARNING",
    REVIEW = "REVIEW",
    RELEARNING = "RELEARNING"
}

export type Rating = "again" | "hard" | "good" | "easy" | "perfect";

// --- Configuration Constants ---
const MINUTES_MS = 60 * 1000;
const DAYS_MS = 24 * 60 * 60 * 1000;

// Learning steps (in milliseconds)
const LEARNING_STEPS = [1 * MINUTES_MS, 10 * MINUTES_MS];

const GRADUATING_INTERVAL_DAYS = 1;
const EASY_INTERVAL_DAYS = 4;

const EASY_BONUS = 1.3;
const HARD_MULTIPLIER = 1.2;
const MIN_EASE_FACTOR = 1.3;

export interface FlashcardProgress {
    sm2_easeFactor: number;
    sm2_repetition: number;
    sm2_interval: number; // For REVIEW, this is days. For LEARNING/RELEARNING, this is the step index.
    sm2_nextReviewDate: number | null;
    sm2_state: CardState;
}

export class Scheduler {
    public static schedule(card: any, rating: Rating): any {
        // Extract current progress or initialize defaults
        let easeFactor = card.sm2_easeFactor ?? 2.5;
        let repetition = card.sm2_repetition ?? 0;
        let interval = card.sm2_interval ?? 0;
        let state: CardState = card.sm2_state ?? CardState.NEW;
        let nextReviewDate = card.sm2_nextReviewDate ?? Date.now();

        // Normalize rating (treat "perfect" as "easy")
        const normalizedRating = rating === "perfect" ? "easy" : rating;

        const now = Date.now();

        if (state === CardState.NEW || state === CardState.LEARNING || state === CardState.RELEARNING) {
            // --- LEARNING PHASE ---
            if (normalizedRating === "again") {
                state = state === CardState.NEW ? CardState.LEARNING : state;
                interval = 0; // Reset to first learning step
                nextReviewDate = now + LEARNING_STEPS[interval];
            } else if (normalizedRating === "hard") {
                // Repeat current step
                nextReviewDate = now + LEARNING_STEPS[interval];
            } else if (normalizedRating === "good") {
                interval += 1;
                if (interval >= LEARNING_STEPS.length) {
                    // Graduate to Review
                    state = CardState.REVIEW;
                    interval = GRADUATING_INTERVAL_DAYS;
                    nextReviewDate = now + interval * DAYS_MS;
                    repetition = 1;
                } else {
                    // Next learning step
                    nextReviewDate = now + LEARNING_STEPS[interval];
                }
            } else if (normalizedRating === "easy") {
                // Instantly graduate
                state = CardState.REVIEW;
                interval = EASY_INTERVAL_DAYS;
                nextReviewDate = now + interval * DAYS_MS;
                repetition = 1;
            }

            // Adjust EF if relearning
            if (state === CardState.RELEARNING && normalizedRating === "again") {
                easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
            }
        } else {
            // --- REVIEW PHASE ---
            if (normalizedRating === "again") {
                state = CardState.RELEARNING;
                interval = 0; // Restart learning steps
                repetition = 0;
                easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
                nextReviewDate = now + LEARNING_STEPS[interval];
            } else if (normalizedRating === "hard") {
                interval = Math.max(1, interval * HARD_MULTIPLIER);
                easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
                nextReviewDate = now + interval * DAYS_MS;
            } else if (normalizedRating === "good") {
                interval = interval * easeFactor;
                repetition += 1;
                nextReviewDate = now + interval * DAYS_MS;
            } else if (normalizedRating === "easy") {
                interval = interval * easeFactor * EASY_BONUS;
                easeFactor += 0.15;
                repetition += 1;
                nextReviewDate = now + interval * DAYS_MS;
            }
        }

        return {
            ...card,
            sm2_interval: interval,
            sm2_repetition: repetition,
            sm2_easeFactor: easeFactor,
            sm2_nextReviewDate: nextReviewDate,
            sm2_state: state
        };
    }
}

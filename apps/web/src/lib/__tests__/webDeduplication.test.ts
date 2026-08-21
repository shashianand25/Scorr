/**
 * Unit tests for web quiz deduplication, fingerprinting, content hashing, and SM-2 algorithm parity.
 */
import { computeQuizFingerprint } from "../quizFingerprint";
import { deduplicateUserQuizzes, type QuizRecord } from "../quizDeduplication";
import { computeContentHash } from "../contentHash";
import { calculateSM2 } from "../sm2";

describe("Web Deduplication & Algorithms Suite", () => {
  it("deduplicates identical quizzes despite differing answer order and merges attempts", async () => {
    const quizA: QuizRecord = {
      id: "quiz_1",
      title: "Biology 101",
      questionsList: [
        {
          question: "What is the powerhouse of the cell?",
          answers: [
            { text: "Mitochondria", isCorrect: true },
            { text: "Nucleus", isCorrect: false },
          ],
        },
      ],
      flashcards: [{ front: "Mitochondria", back: "Powerhouse of the cell" }],
      attempts: [{ score: 80, total: 100 }],
    };

    const quizB: QuizRecord = {
      id: "quiz_2",
      title: "Biology 101 Duplicate",
      questionsList: [
        {
          question: "What is the powerhouse of the cell?",
          answers: [
            { text: "Nucleus", isCorrect: false },
            { text: "Mitochondria", isCorrect: true },
          ],
        },
      ],
      flashcards: [{ front: "Mitochondria", back: "Powerhouse of the cell" }],
      attempts: [{ score: 90, total: 100 }],
    };

    const fpA = await computeQuizFingerprint(quizA);
    const fpB = await computeQuizFingerprint(quizB);
    expect(fpA).toBe(fpB);

    const dedupResult = await deduplicateUserQuizzes([quizA, quizB]);
    expect(dedupResult.deduplicatedQuizzes.length).toBe(1);
    expect(dedupResult.deduplicatedQuizzes[0].attempts?.length).toBe(2);
  });

  it("calculates SM-2 initial interval, ease factor adjustments, and resets correctly", () => {
    const sm2Initial = calculateSM2(3); // Good rating
    expect(sm2Initial.sm2_repetition).toBe(1);
    expect(sm2Initial.sm2_interval).toBe(1);
    expect((sm2Initial.sm2_nextReviewDate || 0)).toBeGreaterThan(Date.now());

    const sm2Hard = calculateSM2(2, sm2Initial); // Hard rating
    expect(sm2Hard.sm2_repetition).toBe(2);
    expect(sm2Hard.sm2_easeFactor || 0).toBeLessThan(2.5);

    const sm2Again = calculateSM2(1, sm2Hard); // Again rating -> resets
    expect(sm2Again.sm2_repetition).toBe(0);
    expect(sm2Again.sm2_interval).toBe(1);
  });

  it("computes content hashes identically regardless of CRLF or surrounding whitespace", async () => {
    const hash1 = await computeContentHash("  Photosynthesis converts light into chemical energy.  \r\n", "en");
    const hash2 = await computeContentHash("Photosynthesis converts light into chemical energy.", "en");
    expect(hash1).toBe(hash2);
  });
});

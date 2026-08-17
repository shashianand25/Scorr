import { computeQuizFingerprint, normalizeQuizText, buildQuizCanonicalString } from "../quizFingerprint";
import { chooseCanonicalQuiz, mergeQuizPersonalState, deduplicateUserQuizzes, QuizRecord } from "../quizDeduplication";
import { computeContentHash } from "../contentHash";
import { calculateSM2, isCardDue } from "../sm2";

interface CustomAssert {
  (condition: any, msg?: string): void;
  ok(condition: any, msg?: string): void;
  strictEqual(actual: any, expected: any, msg?: string): void;
  notStrictEqual(actual: any, expected: any, msg?: string): void;
  deepStrictEqual(actual: any, expected: any, msg?: string): void;
}

const assert: CustomAssert = Object.assign(
  function (condition: any, msg?: string) {
    if (!condition) throw new Error(msg || "Assertion failed");
  },
  {
    ok: (condition: any, msg?: string) => {
      if (!condition) throw new Error(msg || "Assertion failed");
    },
    strictEqual: (actual: any, expected: any, msg?: string) => {
      if (actual !== expected) throw new Error(msg || `Expected ${expected} but got ${actual}`);
    },
    notStrictEqual: (actual: any, expected: any, msg?: string) => {
      if (actual === expected) throw new Error(msg || `Expected values to differ, but both were ${actual}`);
    },
    deepStrictEqual: (actual: any, expected: any, msg?: string) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(msg || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    },
  }
);

async function runTests() {
  console.log("--- Starting Web Algorithms & Deduplication Test Suite ---");

  // 1. Identical quizzes -> deduplicated to 1
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
  assert.strictEqual(fpA, fpB, "Fingerprints must be identical despite answer ordering");

  const dedupResult = await deduplicateUserQuizzes([quizA, quizB]);
  assert.strictEqual(dedupResult.deduplicatedQuizzes.length, 1, "Only 1 canonical copy remains");
  assert.strictEqual(dedupResult.deduplicatedQuizzes[0].attempts?.length, 2, "Both attempts merged");
  console.log("✅ [PASS] 1. Deduplication and attempt merging working");

  // 2. SM-2 Spaced Repetition calculation
  const sm2Initial = calculateSM2(3); // Good rating
  assert.strictEqual(sm2Initial.sm2_repetition, 1);
  assert.strictEqual(sm2Initial.sm2_interval, 1);
  assert.ok((sm2Initial.sm2_nextReviewDate || 0) > Date.now());

  const sm2Hard = calculateSM2(2, sm2Initial); // Hard rating
  assert.strictEqual(sm2Hard.sm2_repetition, 2);
  assert.ok((sm2Hard.sm2_easeFactor || 0) < 2.5);

  const sm2Again = calculateSM2(1, sm2Hard); // Again rating -> resets
  assert.strictEqual(sm2Again.sm2_repetition, 0);
  assert.strictEqual(sm2Again.sm2_interval, 1);
  console.log("✅ [PASS] 2. SM-2 Spaced Repetition logic verified");

  // 3. Content Hash for master quiz cache
  const hash1 = await computeContentHash("  Photosynthesis converts light into chemical energy.  \r\n", "en");
  const hash2 = await computeContentHash("Photosynthesis converts light into chemical energy.", "en");
  assert.strictEqual(hash1, hash2, "Content hashes must match regardless of CRLF or whitespace");
  console.log("✅ [PASS] 3. Content hashing verified");

  console.log("--- All Web Algorithms Tests Passed Successfully ---");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

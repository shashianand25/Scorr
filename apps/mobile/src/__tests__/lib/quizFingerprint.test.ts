/**
 * Tests for quiz fingerprinting, text normalization, and canonical string generation.
 */
import {
  normalizeQuizText,
  buildQuizCanonicalString,
  computeQuizFingerprint,
  type FingerprintableQuiz,
} from "../../lib/quizFingerprint";

describe("Quiz Fingerprinting & Canonical Serialization", () => {
  it("normalizes whitespace and CRLF line endings cleanly", () => {
    const raw = "  Hello   World\r\nFrom   Scorr!\t";
    const normalized = normalizeQuizText(raw);
    expect(normalized).toBe("Hello World\nFrom Scorr!");
  });

  it("handles null, undefined, and empty string safely", () => {
    expect(normalizeQuizText(null)).toBe("");
    expect(normalizeQuizText(undefined)).toBe("");
    expect(normalizeQuizText("")).toBe("");
  });

  it("produces identical canonical strings for quizzes with shuffled questions and answers", () => {
    const quiz1: FingerprintableQuiz = {
      title: "Science Quiz",
      questionsList: [
        {
          question: "What is H2O?",
          answers: [
            { text: "Water", isCorrect: true },
            { text: "Fire", isCorrect: false },
          ],
        },
        {
          question: "What is CO2?",
          answers: [
            { text: "Carbon Dioxide", isCorrect: true },
            { text: "Oxygen", isCorrect: false },
          ],
        },
      ],
      flashcards: [{ front: "H2O", back: "Water" }],
    };

    const quiz2: FingerprintableQuiz = {
      title: "Science Quiz Duplicate",
      questionsList: [
        {
          question: "What is CO2?",
          answers: [
            { text: "Oxygen", isCorrect: false },
            { text: "Carbon Dioxide", isCorrect: true },
          ],
        },
        {
          question: "What is H2O?",
          answers: [
            { text: "Fire", isCorrect: false },
            { text: "Water", isCorrect: true },
          ],
        },
      ],
      flashcards: [{ front: "H2O", back: "Water" }],
    };

    const str1 = buildQuizCanonicalString(quiz1);
    const str2 = buildQuizCanonicalString(quiz2);
    expect(str1).toBe(str2);
  });

  it("generates deterministic SHA-256 fingerprints for identical quiz content", async () => {
    const quiz: FingerprintableQuiz = {
      title: "Physics",
      questionsList: [
        {
          question: "Speed of light in vacuum?",
          answers: [
            { text: "299,792,458 m/s", isCorrect: true },
            { text: "300,000 m/s", isCorrect: false },
          ],
        },
      ],
    };

    const fp1 = await computeQuizFingerprint(quiz);
    const fp2 = await computeQuizFingerprint(quiz);
    expect(fp1).toHaveLength(64); // SHA-256 hex string
    expect(fp1).toBe(fp2);
  });

  it("returns empty string for empty quizzes", async () => {
    const emptyQuiz: FingerprintableQuiz = { questionsList: [], flashcards: [] };
    const fp = await computeQuizFingerprint(emptyQuiz);
    expect(fp).toBe("");
  });
});

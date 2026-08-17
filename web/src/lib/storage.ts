import type { QuizRecord } from "./quizDeduplication";

const PREFIX = "scorr_";

export function getLocalItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`) || localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Storage] Failed to read ${key}:`, err);
    return fallback;
  }
}

export function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(`${PREFIX}${key}`, serialized);
    localStorage.setItem(key, serialized); // Fallback mirror
  } catch (err) {
    console.warn(`[Storage] Failed to write ${key}:`, err);
  }
}

export function removeLocalItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${PREFIX}${key}`);
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[Storage] Failed to remove ${key}:`, err);
  }
}

// ── Sample Quiz Initializer ─────────────────────────────────────────────
export const SAMPLE_QUIZ: QuizRecord = {
  id: "sample_quiz_welcome",
  title: "Welcome to Scorr — Getting Started",
  category: "General",
  questions: 5,
  isSample: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  sourceText: "Welcome to Scorr! Scorr turns your study materials into interactive quizzes and flashcards.",
  questionsList: [
    {
      id: "sq_1",
      question: "What is the primary superpower of Scorr?",
      prompt: "What is the primary superpower of Scorr?",
      explanation: "Scorr uses AI to turn PDFs, PPTs, and notes into active recall study materials in seconds.",
      answers: [
        { id: "sq_1_a", text: "Turns notes & documents into quizzes and flashcards instantly", isCorrect: true },
        { id: "sq_1_b", text: "Prints out physical textbooks", isCorrect: false },
        { id: "sq_1_c", text: "Plays music playlists while you study", isCorrect: false },
        { id: "sq_1_d", text: "Blocks your wifi router", isCorrect: false },
      ],
    },
    {
      id: "sq_2",
      question: "Which scientific learning technique does Scorr's flashcard system use?",
      prompt: "Which scientific learning technique does Scorr's flashcard system use?",
      explanation: "Scorr uses the SuperMemo-2 (SM-2) spaced repetition algorithm for optimal memory retention.",
      answers: [
        { id: "sq_2_a", text: "Cramming the night before", isCorrect: false },
        { id: "sq_2_b", text: "Spaced Repetition (SM-2 algorithm)", isCorrect: true },
        { id: "sq_2_c", text: "Passive reading", isCorrect: false },
        { id: "sq_2_d", text: "Rote memorization", isCorrect: false },
      ],
    },
    {
      id: "sq_3",
      question: "Can you challenge friends in real-time quiz battles on Scorr?",
      prompt: "Can you challenge friends in real-time quiz battles on Scorr?",
      explanation: "Yes! In Battle Arena, you can host a room with a 6-character code and battle live.",
      answers: [
        { id: "sq_3_a", text: "Yes, in the Battle Arena with a 6-character room code", isCorrect: true },
        { id: "sq_3_b", text: "No, multiplayer is not supported", isCorrect: false },
        { id: "sq_3_c", text: "Only on local Bluetooth", isCorrect: false },
        { id: "sq_3_d", text: "Only with bots", isCorrect: false },
      ],
    },
  ],
  flashcards: [
    {
      id: "sf_1",
      front: "Active Recall",
      back: "A learning technique where you stimulate your memory for a piece of information during learning.",
    },
    {
      id: "sf_2",
      front: "Spaced Repetition",
      back: "Reviewing material at increasing intervals of time to exploit the psychological spacing effect.",
    },
    {
      id: "sf_3",
      front: "Instant Load",
      back: "Documents with identical content load instantly in 0s using pre-computed master quiz caches.",
    },
  ],
  attempts: [],
  wrongQuestions: [],
  uniqueCorrectIds: [],
};

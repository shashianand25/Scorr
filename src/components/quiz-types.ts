// Shared types for the quiz flow
export type QuizPhase = "setup" | "playing" | "results";

export interface QuizConfig {
  selectionMode: "all" | "random" | "range" | "unanswered" | "wrong";
  randomCount: number;
  rangeStart: number;
  rangeEnd: number;
  timePerQuestion: number | null;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showAnswerOnSubmit: boolean;
}

export interface DisplayAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
  line: number;
}

export interface DisplayQuestion {
  id: string;
  prompt: string;
  line: number;
  type: "single_choice" | "multiple_choice" | "true_false" | "fill_blank";
  answers: DisplayAnswer[];
  imageUrl?: string;
  originalIndex: number;
}

export interface QuizSession {
  questions: DisplayQuestion[];
  answers: Map<string, string[]>;
  flagged: Set<string>;
  timedOut: Set<string>;
  startTime: number;
  endTime?: number;
}

export interface SessionHistory {
  answered: Set<string>;
  wrong: Set<string>;
}

// ─── Library types ────────────────────────────────────────────

export interface QuizAttempt {
  id: string;
  timestamp: number;
  score: number;       // 0–100
  correct: number;
  wrong: number;
  skipped: number;
  duration: number;    // ms
  questionCount: number;
  wrongQuestionIds?: string[];
  review?: AttemptReviewItem[];
}

export interface SavedQuiz {
  id: string;
  title: string;
  fileName: string;
  source: string;      // raw QST text
  questionCount: number;
  category?: string;
  savedAt: number;
  attempts: QuizAttempt[];
  remoteId?: string;
  slug?: string;
  syncedAt?: number;
}

export interface AttemptReviewItem {
  questionId: string;
  prompt: string;
  selectedAnswers: string[];
  correctAnswers: string[];
  explanation?: string;
}

export const DEFAULT_CONFIG: QuizConfig = {
  selectionMode: "all",
  randomCount: 20,
  rangeStart: 1,
  rangeEnd: 50,
  timePerQuestion: null,
  shuffleQuestions: true,
  shuffleAnswers: true,
  showAnswerOnSubmit: true,
};

export type QstSeverity = "error" | "warning";

export type QstIssueCode =
  | "UNKNOWN_METADATA"
  | "INVALID_METADATA"
  | "ANSWER_WITHOUT_QUESTION"
  | "EMPTY_QUESTION"
  | "QUESTION_WITHOUT_ANSWERS"
  | "QUESTION_WITHOUT_CORRECT_ANSWER"
  | "DUPLICATE_ANSWER"
  | "MIXED_ANSWER_MARKERS"
  | "UNKNOWN_LINE";

export interface QstIssue {
  code: QstIssueCode;
  line: number;
  message: string;
  severity: QstSeverity;
}

export interface QstMetadata {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  timeLimit?: number;
  shuffle?: boolean;
  difficulty?: "easy" | "medium" | "hard" | "expert";
  negativeMarking?: number;
  visibility?: "public" | "private" | "unlisted";
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface QstAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
  line: number;
  marker?: "+" | "-" | "*";
}

export interface QstQuestion {
  id: string;
  prompt: string;
  line: number;
  type: "single_choice" | "multiple_choice" | "true_false" | "fill_blank";
  answers: QstAnswer[];
  imageUrl?: string;
  explanation?: string;
  tags: string[];
  difficulty?: QstMetadata["difficulty"];
  timeLimit?: number;
}

export interface QstDocument {
  metadata: QstMetadata;
  questions: QstQuestion[];
}

export interface QstParseResult {
  ok: boolean;
  data: QstDocument;
  issues: QstIssue[];
}

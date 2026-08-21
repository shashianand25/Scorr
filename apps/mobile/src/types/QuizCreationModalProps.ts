import type React from "react";
import type { QuizQuestion } from "./QuizSessionProps";

export interface CreatedQuizInfo {
  title: string;
  count: number;
}

export interface SelectedQuizOption {
  id?: string;
  title: string;
  category?: string;
  questions?: number;
  questionsList?: QuizQuestion[];
  sourceText?: string;
  [key: string]: unknown;
}

export interface ModalInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Success modal shown when a new quiz is generated from notes or documents */
export interface QuizCreatedModalProps {
  showQuizCreatedModal?: CreatedQuizInfo | null;
  setShowQuizCreatedModal?: (modal: CreatedQuizInfo | null) => void;
  settingsDarkMode?: boolean;
}

/** Configuration modal for starting a study session (question counts, subsets, shuffling) */
export interface StartQuizSettingsModalProps {
  selectedQuiz?: SelectedQuizOption | null;
  setSelectedQuiz?: (quiz: SelectedQuizOption | null) => void;
  selectionMode?: string;
  setSelectionMode?: (mode: string) => void;
  randomCount?: number;
  setRandomCount?: (count: number) => void;
  rangeStart?: number;
  setRangeStart?: (start: number) => void;
  rangeEnd?: number;
  setRangeEnd?: (end: number) => void;
  quizPreset?: string;
  setQuizPreset?: (preset: string) => void;
  totalQuestions?: number;
  unansweredCount?: number;
  wrongCount?: number;
  shuffleQuestions?: boolean;
  setShuffleQuestions?: (shuffle: boolean) => void;
  shuffleAnswers?: boolean;
  setShuffleAnswers?: (shuffle: boolean) => void;
  showAnswerOnSubmit?: boolean;
  setShowAnswerOnSubmit?: (show: boolean) => void;
  handleStartQuiz?: () => void;
  optionsScrollRef?: React.RefObject<any>;
  Stepper?: React.ComponentType<any>;
}

/** Time constraints modal (overall quiz timer or countdown per question) */
export interface TimeLimitModalProps {
  quizTimeLimit?: number | null;
  setQuizTimeLimit?: (limit: number | null) => void;
  quizPerQuestionTimer?: number | null;
  setQuizPerQuestionTimer?: (timer: number | null) => void;
  timeLimitText?: string;
  setTimeLimitText?: (text: string) => void;
  showTimeLimitDropdown?: boolean;
  setShowTimeLimitDropdown?: (fn: boolean | ((prev: boolean) => boolean)) => void;
}

/** Source document and raw text preview modal */
export interface PdfPreviewModalProps {
  pdfViewQuiz?: SelectedQuizOption | null;
  setPdfViewQuiz?: (quiz: SelectedQuizOption | null) => void;
  starredQuestions?: any;
  setStarredQuestions?: (fn: any) => void;
}

/** Composite prop contract for QuizCreationModals */
export interface QuizCreationModalProps
  extends QuizCreatedModalProps,
    StartQuizSettingsModalProps,
    TimeLimitModalProps,
    PdfPreviewModalProps {
  insets?: ModalInsets;
  settingsDarkMode?: boolean;
  [key: string]: unknown;
}

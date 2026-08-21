import type React from "react";
import type { QuizQuestion } from "./QuizSessionProps";
import type { HomeScreenProps } from "./HomeScreenProps";

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
  [key: string]: unknown;
}

/**
 * QuizCreationModalProps — dedicated prop surface for quiz creation/setup modals.
 * Structurally compatible with HomeScreenProps via the index signature.
 */
export interface QuizCreationModalProps {
  insets?: HomeScreenProps["insets"];
  settingsDarkMode?: boolean;
  optionsScrollRef?: React.RefObject<any>;
  setQuizPreset?: (preset: string) => void;
  totalQuestions?: number;
  unansweredCount?: number;
  Stepper?: React.ComponentType<any>;
  questionCount?: number;
  quizPreset?: string;
  wrongCount?: number;
  setQuizSetupStep?: (step: string) => void;
  showQuizCreatedModal?: CreatedQuizInfo | null;
  setShowQuizCreatedModal?: (modal: CreatedQuizInfo | null) => void;
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
  quizTimeLimit?: number | null;
  setQuizTimeLimit?: (limit: number | null) => void;
  quizPerQuestionTimer?: number | null;
  setQuizPerQuestionTimer?: (timer: number | null) => void;
  timeLimitText?: string;
  setTimeLimitText?: (text: string) => void;
  showTimeLimitDropdown?: boolean;
  setShowTimeLimitDropdown?: (fn: boolean | ((prev: boolean) => boolean)) => void;
  shuffleQuestions?: boolean;
  setShuffleQuestions?: (shuffle: boolean) => void;
  shuffleAnswers?: boolean;
  setShuffleAnswers?: (shuffle: boolean) => void;
  showAnswerOnSubmit?: boolean;
  setShowAnswerOnSubmit?: (show: boolean) => void;
  handleStartQuiz?: () => void;
  pdfViewQuiz?: SelectedQuizOption | null;
  setPdfViewQuiz?: (quiz: SelectedQuizOption | null) => void;
  starredQuestions?: any;
  setStarredQuestions?: (fn: any) => void;
  [key: string]: unknown;
}

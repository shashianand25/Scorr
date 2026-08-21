import type React from "react";
import type { Animated } from "react-native";
import type { HomeScreenProps } from "./HomeScreenProps";

export interface QuizAnswer {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  type?: "multiple_choice" | "true_false" | string;
  answers: QuizAnswer[];
  imageUrl?: string;
  explanation?: string;
}

export interface ActiveQuizSession {
  quizId?: string;
  quizTitle: string;
  category?: string;
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<string, string[]>;
  submitted?: string[];
  isFinished?: boolean;
  isBattle?: boolean;
  isHost?: boolean;
  battleRoomCode?: string;
  startTime?: number;
  correctCount?: number;
  showAnswerOnSubmit?: boolean;
  timePerQuestion?: number | null;
  quizTimeLimit?: number | null;
  targetAttemptId?: string;
  retryOfAttemptNum?: number;
  attemptSaved?: boolean;
  selectionMode?: string;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  startedAt?: number;
  [key: string]: unknown;
}

export interface BattleRoomState {
  id?: string;
  hostScore?: number;
  guestScore?: number;
  hostName?: string | null;
  guestName?: string | null;
  hostFinished?: boolean;
  guestFinished?: boolean;
  hostTime?: number | null;
  guestTime?: number | null;
  status?: string;
  quizTitle?: string;
  [key: string]: unknown;
}

export interface InsetsPadding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * QuizSessionProps — dedicated prop surface for quiz session and results screens.
 * Structurally compatible with HomeScreenProps via the index signature.
 */
export interface QuizSessionProps {
  activeSession: ActiveQuizSession | null;
  setActiveSession: (session: ActiveQuizSession | null | ((prev: ActiveQuizSession | null) => ActiveQuizSession | null)) => void;
  settingsDarkMode: boolean;
  isConnected?: boolean;
  showReconnectedToast?: boolean;
  offlineModalParams?: unknown;
  battleRoomState?: BattleRoomState | null;
  firebaseUser?: { displayName?: string | null; email?: string | null; uid?: string } | null;
  sessionTimeLeft?: number | null;
  battleQuestionTimeLeft?: number | null;
  battleTimePerQuestion?: number | null;
  starredQuestions?: any;
  setStarredQuestions?: (fn: any) => void;
  showQuitConfirm?: boolean;
  setShowQuitConfirm?: (v: boolean) => void;
  showQuizSettingsModal?: boolean;
  setShowQuizSettingsModal?: (v: boolean) => void;
  autoSlideEnabled?: boolean;
  setAutoSlideEnabled?: (v: boolean) => void;
  showRestartConfirm?: boolean;
  setShowRestartConfirm?: (v: boolean) => void;
  jumpPage?: number;
  setJumpPage?: (v: number) => void;
  quizFlatListRef?: React.RefObject<any>;
  quizNumbersScrollRef?: React.RefObject<any>;
  handleTimerExpiredRef?: React.MutableRefObject<any>;
  handleCheckAnswer?: (questionId: string) => void;
  handleAnswerSelect?: (question: QuizQuestion, answerId: string) => void;
  handleNavigateSession?: (idx: number) => void;
  handleFinishSession?: () => void;
  saveAndExitQuizSession?: (force?: boolean) => void;
  toggleSpeech?: (text: string) => void;
  speakingText?: string | null;
  renderFormattedText?: (text: string) => React.ReactNode;
  screenFadeAnim?: Animated.Value;
  insets?: InsetsPadding;
  battleHistory?: unknown[];
  quizzes?: Array<{ id: string; title: string; questions?: number; questionsList?: QuizQuestion[] }>;
  isHost?: boolean;
  battleFinishedCalledRef?: React.MutableRefObject<boolean>;
  battleUnsubscribeRef?: React.MutableRefObject<any>;
  saveBattleResult?: (...args: any[]) => void;
  setBattlePopup?: (popup: unknown) => void;
  setBattleRoomCode?: (code: string) => void;
  setBattleRoomState?: (state: any) => void;
  setIsHost?: (isHost: boolean) => void;
  setJoinCodeInput?: (code: string) => void;
  setActiveTab?: (tab: string) => void;
  viewingReportCardData?: unknown;
  setViewingReportCardData?: (data: unknown) => void;
  showWrongReview?: boolean;
  setShowWrongReview?: (v: boolean) => void;
  snapshotReviewData?: unknown;
  setSnapshotReviewData?: (data: unknown) => void;
  selectedAttemptForModal?: unknown;
  setSelectedAttemptForModal?: (attempt: unknown) => void;
  triggerConfettiBurst?: () => void;
  expandedAttemptsMap?: Record<string, boolean>;
  setExpandedAttemptsMap?: (map: Record<string, boolean>) => void;
  reportCardQs?: unknown[];
  [key: string]: unknown;
}

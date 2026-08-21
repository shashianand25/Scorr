import type React from "react";
import type { Animated } from "react-native";

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

/** Base visual and environment props shared across all quiz session sub-views */
export interface BaseSessionProps {
  settingsDarkMode: boolean;
  insets?: InsetsPadding;
  screenFadeAnim?: Animated.Value;
  renderFormattedText?: (text: string) => React.ReactNode;
  toggleSpeech?: (text: string) => void;
  speakingText?: string | null;
  firebaseUser?: { displayName?: string | null; email?: string | null; uid?: string } | null;
  isConnected?: boolean;
}

/** Multiplayer battle session state and lifecycle handlers */
export interface BattleSessionProps {
  isHost?: boolean;
  battleRoomState?: BattleRoomState | null;
  battleHistory?: unknown[];
  battleQuestionTimeLeft?: number | null;
  battleTimePerQuestion?: number | null;
  battleFinishedCalledRef?: React.MutableRefObject<boolean>;
  battleUnsubscribeRef?: React.MutableRefObject<any>;
  saveBattleResult?: (...args: any[]) => void;
  setBattlePopup?: (popup: unknown) => void;
  setBattleRoomCode?: (code: string) => void;
  setBattleRoomState?: (state: any) => void;
  setIsHost?: (isHost: boolean) => void;
  setJoinCodeInput?: (code: string) => void;
  setActiveTab?: (tab: string) => void;
}

/** Post-quiz review, mistake analysis, and report card state */
export interface ReviewSessionProps {
  showWrongReview?: boolean;
  setShowWrongReview?: (v: boolean) => void;
  snapshotReviewData?: unknown;
  setSnapshotReviewData?: (data: unknown) => void;
  viewingReportCardData?: unknown;
  setViewingReportCardData?: (data: unknown) => void;
  selectedAttemptForModal?: unknown;
  setSelectedAttemptForModal?: (attempt: unknown) => void;
  reportCardQs?: unknown[];
  expandedAttemptsMap?: Record<string, boolean>;
  setExpandedAttemptsMap?: (map: Record<string, boolean>) => void;
}

/** Dedicated prop contract for ResultsScreen */
export interface ResultsScreenProps extends BaseSessionProps, BattleSessionProps, ReviewSessionProps {
  activeSession: ActiveQuizSession | null;
  setActiveSession: (session: ActiveQuizSession | null | ((prev: ActiveQuizSession | null) => ActiveQuizSession | null)) => void;
  quizzes?: Array<{ id: string; title: string; questions?: number; questionsList?: QuizQuestion[] }>;
  starredQuestions?: any;
  setStarredQuestions?: (fn: any) => void;
  saveAndExitQuizSession?: (force?: boolean) => void;
  handleFinishSession?: () => void;
  triggerConfettiBurst?: () => void;
}

/** Active interactive study screen props */
export interface ActiveSessionScreenProps extends BaseSessionProps {
  activeSession: ActiveQuizSession | null;
  setActiveSession: (session: ActiveQuizSession | null | ((prev: ActiveQuizSession | null) => ActiveQuizSession | null)) => void;
  sessionTimeLeft?: number | null;
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
}

/** Composite QuizSessionProps maintaining full backwards compatibility */
export interface QuizSessionProps extends ResultsScreenProps {
  sessionTimeLeft?: number | null;
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
  [key: string]: unknown;
}

/**
 * HomeScreenProps — typed prop surface for all screen and modal components
 * that receive state from HomeScreen via the `p` prop pattern.
 *
 * This replaces the `p: any` anti-pattern. Components should destructure
 * only the props they need from this interface.
 */

export interface HomeScreenProps {
  // ── Auth ──────────────────────────────────────────────────────────────────
  firebaseUser: any | null;
  showAuthScreen: boolean;
  setShowAuthScreen: (v: boolean) => void;
  authView: "landing" | "email";
  setAuthView: (v: "landing" | "email") => void;
  authMode: "signin" | "signup";
  setAuthMode: (v: "signin" | "signup") => void;
  signupStep: "form" | "otp";
  setSignupStep: (v: "signup" | "form" | "otp") => void;
  authEmail: string;
  setAuthEmail: (v: string) => void;
  authPassword: string;
  setAuthPassword: (v: string) => void;
  authName: string;
  setAuthName: (v: string) => void;
  authLoading: boolean;
  setAuthLoading: (v: boolean) => void;
  authError: string | null;
  setAuthError: (v: string | null) => void;
  showAuthPassword: boolean;
  setShowAuthPassword: (v: boolean) => void;
  otpCode: string;
  setOtpCode: (v: string) => void;
  otpResendCountdown: number;
  setOtpResendCountdown: (v: number) => void;

  // ── Navigation / Tabs ─────────────────────────────────────────────────────
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // ── Theme ─────────────────────────────────────────────────────────────────
  settingsDarkMode: boolean;

  // ── Quiz Data ─────────────────────────────────────────────────────────────
  quizzes: any[];
  setQuizzes: (fn: any[] | ((prev: any[]) => any[])) => void;
  dataLoaded: boolean;
  sampleQuiz: any | null;
  setSampleDismissed: (v: boolean) => void;
  starredQuestions: any;
  setStarredQuestions: (v: any) => void;
  savedSessions: any[];
  flashcardDecks: any[];
  setFlashcardDecks: (v: any) => void;
  flashcardFilter: string;
  showFlashcardOptions: any;
  setShowFlashcardOptions: (v: any) => void;

  // ── Quiz Session ──────────────────────────────────────────────────────────
  activeSession: any | null;
  setActiveSession: (v: any | null) => void;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showAnswerOnSubmit: boolean;
  autoSlideEnabled: boolean;
  selectionMode: string;
  randomCount: number;
  rangeStart: number;
  rangeEnd: number;
  sessionTimeLeft: number | null;
  quizFlatListRef: React.RefObject<any>;
  quizNumbersScrollRef: React.RefObject<any>;

  // ── AI Generation ─────────────────────────────────────────────────────────
  aiGenPhase: string | null;
  setAiGenPhase: (v: string | null) => void;
  appConfig: any | null;
  aiGenCharCount: number;
  aiGenConnectionLost: boolean;
  pendingAiFile: any | null;
  setPendingAiFile: (v: any) => void;

  // ── Network ───────────────────────────────────────────────────────────────
  isConnected: boolean;
  bottomToast: string | null;
  showReconnectedToast: boolean;

  // ── Battle ────────────────────────────────────────────────────────────────
  battlePopup: any | null;
  setBattlePopup: (v: any | null) => void;
  battleRoomState: any | null;
  battleCountdown: number | null;
  battleHistory: any[];
  setBattleHistory: (v: any[]) => void;
  battleRoomCode: string;
  setBattleRoomCode: (v: string) => void;

  // ── Modals ────────────────────────────────────────────────────────────────
  showQuizActions: any | null;
  setShowQuizActions: (v: any | null) => void;
  showResetConfirm: boolean;
  setShowResetConfirm: (v: boolean) => void;
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: (v: boolean) => void;
  showDeleteAccountConfirm: boolean;
  setShowDeleteAccountConfirm: (v: boolean) => void;
  showQuitConfirm: boolean;
  setShowQuitConfirm: (v: boolean) => void;
  offlineModalParams: any | null;
  setOfflineModalParams: (v: any | null) => void;
  showQuizSettingsModal: boolean;
  setShowQuizSettingsModal: (v: boolean) => void;
  showRestartConfirm: boolean;
  setShowRestartConfirm: (v: boolean) => void;
  selectedAttemptForModal: any | null;
  setSelectedAttemptForModal: (v: any | null) => void;
  showFeedbackPage: boolean;
  setShowFeedbackPage: (v: boolean) => void;
  showPrivacyPolicy: boolean;
  setShowPrivacyPolicy: (v: boolean) => void;
  showTermsOfService: boolean;
  setShowTermsOfService: (v: boolean) => void;
  showQuizCreatedModal: any | null;
  setShowQuizCreatedModal: (v: any | null) => void;
  showAddMenu: boolean;
  setShowAddMenu: (v: boolean) => void;
  showDeckReport: any | null;
  setShowDeckReport: (v: any | null) => void;
  showLanguageModal: boolean;
  setShowLanguageModal: (v: boolean) => void;

  // ── Handlers ─────────────────────────────────────────────────────────────
  handleStartQuiz: (quiz: any, options?: any) => void;
  handleOpenQuizOptions: (quiz: any) => void;
  handleShareQuiz: (quiz: any) => Promise<void>;
  handleDeleteQuizOnMobile: (quizId: string) => void;
  handleImportQst: (text: string, fileName: string, sourceUri?: string) => void;
  handleGenerateWithAI: (text: string, options?: any) => Promise<void>;
  handleFinishSession: () => void;
  handleCheckAnswer: (questionId: string) => void;
  handleAnswerSelect: (question: any, answerId: string) => void;
  handleNavigateSession: (idx: number) => void;
  handleSM2Rating: (rating: "again" | "hard" | "good" | "easy" | "perfect") => void;
  handleHostBattle: (quizId: string, source?: "lobby" | "insights") => void;
  handleStartBattle: () => Promise<void>;
  handleJoinBattle: () => Promise<void>;
  handleCancelAiGeneration: () => void;
  saveAndExitQuizSession: () => void;
  triggerConfettiBurst: () => void;

  // ── UI State ─────────────────────────────────────────────────────────────
  confettiParticles: any[];
  setConfettiParticles: (v: any[]) => void;
  screenFadeAnim: any;
  insets: { top: number; bottom: number; left: number; right: number };
  isRefreshing: boolean;
  signOutLoading: boolean;

  // ── Insights ─────────────────────────────────────────────────────────────
  viewingInsightsQuiz: any | null;
  setViewingInsightsQuiz: (v: any | null) => void;
  viewingInsightsDeck: any | null;
  viewingInsightsQuizFromTab: string;
  setViewingInsightsQuizFromTab: (v: string) => void;

  // Allow additional properties for backward compatibility during migration
  [key: string]: unknown;
}

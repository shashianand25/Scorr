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
  signupStep: "form" | "otp" | "details";
  setSignupStep: (v: "signup" | "form" | "otp" | "details") => void;
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
  setOtpResendCountdown: (v: number | ((prev: number) => number)) => void;

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
  bottomToast: { icon?: string; color?: string; message?: string } | null;
  bottomToastOpacity?: any;
  bottomToastTranslateY?: any;
  showReconnectedToast: boolean;
  syncToastMessage?: string | null;
  fileInputRef?: React.RefObject<HTMLInputElement>;

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
  setPdfViewQuiz?: (quiz: any | null) => void;
  setSelectedQuiz?: (quiz: any | null) => void;

  // ── Handlers ─────────────────────────────────────────────────────────────
  handleStartQuiz: (quiz: any, options?: any) => void;
  handleOpenQuizOptions: (quiz: any) => void;
  handleShareQuiz: (quiz: any) => Promise<void>;
  openAuthScreen?: () => void;
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
  saveAndExitQuizSession: (...args: any[]) => void;
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

  // ── Auth Handlers ─────────────────────────────────────────────────────────
  signInWithEmail?: (email: string, password: string) => Promise<any>;
  signInWithGoogle?: () => Promise<any>;
  signUpWithEmail?: (email: string, password: string, name: string) => Promise<any>;
  sendOtpEmail?: (email: string) => Promise<any>;
  verifyOtpCode?: (email: string, code: string) => Promise<any>;
  resetPassword?: (email: string) => Promise<any>;
  renderAuthScreen?: () => React.ReactNode;
  authViewAnim?: any;
  setOtpDevCode?: (v: string) => void;

  // ── Search ────────────────────────────────────────────────────────────────
  homeSearch?: string;
  setHomeSearch?: (v: string) => void;
  librarySearch?: string;
  setLibrarySearch?: (v: string) => void;

  // ── Quiz Helpers ──────────────────────────────────────────────────────────
  startStudy?: (quiz: any, preset?: string) => void;
  renderFormattedText?: (text: string, style?: any) => React.ReactNode;
  toggleSpeech?: (text: string) => void;
  speakingText?: string | null;
  jumpPage?: number;
  setJumpPage?: (v: number) => void;
  customToast?: any | null;
  setCustomToast?: (v: any | null) => void;

  // ── Flashcard / Insights ──────────────────────────────────────────────────
  fcIndex?: number;
  setFcIndex?: (v: number | ((prev: number) => number)) => void;
  fcFlipped?: boolean;
  setFcFlipped?: (v: boolean) => void;
  insightsFlipAnim?: any;
  insightsSwipeX?: any;
  insightsSwipeY?: any;
  insightsPanResponder?: any;
  buttonSlideX?: any;
  expandedAttemptsMap?: Record<string, boolean>;
  setExpandedAttemptsMap?: (v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  setStudyModeModalVisible?: (v: boolean) => void;
  deleteFlashcardDeck?: (deckId: string) => void;

  // ── Battle (extended) ─────────────────────────────────────────────────────
  setBattleRoomState?: (v: any | null) => void;
  setBattleError?: (v: string | null) => void;
  joinCodeInput?: string;
  setJoinCodeInput?: (v: string) => void;
  showBattleHistory?: boolean;
  setShowBattleHistory?: (v: boolean) => void;
  showBattleQuizSelector?: boolean;
  setShowBattleQuizSelector?: (v: boolean) => void;
  battleUnsubscribeRef?: React.RefObject<any>;
  pendingDeleteIdsRef?: React.RefObject<Set<string>>;

  // ── Quiz Rename / Delete modals ───────────────────────────────────────────
  renamingQuiz?: any | null;
  setRenamingQuiz?: (v: any | null) => void;
  deletingQuizConfirm?: any | null;
  setDeletingQuizConfirm?: (v: any | null) => void;
  renameTitle?: string;
  setRenameTitle?: (v: string) => void;

  // ── Account / Auth actions ────────────────────────────────────────────────
  handleLogout?: () => Promise<void>;
  deleteAccount?: () => Promise<void>;
  deleteAccountLoading?: boolean;
  setDeleteAccountLoading?: (v: boolean) => void;
  deleteUserFromNeon?: (uid?: string) => Promise<void>;

  // ── Feedback ──────────────────────────────────────────────────────────────
  feedbackText?: string;
  setFeedbackText?: (v: string) => void;
  feedbackLoading?: boolean;
  setFeedbackLoading?: (v: boolean) => void;
  sendFeedback?: (payload?: { userId?: any; userEmail?: any; message?: string }) => Promise<any>;

  // ── Import ────────────────────────────────────────────────────────────────
  isImporting?: boolean;
  importErrorDetails?: { title?: string; message?: string; details?: string } | null;
  setImportErrorDetails?: (v: { title?: string; message?: string; details?: string } | null) => void;

  // ── Neon / Remote sync ────────────────────────────────────────────────────
  updateMobileQuiz?: (payload: any) => Promise<void>;
  deleteMobileQuiz?: (uid: string, quizId: string) => Promise<void>;

  // ── History / Session ─────────────────────────────────────────────────────
  handleClearHistoryOnMobile?: (quizId: string) => void;

  // ── HomeLayout extra fields ───────────────────────────────────────────────
  battleShuffleQ?: boolean;
  setBattleShuffleQ?: (v: boolean) => void;
  battleShuffleA?: boolean;
  setBattleShuffleA?: (v: boolean) => void;
  battleError?: string | null;
  battleCreating?: boolean;
  studyModeModalVisible?: boolean;
  studyCardCount?: number;
  selectedStudyMode?: string | null;
  setSelectedStudyMode?: (v: string | null) => void;
  setStudyingDeck?: (v: any | null) => void;
  setStudyQueue?: (v: any[]) => void;
  setIsPreviewMode?: (v: boolean) => void;
  flipAnim?: any;
  swipeX?: any;
  setNoDueAtStart?: (v: boolean) => void;
  creationMode?: string | null;
  showWrongReview?: boolean;
  setShowWrongReview?: (v: boolean) => void;
  viewingReportCardData?: any | null;
  setViewingReportCardData?: (v: any | null) => void;
  reportCardQs?: any[];
  snapshotReviewData?: any | null;
  setSnapshotReviewData?: (v: any | null) => void;
  sampleDismissed?: boolean;
  showBattleOptions?: boolean;
  setShowBattleOptions?: (v: boolean) => void;
  battleOptionsQuiz?: any | null;
  battleSelectionMode?: string;
  setBattleSelectionMode?: (v: string) => void;
  battleRandomCount?: number;
  setBattleRandomCount?: (v: number) => void;
  battleRangeStart?: number;
  setBattleRangeStart?: (v: number) => void;
  battleRangeEnd?: number;
  setBattleRangeEnd?: (v: number) => void;
  battleTimePerQuestion?: number | null;
  setBattleTimePerQuestion?: (v: number | null) => void;
  aiConfig?: any | null;

  // Allow additional properties for backward compatibility during migration
  [key: string]: unknown;
}

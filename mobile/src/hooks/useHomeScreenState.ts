import React, { useState, useRef, useEffect } from "react";
import { Platform, Dimensions, Animated, KeyboardAvoidingView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { onAuth, signOutUser, type User } from "../lib/firebase";
import { fetchAppConfig, type AppConfig } from "../lib/api";
import { deduplicateUserQuizzes } from "../lib/quizDeduplication";
import { renderFormattedText } from "../utils/text";
import { logger } from "../lib/logger";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function useHomeScreenState() {
  const { t, i18n } = useTranslation();
  const [aiGenConnectionLost, setAiGenConnectionLost] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  const handleFinishSession = () => {
    if (!activeSession) return;
    setActiveSession((prev: any) => prev ? { ...prev, isFinished: true } : null);
  };

  const saveAndExitQuizSession = () => {
    setActiveSession(null);
    setActiveTab("home");
  };

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [savedAppLanguage, setSavedAppLanguage] = useState<string | null>(null);

  const storageKey = (type: "quizzes") => `quizforge_${type}_global`;

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [flashcardDecks, setFlashcardDecks] = useState<any[]>([]);
  const [flashcardFilter, setFlashcardFilter] = useState<"all"|"due"|"progress"|"mastered">("all");
  const [showFlashcardOptions, setShowFlashcardOptions] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const loadedUidRef = useRef<string | null | undefined>(undefined);
  const quizzesRef = useRef<any[]>([]);
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem("user-language").then(setSavedAppLanguage);
  }, []);

  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    fetchAppConfig().then(({ config, error }) => {
      if (config) {
        setAppConfig(config);
      } else {
        logger.warn("App Config", "Failed to load config from backend:", error);
      }
    });
  }, []);

  const insets = useSafeAreaInsets();

  const correctPlayer = useAudioPlayer(require("../../assets/sounds/correct.mp3"));
  const wrongPlayer = useAudioPlayer(require("../../assets/sounds/wrong.mp3"));
  const successPlayer = useAudioPlayer(require("../../assets/sounds/success.mp3"));
  const tickingPlayer = useAudioPlayer(require("../../assets/sounds/ticking.mp3"));

  const [battlePopup, setBattlePopup] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<any>("home");
  const [battleRoomCode, setBattleRoomCode] = useState("");
  const [battleRoomState, setBattleRoomState] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [battleError, setBattleError] = useState("");
  const [showBattleQuizSelector, setShowBattleQuizSelector] = useState(false);
  const [showBattleOptions, setShowBattleOptions] = useState(false);
  const [battleOptionsQuiz, setBattleOptionsQuiz] = useState<any>(null);
  const [battleShuffleQ, setBattleShuffleQ] = useState(false);
  const [battleShuffleA, setBattleShuffleA] = useState(false);
  const [battleRandomCount, setBattleRandomCount] = useState(10);
  const [battleSelectionMode, setBattleSelectionMode] = useState<"all" | "random" | "range">("all");
  const [battleRangeStart, setBattleRangeStart] = useState<number>(1);
  const [battleRangeEnd, setBattleRangeEnd] = useState<number>(5);
  const [showBattleHistory, setShowBattleHistory] = useState(false);
  const [battleHistory, setBattleHistory] = useState<any[]>([]);
  const [battleConnError, setBattleConnError] = useState("");
  const [battleCreating, setBattleCreating] = useState(false);
  const [battleTimePerQuestion, setBattleTimePerQuestion] = useState<number | null>(null);
  const [battleCountdown, setBattleCountdown] = useState<number | null>(null);
  const battleUnsubscribeRef = useRef<any>(null);

  const [settingsDarkMode, setSettingsDarkMode] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [offlineModalParams, setOfflineModalParams] = useState<any>(null);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [customToast, setCustomToast] = useState<any>(null);
  const [bottomToast, setBottomToast] = useState<string | null>(null);
  const bottomToastOpacity = useRef(new Animated.Value(0)).current;
  const bottomToastTranslateY = useRef(new Animated.Value(20)).current;
  const [confettiParticles, setConfettiParticles] = useState<any[]>([]);
  const screenFadeAnim = useRef(new Animated.Value(1)).current;

  const [homeSearch, setHomeSearch] = useState("");
  const [homeFilter, setHomeFilter] = useState("all");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryTab, setLibraryTab] = useState<"quizzes" | "flashcards">("quizzes");
  const [sampleQuiz, setSampleQuiz] = useState<any>(null);
  const [sampleDismissed, setSampleDismissed] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [pdfViewQuiz, setPdfViewQuiz] = useState<any>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<any>(null);
  const [aiGenPhase, setAiGenPhase] = useState<string | null>(null);

  const [studyingDeck, setStudyingDeck] = useState<any>(null);
  const [studyQueue, setStudyQueue] = useState<any[]>([]);
  const [fcIndex, setFcIndex] = useState(0);
  const fcIndexRef = useRef(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcStarredIds, setFcStarredIds] = useState<Set<string>>(new Set());
  const previewSourceDeckRef = useRef<any>(null);

  const [viewingInsightsQuiz, setViewingInsightsQuiz] = useState<any>(null);
  const [viewingInsightsDeck, setViewingInsightsDeck] = useState<any>(null);
  const [viewingInsightsQuizFromTab, setViewingInsightsQuizFromTab] = useState<string>("home");

  const [starredQuestions, setStarredQuestions] = useState<Set<string>>(new Set());
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showQuizSettingsModal, setShowQuizSettingsModal] = useState(false);
  const [autoSlideEnabled, setAutoSlideEnabled] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"all" | "random" | "range">("all");
  const [randomCount, setRandomCount] = useState(10);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(5);
  const [shuffleQuestions, setShuffleQuestionsRaw] = useState(false);
  const [shuffleAnswers, setShuffleAnswersRaw] = useState(false);
  const [showAnswerOnSubmit, setShowAnswerOnSubmitRaw] = useState(true);
  const [quizTimeLimit, setQuizTimeLimit] = useState<number | null>(null);
  const [quizPerQuestionTimer, setQuizPerQuestionTimer] = useState<number | null>(null);
  const [timeLimitText, setTimeLimitText] = useState("No limit");
  const [showTimeLimitDropdown, setShowTimeLimitDropdown] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [battleQuestionTimeLeft, setBattleQuestionTimeLeft] = useState<number | null>(null);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [selectedAttemptForModal, setSelectedAttemptForModal] = useState<any>(null);
  const [jumpPage, setJumpPage] = useState(0);
  const quizFlatListRef = useRef<any>(null);
  const quizNumbersScrollRef = useRef<any>(null);
  const handleTimerExpiredRef = useRef<() => void>(() => {});

  const [showQuizActions, setShowQuizActions] = useState<any>(null);
  const [renamingQuiz, setRenamingQuiz] = useState<any>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [importErrorDetails, setImportErrorDetails] = useState<any>(null);
  const [deletingQuizConfirm, setDeletingQuizConfirm] = useState<any>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<any>(null);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showFeedbackPage, setShowFeedbackPage] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showQuizCreatedModal, setShowQuizCreatedModal] = useState(false);
  const [showWrongReview, setShowWrongReview] = useState(false);
  const [snapshotReviewData, setSnapshotReviewData] = useState<any>(null);
  const [viewingReportCardData, setViewingReportCardData] = useState<any>(null);
  const [reportCardQs, setReportCardQs] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuth((u) => setFirebaseUser(u));
    return () => unsub();
  }, []);

  const showBottomPillToast = (msg: string) => {
    setBottomToast(msg);
    Animated.sequence([
      Animated.timing(bottomToastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(bottomToastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const triggerConfettiBurst = () => {};
  const handlePullRefresh = async () => {};
  const handleCancelAiGeneration = () => {};
  const handleRequestCancelGeneration = () => {};

  const p: any = {
    activeTab, setActiveTab,
    settingsDarkMode, setSettingsDarkMode,
    firebaseUser, showAuthScreen, setShowAuthScreen,
    authLoading, setAuthLoading, signOutLoading, setSignOutLoading,
    authError, setAuthError,
    isConnected, offlineModalParams, setOfflineModalParams,
    syncToastMessage, setSyncToastMessage,
    customToast, setCustomToast,
    bottomToast, bottomToastOpacity, bottomToastTranslateY, showBottomPillToast,
    confettiParticles, setConfettiParticles, triggerConfettiBurst,
    insets,
    homeSearch, setHomeSearch,
    homeFilter, setHomeFilter,
    librarySearch, setLibrarySearch,
    libraryTab, setLibraryTab,
    flashcardFilter, setFlashcardFilter,
    appConfig, setAppConfig,
    openAuthScreen: () => setShowAuthScreen(true),
    handleSignOut: async () => { setSignOutLoading(true); await signOutUser(); setSignOutLoading(false); },
    deleteQuiz: (id: string) => { setQuizzes((prev: any[]) => prev.filter((q: any) => q.id !== id)); },
    renameQuiz: (id: string, newTitle: string) => { setQuizzes((prev: any[]) => prev.map((q: any) => q.id === id ? { ...q, title: newTitle } : q)); },
    startStudy: (deckOrQuiz: any) => { setStudyingDeck(deckOrQuiz); setActiveTab("flashcards"); },
    deleteFlashcardDeck: (id: string) => { setFlashcardDecks((prev: any[]) => prev.filter((d: any) => d.id !== id)); },
    saveBattleResult: async () => {},
    handleCreateBattle: async () => {},
    renderFormattedText,
    screenFadeAnim,
    showReconnectedToast: false,
    insightsPanResponder: { panHandlers: {} },
    insightsSwipeX: new Animated.Value(0),
    insightsSwipeY: new Animated.Value(0),
    insightsFlipAnim: new Animated.Value(0),
    buttonSlideX: new Animated.Value(0),
    toggleSpeech: () => {},
    speakingText: null,
    fcFlipped, setFcFlipped,
    fcStarredIds, setFcStarredIds,
    fcIndexRef,
    previewSourceDeckRef,
    battleFinishedCalledRef: { current: false },
    noDueAtStart: false, setNoDueAtStart: () => {},
    sessionRatings: { again: 0, hard: 0, good: 0, perfect: 0 },
    studyQueueTotal: 0, setStudyQueueTotal: () => {},
    studyTypedAnswer: "", setStudyTypedAnswer: () => {},
    studyChecked: false, setStudyChecked: () => {},
    selectedRating: null,
    cardType: "Basic", setCardType: () => {},
    fcCategory: "General", setFcCategory: () => {},
    deckNameInput: "", setDeckNameInput: () => {},
    nameDeckAction: "create", setNameDeckAction: () => {},
    showNameDeckModal: false, setShowNameDeckModal: () => {},
    showEllipsisMenu: false, setShowEllipsisMenu: () => {},
    showPreviewModal: false, setShowPreviewModal: () => {},
    updateDraftOptionText: () => {},
    deleteDraftOption: () => {},
    addDraftOption: () => {},
    handleDraftBack: () => {},
    updateDraftPrompt: () => {},
    selectDraftOptionCorrect: () => {},
    handleProceedToDrafting: () => {},
    handleSaveDraftedQuiz: () => {},
    authEmail: "", setAuthEmail: () => {},
    authPassword: "", setAuthPassword: () => {},
    authMode: "signin", setAuthMode: () => {},
    signupStep: "details", setSignupStep: () => {},
    otpCode: "", setOtpCode: () => {},
    otpResendCountdown: 0, setOtpResendCountdown: () => {},
    otpDevCode: null, setOtpDevCode: () => {},
    authViewAnim: new Animated.Value(0),
    showAuthPassword: false, setShowAuthPassword: () => {},
    sendOtpEmail: async () => {},
    verifyOtpCode: async () => false,
    signUpWithEmail: async () => {},
    signInWithEmail: async () => {},
    resetPassword: async () => {},
    questionCount: 5,
    quizPreset: "all",
    wrongCount: 0,
    setQuizSetupStep: () => {},
    expandedAttemptsMap: {}, setExpandedAttemptsMap: () => {},
    pendingDeleteIdsRef,
    loadedUidRef,
    quizzesRef,
    quizzes, setQuizzes, flashcardDecks, setFlashcardDecks,
    sampleQuiz, setSampleQuiz, sampleDismissed, setSampleDismissed,
    selectedQuiz, setSelectedQuiz, pdfViewQuiz, setPdfViewQuiz,
    creationMode: "pick", setCreationMode: () => {}, creationStep: 1, setCreationStep: () => {},
    newTitle: "", setNewTitle: () => {}, newQuestionsCount: 5, setNewQuestionsCount: () => {},
    newQuizLanguage: "English", setNewQuizLanguage: () => {}, draftQuestions: [], setDraftQuestions: () => {},
    draftCurrentIndex: 0, setDraftCurrentIndex: () => {}, showAddMenu, setShowAddMenu,
    isImporting, setIsImporting, pendingAiFile: null, setPendingAiFile: () => {},
    fileInputRef,
    aiGenPhase, setAiGenPhase, aiGenCharCount: 0,
    aiGenConnectionLost, setAiGenConnectionLost,
    handleCancelAiGeneration, handleRequestCancelGeneration,
    studyingDeck, setStudyingDeck, studyQueue, setStudyQueue,
    isPreviewMode: false, setIsPreviewMode: () => {}, fcIndex, setFcIndex,
    fcCards: [], setFcCards: () => {}, fcCurrentIdx: 0, setFcCurrentIdx: () => {},
    fcTitle: "", setFcTitle: () => {}, editingDeckId: null, setEditingDeckId: () => {},
    flipAnim: new Animated.Value(0), swipeX: new Animated.Value(0), studyTiltAnim: new Animated.Value(0),
    studyFlipped: false, setStudyFlipped: () => {},
    viewingInsightsQuiz, setViewingInsightsQuiz,
    viewingInsightsDeck, setViewingInsightsDeck,
    viewingInsightsQuizFromTab, setViewingInsightsQuizFromTab,
    studyModeModalVisible: false, setStudyModeModalVisible: () => {},
    studyCardCount: "auto", setStudyCardCount: () => {},
    selectedStudyMode: "spaced", setSelectedStudyMode: () => {},
    battleRoomCode, setBattleRoomCode,
    battleRoomState, setBattleRoomState,
    isHost, setIsHost,
    joinCodeInput, setJoinCodeInput,
    battleError, setBattleError,
    showBattleQuizSelector, setShowBattleQuizSelector,
    showBattleOptions, setShowBattleOptions,
    battleOptionsQuiz, setBattleOptionsQuiz,
    battleShuffleQ, setBattleShuffleQ,
    battleShuffleA, setBattleShuffleA,
    battleRandomCount, setBattleRandomCount,
    battleSelectionMode, setBattleSelectionMode,
    battleRangeStart, setBattleRangeStart,
    battleRangeEnd, setBattleRangeEnd,
    showBattleHistory, setShowBattleHistory,
    battleHistory, setBattleHistory,
    battleConnError, setBattleConnError,
    battleCreating, setBattleCreating,
    battleTimePerQuestion, setBattleTimePerQuestion,
    battleCountdown, setBattleCountdown,
    battlePopup, setBattlePopup,
    battleUnsubscribeRef,
    activeSession, setActiveSession,
    starredQuestions, setStarredQuestions,
    showQuitConfirm, setShowQuitConfirm,
    showRestartConfirm, setShowRestartConfirm,
    showQuizSettingsModal, setShowQuizSettingsModal,
    autoSlideEnabled, setAutoSlideEnabled,
    selectionMode, setSelectionMode,
    randomCount, setRandomCount,
    rangeStart, setRangeStart,
    rangeEnd, setRangeEnd,
    shuffleQuestions, setShuffleQuestions: setShuffleQuestionsRaw,
    shuffleAnswers, setShuffleAnswers: setShuffleAnswersRaw,
    showAnswerOnSubmit, setShowAnswerOnSubmit: setShowAnswerOnSubmitRaw,
    quizTimeLimit, setQuizTimeLimit,
    quizPerQuestionTimer, setQuizPerQuestionTimer,
    timeLimitText, setTimeLimitText,
    showTimeLimitDropdown, setShowTimeLimitDropdown,
    sessionTimeLeft, setSessionTimeLeft,
    battleQuestionTimeLeft, setBattleQuestionTimeLeft,
    savedSessions, setSavedSessions,
    selectedAttemptForModal, setSelectedAttemptForModal,
    jumpPage, setJumpPage,
    quizFlatListRef, quizNumbersScrollRef, handleTimerExpiredRef,
    showQuizActions, setShowQuizActions,
    renamingQuiz, setRenamingQuiz, renameTitle, setRenameTitle,
    importErrorDetails, setImportErrorDetails,
    deletingQuizConfirm, setDeletingQuizConfirm,
    showResetConfirm, setShowResetConfirm,
    showDeleteAccountConfirm, setShowDeleteAccountConfirm,
    showLogoutConfirm, setShowLogoutConfirm,
    deleteAccountLoading, setDeleteAccountLoading,
    showFeedbackPage, setShowFeedbackPage,
    feedbackText, setFeedbackText, feedbackLoading, setFeedbackLoading,
    showPrivacyPolicy, setShowPrivacyPolicy,
    showTermsOfService, setShowTermsOfService,
    showQuizCreatedModal, setShowQuizCreatedModal,
    showWrongReview, setShowWrongReview,
    snapshotReviewData, setSnapshotReviewData,
    viewingReportCardData, setViewingReportCardData,
    reportCardQs,
    showDeckReport: null, setShowDeckReport: () => {},
    showFlashcardOptions, setShowFlashcardOptions,
    showLanguageModal, setShowLanguageModal,
    savedAppLanguage, setSavedAppLanguage,
    languageSearch, setLanguageSearch,
    handleStartQuiz: () => {},
    handleDeleteAttemptOnMobile: () => {},
    handleClearHistoryOnMobile: () => {},
    handleDeleteQuizOnMobile: () => {},
    handleCheckAnswer: () => {},
    handleAnswerSelect: () => {},
    handleNavigateSession: () => {},
    handleFinishSession,
    saveAndExitQuizSession,
    handleImportQst: () => {},
    handleOpenQuizOptions: () => {},
    handleShareQuiz: async () => {},
    handleGenerateWithAI: async () => {},
    handleSM2Rating: () => {},
    handleHostBattle: () => {},
    handleStartBattle: async () => {},
    handleJoinBattle: async () => {},
    handlePullRefresh,
  };

  return p;
}

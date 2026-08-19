import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
  TextInput,
  Linking,
  Animated,
  Easing,
  ActivityIndicator,
  PanResponder,
  KeyboardAvoidingView,
  Keyboard,
  BackHandler,
  FlatList,
  Share,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import { CustomChartIcon } from "../components/ui/CustomChartIcon";

import { GestureHandlerRootView, FlingGestureHandler, Directions, State } from "react-native-gesture-handler";
import YoutubeIframe from "react-native-youtube-iframe";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from '@react-native-masked-view/masked-view';
import { Buffer } from "buffer";
import * as mammoth from "mammoth/mammoth.browser.js";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser, onAuth, deleteAccount, resetPassword, type User } from "../lib/firebase";
import * as Sentry from "@sentry/react-native";
import { identifyUser, clearUser, trackQuizStarted, trackQuizCompleted, trackAiGenerationStarted, trackAiGenerationSucceeded, trackAiGenerationFailed, trackQuizCreated, trackBattleStarted, trackBattleCompleted, trackShareLinkTapped } from "../lib/analytics";
import { syncUserToNeon, fetchMobileQuizzes, createMobileQuiz, updateMobileQuiz, deleteMobileQuiz, deleteUserFromNeon, sendFeedback, saveBattleHistory, fetchBattleHistory, parsePdfFromBackend, parsePptFromBackend, fetchGeminiKey, fetchAppConfig, fetchSharedQuiz, checkAiDailyLimit, checkMasterQuizCache, saveMasterQuiz, sendOtpEmail, verifyOtpCode, type AppConfig } from "../lib/api";
import { computeContentHash } from "../lib/contentHash";
import { computeQuizFingerprint } from "../lib/quizFingerprint";
import { deduplicateUserQuizzes, mergeQuizPersonalState } from "../lib/quizDeduplication";
import { getUserErrorMessage } from "../utils/errors";
import { createBattleRoom, joinBattleRoom, updateBattleScore, finishBattle, markPlayerFinished, listenToBattleRoom, getBattleRoom, type BattleRoom } from "../lib/multiplayer";
import NetInfo from "@react-native-community/netinfo";
// expo-speech requires a native rebuild — guarded so app doesn't crash before rebuild
const Speech = (() => {
  try {
    return require("expo-speech");
  } catch {
    return { speak: () => {}, stop: () => {} };
  }
})();
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { questionsToSourceText, renderFormattedText, parseQstText } from "../utils/text";
import { useTranslation } from "react-i18next";
import "../lib/i18n";
import { SAMPLE_QUIZ, APP_LANGUAGES } from "../constants/sample-quiz";
import { generateMockQuestionsForQuiz, getCategoryIconDetails } from "../utils/quiz";
import { getUserFirstName, getUserFullName, getUserInitial } from "../utils/user";
import { Scheduler, CardState } from "../utils/sm2";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
import { Stepper } from "../components/ui/Stepper";
import { BattleTimer } from "../components/ui/BattleTimer";
import { renderCategoryAvatar } from "../components/layout/CategoryAvatar";
import { styles } from "../styles/shared";
import { AppModals } from "../components/modals/AppModals";
import { InsightsTabScreen, DeckInsightsTab } from "../screens/InsightsTabScreen";
import { ActiveSessionScreen, ResultsScreen } from "../screens/QuizSessionScreen";
import { BattleLobbyScreen } from "../screens/BattleScreen";
import { FlashcardsScreen } from "../screens/FlashcardScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { MainContentScreen } from "../screens/MainContentScreen";
import { AIGeneratingScreen, FullscreenBattleCountdown } from "../components/AIGeneratingScreen";
import { logger } from "../lib/logger";




// Get screen width/height for layout sizing
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const KeyboardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;

// NOTE: The prompt template is loaded exclusively from the backend via /api/app-config.
// If the config fetch fails, AI generation will throw a clear error rather than
// silently using a local prompt that diverges from the server format.

const handleModalCloseRequest = (closeAction: () => void) => {
  if (Keyboard.isVisible()) {
    Keyboard.dismiss();
  } else {
    closeAction();
  }
};

const STEPS = [
  { icon: "document-text-outline", label: "Reading your file" },
  { icon: "bulb-outline",          label: "Analysing content" },
  { icon: "create-outline",        label: "Writing questions" },
  { icon: "shuffle-outline",       label: "Shuffling answers" },
] as const;

// AIGeneratingScreen and FullscreenBattleCountdown are imported from ../components/AIGeneratingScreen


export default function HomeScreen() {
  const { t, i18n } = useTranslation();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const [savedAppLanguage, setSavedAppLanguage] = useState<string | null>(null);

  // ── Unified global storage key ────────────────
  const storageKey = (type: "quizzes") =>
    `quizforge_${type}_global`;

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [flashcardDecks, setFlashcardDecks] = useState<any[]>([]);
  const [flashcardFilter, setFlashcardFilter] = useState<"all"|"due"|"progress"|"mastered">("all");
  const [showFlashcardOptions, setShowFlashcardOptions] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Track which uid slot is currently loaded so we know when to switch
  const loadedUidRef = React.useRef<string | null | undefined>(undefined); // undefined = not loaded yet
  const quizzesRef = React.useRef<any[]>([]);
  // In-memory tombstone set — updated synchronously on every delete so that Neon re-syncs
  // (which happen whenever Firebase re-emits auth state, e.g. on network reconnect) can
  // never resurrect a quiz the user has already deleted.
  const pendingDeleteIdsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem("user-language").then(setSavedAppLanguage);
  }, []);

  useEffect(() => {
    fetchAppConfig().then(({ config, error }) => {
      if (config) {
        setAppConfig(config);
      } else {
        logger.warn("App Config",  Failed to load config from backend:", error);
      }
    });
  }, []);
  const insets = useSafeAreaInsets();


  const correctPlayer = useAudioPlayer(require("../../assets/sounds/correct.mp3"));
  const wrongPlayer = useAudioPlayer(require("../../assets/sounds/wrong.mp3"));
  const successPlayer = useAudioPlayer(require("../../assets/sounds/success.mp3"));
  const tickingPlayer = useAudioPlayer(require("../../assets/sounds/ticking.mp3"));

  const playCorrectSound = () => {
    try {
      correctPlayer.volume = 0.45; // Reduce correct chime volume to 45% (soft and pleasant)
      correctPlayer.seekTo(0);
      correctPlayer.play();
    } catch (error) {
      logger.warn("App", "Failed to play correct sound effect:", error);
    }
  };

  const playWrongSound = () => {
    try {
      wrongPlayer.volume = 0.3; // Subtle wrong-answer buzzer — quiet and non-distracting
      wrongPlayer.seekTo(0);
      wrongPlayer.play();
    } catch (error) {
      logger.warn("App", "Failed to play wrong sound effect:", error);
    }
  };

  const playSuccessSound = () => {
    try {
      successPlayer.seekTo(0);
      successPlayer.play();
      
      // Limit success noise playback to 3 seconds max
      setTimeout(() => {
        try {
          successPlayer.pause();
          successPlayer.seekTo(0);
        } catch (e) {
          // Already stopped
        }
      }, 3000);
    } catch (error) {
      logger.warn("App", "Failed to play success sound effect:", error);
    }
  };
  const [showLanding, setShowLanding] = useState(false);
  const [battlePopup, setBattlePopup] = useState<{myScore: number, opponentScore: number, opponentName: string, won: boolean, myTime?: number, opponentTime?: number} | null>(null);
  const battleConfettiFiredRef = useRef(false);

  // ── Suppress browser native blue focus ring globally on web ──
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const styleId = "__qf_no_outline";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = "textarea:focus,input:focus{outline:none!important;box-shadow:none!important;}";
      document.head.appendChild(s);
    }
  }

  // ── Firebase auth state listener — handles login, logout, account switch ──
  // ── Firebase auth listener → useAuth hook (src/hooks/useAuth.ts) ──


  // ── Pre-load quizzes instantly before Firebase initializes (offline-first) ──
  useEffect(() => {
    (async () => {
      try {
        const [qRaw, sRaw, dRaw, pendRaw] = await Promise.all([
          AsyncStorage.getItem(storageKey("quizzes")),
          AsyncStorage.getItem(`quizforge_starred_global`),
          AsyncStorage.getItem(`quizforge_flashcard_decks`),
          AsyncStorage.getItem("quizforge_pending_deletions"),
        ]);
        // Populate in-memory tombstone set from persisted list BEFORE loading quizzes,
        // so we can filter them out immediately.
        const tombstoneIds: Record<string, true> = {};
        if (pendRaw) {
          try {
            const ids: string[] = JSON.parse(pendRaw);
            ids.forEach(id => { tombstoneIds[id] = true; pendingDeleteIdsRef.current.add(id); });
          } catch {}
        }
        if (qRaw) {
          const parsed = JSON.parse(qRaw)
            .filter((q: any) => {
              // Strip tombstoned quizzes — they were deleted but AsyncStorage may still
              // have them if the app restarted before the persistence effect fired.
              if (tombstoneIds[q.id] || tombstoneIds[q.neonId]) return false;
              const qc = typeof q.questions === "number" ? q.questions : (q.questionsList?.length || 0);
              const cc = q.flashcards?.length || 0;
              return qc > 0 || cc > 0;
            });
          try {
            const { deduplicatedQuizzes, removedQuizIds, hasChanges } = await deduplicateUserQuizzes(parsed);
            if (hasChanges) {
              removedQuizIds.forEach(id => {
                tombstoneIds[id] = true;
                pendingDeleteIdsRef.current.add(id);
              });
              AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify(deduplicatedQuizzes)).catch(() => {});
            }
            setQuizzes(prev => prev.length === 0 ? deduplicatedQuizzes : prev);
          } catch {
            setQuizzes(prev => prev.length === 0 ? parsed : prev);
          }
        }
        if (sRaw) {
          setStarredQuestions(new Set(JSON.parse(sRaw)));
        }
        if (dRaw) {
          const parsed = JSON.parse(dRaw).filter((d: any) => d.cards && d.cards.length > 0);
          setFlashcardDecks(prev => prev.length === 0 ? parsed : prev);
        }
        setDataLoaded(true);
      } catch {
        setDataLoaded(true);
      }
    })();
  }, []);

  // ── Inject sample quiz on very first launch ───────────────────────────────
  useEffect(() => {
    if (!dataLoaded) return;
    (async () => {
      try {
        const already = await AsyncStorage.getItem("quizforge_sample_injected");
        if (already) return;
        // The sample quiz is always shown via the sampleQuiz state — don't add it to the
        // main quizzes array, otherwise it appears twice in combinedQuizzes.
        await AsyncStorage.setItem("quizforge_sample_injected", "1");
      } catch (e) {
        logger.warn("Sample",  inject failed:", e);
      }
    })();
  }, [dataLoaded]);

  // ── Quiz pre-load (offline-first) → useQuizData hook ──

  // ─────────────────────────────────────────────────────────────────



  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  
  const [activeTab, setActiveTab] = useState<"home" | "add" | "guide" | "menu" | "insights" | "battle" | "library" | "flashcards" | "insights-flashcard" | "bookmarked-questions">("home");
  const [battleRoomCode, setBattleRoomCode] = useState("");
  const [battleRoomState, setBattleRoomState] = useState<BattleRoom | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [battleError, setBattleError] = useState("");
  const [showBattleQuizSelector, setShowBattleQuizSelector] = useState(false);
  const [showBattleOptions, setShowBattleOptions] = useState(false);
  const [battleOptionsQuiz, setBattleOptionsQuiz] = useState<any>(null);
  const [battleOptionsSource, setBattleOptionsSource] = useState<"lobby" | "insights">("lobby");
  const [battleShuffleQ, setBattleShuffleQ] = useState(false);
  const [battleShuffleA, setBattleShuffleA] = useState(false);
  const [battleRandomCount, setBattleRandomCount] = useState(10);
  const [battleSelectionMode, setBattleSelectionMode] = useState<"all" | "random" | "range">("all");
  const [battleRangeStart, setBattleRangeStart] = useState<number>(1);
  const [battleRangeEnd, setBattleRangeEnd] = useState<number>(5);
  const [showBattleHistory, setShowBattleHistory] = useState(false);
  const [battleHistory, setBattleHistory] = useState<Array<{
    date: number;
    quizTitle: string;
    myScore: number;
    opponentScore: number;
    opponentName: string;
    won: boolean;
    myTime?: number;
    opponentTime?: number;
    roomCode?: string;
    questions?: any[];
    answers?: Record<string, string[]>;
  }>>([]);
  const [battleConnError, setBattleConnError] = useState("");
  const [battleCreating, setBattleCreating] = useState(false);
  const [battleTimePerQuestion, setBattleTimePerQuestion] = useState<number | null>(null); // null = no limit
  const [battleCountdown, setBattleCountdown] = useState<number | null>(null);
  const battleUnsubscribeRef = useRef<(() => void) | null>(null);
  const battleStartedRef = useRef(false);
  const battleFinishedCalledRef = useRef(false);

  useEffect(() => {
    return () => {
      if (battleUnsubscribeRef.current) {
        battleUnsubscribeRef.current();
      }
    };
  }, []);

  // ── Screen transition: fade-in whenever the active tab changes ──────────
  const isFirstRender = useRef(true);
  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    screenFadeAnim.setValue(0.3);
    Animated.timing(screenFadeAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [activeTab]);

  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [showWrongReview, setShowWrongReview] = useState<boolean>(false);
  const [snapshotReviewData, setSnapshotReviewData] = useState<any[]>([]);
  const [viewingReportCardData, setViewingReportCardData] = useState<{ attempt: any, quiz: any } | null>(null);
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [studyQueue, setStudyQueue] = useState<string[]>([]);
  const [aiGenPhase, setAiGenPhase] = useState<null | "select" | "generating">(null);

  const reportCardQs = useMemo(() => {
    const rcq: any[] = [];
    const sourceQuestions = viewingReportCardData ? viewingReportCardData.quiz.questionsList : activeSession?.questions;
    const sourceAnswers = viewingReportCardData ? viewingReportCardData.attempt.answers : activeSession?.answers;
    
    if (!sourceQuestions || !sourceAnswers) return rcq;
    
    const questionIdsInAttempt = viewingReportCardData ? viewingReportCardData.attempt.questionIds : null;

    sourceQuestions.forEach((q: any) => {
      if (questionIdsInAttempt && !questionIdsInAttempt.includes(q.id)) return;
      
      const selected = sourceAnswers[q.id] || [];
      const correctIds = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
      
      let status = "skipped";
      if (selected.length > 0) {
        const isAllCorrect = selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
        status = isAllCorrect ? "correct" : "wrong";
      }

      rcq.push({
        id: q.id,
        prompt: q.prompt,
        explanation: q.explanation,
        status,
        selectedTexts: q.answers.filter((a: any) => selected.includes(a.id)).map((a: any) => a.text),
        correctTexts: q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.text),
      });
    });
    return rcq;
  }, [viewingReportCardData, activeSession]);

  const [showQuizActions, setShowQuizActions] = useState<any | null>(null);
  const [renamingQuiz, setRenamingQuiz] = useState<any | null>(null);
  const [importErrorDetails, setImportErrorDetails] = useState<{ title: string; message: string; details?: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [deletingQuizConfirm, setDeletingQuizConfirm] = useState<any | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  // In-app modals (replaces Alert.alert)
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [savedSessions, setSavedSessions] = useState<Record<string, any>>({});
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showQuizSettingsModal, setShowQuizSettingsModal] = useState(false);
  const [autoSlideEnabled, setAutoSlideEnabledRaw] = useState(true);
  const [selectedAttemptForModal, setSelectedAttemptForModal] = useState<any | null>(null);
  const [expandedAttemptsMap, setExpandedAttemptsMap] = useState<Record<string, boolean>>({});
  const [starredQuestions, setStarredQuestions] = useState<Set<string>>(new Set());
  const [homeFilter, setHomeFilter] = useState<"all"|"progress"|"notstarted"|"done">("all");
  const [homeSearch, setHomeSearch] = useState("");
  const [libraryTab, setLibraryTab] = useState<"courses" | "uploads">("courses");
  const [librarySearch, setLibrarySearch] = useState("");
  const [jumpPage, setJumpPage] = useState(0);
  const [showFeedbackPage, setShowFeedbackPage] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showQuizCreatedModal, setShowQuizCreatedModal] = useState<{ title: string; count: number } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  // ── Firebase Auth ──
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const neonUserReadyRef = React.useRef<boolean>(false); // true once syncUserToNeon succeeds
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [pendingSharedQuizId, setPendingSharedQuizId] = useState<string | null>(null);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      if (url.includes('scorrapp.com/share/quiz/') || url.includes('scorr://share/quiz/') || url.includes('recall://share/quiz/')) {
        let splitString = 'recall://share/quiz/';
        if (url.includes('scorrapp.com/share/quiz/')) splitString = 'scorrapp.com/share/quiz/';
        else if (url.includes('scorr://share/quiz/')) splitString = 'scorr://share/quiz/';
        
        const id = url.split(splitString)[1]?.split('?')[0]?.split('/')[0];
        if (id) {
          setPendingSharedQuizId(id);
        }
      }
    };
    
    // Check if the deep-link screen stored a pending quiz ID (cold-start via App Link)
    AsyncStorage.getItem("pending_shared_quiz_id").then((id) => {
      if (id) {
        AsyncStorage.removeItem("pending_shared_quiz_id");
        setPendingSharedQuizId(id);
      }
    });

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => {
      subscription.remove();
    };
  }, []);

  const importingSharedQuizRef = React.useRef<string | null>(null);

  // ── Prefs + battle history load → useQuizSession/useBattle hooks ──


  // ── Bottom Capsule Toast (Pill) ──
  const [bottomToast, setBottomToast] = useState<{ message: string; icon?: any; color?: string } | null>(null);
  const bottomToastOpacity = useRef(new Animated.Value(0)).current;
  const bottomToastTranslateY = useRef(new Animated.Value(20)).current;
  const bottomToastTimeoutRef = useRef<any>(null);
  const lastBackPressTimeRef = useRef<number>(0);

  const showBottomPillToast = React.useCallback((message: string, options?: { icon?: any; color?: string; durationMs?: number }) => {
    const durationMs = options?.durationMs ?? 1800;
    if (bottomToastTimeoutRef.current) clearTimeout(bottomToastTimeoutRef.current);
    setBottomToast({
      message,
      icon: options?.icon ?? "sparkles",
      color: options?.color ?? "#38bdf8",
    });
    bottomToastOpacity.setValue(0);
    bottomToastTranslateY.setValue(20);

    Animated.parallel([
      Animated.timing(bottomToastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(bottomToastTranslateY, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();

    bottomToastTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(bottomToastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(bottomToastTranslateY, { toValue: 12, duration: 200, useNativeDriver: true }),
      ]).start(() => setBottomToast(null));
    }, durationMs);
  }, []);

  // ── Pull to Refresh ──
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const handlePullRefresh = React.useCallback(async () => {
    setPullRefreshing(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 800));
    try {
      const { config } = await fetchAppConfig();
      if (config) setAppConfig(config);

      if (firebaseUser && neonUserReadyRef.current) {
        const pendRaw = await AsyncStorage.getItem("quizforge_pending_deletions");
        const pendingIds: string[] = pendRaw ? JSON.parse(pendRaw) : [];
        const allTombstones = new Set([...pendingIds, ...pendingDeleteIdsRef.current]);

        const quizzesRes = await fetchMobileQuizzes(firebaseUser.uid);
        if (!quizzesRes.error && quizzesRes.quizzes) {
          const filteredFromDb = quizzesRes.quizzes.filter((q: any) => !allTombstones.has(q.id));
          if (filteredFromDb.length > 0) {
            const normalized = filteredFromDb.map((q: any) => {
              const localCopy = quizzesRef.current.find((l: any) => l.id === q.id || l.neonId === q.id);
              return {
                id: q.id,
                neonId: q.id,
                title: q.title,
                questions: q.questionCount,
                category: q.category,
                time: "Synced",
                questionsList: (() => {
                  if (localCopy?.questionsList?.length > 0) return localCopy.questionsList;
                  try {
                    const parsed = JSON.parse(q.sourceText);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                  } catch {}
                  try { return parseQstText(q.sourceText).questions; } catch { return []; }
                })(),
                flashcards: (() => {
                  if (localCopy?.flashcards?.length > 0) return localCopy.flashcards;
                  try { return parseQstText(q.sourceText).flashcards || []; } catch { return []; }
                })(),
                attempts: (() => {
                  const dbAttempts = q.attempts ?? [];
                  const locAttempts = localCopy?.attempts ?? [];
                  const attemptMap = new Map();
                  for (const a of dbAttempts) attemptMap.set(a.id, a);
                  for (const a of locAttempts) attemptMap.set(a.id, a);
                  return Array.from(attemptMap.values()).sort((a, b) => Number(b.id) - Number(a.id));
                })(),
                wrongQuestions: q.wrongQuestions ?? localCopy?.wrongQuestions ?? [],
                uniqueCorrectIds: q.uniqueCorrectIds ?? localCopy?.uniqueCorrectIds ?? [],
              };
            });

            const localOnly = quizzesRef.current.filter((l: any) => !allTombstones.has(l.id) && !filteredFromDb.some((dbQ: any) => dbQ.id === l.id || dbQ.id === l.neonId));
            const merged = [...normalized, ...localOnly];
            try {
              const { deduplicatedQuizzes, removedQuizIds, neonDeletions, hasChanges } = await deduplicateUserQuizzes(merged, { currentUserId: firebaseUser.uid });
              if (hasChanges) {
                removedQuizIds.forEach((id) => pendingDeleteIdsRef.current.add(id));
                for (const d of neonDeletions) {
                  deleteMobileQuiz(firebaseUser.uid, d.neonId).catch(() => {});
                }
              }
              setQuizzes(deduplicatedQuizzes);
              AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify(deduplicatedQuizzes)).catch(() => {});
            } catch {
              setQuizzes(merged);
              AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify(merged)).catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      logger.warn("PullRefresh",  failed:", err);
    } finally {
      await minDelay;
      setPullRefreshing(false);
      showBottomPillToast("Updated just now ✨");
    }
  }, [firebaseUser, showBottomPillToast]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [hasSeenLogin, setHasSeenLogin] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  // ── Network State ──
  const [offlineModalParams, setOfflineModalParams] = useState<{ title: string; message: string; buttons?: { text: string; onPress: () => void; isPrimary?: boolean }[] } | null>(null);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [customToast, setCustomToast] = useState<{ message: string, icon: any, color: string } | null>(null);

  useEffect(() => {
    NetInfo.configure({
      reachabilityUrl: 'https://clients3.google.com/generate_204',
      reachabilityTest: async (response) => response.status === 204 || response.status === 200,
      reachabilityLongTimeout: 8 * 1000,
      reachabilityShortTimeout: 2 * 1000,
      reachabilityRequestTimeout: 2500,
      shouldFetchWiFiSSID: false,
    });

    const unsubscribe = NetInfo.addEventListener(state => {
      // isConnected is true for local wifi without WAN; isInternetReachable === false means no actual internet
      const reachable = state.isConnected === true && state.isInternetReachable !== false;
      setIsConnected(reachable);
    });
    return () => unsubscribe();
  }, []);
  const [settingsDarkMode, setSettingsDarkMode] = useState<boolean>(true);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [pdfViewQuiz, setPdfViewQuiz] = useState<any | null>(null);
  const [selectionMode, setSelectionMode] = useState<"all" | "random" | "range" | "unanswered" | "wrong">("all");
  const [randomCount, setRandomCount] = useState<number>(5);
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(5);
  const [shuffleQuestions, setShuffleQuestionsRaw] = useState<boolean>(false);
  const [shuffleAnswers, setShuffleAnswersRaw] = useState<boolean>(true);
  const [showAnswerOnSubmit, setShowAnswerOnSubmitRaw] = useState<boolean>(true);
  const [quizTimeLimit, setQuizTimeLimit] = useState<number | null>(null);
  const [quizPerQuestionTimer, setQuizPerQuestionTimer] = useState<number | null>(null);
  const [timeLimitText, setTimeLimitText] = useState(""); // local text state — avoids re-render flicker while typing
  const [showTimeLimitDropdown, setShowTimeLimitDropdown] = useState(false);


  const [sampleDismissed, setSampleDismissed] = useState<boolean>(false);
  const [sampleQuiz, setSampleQuiz] = useState<any>(SAMPLE_QUIZ);

  // Load sample quiz state
  useEffect(() => {
    AsyncStorage.getItem("quizforge_sample_dismissed").then(val => {
      if (val === "1") setSampleDismissed(true);
    });
    AsyncStorage.getItem("quizforge_sample_data").then(val => {
      if (val) {
        try { setSampleQuiz(JSON.parse(val)); } catch {}
      }
    });
  }, []);

  const setShuffleQuestions = (val: boolean) => {
    setShuffleQuestionsRaw(val);
    AsyncStorage.setItem("pref_shuffleQuestions", val ? "1" : "0");
  };
  const setShuffleAnswers = (val: boolean) => {
    setShuffleAnswersRaw(val);
    AsyncStorage.setItem("pref_shuffleAnswers", val ? "1" : "0");
  };
  const setShowAnswerOnSubmit = (val: boolean) => {
    setShowAnswerOnSubmitRaw(val);
    AsyncStorage.setItem("pref_showAnswerOnSubmit", val ? "1" : "0");
  };
  const setAutoSlideEnabled = (val: boolean) => {
    setAutoSlideEnabledRaw(val);
    AsyncStorage.setItem("pref_autoSlideEnabled", val ? "1" : "0");
  };

  const activeSessionRef = React.useRef<any>(null);
  React.useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(0);
  const [battleQuestionTimeLeft, setBattleQuestionTimeLeft] = useState<number>(0); // per-question countdown in battle
  const [viewingInsightsQuiz, setViewingInsightsQuiz] = useState<any | null>(null);
  const viewingInsightsQuizRef = useRef<any>(null);
  const [fcIndex, setFcIndex] = useState(0);
  const fcIndexRef = useRef(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcStarredIds, setFcStarredIds] = useState<Set<number>>(new Set());
  const [viewingInsightsDeck, setViewingInsightsDeck] = useState<any | null>(null);
  const [viewingInsightsQuizFromTab, setViewingInsightsQuizFromTab] = useState<string>("home");
  const [qQuery, setQQuery] = useState("");
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const fileInputRef = React.useRef<any>(null);
  const quizFlatListRef = React.useRef<any>(null);
  const quizNumbersScrollRef = React.useRef<ScrollView>(null);
  const [confettiParticles, setConfettiParticles] = useState<any[]>([]);
  const [studyingDeck, setStudyingDeck] = useState<any | null>(null);
  const previewSourceDeckRef = useRef<any | null>(null);
  
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const toggleSpeech = (text: string) => {
    if (speakingText === text) {
      Speech.stop();
      setSpeakingText(null);
    } else {
      Speech.stop();
      setSpeakingText(text);
      Speech.speak(text, {
        rate: 0.9,
        pitch: 1.0,
        onDone: () => setSpeakingText(null),
        onStopped: () => setSpeakingText(null),
        onError: () => setSpeakingText(null),
      });
    }
  };

  useEffect(() => {
    if (speakingText) {
      Speech.stop();
      setSpeakingText(null);
    }
  }, [fcIndex, studyQueue, activeTab, studyingDeck]);

  const [showReconnectedToast, setShowReconnectedToast] = useState(false);
  const disconnectTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isConnected && activeSession?.isBattle) {
      if (!disconnectTimerRef.current) {
        disconnectTimerRef.current = setTimeout(() => {
          setOfflineModalParams({
            title: "Battle Disconnected",
            message: "We couldn't reconnect to the battle.",
            buttons: [
              { text: "Leave Battle", onPress: () => { handleFinishSession(); } },
              { text: "Try Again", onPress: () => {}, isPrimary: true }
            ]
          });
        }, 15000);
      }
    } else {
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
        if (activeSession?.isBattle) {
          setShowReconnectedToast(true);
          setTimeout(() => setShowReconnectedToast(false), 3000);
        }
      }
    }
  }, [isConnected, activeSession?.isBattle]);

  // ── Fallback: Poll battle room if stuck waiting ──
  useEffect(() => {
    if (activeSession?.isBattle && activeSession.isFinished && battleRoomState) {
      const opponentFinished = activeSession.isHost ? battleRoomState.guestFinished : battleRoomState.hostFinished;
      if (!opponentFinished) {
        const interval = setInterval(() => {
          getBattleRoom(battleRoomState.id).then(data => {
            if (data) setBattleRoomState(data);
          }).catch(() => {});
        }, 3000);
        return () => clearInterval(interval);
      }
    }
  }, [activeSession?.isBattle, activeSession?.isFinished, activeSession?.isHost, battleRoomState?.id, battleRoomState?.hostFinished, battleRoomState?.guestFinished]);

  // ── AI Generation Cancellation Controls ──
  const aiGenAbortControllerRef = useRef<AbortController | null>(null);
  const aiGenCancelledRef = useRef<boolean>(false);

  const handleCancelAiGeneration = React.useCallback(() => {
    aiGenCancelledRef.current = true;
    if (aiGenAbortControllerRef.current) {
      try {
        aiGenAbortControllerRef.current.abort();
      } catch {}
      aiGenAbortControllerRef.current = null;
    }
    setAiGenPhase(null);
    setAiGenConnectionLost(false);
    showBottomPillToast(t('generation.generation_cancelled') || "Generation cancelled", {
      icon: "close-circle",
      color: "#ef4444",
      durationMs: 2500,
    });
  }, [showBottomPillToast, t]);

  const handleRequestCancelGeneration = React.useCallback(() => {
    Alert.alert(
      t('generation.cancel_title') || "Cancel Generation?",
      t('generation.cancel_desc') || "Are you sure you want to stop generating questions?",
      [
        {
          text: t('generation.keep_waiting') || "Keep Waiting",
          style: "cancel",
        },
        {
          text: t('generation.stop_generation') || "Cancel Generation",
          style: "destructive",
          onPress: () => {
            handleCancelAiGeneration();
          },
        },
      ]
    );
  }, [handleCancelAiGeneration, t]);

  // ── Hardware Back Button Handling ──
  useEffect(() => {
    const onBackPress = () => {
      if (aiGenPhase === "generating") {
        return true;
      }
      if (activeSession) {
        if (activeSession.isFinished) {
          // Results page — back saves progress and goes straight to home
          saveAndExitQuizSession();
        } else {
          setShowQuitConfirm(true);
        }
        return true;
      }
      if (activeTab === "insights-flashcard") {
        setActiveTab("insights");
        return true;
      }
      if (activeTab === "flashcards" as any) {
        if (studyingDeck && viewingInsightsQuiz) {
          setStudyingDeck(null);
          setActiveTab("insights");
          return true;
        } else if (studyingDeck) {
          setStudyingDeck(null);
          return true;
        } else {
          setActiveTab("insights");
          return true;
        }
      }
      if (activeTab === "bookmarked-questions") {
        setActiveTab("insights");
        return true;
      }
      if (activeTab === "insights") {
        setActiveTab(viewingInsightsQuizFromTab as any || "home");
        return true;
      }
      if (activeTab === "home") {
        const now = Date.now();
        if (now - lastBackPressTimeRef.current < 2000) {
          BackHandler.exitApp();
          return true;
        }
        lastBackPressTimeRef.current = now;
        showBottomPillToast(t('common.press_back_again') || "Press back again to exit", {
          icon: "log-out-outline",
          color: "#94a3b8",
          durationMs: 2000,
        });
        return true;
      }
      // On any other tab/page
      setActiveTab("home");
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeSession, studyingDeck, activeTab, viewingInsightsQuizFromTab, aiGenPhase, showBottomPillToast, handleRequestCancelGeneration, t]);


  // Confetti celebration physics loop (Confetti Cannon / Party Popper)
  React.useEffect(() => {
    if (confettiParticles.length === 0) return;

    const interval = setInterval(() => {
      setConfettiParticles((prev) => {
        return prev
          .map((p) => {
            const newSpeedY = p.speedY + 0.3; // Gravity pull
            const newY = p.y + newSpeedY;
            const newX = p.x + p.speedX;
            const newRot = p.rotation + p.rotationSpeed;
            return {
              ...p,
              x: newX,
              y: newY,
              speedY: newSpeedY,
              rotation: newRot
            };
          })
          .filter((p) => p.y < SCREEN_HEIGHT + 20 && p.x > -20 && p.x < SCREEN_WIDTH + 20);
      });
    }, 16);

    return () => clearInterval(interval);
  }, [confettiParticles.length]);

  const triggerConfettiBurst = () => {
    const colors = ["#ff007f", "#00e5a0", "#3b82f6", "#f59e0b", "#a855f7", "#ff00ff", "#ffffff", "#00ffff"];
    const shapes = ["circle", "square", "triangle"];
    const particlesCount = 80;
    const newParticles: any[] = [];

    for (let i = 0; i < particlesCount; i++) {
      const id = Date.now() + i;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const size = Math.random() * 8 + 6;
      const rotationSpeed = (Math.random() - 0.5) * 10;
      
      const fireFromLeft = i % 2 === 0;
      const x = fireFromLeft ? 0 : SCREEN_WIDTH;
      const y = SCREEN_HEIGHT - 60;
      
      const speedY = -(Math.random() * 10 + 12); // Shooting upwards
      const speedX = fireFromLeft 
        ? Math.random() * 8 + 4 
        : -(Math.random() * 8 + 4); // Shoots towards center

      newParticles.push({
        id,
        x,
        y,
        size,
        color,
        shape,
        speedY,
        speedX,
        rotation: Math.random() * 360,
        rotationSpeed
      });
    }

    setConfettiParticles(newParticles);
  };

  // Trigger celebration when quiz finishes successfully (80%+ score)
  React.useEffect(() => {
    if (activeSession && activeSession.isFinished) {
      const questions = activeSession.questions || [];
      if (questions.length === 0) return;
      
      let correctCount = 0;
      questions.forEach((q: any) => {
        const selected = activeSession.answers[q.id] || [];
        if (selected.length > 0) {
          const correctIds = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
          const isAllCorrect = selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
          if (isAllCorrect) correctCount++;
        }
      });
      
      const scorePct = Math.round((correctCount / questions.length) * 100);
      if (scorePct >= 80 && !activeSession.isBattle) {
        triggerConfettiBurst();
      }
    }
  }, [activeSession?.isFinished]);

  useEffect(() => {
    if (activeSession?.isBattle && activeSession.isFinished && battleRoomState?.status === "finished") {
      if (!battleConfettiFiredRef.current) {
        battleConfettiFiredRef.current = true;
        const host = activeSession.isHost;
        const myScore = host ? (battleRoomState.hostScore ?? 0) : (battleRoomState.guestScore ?? 0);
        const oppScore = host ? (battleRoomState.guestScore ?? 0) : (battleRoomState.hostScore ?? 0);
        let effectiveWin = myScore > oppScore;
        if (myScore === oppScore) {
           const myTime = host ? (battleRoomState.hostTime ?? Infinity) : (battleRoomState.guestTime ?? Infinity);
           const oppTime = host ? (battleRoomState.guestTime ?? Infinity) : (battleRoomState.hostTime ?? Infinity);
           effectiveWin = myTime < oppTime;
        }
        if (effectiveWin) {
          triggerConfettiBurst();
        }
      }
    } else if (!activeSession?.isBattle) {
      battleConfettiFiredRef.current = false;
    }
  }, [activeSession?.isFinished, battleRoomState?.status]);

  // Audio configuration to enable play in silent mode
  React.useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
        });
      } catch (err) {
        logger.warn("App", "Failed to set audio mode:", err);
      }
    };
    configureAudio();
  }, []);

  // Always-fresh ref so the interval closure never goes stale
  const handleTimerExpiredRef = React.useRef<() => void>(() => {});

  // Timer effect for Quiz Attempts
  React.useEffect(() => {
    let intervalId: any = null;

    const isPerQuestion = activeSession?.timePerQuestion != null;
    const isGlobal = activeSession?.quizTimeLimit != null;
    const currentQId = activeSession?.questions?.[activeSession?.currentIndex]?.id;
    const isCurrentQSubmitted = currentQId && activeSession?.submitted?.includes(currentQId);

    if (activeSession && (isPerQuestion || isGlobal) && !activeSession.isFinished && (!isPerQuestion || !isCurrentQSubmitted)) {
      if (isPerQuestion) {
        setSessionTimeLeft(activeSession.timePerQuestion);
      } else if (sessionTimeLeft <= 0) {
        setSessionTimeLeft(activeSession.quizTimeLimit * 60);
      }

      intervalId = setInterval(() => {
        setSessionTimeLeft((prev) => {
          if (prev <= 6 && prev > 1) {
            try {
              if (!tickingPlayer.playing) {
                tickingPlayer.seekTo(0);
                tickingPlayer.play();
              }
            } catch (e) {}
          }
          if (prev <= 1) {
            clearInterval(intervalId);
            try {
              tickingPlayer.pause();
              tickingPlayer.seekTo(0);
            } catch (e) {}
            // Call via ref so we always get the latest handler with fresh state
            handleTimerExpiredRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      try {
        tickingPlayer.pause();
        tickingPlayer.seekTo(0);
      } catch (e) {}
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      try {
        tickingPlayer.pause();
        tickingPlayer.seekTo(0);
      } catch (e) {}
    };
  }, [activeSession?.quizId, activeSession?.quizTimeLimit, activeSession?.timePerQuestion ? activeSession?.currentIndex : null, activeSession?.isFinished, activeSession?.submitted]);

  // Keep ref always pointing to the freshest closure (re-runs every render)
  // ── Per-question battle countdown → useBattle hook ──


  // ── Per-question countdown timer (Battle mode only) ──────────────────────
  const battleQuestionTimerRef = React.useRef<any>(null);

  // ── Auto-save on change → useQuizData hook ──



  // ─────────────────────────────────────────────────────────────────────────
  // Handlers are defined below and collected into `p` for child components.
  // See src/handlers/ for documentation of each handler's responsibilities.
  // ─────────────────────────────────────────────────────────────────────────

  const renderInsightsView = () => <InsightsTabScreen p={p} />;
  const renderDeckInsightsTab = () => <DeckInsightsTab p={p} />;
  // handleGenerateWithAI — defined in src/handlers/aiGenerationHandler.ts, bound below
  const handleGenerateWithAI = aiGenerationHandler;
  const renderActiveSessionView = () => <ActiveSessionScreen p={p} />;
  const renderResultsView = () => <ResultsScreen p={p} />;
  const renderBattleLobbyView = () => <BattleLobbyScreen p={p} />;
  const renderFlashcardsView = () => <FlashcardsScreen p={p} />;
  const renderContent = (overrideTab?: string) => <MainContentScreen p={p} overrideTab={overrideTab} />;

  return <HomeLayout p={p} />;
}

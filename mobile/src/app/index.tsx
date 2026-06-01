import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
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
  BackHandler,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser, onAuth, type User } from "../lib/firebase";
import { syncUserToNeon, createFlashcardDeck, updateFlashcardDeck, deleteFlashcardDeck, fetchFlashcardDecks, fetchMobileQuizzes, createMobileQuiz, updateMobileQuiz, deleteMobileQuiz } from "../lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Get screen width/height for layout sizing
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * AnimatedPressable — a drop-in Pressable replacement with a smooth spring
 * press animation (scale + opacity). Subtle and modern, never jarring.
 */
function AnimatedPressable({
  children,
  style,
  onPress,
  onLongPress,
  disabled,
  scaleTo = 0.96,
  ...rest
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  scaleTo?: number;
  [key: string]: any;
}) {
  const anim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(anim, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 50,
      bounciness: 2,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 3,
    }).start();
  };

  const flat = style ? StyleSheet.flatten(style) : {};

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={style}
      {...rest}
    >
      <Animated.View style={[{ transform: [{ scale: anim }] }, flat ? { alignItems: flat.alignItems, justifyContent: flat.justifyContent, gap: flat.gap, flexDirection: flat.flexDirection } : null]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function ToggleSwitch({ checked, onChange, disabled, darkMode = true }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; darkMode?: boolean }) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={[
        styles.switchContainer,
        checked ? { backgroundColor: "#00e5a0" } : { backgroundColor: darkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)" },
        !darkMode && { borderWidth: 1, borderColor: "rgba(0, 0, 0, 0.12)" },
        disabled && { opacity: 0.4 }
      ]}
    >
      <View 
        style={[
          styles.switchCircle, 
          !darkMode && { 
            backgroundColor: checked ? "#ffffff" : "#f0f0f0",
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 1.5,
            elevation: 2,
            borderWidth: 0.5,
            borderColor: "rgba(0, 0, 0, 0.15)"
          },
          checked ? { transform: [{ translateX: 18 }] } : { transform: [{ translateX: 0 }] }]
        } 
      />
    </Pressable>
  );
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
  darkMode = true,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  darkMode?: boolean;
}) {
  return (
    <View style={[styles.stepperContainer, !darkMode && styles.lightCard]}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        style={({ pressed }) => [
          styles.stepperBtn,
          value <= min && styles.stepperBtnDisabled,
          pressed && styles.opacityPress,
        ]}
      >
        <Feather name="minus" size={14} color={value <= min ? (darkMode ? "#444" : "#ccc") : "#00e5a0"} />
      </Pressable>
      
      <View style={[styles.stepperValueContainer, !darkMode && styles.lightBorder]}>
        <Text style={styles.stepperValueText}>
          {value}
          {suffix}
        </Text>
      </View>

      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        style={({ pressed }) => [
          styles.stepperBtn,
          value >= max && styles.stepperBtnDisabled,
          pressed && styles.opacityPress,
        ]}
      >
        <Feather name="plus" size={14} color={value >= max ? (darkMode ? "#444" : "#ccc") : "#00e5a0"} />
      </Pressable>
    </View>
  );
}

function parseQstText(text: string): { title: string; category: string; questions: any[] } {
  const lines = text.split(/\r?\n/);
  let title = "";
  let category = "General";
  const questions: any[] = [];
  let currentQuestion: any = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Metadata
    if (trimmed.startsWith("@")) {
      const parts = trimmed.substring(1).split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const val = parts.slice(1).join(":").trim();
        if (key === "title") title = val;
        if (key === "category") category = val;
      }
      continue;
    }

    // Question prompt
    if (trimmed.startsWith("?")) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = {
        id: `q-${questions.length + 1}`,
        prompt: trimmed.substring(1).trim(),
        answers: [],
        type: "single_choice",
      };
      continue;
    }

    // Options
    if (currentQuestion) {
      if (trimmed.startsWith("+")) {
        currentQuestion.answers.push({
          id: `a-${currentQuestion.id}-${currentQuestion.answers.length + 1}`,
          text: trimmed.substring(1).trim(),
          isCorrect: true,
        });
      } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        currentQuestion.answers.push({
          id: `a-${currentQuestion.id}-${currentQuestion.answers.length + 1}`,
          text: trimmed.substring(1).trim(),
          isCorrect: false,
        });
      }
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  // Determine question type (multiple choice vs single choice)
  for (let q of questions) {
    const correctCount = q.answers.filter((a: any) => a.isCorrect).length;
    q.type = correctCount > 1 ? "multiple_choice" : "single_choice";
  }

  return { title, category, questions };
}

function generateMockQuestionsForQuiz(title: string, count: number) {
  const list = [];
  for (let i = 1; i <= count; i++) {
    list.push({
      id: `mock-${title}-${i}`,
      prompt: `Question ${i}: This is a mock question for ${title}. Which of the following options is correct?`,
      answers: [
        { id: `opt-${i}-1`, text: `Incorrect option A for question ${i}`, isCorrect: false },
        { id: `opt-${i}-2`, text: `Correct option B for question ${i}`, isCorrect: true },
        { id: `opt-${i}-3`, text: `Incorrect option C for question ${i}`, isCorrect: false },
        { id: `opt-${i}-4`, text: `Incorrect option D for question ${i}`, isCorrect: false },
      ],
      type: "single_choice" as const,
    });
  }
  return list;
}

function questionIndexRowStyle(showResult: boolean, selectedAnswers: string[], currentQuestion: any) {
  return styles.questionIndexRow;
}

function getCategoryIconDetails(categoryStr: string) {
  return {
    bg: "rgba(99, 102, 241, 0.1)",
    border: "rgba(99, 102, 241, 0.25)",
    color: "#6366f1",
    iconType: "Ionicons" as const,
    iconName: "document-text-outline" as const
  };
}

function renderCategoryAvatar(category: string, settingsDarkMode: boolean) {
  const details = getCategoryIconDetails(category);
  
  // In light mode, slightly lighter backgrounds/borders for visibility
  const bg = settingsDarkMode ? details.bg : details.bg.replace("0.1", "0.08");
  const border = settingsDarkMode ? details.border : details.border.replace("0.25", "0.2");
  const color = details.color;
  const iconName = details.iconName;
  const iconType = details.iconType;

  return (
    <View 
      style={[
        styles.quizAvatar, 
        { 
          backgroundColor: bg, 
          borderColor: border, 
          borderWidth: 1.5,
          borderRadius: 14,
        }
      ]}
    >
      {iconType === "Ionicons" ? (
        <Ionicons name={iconName as any} size={20} color={color} />
      ) : iconType === "FontAwesome6" ? (
        <FontAwesome6 name={iconName as any} size={18} color={color} />
      ) : (
        <Feather name={iconName as any} size={18} color={color} />
      )}
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const localVideoPlayer = useVideoPlayer(require("../../assets/videos/tutorial.mp4"), (player) => {
    player.loop = false;
  });

  const correctPlayer = useAudioPlayer(require("../../assets/sounds/correct.mp3"));
  const wrongPlayer = useAudioPlayer(require("../../assets/sounds/wrong.mp3"));
  const successPlayer = useAudioPlayer(require("../../assets/sounds/success.mp3"));

  const playCorrectSound = () => {
    try {
      correctPlayer.volume = 0.45; // Reduce correct chime volume to 45% (soft and pleasant)
      correctPlayer.seekTo(0);
      correctPlayer.play();
    } catch (error) {
      console.warn("Failed to play correct sound effect:", error);
    }
  };

  const playWrongSound = () => {
    try {
      wrongPlayer.volume = 0.15; // Subtle wrong-answer buzzer — quiet and non-distracting
      wrongPlayer.seekTo(0);
      wrongPlayer.play();
    } catch (error) {
      console.warn("Failed to play wrong sound effect:", error);
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
      console.warn("Failed to play success sound effect:", error);
    }
  };
  const [showLanding, setShowLanding] = useState(true);

  // ── Splash animation values ──────────────────────────────────────
  const splashLogoScale   = useRef(new Animated.Value(0)).current;
  const splashLogoOpacity = useRef(new Animated.Value(0)).current;
  const splashNameY       = useRef(new Animated.Value(32)).current;
  const splashNameOpacity = useRef(new Animated.Value(0)).current;
  const splashTagOpacity  = useRef(new Animated.Value(0)).current;
  const splashDotScale    = useRef(new Animated.Value(0)).current;
  const splashFadeOut     = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    // Phase 1 — logo bounces in
    Animated.parallel([
      Animated.spring(splashLogoScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(splashLogoOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    // Phase 2 — app name slides up
    const t1 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(splashNameY, { toValue: 0, duration: 500, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        Animated.timing(splashNameOpacity, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
    }, 350);

    // Phase 3 — tagline fades in
    const t2 = setTimeout(() => {
      Animated.timing(splashTagOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    }, 750);

    // Phase 4 — dot pulse
    const t3 = setTimeout(() => {
      Animated.spring(splashDotScale, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }).start();
    }, 1000);

    // Phase 5 — fade out and dismiss
    const t4 = setTimeout(() => {
      Animated.timing(splashFadeOut, { toValue: 0, duration: 650, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => setShowLanding(false));
    }, 2500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // ── Firebase auth state listener — handles login, logout, account switch ──
  useEffect(() => {
    const unsub = onAuth(async (user) => {
      const newUid = user?.uid ?? null;
      const prevUid = loadedUidRef.current; // undefined means app just started

      // Nothing changed (same user still logged in) — skip
      if (prevUid !== undefined && prevUid === newUid) {
        setFirebaseUser(user);
        return;
      }

      // ── Save the outgoing user's data before switching ──────────────────
      if (prevUid !== undefined) {
        try {
          await Promise.all([
            AsyncStorage.setItem(storageKey("quizzes", prevUid), JSON.stringify(quizzesRef.current)),
            AsyncStorage.setItem(storageKey("decks", prevUid), JSON.stringify(decksRef.current)),
          ]);
        } catch (e) { console.warn("[Persist] save-before-switch failed:", e); }
      }

      setFirebaseUser(user);

      if (user) {
        // ── Switching to a logged-in account ─────────────────────────────
        // 1. Load this user's local device slot
        try {
          const [qRaw, dRaw] = await Promise.all([
            AsyncStorage.getItem(storageKey("quizzes", newUid)),
            AsyncStorage.getItem(storageKey("decks", newUid)),
          ]);
          setQuizzes(qRaw ? JSON.parse(qRaw) : []);
          setFlashcardDecks(dRaw ? JSON.parse(dRaw) : []);
        } catch (e) { console.warn("[Persist] user load failed:", e); }
        loadedUidRef.current = newUid;

        // 2. Sync user profile to Neon
        syncUserToNeon({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }).catch((err) => console.warn("[NeonSync] user sync failed:", err));

        // 3. Fetch flashcard decks from Neon and merge on top of local
        const { decks: cloudDecks, error: deckErr } = await fetchFlashcardDecks(user.uid);
        if (!deckErr && cloudDecks.length > 0) {
          const normalized = cloudDecks.map((d) => ({
            id: d.id,
            neonId: d.id,
            title: d.title,
            category: "General",
            cardType: d.cardType,
            type: "flashcard",
            cards: d.cards.map((c) => ({ front: c.front, back: c.back })),
          }));
          setFlashcardDecks((local: any[]) => {
            // Cloud wins over local for decks with the same id
            const localOnly = local.filter((l) => !normalized.find((n) => n.id === l.id));
            return [...normalized, ...localOnly];
          });
        }

        // 4. Fetch quizzes from Neon and merge on top of local
        const { quizzes: cloudQuizzes, error: quizErr } = await fetchMobileQuizzes(user.uid);
        if (!quizErr && cloudQuizzes.length > 0) {
          const normalized = cloudQuizzes.map((q) => ({
            id: q.id,
            neonId: q.id,
            title: q.title,
            questions: q.questionCount,
            category: q.category,
            time: "Synced",
            sourceText: q.sourceText,
            questionsList: (() => {
              try {
                return parseQstText(q.sourceText).questions;
              } catch { return []; }
            })(),
            attempts: q.attempts ?? [],
            wrongQuestions: q.wrongQuestions ?? [],
            uniqueCorrectIds: q.uniqueCorrectIds ?? [],
          }));
          setQuizzes((local: any[]) => {
            const localOnly = local.filter((l) => !normalized.find((n) => n.id === l.id));
            return [...normalized, ...localOnly];
          });
        }
      } else {
        // ── Signed out — switch back to the guest slot ───────────────────
        try {
          const [qRaw, dRaw] = await Promise.all([
            AsyncStorage.getItem(storageKey("quizzes", null)),
            AsyncStorage.getItem(storageKey("decks", null)),
          ]);
          setQuizzes(qRaw ? JSON.parse(qRaw) : []);
          setFlashcardDecks(dRaw ? JSON.parse(dRaw) : []);
        } catch (e) { console.warn("[Persist] guest load failed:", e); }
        loadedUidRef.current = null;
      }
    });
    return unsub;
  }, []);

  // ── Show full auth screen once after splash (first-time only) ──
  useEffect(() => {
    if (showLanding) return; // still on splash
    AsyncStorage.getItem("quizforge_has_seen_auth").then((val) => {
      if (!val) {
        // First ever launch — show full auth screen
        setShowAuthScreen(true);
        AsyncStorage.setItem("quizforge_has_seen_auth", "1");
      }
    });
  }, [showLanding]);
  // ─────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<"home" | "dashboard" | "add" | "flashcards" | "guide" | "menu" | "insights">("home");
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [showWrongReview, setShowWrongReview] = useState<boolean>(false);
  const [showQuizActions, setShowQuizActions] = useState<any | null>(null);
  const [renamingQuiz, setRenamingQuiz] = useState<any | null>(null);
  const [importErrorDetails, setImportErrorDetails] = useState<{ title: string; message: string; details?: string } | null>(null);
  const [deletingQuizConfirm, setDeletingQuizConfirm] = useState<any | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  // In-app modals (replaces Alert.alert)
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [starredQuestions, setStarredQuestions] = useState<Set<string>>(new Set());
  const [homeFilter, setHomeFilter] = useState<"all"|"progress"|"notstarted"|"done">("all");
  const [homeSearch, setHomeSearch] = useState("");
  const [showAboutPage, setShowAboutPage] = useState(false);
  const [showFeedbackPage, setShowFeedbackPage] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showQuizCreatedModal, setShowQuizCreatedModal] = useState<{ title: string; count: number } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  // ── Firebase Auth ──
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
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
  const [settingsDarkMode, setSettingsDarkMode] = useState<boolean>(true);
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [selectionMode, setSelectionMode] = useState<"all" | "random" | "range" | "unanswered" | "wrong">("all");
  const [randomCount, setRandomCount] = useState<number>(5);
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(5);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [shuffleAnswers, setShuffleAnswers] = useState<boolean>(false);
  const [showAnswerOnSubmit, setShowAnswerOnSubmit] = useState<boolean>(true);
  const [timePerQuestion, setTimePerQuestion] = useState<number | null>(null);

  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(0);
  const [viewingInsightsQuiz, setViewingInsightsQuiz] = useState<any | null>(null);
  const [viewingInsightsQuizFromTab, setViewingInsightsQuizFromTab] = useState<string>("dashboard");
  const [qQuery, setQQuery] = useState("");
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const fileInputRef = React.useRef<any>(null);
  const [confettiParticles, setConfettiParticles] = useState<any[]>([]);

  // ── Hardware Back Button Handling ──
  useEffect(() => {
    const onBackPress = () => {
      if (activeSession) {
        setShowQuitConfirm(true);
        return true;
      }
      if (studyingDeck) {
        setStudyingDeck(null);
        return true;
      }
      if (activeTab === "insights") {
        setActiveTab("dashboard");
        return true;
      }
      if (activeTab === "home") {
        return false; // Yield to OS default behavior
      }
      // On any other tab/page
      setActiveTab("home");
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeSession, studyingDeck, activeTab]);


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

  // Trigger celebration when quiz finishes successfully
  React.useEffect(() => {
    if (activeSession && activeSession.isFinished) {
      triggerConfettiBurst();
    }
  }, [activeSession?.isFinished]);

  // Audio configuration to enable play in silent mode
  React.useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
        });
      } catch (err) {
        console.warn("Failed to set audio mode:", err);
      }
    };
    configureAudio();
  }, []);

  // Timer effect for Quiz Attempts
  React.useEffect(() => {
    let intervalId: any = null;

    if (activeSession && activeSession.timePerQuestion !== null && !activeSession.isFinished) {
      setSessionTimeLeft(activeSession.timePerQuestion);

      intervalId = setInterval(() => {
        setSessionTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            handleTimerExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeSession?.quizId, activeSession?.currentIndex, activeSession?.timePerQuestion]);

  const handleTimerExpired = () => {
    if (!activeSession) return;
    const currentQ = activeSession.questions[activeSession.currentIndex];
    const answers = { ...activeSession.answers };
    if (!answers[currentQ.id]) {
      answers[currentQ.id] = []; 
    }
    
    const nextIdx = activeSession.currentIndex + 1;
    if (nextIdx < activeSession.questions.length) {
      setActiveSession({
        ...activeSession,
        answers,
        currentIndex: nextIdx
      });
    } else {
      setActiveSession({
        ...activeSession,
        answers,
        isFinished: true
      });
    }
  };

  const handleStartQuiz = () => {
    if (!selectedQuiz) return;
    let qsList = selectedQuiz.questionsList;
    if (!qsList || qsList.length === 0) {
      qsList = generateMockQuestionsForQuiz(selectedQuiz.title, selectedQuiz.questions);
    }

    let filteredQuestions = [...qsList];
    if (selectionMode === "random") {
      filteredQuestions = filteredQuestions.sort(() => Math.random() - 0.5).slice(0, randomCount);
    } else if (selectionMode === "range") {
      filteredQuestions = filteredQuestions.slice(rangeStart - 1, rangeEnd);
    } else if (selectionMode === "wrong") {
      const wrongList = selectedQuiz.wrongQuestions || [];
      if (wrongList.length > 0) {
        filteredQuestions = filteredQuestions.filter((q: any) => wrongList.some((w: any) => w.id === q.id));
      }
    }

    if (shuffleQuestions) {
      filteredQuestions = filteredQuestions.sort(() => Math.random() - 0.5);
    }
    if (shuffleAnswers) {
      filteredQuestions = filteredQuestions.map((q: any) => ({
        ...q,
        answers: [...q.answers].sort(() => Math.random() - 0.5)
      }));
    }

    const session = {
      quizId: selectedQuiz.id,
      quizTitle: selectedQuiz.title,
      questions: filteredQuestions,
      selectionMode,
      shuffleQuestions,
      shuffleAnswers,
      showAnswerOnSubmit,
      timePerQuestion,
      currentIndex: 0,
      answers: {},
      submitted: [] as string[],
      isFinished: false,
      startedAt: Date.now()
    };

    setSelectedQuiz(null);
    setShowWrongReview(false);
    setActiveSession(session);
  };

  const playQuizDirectly = (quiz: any, mode: "all" | "random" | "range" | "unanswered" | "wrong") => {
    let qsList = quiz.questionsList || [];
    if (qsList.length === 0) {
      qsList = generateMockQuestionsForQuiz(quiz.title, quiz.questions);
    }

    let filteredQuestions = [...qsList];
    if (mode === "random") {
      const rndCount = Math.min(5, quiz.questions);
      filteredQuestions = filteredQuestions.sort(() => Math.random() - 0.5).slice(0, rndCount);
    } else if (mode === "wrong") {
      const wrongList = quiz.wrongQuestions || [];
      if (wrongList.length > 0) {
        filteredQuestions = filteredQuestions.filter((q: any) => wrongList.some((w: any) => w.id === q.id));
      }
    }

    const session = {
      quizId: quiz.id,
      quizTitle: quiz.title,
      questions: filteredQuestions,
      selectionMode: mode,
      shuffleQuestions: false,
      shuffleAnswers: false,
      showAnswerOnSubmit: true,
      timePerQuestion: null,
      currentIndex: 0,
      answers: {},
      submitted: [] as string[],
      isFinished: false,
      startedAt: Date.now()
    };

    setActiveSession(session);
  };

  const handleDeleteAttemptOnMobile = (quizId: string, attemptId: string) => {
    const updatedQuizzes = quizzes.map((q) => {
      if (q.id === quizId) {
        const nextAttempts = q.attempts.filter((a: any) => a.id !== attemptId);
        const nextWrong = nextAttempts.length === 0 ? [] : (q.wrongQuestions || []);
        const nextUnique = nextAttempts.length === 0 ? [] : (q.uniqueCorrectIds || []);
        return { ...q, attempts: nextAttempts, wrongQuestions: nextWrong, uniqueCorrectIds: nextUnique };
      }
      return q;
    });
    setQuizzes(updatedQuizzes);
    if (viewingInsightsQuiz && viewingInsightsQuiz.id === quizId) {
      setViewingInsightsQuiz(updatedQuizzes.find((q) => q.id === quizId));
    }
    if (Platform.OS === "web") {
      alert("Attempt history updated.");
    } else {
      Alert.alert("Success", "Attempt deleted successfully.");
    }
  };

  const handleClearHistoryOnMobile = (quizId: string) => {
    const updatedQuizzes = quizzes.map((q) => {
      if (q.id === quizId) {
        return { ...q, attempts: [], wrongQuestions: [], uniqueCorrectIds: [] };
      }
      return q;
    });
    setQuizzes(updatedQuizzes);
    if (viewingInsightsQuiz && viewingInsightsQuiz.id === quizId) {
      setViewingInsightsQuiz(updatedQuizzes.find((q) => q.id === quizId));
    }
  };

  const handleDeleteQuizOnMobile = (quizId: string) => {
    const updatedQuizzes = quizzes.filter((q) => q.id !== quizId);
    setQuizzes(updatedQuizzes);
    setViewingInsightsQuiz(null);
    setActiveTab("dashboard");
  };

  const renderTrendsChart = (attempts: any[]) => {
    if (!attempts || attempts.length < 2) return null;
    const reversed = [...attempts].reverse();
    return (
      <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard, { marginBottom: 14 }]}>
        <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub, { marginBottom: 10, fontSize: 12 }]}>Score Trends</Text>
        <View style={{ flexDirection: "row", height: 110, alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 10 }}>
          {reversed.map((att: any, i: number) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <View style={{ height: 80, width: 14, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", justifyContent: "flex-end", borderRadius: 8, overflow: "hidden" }}>
                <View
                  style={{
                    height: `${att.score}%`,
                    width: "100%",
                    borderRadius: 8,
                    backgroundColor: att.score >= 75 ? "#00e5a0" : "#f59e0b",
                  }}
                />
              </View>
              <Text style={{ fontSize: 9, color: "#888888", marginTop: 6 }}>#{i + 1}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStudyDirectory = (quiz: any) => {
    const questionsList = quiz.questionsList || [];
    if (questionsList.length === 0) return null;
    
    const filtered = questionsList.filter((q: any) => 
      q.prompt.toLowerCase().includes(qQuery.toLowerCase()) ||
      q.answers.some((a: any) => a.text.toLowerCase().includes(qQuery.toLowerCase()))
    );
    
    return (
      <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard]}>
        <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub, { marginBottom: 12 }]}>Quiz Directory & Study Guide</Text>
        
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
          <Feather name="search" size={14} color="#888888" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search questions..."
            placeholderTextColor="#666"
            value={qQuery}
            onChangeText={setQQuery}
            style={{ flex: 1, fontSize: 12, color: settingsDarkMode ? "#ffffff" : "#0d0f14", padding: 0 }}
          />
        </View>
        
        <View style={{ gap: 8 }}>
          {filtered.slice(0, 15).map((q: any, i: number) => {
            const isExpanded = expandedQId === q.id;
            return (
              <View key={q.id} style={{ borderRadius: 12, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                <Pressable
                  onPress={() => setExpandedQId(isExpanded ? null : q.id)}
                  style={{ flexDirection: "row", alignItems: "flex-start", padding: 10, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)" }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: "#888888", marginRight: 8, marginTop: 1 }}>Q{i+1}</Text>
                  <Text style={{ flex: 1, fontSize: 12, color: settingsDarkMode ? "#dddddd" : "#333333", lineHeight: 16 }} numberOfLines={isExpanded ? undefined : 2}>
                    {q.prompt}
                  </Text>
                  <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#666" style={{ marginLeft: 6 }} />
                </Pressable>
                
                {isExpanded && (
                  <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", gap: 6 }}>
                    {q.answers.map((answer: any, aIdx: number) => (
                      <View 
                        key={aIdx} 
                        style={{ 
                          flexDirection: "row", 
                          alignItems: "center", 
                          padding: 8, 
                          borderRadius: 8, 
                          backgroundColor: answer.isCorrect ? "rgba(0, 229, 160, 0.05)" : "rgba(255,255,255,0.01)",
                          borderWidth: 1,
                          borderColor: answer.isCorrect ? "rgba(0, 229, 160, 0.12)" : "transparent"
                        }}
                      >
                        <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: answer.isCorrect ? "rgba(0, 229, 160, 0.15)" : "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                          <Text style={{ fontSize: 9, fontWeight: "bold", color: answer.isCorrect ? "#00e5a0" : "#888888" }}>
                            {answer.isCorrect ? "✓" : "-"}
                          </Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 11, color: answer.isCorrect ? "#00e5a0" : (settingsDarkMode ? "#bbbbbb" : "#444444") }}>
                          {answer.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
          {filtered.length === 0 && (
            <Text style={{ fontSize: 11, color: "#666", textAlign: "center", paddingVertical: 10 }}>No matching questions found.</Text>
          )}
        </View>
      </View>
    );
  };

  const renderInsightsView = () => {
    if (!viewingInsightsQuiz) return null;
    const quiz = viewingInsightsQuiz;
    const attempts = quiz.attempts || [];
    const highScore = attempts.length > 0 ? Math.max(...attempts.map((a: any) => a.score)) : 0;
    const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s: number, a: any) => s + a.score, 0) / attempts.length) : 0;
    const wrongCount = (quiz.wrongQuestions || []).length;
    
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Link */}
        <Pressable 
          onPress={() => setActiveTab(viewingInsightsQuizFromTab as any || "dashboard")}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 15 }}
        >
          <Feather name="arrow-left" size={16} color="#00e5a0" />
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#00e5a0" }}>Back to Dashboard</Text>
        </Pressable>

        {/* Page Header */}
        <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: "rgba(0, 229, 160, 0.12)" }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: "#00e5a0" }}>{quiz.category}</Text>
            </View>
            <Text style={{ fontSize: 11, color: "#888888" }}>{quiz.questions} Questions</Text>
          </View>
          <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText, { fontSize: 20, marginTop: 4 }]} numberOfLines={2}>
            {quiz.title}
          </Text>
        </View>

        {/* Core Stats Row */}
        <View style={[styles.statsGrid, { marginBottom: 15 }]}>
          <View 
            style={[
              styles.statCard, 
              settingsDarkMode 
                ? { backgroundColor: "rgba(245, 158, 11, 0.03)", borderColor: "rgba(245, 158, 11, 0.15)", shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 16 } 
                : { backgroundColor: "rgba(245, 158, 11, 0.04)", borderColor: "rgba(245, 158, 11, 0.22)", shadowColor: "#f59e0b", shadowOpacity: 0.14, shadowRadius: 12 }
            ]}
          >
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
              <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{attempts.length > 0 ? `${highScore}%` : "—"}</Text>
            <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>Peak Score</Text>
          </View>

          <View 
            style={[
              styles.statCard, 
              settingsDarkMode 
                ? { backgroundColor: "rgba(59, 130, 246, 0.03)", borderColor: "rgba(59, 130, 246, 0.15)", shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 16 } 
                : { backgroundColor: "rgba(59, 130, 246, 0.04)", borderColor: "rgba(59, 130, 246, 0.22)", shadowColor: "#3b82f6", shadowOpacity: 0.14, shadowRadius: 12 }
            ]}
          >
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
              <Ionicons name="analytics-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{attempts.length > 0 ? `${avgScore}%` : "—"}</Text>
            <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>Avg Score</Text>
          </View>

          <View 
            style={[
              styles.statCard, 
              settingsDarkMode 
                ? { backgroundColor: "rgba(168, 85, 247, 0.03)", borderColor: "rgba(168, 85, 247, 0.15)", shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 16 } 
                : { backgroundColor: "rgba(168, 85, 247, 0.04)", borderColor: "rgba(168, 85, 247, 0.22)", shadowColor: "#a855f7", shadowOpacity: 0.14, shadowRadius: 12 }
            ]}
          >
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(168, 85, 247, 0.12)" }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#a855f7" />
            </View>
            <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{attempts.length}</Text>
            <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>Sessions</Text>
          </View>
        </View>

        {/* Score Trends line */}
        {renderTrendsChart(attempts)}

        {/* ── Primary actions ── */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          {/* Start Test — always shown */}
          <Pressable
            onPress={() => handleOpenQuizOptions(quiz)}
            style={({ pressed }) => [{
              flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              height: 52, borderRadius: 16,
              backgroundColor: "#6366f1",
              shadowColor: "#6366f1", shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
            }, pressed && styles.pressedScale]}
          >
            <Ionicons name="play" size={18} color="#ffffff" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>Start Test</Text>
          </Pressable>

          {/* Practice Incorrect — only when there are wrong answers */}
          {wrongCount > 0 && (
            <Pressable
              onPress={() => playQuizDirectly(quiz, "wrong")}
              style={({ pressed }) => [{
                flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                height: 52, borderRadius: 16,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
              }, pressed && styles.pressedScale]}
            >
              <Ionicons name="refresh" size={17} color={settingsDarkMode ? "#ccccdd" : "#44445a"} />
              <Text style={{ fontSize: 13, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>
                Incorrect ({wrongCount})
              </Text>
            </Pressable>
          )}
        </View>

        {/* Searchable Questions list — collapsible */}
        {(quiz.questionsList || []).length > 0 && (
          <Pressable
            onPress={() => setExpandedQId(expandedQId === "directory" ? null : "directory")}
            style={({ pressed }) => [{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, marginBottom: 12,
              backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
              borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            }, pressed && styles.opacityPress]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="book-outline" size={18} color={settingsDarkMode ? "#aaaacc" : "#666688"} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>
                Quiz Directory
              </Text>
              <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: settingsDarkMode ? "#aaaacc" : "#666688" }}>
                  {(quiz.questionsList || []).length}
                </Text>
              </View>
            </View>
            <Ionicons name={expandedQId === "directory" ? "chevron-up" : "chevron-down"} size={16}
              color={settingsDarkMode ? "#6e727a" : "#999"} />
          </Pressable>
        )}
        {expandedQId === "directory" && renderStudyDirectory(quiz)}

        {/* Attempt Log History */}
        <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard]}>
          <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub, { marginBottom: 10, fontSize: 12 }]}>Attempt History</Text>
          {attempts.length > 0 ? (
            <View style={{ gap: 8 }}>
              {attempts.map((attempt: any, index: number) => (
                <View
                  key={attempt.id || String(index)}
                  style={[
                    { padding: 12, borderRadius: 12, backgroundColor: "rgba(255, 255, 255, 0.02)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.05)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                    !settingsDarkMode && styles.lightCard
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[{ fontSize: 12, fontWeight: "bold", color: "#ffffff" }, !settingsDarkMode && styles.lightText]}>
                      Attempt #{attempts.length - index}
                    </Text>
                    <Text style={[{ fontSize: 10, color: "#888888", marginTop: 2 }, !settingsDarkMode && styles.lightTextSub]}>
                      {attempt.correct} correct · {attempt.wrong} wrong · {attempt.skipped} skipped
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: attempt.score >= 75 ? "rgba(0, 229, 160, 0.12)" : "rgba(245, 158, 11, 0.12)" }}>
                      <Text style={{ fontSize: 11, fontWeight: "bold", color: attempt.score >= 75 ? "#00e5a0" : "#f59e0b" }}>
                        {attempt.score}%
                      </Text>
                    </View>
                    <Pressable 
                      onPress={() => handleDeleteAttemptOnMobile(quiz.id, attempt.id)}
                      style={{ padding: 4 }}
                    >
                      <Feather name="trash-2" size={14} color="#888888" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: "#666", textAlign: "center", paddingVertical: 10 }}>No attempts logged yet.</Text>
          )}
        </View>

        {/* Reset controls */}
        <View style={[
          styles.panelCard, 
          { 
            marginBottom: 30,
          },
          !settingsDarkMode && styles.lightCard
        ]}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: settingsDarkMode ? "#6e727a" : "#999999", marginBottom: 12 }}>Manage</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => {
                if (Platform.OS === "web") {
                  if (confirm("Reset attempts for this quiz?")) handleClearHistoryOnMobile(quiz.id);
                } else {
                  Alert.alert("Reset", "Reset history for this quiz?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Reset", style: "destructive", onPress: () => handleClearHistoryOnMobile(quiz.id) }
                  ]);
                }
              }}
              style={({ pressed }) => [
                { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.2)", alignItems: "center", justifyContent: "center" },
                pressed && styles.opacityPress
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: "bold", color: "#ef4444" }}>Clear History</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (Platform.OS === "web") {
                  if (confirm("Delete this quiz completely?")) handleDeleteQuizOnMobile(quiz.id);
                } else {
                  Alert.alert("Delete", "Delete this quiz completely?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => handleDeleteQuizOnMobile(quiz.id) }
                  ]);
                }
              }}
              style={({ pressed }) => [
                { flex: 1, padding: 10, borderRadius: 10, backgroundColor: "rgba(239, 68, 68, 0.15)", alignItems: "center", justifyContent: "center" },
                pressed && styles.opacityPress
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: "bold", color: "#ef4444" }}>Delete Quiz</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  };

  const handleCheckAnswer = (questionId: string) => {
    if (!activeSession) return;
    const submitted = [...(activeSession.submitted || [])];
    if (!submitted.includes(questionId)) {
      submitted.push(questionId);
      
      // Determine correctness to play sound
      const currentQuestion = activeSession.questions.find((q: any) => q.id === questionId);
      if (currentQuestion) {
        const selected = activeSession.answers[questionId] || [];
        const correctIds = currentQuestion.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
        const isAllCorrect = selected.length === correctIds.length && selected.every((id: string) => correctIds.includes(id));
        if (isAllCorrect) {
          playCorrectSound();
        } else {
          playWrongSound();
        }
      }

      setActiveSession({
        ...activeSession,
        submitted
      });
    }
  };

  const handleAnswerSelect = (question: any, answerId: string) => {
    if (!activeSession) return;
    const isSubmitted = activeSession.submitted?.includes(question.id);
    if (activeSession.showAnswerOnSubmit && isSubmitted) return;

    const answers = { ...activeSession.answers };
    let currentAnswers = answers[question.id] || [];

    if (question.type === "multiple_choice") {
      if (currentAnswers.includes(answerId)) {
        currentAnswers = currentAnswers.filter((id: string) => id !== answerId);
      } else {
        currentAnswers = [...currentAnswers, answerId];
      }
      answers[question.id] = currentAnswers;
      setActiveSession({
        ...activeSession,
        answers
      });
    } else {
      currentAnswers = [answerId];
      answers[question.id] = currentAnswers;

      // Auto-submit single choice questions immediately if showAnswerOnSubmit is enabled
      const submitted = [...(activeSession.submitted || [])];
      if (activeSession.showAnswerOnSubmit && !submitted.includes(question.id)) {
        submitted.push(question.id);
        
        // Play correct/wrong sound
        const correctIds = question.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
        const isAllCorrect = currentAnswers.length === correctIds.length && currentAnswers.every((id: string) => correctIds.includes(id));
        if (isAllCorrect) {
          playCorrectSound();
        } else {
          playWrongSound();
        }
      }

      setActiveSession({
        ...activeSession,
        answers,
        submitted
      });
    }
  };

  const handleNavigateSession = (idx: number) => {
    if (!activeSession) return;
    setActiveSession({
      ...activeSession,
      currentIndex: idx
    });
  };

  const handleFinishSession = () => {
    if (!activeSession) return;
    const totalQs = activeSession.questions.length;
    const answeredCount = Object.keys(activeSession.answers).length;
    const unanswered = totalQs - answeredCount;

    const finish = () => {
      playSuccessSound();
      setActiveSession({
        ...activeSession,
        isFinished: true
      });
    };

    if (unanswered > 0) {
      if (Platform.OS === "web") {
        if (confirm(`${unanswered} question${unanswered > 1 ? "s" : ""} unanswered. Finish anyway?`)) {
          finish();
        }
      } else {
        Alert.alert(
          "Finish Quiz",
          `${unanswered} question${unanswered > 1 ? "s" : ""} unanswered. Finish anyway?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Finish", style: "destructive", onPress: finish }
          ]
        );
      }
    } else {
      finish();
    }
  };

  const handleImportQst = (text: string, fileName: string) => {
    try {
      const parsed = parseQstText(text);
      if (parsed.questions.length === 0) {
        throw new Error("No questions found. QuizForge format requires questions starting with '?' and answers starting with '+' or '-'.");
      }
      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const newQuiz: any = {
        id: localId,
        title: parsed.title || fileName.replace(/\.[^.]+$/, ""),
        questions: parsed.questions.length,
        category: parsed.category || "General",
        time: "Just now",
        sourceText: text,
        questionsList: parsed.questions,
        attempts: [],
        wrongQuestions: [],
        uniqueCorrectIds: [],
      };
      setQuizzes([newQuiz, ...quizzes]);
      setActiveTab("home");
      setCreationMode("pick");
      handleOpenQuizOptions(newQuiz);

      // Push to Neon if logged in
      if (firebaseUser) {
        createMobileQuiz({
          userId: firebaseUser.uid,
          title: newQuiz.title,
          category: newQuiz.category,
          questionCount: newQuiz.questions,
          sourceText: text,
        }).then(({ quiz: saved, error }) => {
          if (saved && !error) {
            // Store neonId so future updates/deletes can reference it
            setQuizzes((prev: any[]) =>
              prev.map((q) => q.id === localId ? { ...q, id: saved.id, neonId: saved.id } : q)
            );
          } else {
            console.warn("[NeonSync] quiz create failed:", error);
          }
        });
      }
    } catch (err: any) {
      setImportErrorDetails({
        title: "Invalid File Format",
        message: "The file you uploaded is not formatted correctly. Would you like to watch our short video tutorial to learn how to format your quiz files?",
        details: err.message
      });
    }
  };

  const totalQuestions = selectedQuiz?.questions ?? 0;
  const wrongCount = selectedQuiz?.wrongQuestions?.length ?? 0;
  const unansweredCount = selectedQuiz?.attempts?.length > 0 ? 0 : totalQuestions;

  // Compute how many questions will be used
  const questionCount = (() => {
    switch (selectionMode) {
      case "random":
        return Math.min(randomCount, totalQuestions);
      case "range":
        return Math.max(0, Math.min(rangeEnd, totalQuestions) - Math.max(rangeStart - 1, 0));
      case "unanswered":
        return unansweredCount;
      case "wrong":
        return wrongCount;
      default:
        return totalQuestions;
    }
  })();

  // Add mock quizzes state for dashboard
  // ── Per-user storage keys (guest slot when not logged in) ────────────────
  const storageKey = (type: "quizzes" | "decks", uid?: string | null) =>
    `quizforge_${type}_${uid ?? "guest"}`;

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [flashcardDecks, setFlashcardDecks] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  // Track which uid slot is currently loaded so we know when to switch
  const loadedUidRef = React.useRef<string | null | undefined>(undefined); // undefined = not loaded yet
  // Mirror of quizzes/decks in refs for use inside async callbacks (avoids stale closure)
  const quizzesRef = React.useRef<any[]>([]);
  const decksRef   = React.useRef<any[]>([]);

  // ── Initial load on mount (guest slot) ───────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [qRaw, dRaw] = await Promise.all([
          AsyncStorage.getItem(storageKey("quizzes", null)),
          AsyncStorage.getItem(storageKey("decks", null)),
        ]);
        setQuizzes(qRaw ? JSON.parse(qRaw) : []);
        setFlashcardDecks(dRaw ? JSON.parse(dRaw) : []);
        const sRaw = await AsyncStorage.getItem(`quizforge_starred_guest`);
        if (sRaw) setStarredQuestions(new Set(JSON.parse(sRaw)));
      } catch (e) { console.warn("[Persist] initial load failed:", e); }
      loadedUidRef.current = null;
      setDataLoaded(true);
    })();
  }, []);

  // ── Keep refs in sync + auto-save on every change ───────────────────────
  useEffect(() => {
    quizzesRef.current = quizzes;
    if (!dataLoaded || loadedUidRef.current === undefined) return;
    AsyncStorage.setItem(
      storageKey("quizzes", loadedUidRef.current),
      JSON.stringify(quizzes)
    ).catch(e => console.warn("[Persist] quiz save failed:", e));
  }, [quizzes, dataLoaded]);

  useEffect(() => {
    decksRef.current = flashcardDecks;
    if (!dataLoaded || loadedUidRef.current === undefined) return;
    AsyncStorage.setItem(
      storageKey("decks", loadedUidRef.current),
      JSON.stringify(flashcardDecks)
    ).catch(e => console.warn("[Persist] deck save failed:", e));
  }, [flashcardDecks, dataLoaded]);

  // ── Persist starred questions ────────────────────────────────────────────
  useEffect(() => {
    if (!dataLoaded || loadedUidRef.current === undefined) return;
    AsyncStorage.setItem(
      `quizforge_starred_${loadedUidRef.current ?? "guest"}`,
      JSON.stringify([...starredQuestions])
    ).catch(e => console.warn("[Persist] starred save failed:", e));
  }, [starredQuestions, dataLoaded]);

  const totalAttempts = quizzes.reduce((sum, q) => sum + (q.attempts || []).length, 0);
  const bestScore = quizzes.reduce((max, q) => {
    const qMax = (q.attempts || []).reduce((m: number, a: any) => Math.max(m, a.score), 0);
    return Math.max(max, qMax);
  }, 0);


  // Quiz Creator Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newQuestionsCount, setNewQuestionsCount] = useState("");
  const [creationStep, setCreationStep] = useState<"setup" | "drafting">("setup");
  const [creationMode, setCreationMode] = useState<"pick" | "quiz" | "flashcard">("pick");
  const [fcTitle, setFcTitle] = useState("");
  const [fcCategory, setFcCategory] = useState("");
  const [fcCards, setFcCards] = useState<{ front: string; back: string }[]>([{ front: "", back: "" }]);
  const [fcCurrentIdx, setFcCurrentIdx] = useState(0);
  const [studyingDeck, setStudyingDeck] = useState<any | null>(null);
  const [studyCardIdx, setStudyCardIdx] = useState(0);
  const [studyFlipped, setStudyFlipped] = useState(false);
  const [studyKnownCount, setStudyKnownCount] = useState(0);
  const [studyUnknownCount, setStudyUnknownCount] = useState(0);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const swipeX   = useRef(new Animated.Value(0)).current;
  const [cardType, setCardType] = useState<"Basic" | "Basic (and reversed card)" | "Basic (optional reversed card)" | "Basic (type in the answer)" | "Cloze" | "Image Occlusion">("Basic");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeckReport, setShowDeckReport] = useState<{ deck: any, attempt: any } | null>(null);
  const [isFrontFocused, setIsFrontFocused] = useState(false);
  const [isBackFocused, setIsBackFocused] = useState(false);
  const [isFrontCollapsed, setIsFrontCollapsed] = useState(false);
  const [isBackCollapsed, setIsBackCollapsed] = useState(false);
  const [activeInput, setActiveInput] = useState<"front" | "back">("front");
  const [studyTypedAnswer, setStudyTypedAnswer] = useState("");
  const [studyChecked, setStudyChecked] = useState(false);
  const [draftCurrentIndex, setDraftCurrentIndex] = useState<number>(0);
  const [draftQuestions, setDraftQuestions] = useState<any[]>([]);

  // Custom Modals for Deck Naming and Ellipsis options
  const [showNameDeckModal, setShowNameDeckModal] = useState(false);
  const [deckNameInput, setDeckNameInput] = useState("");
  const [nameDeckAction, setNameDeckAction] = useState<"create" | "rename">("create");
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false);

  const handleOpenQuizOptions = (quiz: any) => {
    setSelectedQuiz(quiz);
    setSelectionMode("all");
    setRandomCount(Math.min(5, quiz.questions));
    setRangeStart(1);
    setRangeEnd(quiz.questions);
    setShuffleQuestions(false);
    setShuffleAnswers(false);
    setShowAnswerOnSubmit(true);
    setTimePerQuestion(null);
  };

  const handleProceedToDrafting = () => {
    if (!newTitle.trim()) {
      if (Platform.OS === "web") {
        alert("Please enter a quiz title.");
      } else {
        Alert.alert("Error", "Please enter a quiz title.");
      }
      return;
    }

    const count = parseInt(newQuestionsCount);
    if (isNaN(count) || count <= 0 || count > 50) {
      if (Platform.OS === "web") {
        alert("Please enter a valid question count between 1 and 50.");
      } else {
        Alert.alert("Error", "Please enter a valid question count between 1 and 50.");
      }
      return;
    }

    // Initialize blank draft questions
    const initialDrafts = [];
    for (let i = 0; i < count; i++) {
      initialDrafts.push({
        prompt: "",
        answers: [
          { id: `o-1-${Date.now()}-${Math.random()}`, text: "", isCorrect: true },
          { id: `o-2-${Date.now()}-${Math.random()}`, text: "", isCorrect: false },
          { id: `o-3-${Date.now()}-${Math.random()}`, text: "", isCorrect: false },
          { id: `o-4-${Date.now()}-${Math.random()}`, text: "", isCorrect: false }
        ]
      });
    }

    setDraftQuestions(initialDrafts);
    setDraftCurrentIndex(0);
    setCreationStep("setup"); // We'll set creationStep to "drafting" next
    setCreationStep("drafting");
  };

  const handleSaveDraftedQuiz = () => {
    // Validation
    const invalidQuestionIdx = draftQuestions.findIndex(q => !q.prompt.trim());
    if (invalidQuestionIdx !== -1) {
      const errMsg = `Please enter a prompt for Question ${invalidQuestionIdx + 1}.`;
      if (Platform.OS === "web") alert(errMsg);
      else Alert.alert("Validation Error", errMsg);
      setDraftCurrentIndex(invalidQuestionIdx);
      return;
    }

    // Validate that each question has at least 2 options filled, and one is correct
    for (let i = 0; i < draftQuestions.length; i++) {
      const q = draftQuestions[i];
      const filledOptions = q.answers.filter((a: any) => a.text.trim());
      if (filledOptions.length < 2) {
        const errMsg = `Question ${i + 1} must have at least 2 non-empty options.`;
        if (Platform.OS === "web") alert(errMsg);
        else Alert.alert("Validation Error", errMsg);
        setDraftCurrentIndex(i);
        return;
      }
      
      const correctFilled = filledOptions.find((a: any) => a.isCorrect);
      if (!correctFilled) {
        const errMsg = `Please select a correct answer amongst the non-empty options for Question ${i + 1}.`;
        if (Platform.OS === "web") alert(errMsg);
        else Alert.alert("Validation Error", errMsg);
        setDraftCurrentIndex(i);
        return;
      }
    }

    // Build the final quiz object
    const finalQuestions = draftQuestions.map((q, qIdx) => {
      const filledOptions = q.answers.filter((a: any) => a.text.trim());
      return {
        id: `q-${Date.now()}-${qIdx}`,
        prompt: q.prompt.trim(),
        answers: filledOptions.map((a: any, aIdx: number) => ({
          id: a.id || `o-${Date.now()}-${qIdx}-${aIdx}`,
          text: a.text.trim(),
          isCorrect: a.isCorrect
        })),
        type: filledOptions.filter((a: any) => a.isCorrect).length > 1 ? ("multiple_choice" as const) : ("single_choice" as const)
      };
    });

    const newQuiz = {
      id: String(Date.now()),
      title: newTitle.trim(),
      category: newCategory.trim() || "General",
      questions: finalQuestions.length,
      time: "Just now",
      questionsList: finalQuestions,
      attempts: [],
      wrongQuestions: [],
      uniqueCorrectIds: []
    };

    setQuizzes([newQuiz, ...quizzes]);
    setNewTitle("");
    setNewCategory("");
    setNewQuestionsCount("");
    setCreationStep("setup");
    
    setShowQuizCreatedModal({ title: newQuiz.title, count: newQuiz.questions });
    setActiveTab("dashboard");
  };

  const updateDraftPrompt = (text: string) => {
    const next = [...draftQuestions];
    if (next[draftCurrentIndex]) {
      next[draftCurrentIndex].prompt = text;
      setDraftQuestions(next);
    }
  };

  const updateDraftOptionText = (optIdx: number, text: string) => {
    const next = [...draftQuestions];
    if (next[draftCurrentIndex] && next[draftCurrentIndex].answers[optIdx]) {
      next[draftCurrentIndex].answers[optIdx].text = text;
      setDraftQuestions(next);
    }
  };

  const selectDraftOptionCorrect = (optIdx: number) => {
    const next = [...draftQuestions];
    if (next[draftCurrentIndex]) {
      next[draftCurrentIndex].answers = next[draftCurrentIndex].answers.map((a: any, idx: number) => ({
        ...a,
        isCorrect: idx === optIdx
      }));
      setDraftQuestions(next);
    }
  };

  const addDraftOption = () => {
    const next = [...draftQuestions];
    if (next[draftCurrentIndex]) {
      const newOptId = `o-add-${Date.now()}-${Math.random()}`;
      next[draftCurrentIndex].answers.push({
        id: newOptId,
        text: "",
        isCorrect: false
      });
      setDraftQuestions(next);
    }
  };

  const deleteDraftOption = (optIdx: number) => {
    const next = [...draftQuestions];
    if (next[draftCurrentIndex]) {
      const answers = next[draftCurrentIndex].answers;
      if (answers.length <= 2) return; // Keep at least 2 options
      
      const removedWasCorrect = answers[optIdx].isCorrect;
      answers.splice(optIdx, 1);
      
      // If the removed option was correct, make the first remaining one correct
      if (removedWasCorrect && answers.length > 0) {
        answers[0].isCorrect = true;
      }
      
      setDraftQuestions(next);
    }
  };

  const handleDraftBack = () => {
    if (draftCurrentIndex > 0) {
      setDraftCurrentIndex(draftCurrentIndex - 1);
    } else {
      setCreationStep("setup");
    }
  };

  const renderActiveSessionView = () => {
    if (!activeSession) return null;

    if (activeSession.isFinished) {
      return renderResultsView();
    }

    const currentIndex = activeSession.currentIndex;
    const currentQuestion = activeSession.questions[currentIndex];
    const totalQs = activeSession.questions.length;

    if (!currentQuestion) {
      return (
        <Animated.View style={[styles.sessionContainer, !settingsDarkMode && styles.lightSessionContainer]}>
          <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>No Questions available</Text>
          <Pressable onPress={() => setActiveSession(null)} style={styles.startQuizBtn}>
            <Text style={styles.startQuizBtnText}>Go Back</Text>
          </Pressable>
        </Animated.View>
      );
    }

    const selectedAnswers = activeSession.answers[currentQuestion.id] || [];
    const isAnswered = selectedAnswers.length > 0;
    const showResult = activeSession.showAnswerOnSubmit && (activeSession.submitted || []).includes(currentQuestion.id);

    return (
      <View style={[styles.sessionContainer, !settingsDarkMode && styles.lightSessionContainer]}>
        {/* Session Header */}
        <View style={styles.sessionHeader}>
          <Pressable
            onPress={() => setShowQuitConfirm(true)}
            style={[styles.sessionCloseBtn, !settingsDarkMode && { backgroundColor: "rgba(0, 0, 0, 0.05)" }]}
          >
            <Ionicons name="close" size={24} color={settingsDarkMode ? "#ffffff" : "#0d0f14"} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.sessionQuizTitle, !settingsDarkMode && styles.lightText]} numberOfLines={1}>
              {activeSession.quizTitle}
            </Text>
            <Text style={[styles.sessionProgressText, !settingsDarkMode && styles.lightTextSub]}>
              Question {currentIndex + 1} of {totalQs}
            </Text>
          </View>
          {/* Timer + Star */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {activeSession.timePerQuestion !== null && (
              <View style={styles.sessionTimerBox}>
                <Ionicons name="time-outline" size={16} color="#6366f1" style={{ marginRight: 4 }} />
                <Text style={styles.sessionTimerText}>{sessionTimeLeft}s</Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                const qId = currentQuestion.id;
                setStarredQuestions(prev => {
                  const next = new Set(prev);
                  if (next.has(qId)) next.delete(qId); else next.add(qId);
                  return next;
                });
              }}
              style={({ pressed }) => [{ padding: 8, borderRadius: 10,
                backgroundColor: starredQuestions.has(currentQuestion.id)
                  ? "rgba(245,158,11,0.15)" : "transparent"
              }, pressed && styles.pressedScale]}
            >
              <Ionicons
                name={starredQuestions.has(currentQuestion.id) ? "star" : "star-outline"}
                size={20}
                color={starredQuestions.has(currentQuestion.id) ? "#f59e0b" : (settingsDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)")}
              />
            </Pressable>
          </View>
        </View>

        {/* Progress bar */}
        <View style={[styles.progressBarBg, !settingsDarkMode && styles.lightProgressBg]}>
          <View style={[styles.progressBarFill, { width: `${((currentIndex + 1) / totalQs) * 100}%` }]} />
        </View>

        <ScrollView 
          style={styles.sessionScroll} 
          contentContainerStyle={styles.sessionScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Prompt */}
          <View style={[styles.sessionQuestionCard, !settingsDarkMode && styles.lightCard]}>
            <View style={questionIndexRowStyle(showResult, selectedAnswers, currentQuestion)}>
              <View style={styles.questionIndexCircle}>
                <Text style={styles.questionIndexCircleText}>{currentIndex + 1}</Text>
              </View>
              <Text style={[styles.questionTypeHelpText, !settingsDarkMode && styles.lightTextSub]}>
                {currentQuestion.type === "multiple_choice" ? "Select all correct options" : "Choose the correct option"}
              </Text>
            </View>
            <Text style={[styles.questionPromptText, !settingsDarkMode && styles.lightText]}>{currentQuestion.prompt}</Text>
          </View>

          {/* Option Buttons */}
          <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub]}>Options</Text>
          <View style={styles.sessionOptionsContainer}>
            {currentQuestion.answers.map((answer: any, idx: number) => {
              const isSelected = selectedAnswers.includes(answer.id);
              const correctHighlight = showResult && answer.isCorrect;
              const wrongHighlight = showResult && isSelected && !answer.isCorrect;

              return (
                <Pressable
                  key={answer.id}
                  disabled={showResult}
                  onPress={() => handleAnswerSelect(currentQuestion, answer.id)}
                  style={({ pressed }) => [
                    styles.sessionOptionBtn,
                    !settingsDarkMode && styles.lightCard,
                    isSelected && styles.sessionOptionBtnSelected,
                    correctHighlight && styles.sessionOptionBtnCorrect,
                    wrongHighlight && styles.sessionOptionBtnWrong,
                    pressed && !showResult && styles.pressedScale,
                  ]}
                >
                  <View style={[
                    styles.optionLetterBox,
                    !settingsDarkMode && { backgroundColor: "rgba(0, 0, 0, 0.05)" },
                    isSelected && styles.optionLetterBoxSelected,
                    correctHighlight && styles.optionLetterBoxCorrect,
                    wrongHighlight && styles.optionLetterBoxWrong,
                  ]}>
                    {correctHighlight ? (
                      <Ionicons name="checkmark" size={14} color="#00e5a0" />
                    ) : wrongHighlight ? (
                      <Ionicons name="close" size={14} color="#ef4444" />
                    ) : (
                      <Text style={[
                        styles.optionLetterText,
                        !settingsDarkMode && styles.lightText,
                        isSelected && { color: "#000000" }
                      ]}>
                        {String.fromCharCode(65 + idx)}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.optionContentText, !settingsDarkMode && styles.lightText]}>{answer.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        {/* Footer Navigation Bar */}
        <View style={[styles.sessionFooter, !settingsDarkMode && styles.lightBorderTop]}>
          <Pressable
            disabled={currentIndex === 0}
            onPress={() => handleNavigateSession(currentIndex - 1)}
            style={({ pressed }) => [
              styles.sessionNavBtn,
              !settingsDarkMode && styles.lightCard,
              currentIndex === 0 && styles.sessionNavBtnDisabled,
              pressed && currentIndex !== 0 && styles.pressedScale,
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={currentIndex === 0 ? (settingsDarkMode ? "#444" : "#ccc") : (settingsDarkMode ? "#ffffff" : "#0d0f14")} />
            <Text style={[styles.sessionNavBtnText, !settingsDarkMode && styles.lightText, currentIndex === 0 && { color: settingsDarkMode ? "#444" : "#ccc" }]}>Prev</Text>
          </Pressable>

          {activeSession.showAnswerOnSubmit && currentQuestion.type === "multiple_choice" && !(activeSession.submitted || []).includes(currentQuestion.id) ? (
            <Pressable
              disabled={selectedAnswers.length === 0}
              onPress={() => handleCheckAnswer(currentQuestion.id)}
              style={({ pressed }) => [
                styles.sessionNavBtn,
                styles.finishSessionBtn,
                selectedAnswers.length === 0 && styles.sessionNavBtnDisabled,
                pressed && selectedAnswers.length > 0 && styles.pressedScale,
              ]}
            >
              <Ionicons name="checkmark-circle" size={18} color="#000000" />
              <Text style={[styles.sessionNavBtnText, { color: "#000000", fontWeight: "bold" }]}>Submit</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                if (currentIndex < totalQs - 1) {
                  handleNavigateSession(currentIndex + 1);
                } else {
                  handleFinishSession();
                }
              }}
              style={({ pressed }) => [
                styles.sessionNavBtn,
                !settingsDarkMode && currentIndex !== totalQs - 1 && styles.lightCard,
                currentIndex === totalQs - 1 ? styles.finishSessionBtn : null,
                pressed && styles.pressedScale,
              ]}
            >
              <Text style={[
                styles.sessionNavBtnText,
                !settingsDarkMode && currentIndex !== totalQs - 1 && styles.lightText,
                currentIndex === totalQs - 1 ? { color: "#000000", fontWeight: "bold" } : null
              ]}>
                {currentIndex === totalQs - 1 ? "Finish" : "Next"}
              </Text>
              {currentIndex < totalQs - 1 ? (
                <Ionicons name="chevron-forward" size={18} color={settingsDarkMode ? "#ffffff" : "#0d0f14"} />
              ) : (
                <Ionicons name="flag-outline" size={16} color="#000000" />
              )}
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderResultsView = () => {
    if (!activeSession) return null;

    const questions = activeSession.questions;
    const totalQs = questions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const wrongQsForQuiz: any[] = [];

    questions.forEach((q: any) => {
      const selected = activeSession.answers[q.id] || [];
      if (selected.length === 0) {
        skippedCount++;
      } else {
        const correctIds = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
        const isAllCorrect = selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
        if (isAllCorrect) {
          correctCount++;
        } else {
          wrongCount++;
          const correctText = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.text).join(", ");
          const selectedText = q.answers.filter((a: any) => selected.includes(a.id)).map((a: any) => a.text).join(", ");
          wrongQsForQuiz.push({
            id: q.id,
            prompt: q.prompt,
            selected: selectedText,
            correct: correctText,
          });
        }
      }
    });

    const wrongQuestionObjects = questions.filter((q: any) => {
      const selected = activeSession.answers[q.id] || [];
      if (selected.length === 0) return true;
      const correctIds = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
      const isAllCorrect = selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
      return !isAllCorrect;
    });

    const handleReattemptWrong = () => {
      if (wrongQuestionObjects.length === 0) return;
      setActiveSession({
        ...activeSession,
        questions: wrongQuestionObjects,
        currentIndex: 0,
        answers: {},
        submitted: [] as string[],
        isFinished: false,
        startedAt: Date.now()
      });
      setShowWrongReview(false);
    };

    const handleRetakeEntire = () => {
      const origQuiz = quizzes.find((q: any) => q.id === activeSession.quizId);
      const title = origQuiz ? origQuiz.title : activeSession.quizTitle;
      
      let qsList = origQuiz && origQuiz.questionsList && origQuiz.questionsList.length > 0
        ? [...origQuiz.questionsList]
        : [...activeSession.questions];
        
      if (qsList.length === 0) {
        qsList = generateMockQuestionsForQuiz(title, origQuiz ? origQuiz.questions : activeSession.questions.length);
      }

      if (activeSession.shuffleQuestions) {
        qsList = qsList.sort(() => Math.random() - 0.5);
      }
      if (activeSession.shuffleAnswers) {
        qsList = qsList.map((q: any) => ({
          ...q,
          answers: [...q.answers].sort(() => Math.random() - 0.5)
        }));
      }

      setActiveSession({
        quizId: activeSession.quizId,
        quizTitle: title,
        questions: qsList,
        selectionMode: activeSession.selectionMode || "all",
        shuffleQuestions: activeSession.shuffleQuestions || false,
        shuffleAnswers: activeSession.shuffleAnswers || false,
        showAnswerOnSubmit: activeSession.showAnswerOnSubmit !== false,
        timePerQuestion: activeSession.timePerQuestion || null,
        currentIndex: 0,
        answers: {},
        submitted: [] as string[],
        isFinished: false,
        startedAt: Date.now()
      });
      setShowWrongReview(false);
    };

    const answeredCount = correctCount + wrongCount;
    const scorePct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
    const xpGained = correctCount * 20;

    return (
      <ScrollView 
        style={[styles.sessionContainer, !settingsDarkMode && styles.lightSessionContainer]} 
        contentContainerStyle={styles.resultsScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resultsHeader}>
          <View style={styles.resultsIconCircle}>
            <Ionicons name="trophy" size={48} color="#00e5a0" />
          </View>
          <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>Quiz Results</Text>
          <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub]}>Performance Summary</Text>
        </View>

        {/* Score Ring / Panel */}
        <View style={[styles.scoreSummaryCard, !settingsDarkMode && styles.lightCard]}>
          <Text style={styles.scoreTextBig}>{scorePct}%</Text>
          <Text style={[styles.scoreSubText, !settingsDarkMode && styles.lightText]}>
            {correctCount} of {totalQs} Correct
          </Text>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{xpGained} XP GAINED</Text>
          </View>
        </View>

        {/* Detailed Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.miniStatCard, !settingsDarkMode && styles.lightCard]}>
            <Text style={[styles.miniStatLabel, !settingsDarkMode && styles.lightTextSub]}>Correct</Text>
            <Text style={[styles.miniStatValue, { color: "#00e5a0" }]}>{correctCount}</Text>
          </View>
          <View style={[styles.miniStatCard, !settingsDarkMode && styles.lightCard]}>
            <Text style={[styles.miniStatLabel, !settingsDarkMode && styles.lightTextSub]}>Wrong</Text>
            <Text style={[styles.miniStatValue, { color: "#ef4444" }]}>{wrongCount}</Text>
          </View>
          <View style={[styles.miniStatCard, !settingsDarkMode && styles.lightCard]}>
            <Text style={[styles.miniStatLabel, !settingsDarkMode && styles.lightTextSub]}>Skipped</Text>
            <Text style={[styles.miniStatValue, !settingsDarkMode && styles.lightText]}>{skippedCount}</Text>
          </View>
        </View>

        {/* Collapsible Wrong Answers Review */}
        {wrongQsForQuiz.length > 0 && (
          <View style={{ width: "100%", marginVertical: 12 }}>
            <Pressable
              onPress={() => setShowWrongReview(!showWrongReview)}
              style={({ pressed }) => [
                styles.actionBtnRow,
                !settingsDarkMode && styles.lightCard,
                { justifyContent: "space-between", height: 48 },
                pressed && styles.opacityPress
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="eye-outline" size={18} color={settingsDarkMode ? "#cccccc" : "#0d0f14"} />
                <Text style={[styles.actionBtnRowText, !settingsDarkMode && styles.lightText]}>Review Incorrect Questions ({wrongQsForQuiz.length})</Text>
              </View>
              <Feather name={showWrongReview ? "chevron-up" : "chevron-down"} size={18} color={settingsDarkMode ? "#cccccc" : "#0d0f14"} />
            </Pressable>

            {showWrongReview && (
              <View style={[styles.guideStepCard, { marginTop: 8, marginBottom: 0 }, !settingsDarkMode && styles.lightCard]}>
                {wrongQsForQuiz.map((q: any, idx: number) => (
                  <View key={q.id} style={[styles.wrongQuestionItem, idx === wrongQsForQuiz.length - 1 && { borderBottomWidth: 0 }, !settingsDarkMode && styles.lightBorder]}>
                    <Text style={[styles.wrongQuestionPrompt, !settingsDarkMode && styles.lightText]}>{idx + 1}. {q.prompt}</Text>
                    <Text style={styles.wrongAnswerText}>Your answer: {q.selected || "(Skipped)"}</Text>
                    <Text style={styles.correctAnswerText}>Correct: {q.correct}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={{ gap: 12, marginTop: 12, width: "100%", paddingBottom: 40 }}>
          {wrongQsForQuiz.length > 0 && (
            <Pressable
              onPress={handleReattemptWrong}
              style={({ pressed }) => [
                styles.startQuizBtn,
                { backgroundColor: "#3b82f6", shadowColor: "#3b82f6" },
                pressed && styles.opacityPress
              ]}
            >
              <Ionicons name="refresh" size={18} color="#ffffff" />
              <Text style={[styles.startQuizBtnText, { color: "#ffffff" }]}>Re-attempt Wrong Questions</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleRetakeEntire}
            style={({ pressed }) => [
              styles.startQuizBtn,
              pressed && styles.opacityPress
            ]}
          >
            <Ionicons name="play" size={18} color="#000000" />
            <Text style={styles.startQuizBtnText}>Retake Entire Quiz</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              const attempt = {
                id: String(Date.now()),
                score: scorePct,
                correct: correctCount,
                wrong: wrongCount,
                skipped: skippedCount,
                timestamp: Date.now()
              };
              
              const correctIdsInSession = activeSession.questions
                .filter((q: any) => !wrongQsForQuiz.find((wq) => wq.id === q.id))
                .map((q: any) => q.id);

              const updatedQuizzes = quizzes.map((q: any) => {
                if (q.id === activeSession.quizId) {
                  const currentUnique = q.uniqueCorrectIds || [];
                  const updatedUniqueCorrectIds = Array.from(new Set([...currentUnique, ...correctIdsInSession]));
                  return {
                    ...q,
                    attempts: [attempt, ...(q.attempts || [])],
                    wrongQuestions: wrongQsForQuiz,
                    uniqueCorrectIds: updatedUniqueCorrectIds
                  };
                }
                return q;
              });

              setQuizzes(updatedQuizzes);
              setViewingInsightsQuiz(updatedQuizzes.find((q: any) => q.id === activeSession.quizId));
              setActiveSession(null);

              // Push updated attempts to Neon if logged in
              const updatedQ = updatedQuizzes.find((q: any) => q.id === activeSession.quizId);
              const neonId = updatedQ?.neonId ?? updatedQ?.id;
              if (firebaseUser && neonId && !String(neonId).startsWith("local_")) {
                updateMobileQuiz({
                  userId: firebaseUser.uid,
                  quizId: neonId,
                  attempts: updatedQ.attempts,
                  wrongQuestions: updatedQ.wrongQuestions,
                  uniqueCorrectIds: updatedQ.uniqueCorrectIds,
                }).catch((err) => console.warn("[NeonSync] quiz attempt update failed:", err));
              }
            }}
            style={[styles.startQuizBtn, { backgroundColor: settingsDarkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)", shadowOpacity: 0 }]}
          >
            <Text style={[styles.startQuizBtnText, { color: settingsDarkMode ? "#ffffff" : "#0d0f14" }]}>Exit to Library</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  // ── Derive a friendly display name from auth user ───────────────────────
  const getUserFirstName = (user: typeof firebaseUser | null): string => {
    if (!user) return "User";
    if (user.displayName) return user.displayName.split(" ")[0];
    if (user.email) {
      // e.g. "shashi.anand25@gmail.com" → "Shashi"
      const localPart = user.email.split("@")[0];          // shashi.anand25
      const namePart  = localPart.split(/[._\-+0-9]/)[0]; // shashi
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return "User";
  };

  const getUserFullName = (user: typeof firebaseUser | null): string => {
    if (!user) return "QuizForge User";
    if (user.displayName) return user.displayName;
    if (user.email) {
      const localPart = user.email.split("@")[0];
      // Convert shashi.anand25 → "Shashi Anand"
      const parts = localPart.split(/[._\-+]/).filter(p => p.replace(/\d/g, "").length > 0);
      return parts.map(p => p.replace(/\d+/g, "").charAt(0).toUpperCase() + p.replace(/\d+/g, "").slice(1)).join(" ");
    }
    return "QuizForge User";
  };

  const getUserInitial = (user: typeof firebaseUser | null): string => {
    const name = getUserFullName(user);
    return name.charAt(0).toUpperCase();
  };

  // Render Sub-Views based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case "insights":
        return renderInsightsView();

      case "dashboard": {
        const isDark = settingsDarkMode;
        const bg     = isDark ? "#0a0a0f" : "#f4f4f8";
        const card   = isDark ? "#111118" : "#ffffff";
        const border = isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)";
        const border2 = isDark ? "#2a2a4a" : "rgba(99,102,241,0.15)";
        const txt    = isDark ? "#f1f0ff" : "#0d0f14";
        const muted  = isDark ? "#8e8e9e" : "#666677";

        const totalAttempts  = quizzes.reduce((s, q) => s + (q.attempts || []).length, 0);
        const totalQuestions = quizzes.reduce((s, q) => s + (q.questions || 0), 0);
        const avgScore = totalAttempts > 0
          ? Math.round(quizzes.flatMap(q => q.attempts || []).reduce((s: number, a: any) => s + a.score, 0) / totalAttempts)
          : 0;

        // For starred block
        const starredQList = quizzes.flatMap(q =>
          (q.questionsList || []).filter((qs: any) => starredQuestions.has(qs.id)).map((qs: any) => ({ ...qs, quizId: q.id }))
        );
        const starredQuizObj = {
          id: "__starred__", title: "Starred Questions",
          questions: starredQList.length, questionsList: starredQList, attempts: [],
        };



        return (
          <ScrollView
            style={{ flex: 1, backgroundColor: bg }}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Subtle top glow ── */}
            <View style={{ position: "absolute", top: -60, left: "50%", marginLeft: -120,
              width: 240, height: 240, borderRadius: 120,
              backgroundColor: "rgba(99,102,241,0.08)" }} pointerEvents="none" />

            {/* ── Header ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 4 }}>
              <Text style={{ fontSize: 26, fontWeight: "600", letterSpacing: -0.5,
                color: txt, lineHeight: 30 }}>
                {getUserFirstName(firebaseUser)}
              </Text>
            </View>

            {/* ── Hero card ── */}
            <View style={{
              marginHorizontal: 20, marginTop: 20,
              backgroundColor: isDark ? "#16162a" : "#ffffff",
              borderRadius: 20,
              borderWidth: 1, borderColor: border2,
              padding: 20, overflow: "hidden",
            }}>
              {/* Top accent line */}
              <View style={{ position: "absolute", top: 0, left: 20, right: 20, height: 1,
                backgroundColor: isDark ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)" }} />

              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.5,
                color: "#6366f1", textTransform: "uppercase", marginBottom: 12 }}>
                Overview
              </Text>

              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
                  <Text style={{ fontSize: 48, fontWeight: "600", color: txt, letterSpacing: -2, lineHeight: 52 }}>
                    {avgScore}
                  </Text>
                  <Text style={{ fontSize: 20, color: muted, marginBottom: 8, fontWeight: "300" }}>%</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 11, color: muted }}>{totalAttempts} attempt{totalAttempts !== 1 ? "s" : ""}</Text>
                  <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                    across {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 10, color: muted, letterSpacing: 0.5 }}>Progress</Text>
                  <Text style={{ fontSize: 10, color: muted, letterSpacing: 0.5 }}>
                    {totalAttempts > 0 ? `${avgScore} / 100` : "0 / 0"}
                  </Text>
                </View>
                <View style={{ height: 3, backgroundColor: isDark ? "#1e1e3a" : "rgba(0,0,0,0.06)", borderRadius: 2 }}>
                  <View style={{ height: 3, borderRadius: 2, width: `${avgScore}%` as any,
                    backgroundColor: "#6366f1" }} />
                </View>
              </View>
            </View>

            {/* ── Stats grid — 3 cells ── */}
            <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 20, marginTop: 12 }}>
              {[
                { label: "QUIZZES",   value: String(quizzes.length),        icon: "layers-outline"      as const },
                { label: "QUESTIONS", value: String(totalQuestions),         icon: "help-circle-outline" as const },
                { label: "DECKS",     value: String(flashcardDecks.length),  icon: "copy-outline"        as const },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, backgroundColor: card,
                  borderWidth: 1, borderColor: border, borderRadius: 14,
                  paddingVertical: 14, paddingHorizontal: 12, alignItems: "center" }}>
                  <Ionicons name={s.icon} size={16} color="#6366f1" style={{ marginBottom: 6 }} />
                  <Text style={{ fontSize: 20, fontWeight: "600", color: txt, letterSpacing: -0.5 }}>{s.value}</Text>
                  <Text style={{ fontSize: 9, color: muted, textTransform: "uppercase",
                    letterSpacing: 0.8, marginTop: 2, fontWeight: "300" }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* ── Starred ── */}
            {starredQList.length > 0 && (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between",
                  alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.2, color: muted, textTransform: "uppercase" }}>
                    Starred
                  </Text>
                </View>
                <Pressable
                  onPress={() => playQuizDirectly(starredQuizObj, "all")}
                  style={({ pressed }) => [{
                    marginHorizontal: 20,
                    backgroundColor: isDark ? "#0f0f1a" : "#ffffff",
                    borderWidth: 1, borderColor: isDark ? "#2a2a4a" : "rgba(0,0,0,0.07)",
                    borderRadius: 16, padding: 16,
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  }, pressed && styles.pressedScale]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10,
                      backgroundColor: "rgba(234,179,8,0.1)",
                      alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="star" size={17} color="#eab308" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: txt }}>Starred Questions</Text>
                      <Text style={{ fontSize: 11, color: muted, marginTop: 2, fontWeight: "300" }}>
                        {starredQList.length} question{starredQList.length !== 1 ? "s" : ""} saved
                      </Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: "#6366f1", borderRadius: 10,
                    paddingHorizontal: 14, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: "500", color: "#fff" }}>Attempt</Text>
                  </View>
                </Pressable>
              </>
            )}

            {/* ── All Quizzes ── */}
            <View style={{ flexDirection: "row", justifyContent: "space-between",
              alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.2, color: muted, textTransform: "uppercase" }}>
                All Quizzes
              </Text>
            </View>

            <View style={{ paddingHorizontal: 20, gap: 8 }}>
              {quizzes.map((quiz) => {
                const attempts = quiz.attempts || [];
                const uniqueCount = (quiz.uniqueCorrectIds || []).length;
                const qCount = quiz.questions || 1;
                const completionPct = attempts.length > 0 ? Math.min(Math.round((uniqueCount / qCount) * 100), 100) : null;
                return (
                  <Pressable
                    key={quiz.id}
                    onPress={() => { setViewingInsightsQuiz(quiz); setViewingInsightsQuizFromTab("dashboard"); setActiveTab("insights"); }}
                    style={({ pressed }) => [{
                      backgroundColor: card,
                      borderWidth: 1, borderColor: border,
                      borderRadius: 16, padding: 16, paddingLeft: 20,
                      overflow: "hidden",
                    }, pressed && styles.pressedScale]}
                  >
                    <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: "#6366f1" }} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: "500", color: txt }} numberOfLines={1}>
                          {quiz.title}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 5, flexWrap: "wrap" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#6366f1" }} />
                            <Text style={{ fontSize: 10, color: muted }}>{quiz.questions} questions</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#6366f1" }} />
                            <Text style={{ fontSize: 10, color: muted }}>
                              {attempts.length} attempt{attempts.length !== 1 ? "s" : ""}
                            </Text>
                          </View>
                        </View>
                      </View>
                      {completionPct !== null && (
                        <View style={{ backgroundColor: "rgba(99,102,241,0.1)", borderRadius: 6,
                          paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 12, color: "#6366f1" }}>{completionPct}%</Text>
                        </View>
                      )}
                    </View>
                    {/* Mini progress bar */}
                    <View style={{ height: 2, backgroundColor: isDark ? "#1e1e2e" : "rgba(0,0,0,0.06)", borderRadius: 2 }}>
                      {completionPct !== null && (
                        <View style={{ height: 2, borderRadius: 2, width: `${completionPct}%` as any, backgroundColor: "#6366f1" }} />
                      )}
                    </View>
                  </Pressable>
                );
              })}

            </View>
          </ScrollView>
        );
      }

      case "add": {
        // ── Type picker ──────────────────────────────────────────
        if (creationMode === "pick") {
          return (
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <View style={styles.tabHeader}>
                <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>Create</Text>
                <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub]}>What would you like to make?</Text>
              </View>

              {/* Quiz card */}
              <Pressable
                onPress={() => setCreationMode("quiz")}
                style={({ pressed }) => [{
                  marginHorizontal: 16, marginBottom: 14, borderRadius: 20, overflow: "hidden",
                  backgroundColor: settingsDarkMode ? "#141625" : "#ffffff",
                  borderWidth: 1, borderColor: settingsDarkMode ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.2)",
                  borderBottomWidth: 3, borderBottomColor: "#6366f1",
                  shadowColor: "#6366f1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 6,
                }, pressed && styles.pressedScale]}
              >
                <View style={{ padding: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(99,102,241,0.12)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="checkbox-outline" size={24} color="#6366f1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[{ fontSize: 17, fontWeight: "800", letterSpacing: -0.2 }, !settingsDarkMode && styles.lightText]}>Quiz</Text>
                      <Text style={{ fontSize: 12, color: "#6e727a", marginTop: 2 }}>Multiple-choice questions</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#6366f1" />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {["Timed mode", "Shuffle", "Wrong review", "Multi-select"].map(tag => (
                      <View key={tag} style={{ backgroundColor: "rgba(99,102,241,0.1)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, color: "#6366f1", fontWeight: "600" }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>

              {/* Flashcards card */}
              <Pressable
                onPress={() => setCreationMode("flashcard")}
                style={({ pressed }) => [{
                  marginHorizontal: 16, marginBottom: 14, borderRadius: 20, overflow: "hidden",
                  backgroundColor: settingsDarkMode ? "#141625" : "#ffffff",
                  borderWidth: 1, borderColor: settingsDarkMode ? "rgba(0,229,160,0.25)" : "rgba(0,180,120,0.2)",
                  borderBottomWidth: 3, borderBottomColor: "#00e5a0",
                  shadowColor: "#00e5a0", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
                }, pressed && styles.pressedScale]}
              >
                <View style={{ padding: 20 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: "rgba(0,229,160,0.1)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="copy-outline" size={24} color="#00e5a0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[{ fontSize: 17, fontWeight: "800", letterSpacing: -0.2 }, !settingsDarkMode && styles.lightText]}>Flashcards</Text>
                      <Text style={{ fontSize: 12, color: "#6e727a", marginTop: 2 }}>Flip-card study decks</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#00e5a0" />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {["Front & back", "Flip to reveal", "Deck mode", "Quick recall"].map(tag => (
                      <View key={tag} style={{ backgroundColor: "rgba(0,229,160,0.08)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, color: "#00e5a0", fontWeight: "600" }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={{ height: 3, backgroundColor: "#00e5a0", borderRadius: 0 }} />
              </Pressable>
            </ScrollView>
          );
        }

        // ── Flashcard creation flow ───────────────────────────────
        if (creationMode === "flashcard") {
          const currentCard = fcCards[fcCurrentIdx] || { front: "", back: "" };
          const updateFront = (t: string) => { const c = [...fcCards]; c[fcCurrentIdx] = { ...c[fcCurrentIdx], front: t }; setFcCards(c); };
          const updateBack  = (t: string) => { const c = [...fcCards]; c[fcCurrentIdx] = { ...c[fcCurrentIdx], back: t };  setFcCards(c); };
          const addCard = () => { setFcCards([...fcCards, { front: "", back: "" }]); setFcCurrentIdx(fcCards.length); };
          const saveDeck = async () => {
            // Force deck selection if creating new and no deck chosen
            if (!editingDeckId && !fcTitle.trim()) {
              setShowDeckPicker(true);
              return;
            }
            const finalTitle = fcTitle.trim() || "Untitled Deck";
            const filled = fcCards.filter(c => c.front.trim() || c.back.trim());
            if (filled.length === 0) return;

            let finalCards = [...filled];
            if (cardType === "Basic (and reversed card)") {
              finalCards = [];
              filled.forEach(c => {
                finalCards.push({ front: c.front, back: c.back });
                finalCards.push({ front: c.back, back: c.front });
              });
            }

            if (editingDeckId) {
              // ── Update existing deck ──
              const updatedLocal = { ...flashcardDecks.find(d => d.id === editingDeckId), title: finalTitle, cards: finalCards, cardType };
              setFlashcardDecks(flashcardDecks.map(d => d.id === editingDeckId ? updatedLocal : d));

              // Sync update to Neon if logged in
              if (firebaseUser && updatedLocal?.neonId) {
                updateFlashcardDeck({
                  userId: firebaseUser.uid,
                  deckId: updatedLocal.neonId,
                  title: finalTitle,
                  cardType,
                  cards: finalCards,
                }).catch(err => console.warn("[NeonSync] deck update failed:", err));
              }
              setEditingDeckId(null);
            } else {
              // ── Create new deck ──
              const localId = String(Date.now());
              const deck: any = { id: localId, neonId: null, title: finalTitle, category: "General", cards: finalCards, cardType, type: "flashcard" };
              setFlashcardDecks([deck, ...flashcardDecks]);

              // Sync to Neon if logged in — replace local id with server id
              if (firebaseUser) {
                createFlashcardDeck({
                  userId: firebaseUser.uid,
                  title: finalTitle,
                  cardType,
                  cards: finalCards,
                }).then(({ deck: neonDeck, error }) => {
                  if (neonDeck && !error) {
                    // Replace the local deck with the server-assigned id
                    setFlashcardDecks(prev => prev.map(d =>
                      d.id === localId ? { ...d, id: neonDeck.id, neonId: neonDeck.id } : d
                    ));
                  } else {
                    console.warn("[NeonSync] deck create failed:", error);
                  }
                });
              }
            }
            setFcTitle(""); setFcCards([{ front: "", back: "" }]); setFcCurrentIdx(0);
            setCreationMode("pick");
            setActiveTab("flashcards");
          };

          const insertFormatting = (type: string) => {
            const isFront = activeInput === "front";
            const text = isFront ? currentCard.front : currentCard.back;
            const updateFn = isFront ? updateFront : updateBack;
            
            let insertedText = "";
            switch (type) {
              case "bold":
                insertedText = "**bold**";
                break;
              case "italic":
                insertedText = "*italic*";
                break;
              case "underline":
                insertedText = "<u>underline</u>";
                break;
              case "hr":
                insertedText = "\n---\n";
                break;
              case "formula":
                insertedText = "$$formula$$";
                break;
              case "color":
                insertedText = '<span style="color:#ef4444">color</span>';
                break;
              case "size":
                insertedText = '<span style="font-size:20px">large</span>';
                break;
              default:
                break;
            }
            updateFn(text + insertedText);
          };

          return (
            <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0a0a0f" : "#f4f4f8" }}>
              {/* Header Bar */}
              <View style={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
                backgroundColor: settingsDarkMode ? "#0a0a0f" : "#f4f4f8",
              }}>
                <Pressable
                  onPress={() => { setEditingDeckId(null); setCreationMode("pick"); setActiveTab("flashcards"); }}
                  style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                    backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
                  }, pressed && styles.pressedScale]}
                >
                  <Ionicons name="arrow-back" size={20} color={settingsDarkMode ? "#ffffff" : "#0d0f14"} />
                </Pressable>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14" }} numberOfLines={1}>
                    {fcTitle.trim() || (editingDeckId ? (flashcardDecks.find(d => d.id === editingDeckId)?.title || "Edit Deck") : "New Deck")}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#6e727a", marginTop: 1 }}>
                    {fcCards.length} {fcCards.length === 1 ? "card" : "cards"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Pressable onPress={() => setShowPreviewModal(true)}
                    style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                      backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
                    }, pressed && styles.pressedScale]}>
                    <Ionicons name="eye-outline" size={20} color={settingsDarkMode ? "#ffffff" : "#0d0f14"} />
                  </Pressable>
                  <Pressable onPress={() => setShowEllipsisMenu(true)}
                    style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                      backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
                    }, pressed && styles.pressedScale]}>
                    <Ionicons name="ellipsis-vertical" size={20} color={settingsDarkMode ? "#ffffff" : "#0d0f14"} />
                  </Pressable>
                </View>
              </View>

              {/* Deck selector pill */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <Pressable onPress={() => setShowDeckPicker(true)}
                  style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 8,
                    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
                    backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                    borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)",
                    alignSelf: "flex-start",
                  }, pressed && styles.pressedScale]}>
                  <Ionicons name="layers-outline" size={14} color={settingsDarkMode ? "#aaaacc" : "#666680"} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: settingsDarkMode ? "#ccccdd" : "#44445a" }}>
                    {editingDeckId ? (flashcardDecks.find(d => d.id === editingDeckId)?.title || "study") : (fcTitle.trim() || "Select Deck")}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={settingsDarkMode ? "#888899" : "#9999aa"} />
                </Pressable>
              </View>

              {/* Card editing area */}
              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>

                {/* Card nav header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: settingsDarkMode ? "#6e727a" : "#888899" }}>
                    Card {fcCurrentIdx + 1} of {fcCards.length}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Pressable disabled={fcCurrentIdx === 0} onPress={() => setFcCurrentIdx(fcCurrentIdx - 1)}
                      style={({ pressed }) => [{ padding: 6, borderRadius: 8,
                        backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                        opacity: fcCurrentIdx === 0 ? 0.3 : 1,
                      }, pressed && styles.pressedScale]}>
                      <Ionicons name="chevron-back" size={18} color={settingsDarkMode ? "#fff" : "#000"} />
                    </Pressable>
                    <Pressable disabled={fcCurrentIdx === fcCards.length - 1} onPress={() => setFcCurrentIdx(fcCurrentIdx + 1)}
                      style={({ pressed }) => [{ padding: 6, borderRadius: 8,
                        backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                        opacity: fcCurrentIdx === fcCards.length - 1 ? 0.3 : 1,
                      }, pressed && styles.pressedScale]}>
                      <Ionicons name="chevron-forward" size={18} color={settingsDarkMode ? "#fff" : "#000"} />
                    </Pressable>
                  </View>
                </View>

                {/* Front card */}
                <View style={{
                  borderRadius: 16, marginBottom: 10,
                  backgroundColor: settingsDarkMode ? "#22223a" : "#f8f8ff",
                  borderWidth: 1,
                  borderColor: isFrontFocused
                    ? "rgba(99,102,241,0.5)"
                    : (settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                  overflow: "hidden",
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1,
                      color: settingsDarkMode ? "#5a5a6e" : "#a0a0b0" }}>FRONT</Text>
                    <Pressable onPress={() => setIsFrontCollapsed(!isFrontCollapsed)} hitSlop={8}>
                      <Ionicons name={isFrontCollapsed ? "chevron-down" : "chevron-up"} size={15}
                        color={settingsDarkMode ? "#4a4a5a" : "#b0b0c0"} />
                    </Pressable>
                  </View>
                  {!isFrontCollapsed && (
                    <TextInput multiline
                      onFocus={() => { setIsFrontFocused(true); setActiveInput("front"); }}
                      onBlur={() => setIsFrontFocused(false)}
                      style={{ fontSize: 16, lineHeight: 24,
                        color: settingsDarkMode ? "#ffffff" : "#0d0f14",
                        minHeight: 80, textAlignVertical: "top",
                        paddingHorizontal: 14, paddingBottom: 14 }}
                      placeholder="Enter term or question..."
                      placeholderTextColor={settingsDarkMode ? "#32323e" : "#c8c8d4"}
                      value={currentCard.front} onChangeText={updateFront} />
                  )}
                </View>

                {/* Back card */}
                <View style={{
                  borderRadius: 16, marginBottom: 16,
                  backgroundColor: settingsDarkMode ? "#22223a" : "#f8f8ff",
                  borderWidth: 1,
                  borderColor: isBackFocused
                    ? "rgba(99,102,241,0.5)"
                    : (settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                  overflow: "hidden",
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1,
                      color: settingsDarkMode ? "#5a5a6e" : "#a0a0b0" }}>BACK</Text>
                    <Pressable onPress={() => setIsBackCollapsed(!isBackCollapsed)} hitSlop={8}>
                      <Ionicons name={isBackCollapsed ? "chevron-down" : "chevron-up"} size={15}
                        color={settingsDarkMode ? "#4a4a5a" : "#b0b0c0"} />
                    </Pressable>
                  </View>
                  {!isBackCollapsed && (
                    <TextInput multiline
                      onFocus={() => { setIsBackFocused(true); setActiveInput("back"); }}
                      onBlur={() => setIsBackFocused(false)}
                      style={{ fontSize: 16, lineHeight: 24,
                        color: settingsDarkMode ? "#ffffff" : "#0d0f14",
                        minHeight: 80, textAlignVertical: "top",
                        paddingHorizontal: 14, paddingBottom: 14 }}
                      placeholder="Enter definition or answer..."
                      placeholderTextColor={settingsDarkMode ? "#32323e" : "#c8c8d4"}
                      value={currentCard.back} onChangeText={updateBack} />
                  )}
                </View>

                {/* Card strip thumbnails */}
                {fcCards.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {fcCards.map((c, i) => (
                        <Pressable key={i} onPress={() => setFcCurrentIdx(i)}
                          style={({ pressed }) => [{
                            width: 72, height: 52, borderRadius: 12,
                            backgroundColor: i === fcCurrentIdx ? (settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)") : "transparent",
                            borderWidth: 1,
                            borderColor: i === fcCurrentIdx ? (settingsDarkMode ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)") : (settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                            alignItems: "center", justifyContent: "center",
                          }, pressed && styles.pressedScale]}>
                          <Text style={{ fontSize: 10, fontWeight: "700",
                            color: i === fcCurrentIdx ? (settingsDarkMode ? "#ffffff" : "#0d0f14") : "#6e727a" }}>{i + 1}</Text>
                          <Text style={{ fontSize: 9, color: "#6e727a", marginTop: 2 }} numberOfLines={1}>
                            {c.front ? c.front.slice(0, 10) : "empty"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                )}

                {/* Add card button — blocked until current card is filled */}
                <Pressable
                  onPress={() => {
                    if (!currentCard.front.trim() || !currentCard.back.trim()) return;
                    addCard();
                  }}
                  style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 8, height: 50, borderRadius: 14, borderWidth: 1, 
                    borderStyle: (!currentCard.front.trim() || !currentCard.back.trim()) ? "dashed" : "solid",
                    borderColor: (!currentCard.front.trim() || !currentCard.back.trim())
                      ? (settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)")
                      : (settingsDarkMode ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.5)"),
                    backgroundColor: (!currentCard.front.trim() || !currentCard.back.trim()) ? "transparent" : (settingsDarkMode ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)"),
                    opacity: (!currentCard.front.trim() || !currentCard.back.trim()) ? 0.4 : 1,
                  }, pressed && styles.pressedScale]}
                >
                  <Ionicons name="add" size={18} color={(!currentCard.front.trim() || !currentCard.back.trim()) ? (settingsDarkMode ? "#6e727a" : "#888899") : "#6366f1"} />
                  <Text style={{ fontSize: 14, fontWeight: (!currentCard.front.trim() || !currentCard.back.trim()) ? "500" : "600", color: (!currentCard.front.trim() || !currentCard.back.trim()) ? (settingsDarkMode ? "#6e727a" : "#888899") : "#6366f1" }}>Add Card</Text>
                </Pressable>

                {/* Save button — below Add Card */}
                <Pressable onPress={saveDeck}
                  style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 6, height: 50, borderRadius: 14, marginTop: 10,
                    backgroundColor: "#818cf8",
                  }, pressed && styles.pressedScale]}>
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>Save Deck</Text>
                </Pressable>
              </ScrollView>

              {/* Formatting Toolbar */}
              <View style={{ flexDirection: "row", alignItems: "center",
                paddingVertical: 8, paddingHorizontal: 4,
                backgroundColor: settingsDarkMode ? "#141520" : "#ffffff",
                borderTopWidth: 1, borderTopColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
                {([
                  { label: "B", style: { fontWeight: "bold" as const }, type: "bold" },
                  { label: "I", style: { fontStyle: "italic" as const, fontFamily: "serif" }, type: "italic" },
                  { label: "U", style: { textDecorationLine: "underline" as const }, type: "underline" },
                  { label: "—", style: {} as any, type: "hr" },
                  { label: "T", style: { color: "#ef4444", fontWeight: "700" as const }, type: "color" },
                  { label: "TT", style: { fontSize: 13, fontWeight: "700" as const }, type: "size" },
                  { label: "∑", style: {} as any, type: "formula" },
                ] as Array<{ label: string; style: any; type: string }>).map((btn) => (
                  <Pressable key={btn.type} onPress={() => insertFormatting(btn.type)}
                    style={({ pressed }) => [{ flex: 1, height: 38, alignItems: "center", justifyContent: "center",
                      borderRadius: 8,
                      backgroundColor: pressed ? (settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : "transparent",
                    }, pressed && styles.pressedScale]}>
                    <Text style={[{ fontSize: 16, color: settingsDarkMode ? "#d0d0e0" : "#333" }, btn.style]}>
                      {btn.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Deck Selector Bottom Sheet */}
              <Modal visible={showDeckPicker} transparent animationType="slide" onRequestClose={() => setShowDeckPicker(false)}>
                <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
                  onPress={() => setShowDeckPicker(false)}>
                  <View style={{ backgroundColor: settingsDarkMode ? "#1a1b2e" : "#ffffff",
                    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 32, maxHeight: "75%",
                    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 20 }}
                    onStartShouldSetResponder={() => true}>
                    <View style={{ width: 36, height: 4, borderRadius: 2,
                      backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
                      alignSelf: "center", marginBottom: 16 }} />
                    <Text style={{ fontSize: 17, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14",
                      paddingHorizontal: 20, marginBottom: 12 }}>Select Deck</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <Pressable onPress={() => { setDeckNameInput(""); setNameDeckAction("create"); setShowNameDeckModal(true); setShowDeckPicker(false); }}
                        style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12,
                          paddingHorizontal: 20, paddingVertical: 14,
                          backgroundColor: pressed ? (settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent",
                          borderBottomWidth: 0.5, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"
                        }, pressed && styles.pressedScale]}>
                        <View style={{ width: 36, height: 36, borderRadius: 11,
                          backgroundColor: "rgba(99,102,241,0.15)", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="add" size={20} color="#6366f1" />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#6366f1" }}>Create New Deck</Text>
                      </Pressable>
                      {flashcardDecks.map((deck) => {
                        const isSelected = editingDeckId === deck.id;
                        return (
                          <Pressable key={deck.id} onPress={() => {
                            setEditingDeckId(deck.id); setFcTitle(deck.title);
                            const existingCards = JSON.parse(JSON.stringify(deck.cards || []));
                            if (existingCards.length === 0 || existingCards[existingCards.length - 1].front.trim() || existingCards[existingCards.length - 1].back.trim()) {
                              existingCards.push({ front: "", back: "" });
                            }
                            setFcCards(existingCards); setFcCurrentIdx(existingCards.length - 1);
                            setShowDeckPicker(false);
                          }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12,
                            paddingHorizontal: 20, paddingVertical: 14,
                            backgroundColor: pressed ? (settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent",
                            borderBottomWidth: 0.5, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"
                          }, pressed && styles.pressedScale]}>
                            <View style={{ width: 36, height: 36, borderRadius: 11,
                              backgroundColor: isSelected ? "rgba(99,102,241,0.15)" : (settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                              alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name="copy-outline" size={18} color={isSelected ? "#6366f1" : (settingsDarkMode ? "#aaa" : "#666")} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 15, fontWeight: isSelected ? "700" : "500",
                                color: isSelected ? "#6366f1" : (settingsDarkMode ? "#ffffff" : "#0d0f14") }}>{deck.title}</Text>
                              <Text style={{ fontSize: 12, color: "#6e727a", marginTop: 1 }}>{deck.cards.length} cards</Text>
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={20} color="#6366f1" />}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </Pressable>
              </Modal>

              {/* Deck Naming Modal */}
              <Modal visible={showNameDeckModal} transparent animationType="fade" onRequestClose={() => setShowNameDeckModal(false)}>
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : "height"}
                  style={{ flex: 1 }}
                >
                  <Pressable
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" }}
                    onPress={() => setShowNameDeckModal(false)}
                  >
                    <Pressable
                      onPress={() => {}}
                      style={{ width: "88%", backgroundColor: settingsDarkMode ? "#1a1b2e" : "#ffffff",
                        borderRadius: 20, padding: 24,
                        borderWidth: 1, borderColor: settingsDarkMode ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)",
                        shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14", marginBottom: 16 }}>
                        {nameDeckAction === "create" ? "Name Your Deck" : "Rename Deck"}
                      </Text>
                      <TextInput
                        placeholder="e.g. Biology Chapter 3"
                        placeholderTextColor={settingsDarkMode ? "#3a3a5e" : "#bbb"}
                        style={{ backgroundColor: settingsDarkMode ? "#0a0a0f" : "#f4f4f8",
                          borderWidth: 1.5, borderColor: "rgba(99,102,241,0.3)",
                          borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
                          color: settingsDarkMode ? "#ffffff" : "#0d0f14", fontSize: 16, marginBottom: 20 }}
                        value={deckNameInput}
                        onChangeText={setDeckNameInput}
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          const trimmed = deckNameInput.trim();
                          if (!trimmed) return;
                          if (nameDeckAction === "create") {
                            setEditingDeckId(null);
                            setFcTitle(trimmed);

                          } else {
                            setFcTitle(trimmed);
                            if (editingDeckId) {
                              const renamingDeck = flashcardDecks.find(d => d.id === editingDeckId);
                              setFlashcardDecks(flashcardDecks.map(d => d.id === editingDeckId ? { ...d, title: trimmed } : d));
                              if (firebaseUser && renamingDeck?.neonId) {
                                updateFlashcardDeck({ userId: firebaseUser.uid, deckId: renamingDeck.neonId, title: trimmed })
                                  .catch(err => console.warn("[NeonSync] title rename failed:", err));
                              }
                            }
                          }
                          setShowNameDeckModal(false);
                        }}
                      />
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <Pressable onPress={() => setShowNameDeckModal(false)}
                          style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 14,
                            alignItems: "center", justifyContent: "center",
                            backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
                          }, pressed && styles.pressedScale]}>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={() => {
                          const trimmed = deckNameInput.trim();
                          if (!trimmed) return;
                          if (nameDeckAction === "create") {
                            setEditingDeckId(null);
                            setFcTitle(trimmed);

                          } else {
                            setFcTitle(trimmed);
                            if (editingDeckId) {
                              const renamingDeck = flashcardDecks.find(d => d.id === editingDeckId);
                              setFlashcardDecks(flashcardDecks.map(d => d.id === editingDeckId ? { ...d, title: trimmed } : d));
                              if (firebaseUser && renamingDeck?.neonId) {
                                updateFlashcardDeck({ userId: firebaseUser.uid, deckId: renamingDeck.neonId, title: trimmed })
                                  .catch(err => console.warn("[NeonSync] title rename failed:", err));
                              }
                            }
                          }
                          setShowNameDeckModal(false);
                        }} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 14,
                          alignItems: "center", justifyContent: "center",
                          backgroundColor: "#6366f1",
                          shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
                        }, pressed && styles.pressedScale]}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>
                            {nameDeckAction === "create" ? "Create" : "Save"}
                          </Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  </Pressable>
                </KeyboardAvoidingView>
              </Modal>

              {/* Ellipsis Bottom Sheet */}
              <Modal visible={showEllipsisMenu} transparent animationType="slide" onRequestClose={() => setShowEllipsisMenu(false)}>
                <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
                  onPress={() => setShowEllipsisMenu(false)}>
                  <View style={{ backgroundColor: settingsDarkMode ? "#1a1b2e" : "#ffffff",
                    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 36,
                    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 20 }}
                    onStartShouldSetResponder={() => true}>
                    <View style={{ width: 36, height: 4, borderRadius: 2,
                      backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
                      alignSelf: "center", marginBottom: 16 }} />
                    <Text style={{ fontSize: 17, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14",
                      paddingHorizontal: 20, marginBottom: 8 }}>Deck Options</Text>
                    {[
                      { icon: "create-outline" as const, label: "Rename Deck", onPress: () => {
                        setDeckNameInput(fcTitle); setNameDeckAction("rename"); setShowNameDeckModal(true); setShowEllipsisMenu(false);
                      }, color: settingsDarkMode ? "#fff" as const : "#000" as const, bg: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" },
                      { icon: "refresh-outline" as const, label: "Clear Current Card", onPress: () => {
                        const updated = [...fcCards]; updated[fcCurrentIdx] = { front: "", back: "" }; setFcCards(updated); setShowEllipsisMenu(false);
                      }, color: settingsDarkMode ? "#fff" as const : "#000" as const, bg: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" },
                    ].map((item) => (
                      <Pressable key={item.label} onPress={item.onPress}
                        style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14,
                          paddingHorizontal: 20, paddingVertical: 16,
                          backgroundColor: pressed ? (settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent"
                        }, pressed && styles.pressedScale]}>
                        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: item.bg,
                          alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name={item.icon} size={20} color={item.color} />
                        </View>
                        <Text style={{ fontSize: 15, color: item.color }}>{item.label}</Text>
                      </Pressable>
                    ))}
                    {editingDeckId && (
                      <Pressable onPress={() => {
                        setFlashcardDecks(flashcardDecks.filter(d => d.id !== editingDeckId));
                        // Also delete from Neon if synced
                        const deletingDeck = flashcardDecks.find(d => d.id === editingDeckId);
                        if (firebaseUser && deletingDeck?.neonId) {
                          deleteFlashcardDeck(firebaseUser.uid, deletingDeck.neonId)
                            .catch(err => console.warn("[NeonSync] deck delete failed:", err));
                        }
                        setEditingDeckId(null); setFcTitle(""); setFcCards([{ front: "", back: "" }]); setFcCurrentIdx(0);
                        setCreationMode("pick"); setActiveTab("flashcards"); setShowEllipsisMenu(false);
                      }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14,
                        paddingHorizontal: 20, paddingVertical: 16,
                        backgroundColor: pressed ? "rgba(239,68,68,0.06)" : "transparent"
                      }, pressed && styles.pressedScale]}>
                        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(239,68,68,0.1)",
                          alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </View>
                        <Text style={{ fontSize: 15, color: "#ef4444", fontWeight: "600" }}>Delete Deck</Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              </Modal>

              {/* Card Preview Modal */}
              <Modal visible={showPreviewModal} transparent animationType="slide" onRequestClose={() => setShowPreviewModal(false)}>
                <View style={styles.modalBackdrop}>
                  <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal, { width: "90%", padding: 24 }]}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14", marginBottom: 16 }}>
                      Card Preview
                    </Text>
                    <View style={{ gap: 14, width: "100%", marginBottom: 20 }}>
                      <View style={{ borderRadius: 14, padding: 16,
                        backgroundColor: settingsDarkMode ? "#0d0f14" : "#f0f0ff",
                        borderWidth: 1.5, borderColor: "rgba(99,102,241,0.25)" }}>
                        <Text style={{ fontSize: 11, color: "#6366f1", fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 }}>FRONT</Text>
                        <Text style={{ fontSize: 16, color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{currentCard.front || "(empty)"}</Text>
                      </View>
                      <View style={{ borderRadius: 14, padding: 16,
                        backgroundColor: settingsDarkMode ? "#0d0f14" : "#f0fff8",
                        borderWidth: 1.5, borderColor: "rgba(0,229,160,0.2)" }}>
                        <Text style={{ fontSize: 11, color: "#00e5a0", fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 }}>BACK</Text>
                        <Text style={{ fontSize: 16, color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{currentCard.back || "(empty)"}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => setShowPreviewModal(false)}
                      style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#6366f1", width: "100%", paddingVertical: 16 }, pressed && styles.pressedScale]}>
                      <Text style={styles.dialogConfirmText}>Close</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>

            </View>
          );
        }

        // ── Quiz creation flow ─────────────────────────────────────
        if (creationMode === "quiz" && creationStep === "setup") {
          return (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.tabHeader}>
                <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>Create Quiz</Text>
                <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub]}>Setup a new custom MCQ quiz structure</Text>
              </View>

              <View style={styles.formContainer}>
                <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>Quiz Title</Text>
                <Pressable style={[styles.webInputDummy, !settingsDarkMode && styles.lightInput]}>
                  <TextInput
                    placeholder="e.g. Advanced Javascript"
                    placeholderTextColor="#666"
                    style={[styles.formInput, !settingsDarkMode && styles.lightText]}
                    value={newTitle}
                    onChangeText={setNewTitle}
                  />
                </Pressable>



                <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>Questions Count</Text>
                <Pressable style={[styles.webInputDummy, !settingsDarkMode && styles.lightInput]}>
                  <TextInput
                    placeholder="e.g. 5"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    style={[styles.formInput, !settingsDarkMode && styles.lightText]}
                    value={newQuestionsCount}
                    onChangeText={setNewQuestionsCount}
                  />
                </Pressable>

                <Pressable onPress={handleProceedToDrafting} style={styles.createButton}>
                  <Text style={styles.createButtonText}>Next: Draft Questions</Text>
                </Pressable>
              </View>
            </ScrollView>
          );
        }

        if (creationMode === "quiz" && creationStep === "drafting") {
        const currentDraftQuestion = draftQuestions[draftCurrentIndex];
        const totalDraftCount = parseInt(newQuestionsCount) || 0;

        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.tabHeader}>
              <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>Draft Questions</Text>
              <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub]}>
                Question {draftCurrentIndex + 1} of {totalDraftCount}
              </Text>
            </View>

            {currentDraftQuestion && (
              <View style={styles.formContainer}>
                {/* Visual Progress Bar */}
                <View style={{ width: "100%", height: 6, backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
                  <View style={{ width: `${((draftCurrentIndex + 1) / totalDraftCount) * 100}%`, height: "100%", backgroundColor: "#00e5a0" }} />
                </View>

                {/* Question Prompt */}
                <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>Question Prompt</Text>
                <View style={[styles.webInputDummy, !settingsDarkMode && styles.lightInput, { height: 100, paddingVertical: 8 }]}>
                  <TextInput
                    placeholder="Enter your question prompt here..."
                    placeholderTextColor="#666"
                    multiline
                    style={[styles.formInput, !settingsDarkMode && styles.lightText, { height: "100%", textAlignVertical: "top" }]}
                    value={currentDraftQuestion.prompt}
                    onChangeText={updateDraftPrompt}
                  />
                </View>

                {/* Question Options/Answers */}
                <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText, { marginTop: 15, marginBottom: 4 }]}>
                  Options / Choices
                </Text>
                <Text style={{ fontSize: 10, color: "#888888", marginBottom: 12 }}>
                  Type answer texts below and select the correct answer amongst them.
                </Text>

                <View style={{ gap: 10, marginBottom: 15 }}>
                  {currentDraftQuestion.answers.map((ans: any, optIdx: number) => {
                    const isOptionCorrect = ans.isCorrect;
                    return (
                      <View key={ans.id || String(optIdx)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        {/* Radio selection indicator */}
                        <Pressable 
                          onPress={() => selectDraftOptionCorrect(optIdx)}
                          style={({ pressed }) => [
                            {
                              width: 22,
                              height: 22,
                              borderRadius: 11,
                              borderWidth: 2,
                              borderColor: isOptionCorrect ? "#00e5a0" : (settingsDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"),
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isOptionCorrect ? "rgba(0, 229, 160, 0.1)" : "transparent"
                            },
                            pressed && styles.opacityPress
                          ]}
                        >
                          {isOptionCorrect && (
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#00e5a0" }} />
                          )}
                        </Pressable>

                        {/* Text input for option */}
                        <View style={[{ flex: 1, height: 44, borderRadius: 10, backgroundColor: "rgba(255, 255, 255, 0.05)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)", paddingHorizontal: 12, justifyContent: "center" }, !settingsDarkMode && styles.lightInput]}>
                          <TextInput
                            placeholder={`Option ${optIdx + 1}`}
                            placeholderTextColor="#666"
                            style={[styles.formInput, !settingsDarkMode && styles.lightText, { fontSize: 13 }]}
                            value={ans.text}
                            onChangeText={(text) => updateDraftOptionText(optIdx, text)}
                          />
                        </View>

                        {/* Delete option button */}
                        {currentDraftQuestion.answers.length > 2 && (
                          <Pressable 
                            onPress={() => deleteDraftOption(optIdx)}
                            style={({ pressed }) => [
                              { padding: 8 },
                              pressed && styles.opacityPress
                            ]}
                          >
                            <Feather name="trash-2" size={16} color="#ef4444" />
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Add Option button */}
                <Pressable
                  onPress={addDraftOption}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      alignSelf: "flex-start",
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      marginBottom: 20
                    },
                    !settingsDarkMode && { borderColor: "rgba(0, 0, 0, 0.15)" },
                    pressed && styles.opacityPress
                  ]}
                >
                  <Feather name="plus" size={14} color="#00e5a0" />
                  <Text style={[{ fontSize: 12, fontWeight: "bold", color: "#00e5a0" }]}>Add Option</Text>
                </Pressable>

                {/* Navigation Footer Row */}
                <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
                  <Pressable 
                    onPress={handleDraftBack}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        height: 48,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: settingsDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
                        alignItems: "center",
                        justifyContent: "center"
                      },
                      pressed && styles.opacityPress
                    ]}
                  >
                    <Text style={[{ fontSize: 14, fontWeight: "bold", color: settingsDarkMode ? "#ffffff" : "#0d0f14" }]}>
                      {draftCurrentIndex === 0 ? "Back to Setup" : "Previous Q"}
                    </Text>
                  </Pressable>

                  {draftCurrentIndex < totalDraftCount - 1 ? (
                    <Pressable 
                      onPress={() => {
                        // Validate current question prompt before moving on
                        if (!currentDraftQuestion.prompt.trim()) {
                          if (Platform.OS === "web") alert("Please enter a question prompt.");
                          else Alert.alert("Error", "Please enter a question prompt.");
                          return;
                        }
                        const filledOpts = currentDraftQuestion.answers.filter((a: any) => a.text.trim());
                        if (filledOpts.length < 2) {
                          if (Platform.OS === "web") alert("Please enter at least 2 non-empty options.");
                          else Alert.alert("Error", "Please enter at least 2 non-empty options.");
                          return;
                        }
                        const correctFilled = filledOpts.find((a: any) => a.isCorrect);
                        if (!correctFilled) {
                          if (Platform.OS === "web") alert("Please select a correct answer amongst non-empty options.");
                          else Alert.alert("Error", "Please select a correct answer amongst non-empty options.");
                          return;
                        }
                        setDraftCurrentIndex(draftCurrentIndex + 1);
                      }}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          height: 48,
                          borderRadius: 12,
                          backgroundColor: "#00e5a0",
                          alignItems: "center",
                          justifyContent: "center"
                        },
                        pressed && styles.opacityPress
                      ]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: "#000000" }}>Next Question</Text>
                    </Pressable>
                  ) : (
                    <Pressable 
                      onPress={handleSaveDraftedQuiz}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          height: 48,
                          borderRadius: 12,
                          backgroundColor: "#00e5a0",
                          alignItems: "center",
                          justifyContent: "center"
                        },
                        pressed && styles.opacityPress
                      ]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: "#000000" }}>Save & Create Quiz</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        );
        }
        return null;
      }

      case "flashcards": {
        // ── Flashcard study mode ─────────────────────────────────────
        if (studyingDeck) {
          const card = studyingDeck.cards[studyCardIdx] || { front: "", back: "" };
          const total = studyingDeck.cards.length;
          const isCloze = studyingDeck.cardType === "Cloze";
          const isTypeInAnswer = studyingDeck.cardType === "Basic (type in the answer)";

          let frontText = card.front;
          let backText  = card.back;
          if (isCloze) {
            frontText = card.front.replace(/\{\{c1::(.*?)\}\}/g, "[...]");
            backText  = card.front.replace(/\{\{c1::(.*?)\}\}/g, "$1");
          }

          // ── Flip animation ────────────────────────────────────────────
          const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg","180deg"] });
          const backInterpolate  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg","360deg"] });
          const frontOpacity     = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0], extrapolate: "clamp" });
          const backOpacity      = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1], extrapolate: "clamp" });

          const flipCard = () => {
            if (studyFlipped) {
              Animated.spring(flipAnim, { toValue: 0, friction: 8, tension: 10, useNativeDriver: true }).start();
              setStudyFlipped(false);
            } else {
              Animated.spring(flipAnim, { toValue: 180, friction: 8, tension: 10, useNativeDriver: true }).start();
              setStudyFlipped(true);
            }
          };

          // ── Swipe ─────────────────────────────────────────────────────
          const goNext = (known: boolean) => {
            if (known) setStudyKnownCount(c => c + 1);
            else       setStudyUnknownCount(c => c + 1);
            const after = () => {
              swipeX.setValue(0);
              if (studyCardIdx < total - 1) {
                setStudyCardIdx(studyCardIdx + 1);
                setStudyFlipped(false);
                flipAnim.setValue(0);
                setStudyTypedAnswer("");
                setStudyChecked(false);
              } else {
                const finalKnown = known ? studyKnownCount + 1 : studyKnownCount;
                const finalUnknown = !known ? studyUnknownCount + 1 : studyUnknownCount;
                const attempt = {
                  id: Date.now().toString(),
                  known: finalKnown,
                  unknown: finalUnknown,
                  total: total,
                  date: new Date().toISOString()
                };
                setFlashcardDecks(prev => prev.map(d => 
                  d.id === studyingDeck.id ? { ...d, attempts: [...(d.attempts || []), attempt] } : d
                ));
                setShowDeckReport({ deck: studyingDeck, attempt });
                setStudyingDeck(null);
                setStudyKnownCount(0);
                setStudyUnknownCount(0);
                setStudyTypedAnswer("");
                setStudyChecked(false);
              }
            };
            Animated.timing(swipeX, {
              toValue: known ? 500 : -500, duration: 220, useNativeDriver: true,
            }).start(after);
          };

          const panResponder = PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 60,
            onPanResponderMove: (_, g) => swipeX.setValue(g.dx),
            onPanResponderRelease: (_, g) => {
              if (g.dx > 80)       goNext(true);
              else if (g.dx < -80) goNext(false);
              else Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
            },
          });

          const cardRotate  = swipeX.interpolate({ inputRange: [-220, 0, 220], outputRange: ["-14deg","0deg","14deg"], extrapolate: "clamp" });
          const knownBadge  = swipeX.interpolate({ inputRange: [0, 60],  outputRange: [0, 1], extrapolate: "clamp" });
          const skipBadge   = swipeX.interpolate({ inputRange: [-60, 0], outputRange: [1, 0], extrapolate: "clamp" });

          const isDark  = settingsDarkMode;
          const cardBg  = isDark ? "#12132a" : "#ffffff";
          const pageBg  = isDark ? "#0a0a0f" : "#f4f4f8";

          return (
            <View style={{ flex: 1, backgroundColor: pageBg }}>

              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center",
                paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10, gap: 12 }}>
                <Pressable
                  onPress={() => { setStudyingDeck(null); setStudyKnownCount(0); setStudyUnknownCount(0); }}
                  style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                    backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" },
                    pressed && styles.pressedScale]}
                >
                  <Ionicons name="close" size={20} color={isDark ? "#fff" : "#0d0f14"} />
                </Pressable>

                <Text style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: "600",
                  color: isDark ? "#ffffff" : "#0d0f14" }} numberOfLines={1}>
                  {studyCardIdx + 1} / {total}
                </Text>

                <Pressable
                  onPress={() => {
                    const d = studyingDeck;
                    setStudyingDeck(null);
                    setEditingDeckId(d.id);
                    setFcTitle(d.title);
                    setFcCards(d.cards?.length > 0 ? JSON.parse(JSON.stringify(d.cards)) : [{ front: "", back: "" }]);
                    setFcCurrentIdx(0);
                    setCardType(d.cardType || "Basic");
                    setCreationMode("flashcard");
                    setActiveTab("add");
                  }}
                  style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                    backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" },
                    pressed && styles.pressedScale]}
                >
                  <Ionicons name="pencil-outline" size={18} color={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)"} />
                </Pressable>
              </View>

              {/* Score counters */}
              <View style={{ flexDirection: "row", justifyContent: "space-between",
                paddingHorizontal: 20, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20,
                  borderWidth: 1.5, borderColor: "rgba(239,68,68,0.45)",
                  backgroundColor: "rgba(239,68,68,0.07)" }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#ef4444" }}>{studyUnknownCount}</Text>
                </View>
                <View style={{ paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20,
                  borderWidth: 1.5, borderColor: "rgba(99,102,241,0.45)",
                  backgroundColor: "rgba(99,102,241,0.07)" }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#6366f1" }}>{studyKnownCount}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={{ marginHorizontal: 20, marginBottom: 14, height: 2,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)", borderRadius: 2 }}>
                <View style={{ height: 2, borderRadius: 2, backgroundColor: "#6366f1",
                  width: `${((studyCardIdx + 1) / total) * 100}%` as any }} />
              </View>

              {/* Swipeable card */}
              <Animated.View
                {...panResponder.panHandlers}
                style={{ flex: 1, marginHorizontal: 20, marginBottom: 14,
                  transform: [{ translateX: swipeX }, { rotate: cardRotate }] }}
              >
                {/* KNOW badge — green, right swipe */}
                <Animated.View style={{ position: "absolute", top: 28, left: 20, zIndex: 10, opacity: knownBadge }}>
                  <View style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
                    borderWidth: 2, borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.12)",
                    transform: [{ rotate: "-12deg" }] }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: "#22c55e", letterSpacing: 1 }}>KNOW</Text>
                  </View>
                </Animated.View>
                {/* DON'T KNOW badge — red, left swipe */}
                <Animated.View style={{ position: "absolute", top: 28, right: 20, zIndex: 10, opacity: skipBadge }}>
                  <View style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
                    borderWidth: 2, borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.12)",
                    transform: [{ rotate: "12deg" }] }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: "#ef4444", letterSpacing: 1 }}>DON'T KNOW</Text>
                  </View>
                </Animated.View>

                <Pressable onPress={() => { if (!isTypeInAnswer) flipCard(); }} style={{ flex: 1 }}>

                  {/* FRONT face */}
                  <Animated.View style={[{
                    position: "absolute", inset: 0,
                    borderRadius: 24, alignItems: "center", justifyContent: "center",
                    backgroundColor: cardBg, padding: 32,
                    borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                    shadowColor: "#000", shadowOffset: { width: 0, height: 16 },
                    shadowOpacity: isDark ? 0.55 : 0.12, shadowRadius: 30, elevation: 18,
                    backfaceVisibility: "hidden",
                  }, { transform: [{ rotateY: frontInterpolate }], opacity: frontOpacity }]}>
                    <Text style={{ position: "absolute", top: 20, left: 24,
                      fontSize: 10, fontWeight: "700", letterSpacing: 1.2,
                      color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.18)" }}>FRONT</Text>
                    <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center",
                      lineHeight: 32, color: isDark ? "#ffffff" : "#0d0f14", letterSpacing: -0.3 }}>
                      {frontText}
                    </Text>
                    {isTypeInAnswer ? (
                      <View style={{ width: "100%", marginTop: 28, gap: 12 }}>
                        <TextInput
                          placeholder="Type your answer…"
                          placeholderTextColor={isDark ? "#3a3a5a" : "#c0c0d0"}
                          style={{ backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
                            color: isDark ? "#ffffff" : "#0d0f14", fontSize: 16, textAlign: "center",
                            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}
                          value={studyTypedAnswer} onChangeText={setStudyTypedAnswer}
                        />
                        <Pressable onPress={() => { setStudyChecked(true); flipCard(); }}
                          style={({ pressed }) => [{ backgroundColor: "#6366f1", borderRadius: 14, height: 48,
                            alignItems: "center", justifyContent: "center" }, pressed && styles.pressedScale]}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Check Answer</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={{ position: "absolute", bottom: 22, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="sync-outline" size={12} color={isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)"} />
                        <Text style={{ fontSize: 11, fontWeight: "500", color: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)" }}>
                          Tap to flip
                        </Text>
                      </View>
                    )}
                  </Animated.View>

                  {/* BACK face */}
                  <Animated.View style={[{
                    position: "absolute", inset: 0,
                    borderRadius: 24, alignItems: "center", justifyContent: "center",
                    backgroundColor: cardBg, padding: 32,
                    borderWidth: 1, borderColor: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)",
                    shadowColor: "#6366f1", shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: isDark ? 0.3 : 0.08, shadowRadius: 26, elevation: 18,
                    backfaceVisibility: "hidden",
                  }, { transform: [{ rotateY: backInterpolate }], opacity: backOpacity }]}>
                    <View style={{ position: "absolute", top: 0, left: 32, right: 32, height: 3,
                      backgroundColor: "#6366f1", borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
                    <Text style={{ position: "absolute", top: 20, left: 24,
                      fontSize: 10, fontWeight: "700", letterSpacing: 1.2, color: "#6366f1" }}>ANSWER</Text>
                    <Text style={{ fontSize: 22, fontWeight: "700", textAlign: "center",
                      lineHeight: 32, color: isDark ? "#ffffff" : "#0d0f14", letterSpacing: -0.3 }}>
                      {backText}
                    </Text>
                    {isCloze && card.back.trim() ? (
                      <View style={{ width: "100%", marginTop: 20, paddingTop: 16,
                        borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
                        <Text style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)",
                          fontWeight: "700", letterSpacing: 1, textAlign: "center", marginBottom: 6 }}>EXTRA NOTES</Text>
                        <Text style={{ fontSize: 14, color: isDark ? "#aaaacc" : "#555577", textAlign: "center", lineHeight: 20 }}>
                          {card.back}
                        </Text>
                      </View>
                    ) : null}
                    {isTypeInAnswer && studyChecked && (
                      <View style={{ marginTop: 20, alignItems: "center", width: "100%" }}>
                        {studyTypedAnswer.trim().toLowerCase() === card.back.trim().toLowerCase() ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8,
                            backgroundColor: "rgba(99,102,241,0.1)", paddingHorizontal: 18,
                            paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(99,102,241,0.2)" }}>
                            <Ionicons name="checkmark-circle" size={18} color="#6366f1" />
                            <Text style={{ color: "#6366f1", fontWeight: "700", fontSize: 14 }}>Correct!</Text>
                          </View>
                        ) : (
                          <View style={{ gap: 8, backgroundColor: "rgba(239,68,68,0.08)",
                            paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
                            alignItems: "center", width: "90%", borderWidth: 1, borderColor: "rgba(239,68,68,0.15)" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Ionicons name="close-circle" size={18} color="#ef4444" />
                              <Text style={{ color: "#ef4444", fontWeight: "700" }}>Incorrect</Text>
                            </View>
                            <Text style={{ fontSize: 13, color: isDark ? "#ccccdd" : "#444455", textAlign: "center" }}>
                              Expected: <Text style={{ fontWeight: "700", color: "#6366f1" }}>{card.back}</Text>
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                    {!isTypeInAnswer && (
                      <View style={{ position: "absolute", bottom: 22, flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="sync-outline" size={12} color={isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)"} />
                        <Text style={{ fontSize: 11, fontWeight: "500", color: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)" }}>
                          Tap to flip
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                </Pressable>
              </Animated.View>

              {/* Bottom hint */}
              <View style={{ flexDirection: "row", alignItems: "center",
                paddingHorizontal: 24, paddingBottom: 28, gap: 14 }}>
                <Pressable
                  disabled={studyCardIdx === 0}
                  onPress={() => {
                    setStudyCardIdx(studyCardIdx - 1);
                    setStudyFlipped(false);
                    flipAnim.setValue(0);
                    swipeX.setValue(0);
                    setStudyTypedAnswer("");
                    setStudyChecked(false);
                  }}
                  style={({ pressed }) => [{ opacity: studyCardIdx === 0 ? 0.18 : 0.5 }, pressed && styles.pressedScale]}
                >
                  <Ionicons name="arrow-undo-outline" size={22} color={isDark ? "#ffffff" : "#0d0f14"} />
                </Pressable>

                <Text style={{ flex: 1, textAlign: "center", fontSize: 12, fontWeight: "500",
                  color: isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)" }}>
                  Swipe right — <Text style={{ fontWeight: "700", color: "#22c55e" }}>know</Text>
                  {"   ·   "}
                  Swipe left — <Text style={{ fontWeight: "700", color: "#ef4444" }}>don't know</Text>
                </Text>

                <View style={{ width: 22 }} />
              </View>
            </View>
          );
        }

        const allDecks = flashcardDecks;
        const isDark = settingsDarkMode;

        const openNewDeck = () => {
          setCreationMode("flashcard");
          setFcTitle("");
          setFcCategory("General");
          setFcCards([{ front: "", back: "" }]);
          setFcCurrentIdx(0);
          setEditingDeckId(null);
          setDeckNameInput("");
          setNameDeckAction("create");
          setShowNameDeckModal(true);
          setActiveTab("add");
        };

        return (() => {
          const isDark   = settingsDarkMode;
          const bg       = isDark ? "#0a0a0f" : "#f4f4f8";
          const cardBg   = isDark ? "#111118" : "#ffffff";
          const border   = isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)";
          const border2  = isDark ? "#2a1e3a" : "rgba(168,85,247,0.2)";
          const txt      = isDark ? "#f1f0ff" : "#0d0f14";
          const muted    = isDark ? "#8e8e9e" : "#666677";

          return (
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Topbar */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 52 }}>
              <View>
                <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>// your library</Text>
                <Text style={{ fontSize: 18, fontWeight: "600", color: txt, letterSpacing: -0.3 }}>Flashcards</Text>
              </View>
              <Pressable onPress={openNewDeck} style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(168,85,247,0.15)", borderWidth: 1, borderColor: isDark ? "#3a2a4a" : "rgba(168,85,247,0.2)", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="add" size={18} color="#a855f7" />
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: cardBg, borderWidth: 1, borderColor: border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="search" size={16} color={muted} />
              <TextInput 
                placeholder="Search decks..." 
                placeholderTextColor={muted} 
                style={{ flex: 1, fontSize: 13, color: txt, fontWeight: "300", padding: 0 }} 
                value={homeSearch} 
                onChangeText={setHomeSearch} 
              />
            </View>

            {/* List Head */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: muted, letterSpacing: 1.2, textTransform: "uppercase" }}>Your decks</Text>
              <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: "#a855f7" }}>{allDecks.length} {allDecks.length === 1 ? 'deck' : 'decks'}</Text>
            </View>

            {/* Deck List */}
            {allDecks.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
                <Ionicons name="copy-outline" size={36} color={muted} />
                <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                  No flashcard decks yet
                </Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 20, gap: 8 }}>
                {allDecks.filter((d: any) => d.title.toLowerCase().includes(homeSearch.toLowerCase())).map((deck: any, idx: number) => {
                  const cardCount = (deck.cards || []).length;
                  return (
                    <AnimatedPressable 
                      key={deck.id}
                      onPress={() => { setStudyingDeck(deck); setStudyCardIdx(0); setStudyFlipped(false); flipAnim.setValue(0); }}
                      style={{
                        backgroundColor: cardBg, borderWidth: 1, borderColor: border2,
                        borderRadius: 18, overflow: "hidden"
                      }}
                      scaleTo={0.97}
                    >
                      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: "#a855f7" }} />
                      
                      <View style={{ paddingLeft: 18, paddingRight: 16, paddingVertical: 16 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                            <View style={{ width: 34, height: 34, backgroundColor: "rgba(168,85,247,0.1)", borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name="albums-outline" size={16} color="#a855f7" />
                            </View>
                            <View>
                              <Text style={{ fontSize: 14, fontWeight: "500", color: txt, letterSpacing: -0.2 }}>{deck.title}</Text>
                              <View style={{ backgroundColor: "rgba(168,85,247,0.1)", borderWidth: 1, borderColor: "rgba(168,85,247,0.2)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3, alignSelf: "flex-start" }}>
                                <Text style={{ fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: "#a855f7", letterSpacing: 0.8 }}>DECK</Text>
                              </View>
                            </View>
                          </View>
                          
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            <AnimatedPressable 
                              onPress={() => {
                                setEditingDeckId(deck.id);
                                setFcTitle(deck.title);
                                setFcCards(deck.cards?.length > 0 ? JSON.parse(JSON.stringify(deck.cards)) : [{ front: "", back: "" }]);
                                setFcCurrentIdx(0);
                                setCardType(deck.cardType || "Basic");
                                setCreationMode("flashcard");
                                setActiveTab("add");
                              }}
                              style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: bg, borderWidth: 1, borderColor: border, alignItems: "center", justifyContent: "center" }}
                              scaleTo={0.88}
                            >
                              <Ionicons name="pencil" size={13} color={muted} />
                            </AnimatedPressable>
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="copy-outline" size={11} color={muted} />
                            <Text style={{ fontSize: 10, color: muted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{cardCount} {cardCount === 1 ? 'card' : 'cards'}</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="time-outline" size={11} color={muted} />
                            <Text style={{ fontSize: 10, color: muted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>Just created</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: border }}>
                          <View style={{ flex: 1, marginRight: 12 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                              <Text style={{ fontSize: 10, color: muted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>Mastered</Text>
                              <Text style={{ fontSize: 10, color: muted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>0 / {cardCount}</Text>
                            </View>
                            <View style={{ height: 2, backgroundColor: border, borderRadius: 2, overflow: "hidden" }}>
                              <View style={{ height: "100%", width: "0%", backgroundColor: "#a855f7", borderRadius: 2 }} />
                            </View>
                          </View>
                          <AnimatedPressable 
                            onPress={() => { setStudyingDeck(deck); setStudyCardIdx(0); setStudyFlipped(false); flipAnim.setValue(0); }}
                            style={{ backgroundColor: "rgba(168,85,247,0.1)", borderWidth: 1, borderColor: "#3a2a5a", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 }}
                            scaleTo={0.92}
                          >
                            <Text style={{ color: "#a855f7", fontSize: 11, fontWeight: "500" }}>Study now</Text>
                          </AnimatedPressable>
                        </View>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}
          </ScrollView>
          );
        })();
      }

      case "guide":
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Pressable onPress={() => setActiveTab("menu")} style={({ pressed }) => [{ padding: 8, borderRadius: 10,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }, pressed && styles.pressedScale]}>
                <Ionicons name="arrow-back" size={20} color={settingsDarkMode ? "#fff" : "#000"} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText, { fontSize: 20, marginBottom: 2 }]}>How to Create a Quiz</Text>
                <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub, { fontSize: 12 }]}>Learn how to build, format, and load custom MCQ quizzes</Text>
              </View>
            </View>

            {/* Embedded Local Video Tutorial */}
            <Text style={[styles.sectionHeading, !settingsDarkMode && styles.lightText]}>Watch Tutorial Video</Text>
            <View style={[styles.videoPlayerCard, !settingsDarkMode && styles.lightCard, { height: 220, overflow: "hidden" }]}>
              <VideoView
                style={{ flex: 1 }}
                player={localVideoPlayer}
                allowsPictureInPicture={true}
                fullscreenOptions={{ enable: true }}
              />
            </View>

            {/* Format Instructions */}
            <Text style={[styles.sectionHeading, !settingsDarkMode && styles.lightText]}>Step 1: Format Your Text File (.qst)</Text>
            <View style={[styles.guideStepCard, !settingsDarkMode && styles.lightCard]}>
              <Text style={[styles.guideStepText, !settingsDarkMode && styles.lightTextSub]}>
                QuizForge reads custom quizzes written in a simple text format. Create a plain text file ending in <Text style={{ color: "#00e5a0", fontWeight: "bold" }}>.qst</Text> and follow this layout:
              </Text>

              <View style={[styles.codeBlockContainer, !settingsDarkMode && styles.lightCodeBlock]}>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeTag}>@title</Text>: World Geography Quiz</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeTag}>@category</Text>: Geography</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}></Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeComment}># This is a comment</Text></Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeTag}>?</Text> What is the capital of France?</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> Berlin</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> Madrid</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeAnswer}>+</Text> Paris</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> Rome</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}></Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeTag}>?</Text> Name the muscle tone characteristic of children in the first months of life:</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> physiological hypotension of flexor muscles</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> decreased muscle tone in the hands</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeAnswer}>+</Text> physiological hypertension of flexor muscles</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> decreased muscle tone in the legs</Text>
              </View>
              
              <Text style={[styles.guideStepTip, !settingsDarkMode && styles.lightTextSub]}>
                <Ionicons name="bulb-outline" size={13} color="#00e5a0" style={{ marginRight: 4 }} /> Tip: Use '@key: value' for quiz parameters. Start questions with '?' and prefix answer choices with '+' (correct) and '-' (incorrect).
              </Text>
            </View>

            {/* Import Instructions */}
            <Text style={[styles.sectionHeading, !settingsDarkMode && styles.lightText]}>Step 2: Create or Load in App</Text>
            <View style={[styles.guideStepCard, !settingsDarkMode && styles.lightCard]}>
              <View style={[styles.stepItemRow, !settingsDarkMode && styles.lightBorder]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepItemTitle, !settingsDarkMode && styles.lightText]}>Tap the Add (+) Button</Text>
                  <Text style={[styles.stepItemDesc, !settingsDarkMode && styles.lightTextSub]}>Go to the center tab on the bottom menu to open the Quiz Creator.</Text>
                </View>
              </View>

              <View style={[styles.stepItemRow, !settingsDarkMode && styles.lightBorder]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepItemTitle, !settingsDarkMode && styles.lightText]}>Define Quiz Settings</Text>
                  <Text style={[styles.stepItemDesc, !settingsDarkMode && styles.lightTextSub]}>Type in the title, choose a category, and specify the number of questions to draft your structure.</Text>
                </View>
              </View>

              <View style={[styles.stepItemRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepItemTitle, !settingsDarkMode && styles.lightText]}>Play & Customize</Text>
                  <Text style={[styles.stepItemDesc, !settingsDarkMode && styles.lightTextSub]}>Select your quiz on the Home screen to configure options like Shuffle, range selection, or question timers, then play!</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        );

      case "menu":
        return (() => {
          const isDark  = settingsDarkMode;
          const bg      = isDark ? "#0a0a0f" : "#f4f4f8";
          const cardBg  = isDark ? "#111118" : "#ffffff";
          const border  = isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)";
          const muted   = isDark ? "#8e8e9e" : "#666677";
          const txt     = isDark ? "#f1f0ff" : "#0d0f14";

          const Row = ({ icon, iconBg, iconColor, title, sub, onPress, right }: any) => (
            <Pressable onPress={onPress}
              style={({ pressed }) => [{
                backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                borderRadius: 14, padding: 14, paddingHorizontal: 16,
                flexDirection: "row", alignItems: "center", gap: 12,
              }, pressed && styles.pressedScale]}>
              <View style={{ width: 32, height: 32, borderRadius: 10,
                backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={icon} size={16} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: title === "Reset statistics" ? "#e24b4a" : txt }}>
                  {title}
                </Text>
                {sub ? <Text style={{ fontSize: 11, color: muted, marginTop: 2, fontWeight: "300" }}>{sub}</Text> : null}
              </View>
              {right}
            </Pressable>
          );

          const Chevron = () => <Ionicons name="chevron-forward" size={16} color={muted} />;

          return (
            <View style={{ flex: 1, backgroundColor: bg }}>
              {/* Sign-out loading overlay */}
              {signOutLoading && (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
                  backgroundColor: "rgba(10,10,15,0.92)", alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={{ marginTop: 14, fontSize: 14, color: muted }}>Signing out…</Text>
                </View>
              )}

              {/* Top glow */}
              <View style={{ position: "absolute", top: -40, left: "50%", marginLeft: -100,
                width: 200, height: 200, borderRadius: 100,
                backgroundColor: "rgba(99,102,241,0.07)" }} pointerEvents="none" />

              <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}>

                {/* ── Top bar ── */}
                <View style={{ flexDirection: "row", justifyContent: "space-between",
                  alignItems: "center", paddingHorizontal: 20, paddingTop: 52 }}>
                  <Text style={{ fontSize: 18, fontWeight: "600", color: txt, letterSpacing: -0.3 }}>
                    Profile
                  </Text>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: cardBg,
                    borderWidth: 1, borderColor: border, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name="ellipsis-horizontal" size={16} color={muted} />
                  </View>
                </View>

                {/* ── Identity card ── */}
                <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: cardBg,
                  borderWidth: 1, borderColor: border, borderRadius: 20, padding: 20,
                  flexDirection: "row", alignItems: "center", gap: 14, overflow: "hidden" }}>
                  {/* Top accent line */}
                  <View style={{ position: "absolute", top: 0, left: 20, right: 20, height: 1,
                    backgroundColor: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)" }} />

                  {/* Avatar */}
                  <View style={{ width: 52, height: 52, borderRadius: 16,
                    backgroundColor: firebaseUser ? "#6366f1" : "rgba(99,102,241,0.1)",
                    borderWidth: 1, borderColor: isDark ? "#2a2a4a" : "rgba(99,102,241,0.2)",
                    alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {firebaseUser?.photoURL
                      ? <Image source={{ uri: firebaseUser.photoURL }} style={{ width: 52, height: 52 }} />
                      : firebaseUser
                        ? <Text style={{ fontSize: 20, fontWeight: "700", color: "#fff" }}>{getUserInitial(firebaseUser)}</Text>
                        : <Ionicons name="person-outline" size={24} color="#6366f1" />
                    }
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "500", color: "#f1f0ff" }} numberOfLines={1}>
                      {firebaseUser ? getUserFullName(firebaseUser) : "Guest"}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#4a4a6a", marginTop: 3, fontWeight: "300" }} numberOfLines={1}>
                      {firebaseUser ? firebaseUser.email ?? "" : "// sign in to sync your data"}
                    </Text>
                  </View>

                  {/* Sign in / synced */}
                  {firebaseUser ? (
                    <View style={{ backgroundColor: "rgba(99,102,241,0.1)", borderRadius: 8,
                      paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(99,102,241,0.2)" }}>
                      <Text style={{ fontSize: 10, color: "#6366f1", fontWeight: "600", letterSpacing: 0.5 }}>SYNCED</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => { setAuthView("landing"); setAuthError(null); setShowAuthScreen(true); }}
                      style={({ pressed }) => [{ backgroundColor: "#6366f1", borderRadius: 10,
                        paddingHorizontal: 14, paddingVertical: 8 }, pressed && styles.pressedScale]}>
                      <Text style={{ fontSize: 11, fontWeight: "500", color: "#fff" }}>Sign in</Text>
                    </Pressable>
                  )}
                </View>

                {/* ── Preferences ── */}
                <Text style={{ fontSize: 10, color: muted, letterSpacing: 1.2, textTransform: "uppercase",
                  paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>Preferences</Text>

                <View style={{ paddingHorizontal: 20, gap: 6 }}>
                  {/* Dark mode toggle */}
                  <Pressable onPress={() => setSettingsDarkMode(!settingsDarkMode)}
                    style={({ pressed }) => [{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                      borderRadius: 14, padding: 14, paddingHorizontal: 16,
                      flexDirection: "row", alignItems: "center", gap: 12 }, pressed && styles.pressedScale]}>
                    <View style={{ width: 32, height: 32, borderRadius: 10,
                      backgroundColor: "rgba(99,102,241,0.1)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="moon-outline" size={16} color="#6366f1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: txt }}>Dark mode</Text>
                      <Text style={{ fontSize: 11, color: muted, marginTop: 2, fontWeight: "300" }}>
                        {settingsDarkMode ? "Currently enabled" : "Currently disabled"}
                      </Text>
                    </View>
                    <ToggleSwitch checked={settingsDarkMode} onChange={setSettingsDarkMode} darkMode={isDark} />
                  </Pressable>
                </View>

                {/* ── Support ── */}
                <Text style={{ fontSize: 10, color: muted, letterSpacing: 1.2, textTransform: "uppercase",
                  paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>Support</Text>

                <View style={{ paddingHorizontal: 20, gap: 6 }}>
                  <Row icon="book-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title="How to format quiz (.txt)" sub="Formatting guide"
                    onPress={() => setActiveTab("guide")} right={<Chevron />} />
                  <Row icon="chatbubble-ellipses-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title="Feedback" sub="Help improve QuizForge"
                    onPress={() => setShowFeedbackPage(true)} right={<Chevron />} />
                  <Row icon="information-circle-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title="About" sub="Version 1.0.0"
                    onPress={() => setShowAboutPage(true)} right={<Chevron />} />
                </View>

                {/* ── Danger zone ── */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 6 }}>
                  <Row icon="trash-outline" iconBg="rgba(226,75,74,0.1)" iconColor="#e24b4a"
                    title="Reset statistics" sub="Clear all progress data"
                    onPress={() => setShowResetConfirm(true)} right={<Chevron />} />

                  {firebaseUser && (
                    <Pressable
                      onPress={async () => {
                        setSignOutLoading(true);
                        await new Promise(r => setTimeout(r, 800));
                        await signOutUser();
                        setSignOutLoading(false);
                        setActiveTab("home");
                      }}
                      disabled={signOutLoading}
                      style={({ pressed }) => [{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                        borderRadius: 14, padding: 14, paddingHorizontal: 16,
                        flexDirection: "row", alignItems: "center", gap: 12 }, pressed && styles.pressedScale]}>
                      <View style={{ width: 32, height: 32, borderRadius: 10,
                        backgroundColor: "rgba(226,75,74,0.1)", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="log-out-outline" size={16} color="#e24b4a" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: "#e24b4a" }}>Sign out</Text>
                      </View>
                    </Pressable>
                  )}
                </View>

              </ScrollView>
            </View>
          );
        })();


      default:
        // "home" quizzes list view
        return (() => {
          const isDark   = settingsDarkMode;
          const bg       = isDark ? "#0a0a0f" : "#f4f4f8";
          const cardBg   = isDark ? "#111118" : "#ffffff";
          const border   = isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)";
          const muted    = isDark ? "#8e8e9e" : "#666677";
          const txt      = isDark ? "#f1f0ff" : "#0d0f14";

          const filtered = quizzes.filter(q => {
            const attempts = q.attempts || [];
            const uniqueCount = (q.uniqueCorrectIds || []).length;
            const qCount = q.questions || 1;
            const isCompleted = uniqueCount >= qCount;
            if (homeSearch && !q.title.toLowerCase().includes(homeSearch.toLowerCase())) return false;
            if (homeFilter === "progress") return attempts.length > 0 && !isCompleted;
            if (homeFilter === "notstarted") return attempts.length === 0;
            if (homeFilter === "done") return isCompleted && attempts.length > 0;
            return true;
          });

          const chips: { key: "all"|"progress"|"notstarted"|"done"; label: string }[] = [
            { key: "all",        label: "All" },
            { key: "progress",   label: "In progress" },
            { key: "notstarted", label: "Not started" },
            { key: "done",       label: "Completed" },
          ];

          return (
            <View style={{ flex: 1, backgroundColor: bg }}>
              {/* Top glow */}
              <View style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220,
                borderRadius: 110, backgroundColor: "rgba(99,102,241,0.08)" }} pointerEvents="none" />

              {/* ── Top bar ── */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                paddingHorizontal: 20, paddingTop: 52 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                    {"// Active Learner"}
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: "600", color: txt, letterSpacing: -0.5 }}>
                    Your Active Quizzes
                  </Text>
                </View>
                <Pressable
                  onPress={() => setActiveTab("menu")}
                  style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 12,
                    backgroundColor: "rgba(99,102,241,0.12)",
                    borderWidth: 1, borderColor: isDark ? "#2a2a4a" : "rgba(99,102,241,0.2)",
                    alignItems: "center", justifyContent: "center" },
                    pressed && styles.pressedScale]}
                >
                  {firebaseUser?.photoURL ? (
                    <Image source={{ uri: firebaseUser.photoURL }}
                      style={{ width: 36, height: 36, borderRadius: 12 }} />
                  ) : firebaseUser ? (
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#6366f1" }}>
                      {getUserInitial(firebaseUser)}
                    </Text>
                  ) : (
                    <Ionicons name="person-outline" size={18} color="#6366f1" />
                  )}
                </Pressable>
              </View>

              {/* ── Search ── */}
              <View style={{ marginHorizontal: 20, marginTop: 16, flexDirection: "row",
                alignItems: "center", gap: 10, backgroundColor: cardBg,
                borderWidth: 1, borderColor: border, borderRadius: 14,
                paddingHorizontal: 16, paddingVertical: 12 }}>
                <Ionicons name="search-outline" size={16} color={muted} />
                <TextInput
                  placeholder="Search quizzes..."
                  placeholderTextColor={muted}
                  value={homeSearch}
                  onChangeText={setHomeSearch}
                  style={{ flex: 1, fontSize: 13, color: txt, fontWeight: "300" }}
                />
                {homeSearch.length > 0 && (
                  <Pressable onPress={() => setHomeSearch("")}>
                    <Ionicons name="close-circle" size={16} color={muted} />
                  </Pressable>
                )}
              </View>

              {/* ── Filter chips ── */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, flexShrink: 0 }}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14, alignItems: "center" }}
              >
                {chips.map(c => (
                  <Pressable key={c.key} onPress={() => setHomeFilter(c.key)}
                    style={({ pressed }) => [{
                      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: homeFilter === c.key ? "#6366f1" : "transparent",
                      borderWidth: 1, borderColor: homeFilter === c.key ? "#6366f1" : border,
                      alignSelf: "flex-start",
                    }, pressed && styles.pressedScale]}>
                    <Text style={{ fontSize: 11, letterSpacing: 0.5,
                      color: homeFilter === c.key ? "#fff" : muted }}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* ── List header ── */}
              <View style={{ flexDirection: "row", justifyContent: "space-between",
                alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
                <Text style={{ fontSize: 11, color: muted, letterSpacing: 1.2, textTransform: "uppercase" }}>
                  Quizzes
                </Text>
                <Text style={{ fontSize: 11, color: "#6366f1", letterSpacing: 0.5 }}>
                  {filtered.length} active
                </Text>
              </View>

              {/* ── Quiz list ── */}
              <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 40 }}>
                {filtered.length > 0 ? filtered.map((quiz) => {
                  const attempts = quiz.attempts || [];
                  const uniqueCount = (quiz.uniqueCorrectIds || []).length;
                  const qCount = quiz.questions || 1;
                  const completionPct = attempts.length > 0 ? Math.min(Math.round((uniqueCount / qCount) * 100), 100) : null;
                  const multiplier = quiz.multiplier;
                  return (
                    <AnimatedPressable
                      key={quiz.id}
                      onPress={() => setShowQuizActions(quiz)}
                      style={{
                        backgroundColor: cardBg,
                        borderWidth: 1, borderColor: border,
                        borderRadius: 18, overflow: "hidden",
                      }}
                      scaleTo={0.97}
                    >
                      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: "#6366f1" }} />
                      
                      <View style={{ padding: 18, paddingLeft: 20 }}>
                        {/* Title row */}
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <Text style={{ fontSize: 15, fontWeight: "500", color: txt, letterSpacing: -0.2, flex: 1 }}
                            numberOfLines={1}>
                            {quiz.title}
                          </Text>
                          <Feather name="chevron-right" size={16} color={muted} style={{ marginTop: 2 }} />
                        </View>

                        {/* Meta tags */}
                        <View style={{ flexDirection: "row", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="help-circle-outline" size={12} color={muted} />
                            <Text style={{ fontSize: 10, color: muted }}>{quiz.questions} question{quiz.questions !== 1 ? "s" : ""}</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="refresh-outline" size={12} color={muted} />
                            <Text style={{ fontSize: 10, color: muted }}>{attempts.length} attempt{attempts.length !== 1 ? "s" : ""}</Text>
                          </View>
                          {multiplier && multiplier > 1 && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <Ionicons name="flash-outline" size={12} color={muted} />
                              <Text style={{ fontSize: 10, color: muted }}>{multiplier}× streak</Text>
                            </View>
                          )}
                        </View>

                        {/* Bottom: score + bar + label */}
                        <View style={{ flexDirection: "row", alignItems: "center",
                          marginTop: 14, paddingTop: 12,
                          borderTopWidth: 1, borderTopColor: isDark ? "#1a1a2a" : "rgba(0,0,0,0.06)" }}>
                          <Text style={{ fontSize: 11, color: completionPct !== null ? "#6366f1" : muted, minWidth: 30 }}>
                            {completionPct !== null ? `${completionPct}%` : "0%"}
                          </Text>
                          <View style={{ flex: 1, height: 2, backgroundColor: isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)",
                            borderRadius: 2, marginHorizontal: 12 }}>
                            {completionPct !== null && (
                              <View style={{ height: 2, borderRadius: 2, width: `${completionPct}%` as any,
                                backgroundColor: "#6366f1" }} />
                            )}
                          </View>
                          <Text style={{ fontSize: 10, color: muted }}>
                            {attempts.length > 0 ? `${attempts.length} attempt${attempts.length !== 1 ? "s" : ""}` : "Not started"}
                          </Text>
                        </View>
                      </View>
                    </AnimatedPressable>
                  );
                }) : (
                  homeSearch ? (
                    <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
                      <Ionicons name="search-outline" size={36} color={muted} />
                      <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                        No quizzes match your search
                      </Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
                      <Ionicons name="document-text-outline" size={36} color={muted} />
                      <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                        No active quizzes yet
                      </Text>
                    </View>
                  )
                )}
              </ScrollView>
            </View>
          );
        })();
    }
  };



  // ── Auth view: "landing" | "email" ──────────────────────────────
  const [authView, setAuthView] = useState<"landing" | "email">("landing");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const authViewAnim = useRef(new Animated.Value(0)).current; // 0=landing, 1=email

  const switchAuthView = (view: "landing" | "email") => {
    const toValue = view === "email" ? 1 : 0;
    Animated.timing(authViewAnim, {
      toValue,
      duration: 260,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setAuthView(view));
    setAuthView(view); // update state immediately so content renders
  };

  const handleAuthSubmit = async () => {
    setAuthError(null);
    setAuthLoading(true);
    if (authMode === "signup") {
      const { error } = await signUpWithEmail(authEmail.trim(), authPassword, authName.trim());
      setAuthLoading(false);
      if (error) { setAuthError(error); return; }
    } else {
      const { error } = await signInWithEmail(authEmail.trim(), authPassword);
      setAuthLoading(false);
      if (error) { setAuthError(error); return; }
    }
    setShowAuthScreen(false);
  };

  const renderAuthScreen = () => {
    if (authView === "email") {
      // ── Email form sub-screen ────────────────────────────────
      const slideX = authViewAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
      const fadeIn = authViewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
      return (
        <Animated.View style={[styles.authRoot, { opacity: fadeIn, transform: [{ translateX: slideX }] }]}>
          <View style={styles.authBlobTL} />
          <View style={styles.authBlobBR} />

          {/* Back */}
          <Pressable onPress={() => { switchAuthView("landing"); setAuthError(null); }} style={styles.authBackBtn}>
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
            <Text style={styles.authBackText}>Back</Text>
          </Pressable>

          <View style={styles.authEmailBody}>
            <Text style={styles.authBigTitle}>
              {authMode === "signup" ? "Create account" : "Welcome back"}
            </Text>
            <Text style={styles.authBigSub}>
              {authMode === "signup"
                ? "Start mastering any subject today"
                : "Sign in to access your quizzes"}
            </Text>

            {/* Mode toggle */}
            <View style={styles.authPillToggle}>
              <Pressable
                onPress={() => { setAuthMode("signup"); setAuthError(null); }}
                style={[styles.authPillBtn, authMode === "signup" && styles.authPillBtnOn]}
              >
                <Text style={[styles.authPillText, authMode === "signup" && styles.authPillTextOn]}>Sign Up</Text>
              </Pressable>
              <Pressable
                onPress={() => { setAuthMode("signin"); setAuthError(null); }}
                style={[styles.authPillBtn, authMode === "signin" && styles.authPillBtnOn]}
              >
                <Text style={[styles.authPillText, authMode === "signin" && styles.authPillTextOn]}>Sign In</Text>
              </Pressable>
            </View>

            {/* Name (signup only) */}
            {authMode === "signup" && (
              <View style={styles.authField}>
                <Ionicons name="person-outline" size={16} color="#8888aa" style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.authFieldInput}
                  placeholder="Full name"
                  placeholderTextColor="#666688"
                  value={authName}
                  onChangeText={setAuthName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.authField}>
              <Ionicons name="mail-outline" size={16} color="#8888aa" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.authFieldInput}
                placeholder="Email address"
                placeholderTextColor="#666688"
                value={authEmail}
                onChangeText={setAuthEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.authField}>
              <Ionicons name="lock-closed-outline" size={16} color="#8888aa" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.authFieldInput, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor="#666688"
                value={authPassword}
                onChangeText={setAuthPassword}
                secureTextEntry={!showAuthPassword}
              />
              <Pressable onPress={() => setShowAuthPassword(!showAuthPassword)}>
                <Ionicons name={showAuthPassword ? "eye-off-outline" : "eye-outline"} size={16} color="#8888aa" />
              </Pressable>
            </View>

            {authError ? (
              <View style={styles.authErrBox}>
                <Ionicons name="alert-circle-outline" size={15} color="#f87171" />
                <Text style={styles.authErrTxt}>{authError}</Text>
              </View>
            ) : null}

            <Pressable
              disabled={authLoading || !authEmail || !authPassword}
              onPress={handleAuthSubmit}
              style={({ pressed }) => [
                styles.authBigGreenBtn,
                (!authEmail || !authPassword) && { opacity: 0.45 },
                pressed && styles.pressedScale,
              ]}
            >
              <Text style={styles.authBigGreenBtnText}>
                {authLoading ? "Please wait…" : authMode === "signup" ? "Create Account" : "Sign In"}
              </Text>
            </Pressable>

            <Pressable onPress={() => setShowAuthScreen(false)} style={styles.authSkipRow}>
              <Text style={styles.authSkipTxt}>Continue as guest</Text>
            </Pressable>
          </View>
        </Animated.View>
      );
    }

    // ── Landing sub-screen ─────────────────────────────────────────
    const slideX = authViewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
    const fadeOut = authViewAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    return (
      <Animated.View style={[styles.authRoot, { opacity: fadeOut, transform: [{ translateX: slideX }] }]}>
        <View style={styles.authBlobTL} />
        <View style={styles.authBlobBR} />

        {/* Hero image */}
        <View style={styles.authHeroWrap}>
          <Image
            source={require("../../assets/images/auth_hero.jpeg")}
            style={styles.authHeroImg}
            resizeMode="cover"
          />
        </View>

        {/* Copy */}
        <View style={styles.authCopyBlock}>
          <Text style={styles.authBigTitle}>The smartest way{"\n"}to study.</Text>
          <Text style={styles.authBigSub}>Sign up for free — no account needed to start.</Text>
        </View>

        {/* Buttons */}
        <View style={styles.authBtnStack}>
          {/* Google */}
          <Pressable
            disabled={authLoading}
            onPress={async () => {
              setAuthLoading(true);
              const user = await signInWithGoogle();
              setAuthLoading(false);
              if (user) setShowAuthScreen(false);
            }}
            style={({ pressed }) => [styles.authGooglePill, pressed && styles.pressedScale, authLoading && { opacity: 0.7 }]}
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={styles.authGooglePillText}>
              {authLoading ? "Signing in…" : "Continue with Google"}
            </Text>
          </Pressable>

          {/* Email */}
          <Pressable
            onPress={() => { switchAuthView("email"); setAuthMode("signup"); }}
            style={({ pressed }) => [styles.authEmailPill, pressed && styles.pressedScale]}
          >
            <Ionicons name="mail-outline" size={20} color="#ccccee" />
            <Text style={styles.authEmailPillText}>Sign up with email</Text>
          </Pressable>

          {/* Already have account */}
          <View style={styles.authLoginRow}>
            <Text style={styles.authLoginRowTxt}>Have an account?</Text>
            <Pressable onPress={() => { switchAuthView("email"); setAuthMode("signin"); }}>
              <Text style={styles.authLoginLink}>  Log in</Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={() => setShowAuthScreen(false)} style={styles.authSkipRow}>
          <Text style={styles.authSkipTxt}>Continue as guest</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const renderLandingScreen = () => (
    <Animated.View style={[styles.landingContainer, { opacity: splashFadeOut }]}>
      {/* Ambient blobs */}
      <View style={styles.landingBlob1} />
      <View style={styles.landingBlob2} />
      <View style={styles.landingBlob3} />

      {/* Centered content */}
      <View style={styles.landingSplashCenter}>

        {/* Animated logo ring */}
        <Animated.View style={[
          styles.landingLogoRing,
          { opacity: splashLogoOpacity, transform: [{ scale: splashLogoScale }] }
        ]}>
          <View style={styles.landingLogoInner}>
            <Ionicons name="flash" size={48} color="#000000" />
          </View>
        </Animated.View>

        {/* App name slides up */}
        <Animated.Text style={[
          styles.landingAppName,
          { opacity: splashNameOpacity, transform: [{ translateY: splashNameY }] }
        ]}>
          QuizForge
        </Animated.Text>

        {/* Tagline fades in */}
        <Animated.Text style={[styles.landingTagline, { opacity: splashTagOpacity }]}>
          {"Turn any text into a quiz.\nMaster anything, faster."}
        </Animated.Text>

        {/* Three coloured dots that pop in */}
        <Animated.View style={[styles.landingDotRow, { opacity: splashTagOpacity, transform: [{ scale: splashDotScale }] }]}>
          <View style={[styles.landingDot, { backgroundColor: "#00e5a0" }]} />
          <View style={[styles.landingDot, { backgroundColor: "#3b82f6" }]} />
          <View style={[styles.landingDot, { backgroundColor: "#a855f7" }]} />
        </Animated.View>

      </View>
    </Animated.View>
  );

  if (showLanding) {
    return (
      <SafeAreaView style={styles.landingSafeArea} edges={["top", "left", "right", "bottom"]}>
        {renderLandingScreen()}
      </SafeAreaView>
    );
  }

  if (showAuthScreen) {
    return (
      <SafeAreaView style={[styles.landingSafeArea]} edges={["top", "left", "right", "bottom"]}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderAuthScreen()}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0a0a0f" : "#f4f4f8" }}>
    <SafeAreaView style={[styles.rootContainer, !settingsDarkMode && styles.lightRootContainer]} edges={["top", "left", "right"]}>
      {activeSession ? (
        renderActiveSessionView()
      ) : (
        <>
          {/* Dynamic Screen Area */}
          <View style={styles.screenContainer}>{renderContent()}</View>

          {/* Bottom Tab Bar — Quizlet-style (hidden during focused editing and study sessions to maximize screen real estate and prevent keyboard overlaps) */}
          {!( (activeTab === "add" && creationMode !== "pick") || (activeTab === "flashcards" && studyingDeck) ) && (
            <View style={[
              styles.bottomTabBar,
              !settingsDarkMode && styles.lightTabBar,
              {
                paddingBottom: Math.max(insets.bottom, 16)
              }
            ]}>

              {/* Home */}
              <AnimatedPressable onPress={() => setActiveTab("home")} style={styles.tabItem} scaleTo={0.88}>
                <Ionicons name={activeTab === "home" ? "home" : "home-outline"} size={22}
                  color={activeTab === "home" ? "#6366f1" : settingsDarkMode ? "#6e727a" : "#999"} />
                <Text style={[styles.tabLabel, activeTab === "home" && styles.tabLabelActive]}>Home</Text>
              </AnimatedPressable>

              {/* Flashcards */}
              <AnimatedPressable onPress={() => { setActiveTab("flashcards"); setStudyingDeck(null); }} style={styles.tabItem} scaleTo={0.88}>
                <Ionicons name={activeTab === "flashcards" ? "copy" : "copy-outline"} size={22}
                  color={activeTab === "flashcards" ? "#6366f1" : settingsDarkMode ? "#6e727a" : "#999"} />
                <Text style={[styles.tabLabel, activeTab === "flashcards" && styles.tabLabelActive]}>Flashcards</Text>
              </AnimatedPressable>

              {/* Centre Create */}
              <View style={styles.centerTabContainer}>
                <AnimatedPressable
                  onPress={() => setShowAddMenu(true)}
                  style={styles.qCreateBtn}
                  scaleTo={0.92}
                >
                  <Feather name="plus" size={26} color="#ffffff" />
                </AnimatedPressable>
                <Text style={[styles.tabLabel, { color: settingsDarkMode ? "#6e727a" : "#999", marginTop: 2 }]}>Create</Text>
              </View>

              {/* Quizzes */}
              <AnimatedPressable onPress={() => setActiveTab("dashboard")} style={styles.tabItem} scaleTo={0.88}>
                <Ionicons name={activeTab === "dashboard" ? "layers" : "layers-outline"} size={22}
                  color={activeTab === "dashboard" ? "#6366f1" : settingsDarkMode ? "#6e727a" : "#999"} />
                <Text style={[styles.tabLabel, activeTab === "dashboard" && styles.tabLabelActive]}>Quizzes</Text>
              </AnimatedPressable>

              {/* Profile (replaces menu) */}
              <AnimatedPressable onPress={() => setActiveTab("menu")} style={styles.tabItem} scaleTo={0.88}>
                <Ionicons name={activeTab === "menu" ? "person-circle" : "person-circle-outline"} size={24}
                  color={activeTab === "menu" ? "#6366f1" : settingsDarkMode ? "#6e727a" : "#999"} />
                <Text style={[styles.tabLabel, activeTab === "menu" && styles.tabLabelActive]}>Profile</Text>
              </AnimatedPressable>

            </View>
          )}

          {Platform.OS === "web" && (
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,.qst"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result as string;
                    handleImportQst(text, file.name);
                  };
                  reader.readAsText(file);
                }
                e.target.value = "";
              }}
            />
          )}
        </>
      )}

      {/* Quiz Actions bottom sheet */}
      <Modal
        visible={showQuizActions !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuizActions(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}
          onPress={() => setShowQuizActions(null)}
        >
          <View style={{
            backgroundColor: settingsDarkMode ? "#0d1a2e" : "#ffffff",
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: Platform.OS === "ios" ? 36 : 24,
            overflow: "hidden",
          }} onStartShouldSetResponder={() => true}>
            {/* Drag handle + title */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, marginBottom: 14,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}
                numberOfLines={1}>
                {showQuizActions?.title}
              </Text>
              <Text style={{ fontSize: 12, color: "#6e727a", marginTop: 3 }}>
                {showQuizActions?.questions} Questions
              </Text>
            </View>

            <View style={{ height: 0.5, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", marginTop: 12 }} />

            {/* Start Test */}
            <AnimatedPressable
              onPress={() => {
                const quiz = showQuizActions;
                setShowQuizActions(null);
                handleOpenQuizOptions(quiz);
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 17, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12,
                backgroundColor: "rgba(0,229,160,0.13)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="play" size={22} color="#00e5a0" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1,
                color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Start Test</Text>
            </AnimatedPressable>

            <View style={{ height: 0.5, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", marginHorizontal: 24 }} />

            {/* Statistics */}
            <AnimatedPressable
              onPress={() => {
                const quiz = showQuizActions;
                setShowQuizActions(null);
                setViewingInsightsQuiz(quiz);
                setViewingInsightsQuizFromTab("home");
                setActiveTab("insights");
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 17, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12,
                backgroundColor: "rgba(99,102,241,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="bar-chart-outline" size={22} color="#6366f1" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1,
                color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Statistics</Text>
            </AnimatedPressable>

            <View style={{ height: 0.5, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", marginHorizontal: 24 }} />

            {/* Rename */}
            <AnimatedPressable
              onPress={() => {
                const quiz = showQuizActions;
                setShowQuizActions(null);
                setRenamingQuiz(quiz);
                setRenameTitle(quiz.title);
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 17, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="pencil-outline" size={22} color={settingsDarkMode ? "#ccccdd" : "#555566"} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1,
                color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Rename</Text>
            </AnimatedPressable>



            {/* Delete */}
            <AnimatedPressable
              onPress={() => {
                setDeletingQuizConfirm(showQuizActions);
                setShowQuizActions(null);
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 17, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12,
                backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1, color: "#ef4444" }}>Delete</Text>
            </AnimatedPressable>
          </View>
        </Pressable>
      </Modal>

      {/* Rename Quiz Modal */}
      <Modal
        visible={renamingQuiz !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRenamingQuiz(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable 
            style={styles.centerModalBackdrop} 
            onPress={() => setRenamingQuiz(null)}
          >
            <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
              <View style={[styles.dialogIcon, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
                <Ionicons name="create-outline" size={28} color="#6366f1" />
              </View>
              <Text style={[styles.dialogTitle, !settingsDarkMode && styles.lightText]}>
                Rename Quiz
              </Text>
              <Text style={[styles.dialogDescription, !settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 16 }]}>
                Enter a new title for "{renamingQuiz?.title}"
              </Text>

              <Pressable style={[styles.webInputDummy, { width: "100%", marginBottom: 20 }, !settingsDarkMode && styles.lightInput]}>
                <TextInput
                  autoFocus
                  placeholder="Quiz Title"
                  placeholderTextColor="#666"
                  style={[styles.formInput, !settingsDarkMode && styles.lightText]}
                  value={renameTitle}
                  onChangeText={setRenameTitle}
                />
              </Pressable>

              <View style={styles.dialogButtons}>
                <Pressable
                  onPress={() => setRenamingQuiz(null)}
                  style={({ pressed }) => [styles.dialogCancel, !settingsDarkMode && { borderColor: "rgba(0, 0, 0, 0.15)" }, pressed && styles.pressedScale]}
                >
                  <Text style={[styles.dialogCancelText, !settingsDarkMode && styles.lightText]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (renameTitle.trim() && renamingQuiz) {
                      setQuizzes(quizzes.map(q => q.id === renamingQuiz.id ? { ...q, title: renameTitle.trim() } : q));
                      setRenamingQuiz(null);
                      setRenameTitle("");
                    }
                  }}
                  style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#00e5a0" }, pressed && styles.pressedScale]}
                >
                  <Text style={styles.dialogConfirmText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Import Error Modal */}
      <Modal
        visible={importErrorDetails !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setImportErrorDetails(null)}
      >
        <Pressable 
          style={styles.centerModalBackdrop} 
          onPress={() => setImportErrorDetails(null)}
        >
          <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Ionicons name="warning-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.dialogTitle, !settingsDarkMode && styles.lightText, { color: "#ef4444" }]}>
              {importErrorDetails?.title}
            </Text>
            <Text style={[styles.dialogDescription, !settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 12, lineHeight: 18 }]}>
              {importErrorDetails?.message}
            </Text>
            {importErrorDetails?.details ? (
              <Text style={[{ fontSize: 11, color: "#888888", fontStyle: "italic", marginBottom: 16, textAlign: "center" }, !settingsDarkMode && styles.lightTextSub]}>
                (Error: {importErrorDetails.details})
              </Text>
            ) : null}

            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setImportErrorDetails(null)}
                style={({ pressed }) => [styles.dialogCancel, !settingsDarkMode && { borderColor: "rgba(0, 0, 0, 0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !settingsDarkMode && styles.lightTextSub]}>No Thanks</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setImportErrorDetails(null);
                  setActiveTab("guide");
                }}
                style={({ pressed }) => [styles.dialogConfirm, pressed && styles.pressedScale]}
              >
                <Text style={styles.dialogConfirmText}>Watch Video</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Delete Quiz Confirmation Modal */}
      <Modal
        visible={deletingQuizConfirm !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDeletingQuizConfirm(null)}
      >
        <Pressable 
          style={styles.centerModalBackdrop} 
          onPress={() => setDeletingQuizConfirm(null)}
        >
          <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Ionicons name="trash-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.dialogTitle, !settingsDarkMode && styles.lightText, { color: "#ef4444" }]}>
              Delete Quiz
            </Text>
            <Text style={[styles.dialogDescription, !settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 20, lineHeight: 18 }]}>
              Are you sure you want to delete "{deletingQuizConfirm?.title}"? This action is permanent and cannot be undone.
            </Text>

            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setDeletingQuizConfirm(null)}
                style={({ pressed }) => [styles.dialogCancel, !settingsDarkMode && { borderColor: "rgba(0, 0, 0, 0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !settingsDarkMode && styles.lightText]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (deletingQuizConfirm) {
                    setQuizzes(quizzes.filter(q => q.id !== deletingQuizConfirm.id));
                    setDeletingQuizConfirm(null);
                    // Delete from Neon if logged in and quiz is synced
                    const neonId = deletingQuizConfirm.neonId ?? deletingQuizConfirm.id;
                    if (firebaseUser && neonId && !neonId.startsWith("local_")) {
                      deleteMobileQuiz(firebaseUser.uid, neonId).catch((err) =>
                        console.warn("[NeonSync] quiz delete failed:", err)
                      );
                    }
                  }
                }}
                style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#ef4444", shadowColor: "#ef4444" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Reset Statistics Confirmation Modal ── */}
      <Modal visible={showResetConfirm} animationType="fade" transparent onRequestClose={() => setShowResetConfirm(false)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => setShowResetConfirm(false)}>
          <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Ionicons name="refresh-circle-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.dialogTitle, !settingsDarkMode && styles.lightText, { color: "#ef4444" }]}>Reset Statistics</Text>
            <Text style={[styles.dialogDescription, !settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 20, lineHeight: 20 }]}>
              Are you sure you want to clear all attempt history and statistics? This cannot be undone.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setShowResetConfirm(false)}
                style={({ pressed }) => [styles.dialogCancel, !settingsDarkMode && { borderColor: "rgba(0,0,0,0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !settingsDarkMode && styles.lightText]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setQuizzes(quizzes.map(q => ({ ...q, attempts: [], wrongQuestions: [], uniqueCorrectIds: [] })));
                  setShowResetConfirm(false);
                }}
                style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#ef4444", shadowColor: "#ef4444" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Quit Quiz Confirm — in-app modal ── */}
      <Modal visible={showQuitConfirm} animationType="fade" transparent onRequestClose={() => setShowQuitConfirm(false)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => setShowQuitConfirm(false)}>
          <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal, { paddingBottom: 24 }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
              <Ionicons name="warning-outline" size={30} color="#f59e0b" />
            </View>
            <Text style={[styles.dialogTitle, !settingsDarkMode && styles.lightText]}>Quit Quiz?</Text>
            <Text style={[styles.dialogDescription, !settingsDarkMode && styles.lightTextSub, { textAlign: "center", lineHeight: 20, marginBottom: 24 }]}>
              Your progress will be lost and this attempt won't be saved.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setShowQuitConfirm(false)}
                style={({ pressed }) => [styles.dialogCancel, !settingsDarkMode && { borderColor: "rgba(0,0,0,0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !settingsDarkMode && styles.lightText]}>Keep Going</Text>
              </Pressable>
              <Pressable
                onPress={() => { setShowQuitConfirm(false); setActiveSession(null); }}
                style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#f59e0b" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogConfirmText, { color: "#000" }]}>Quit</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── About — full-screen slide-up page ── */}
      <Modal visible={showAboutPage} animationType="slide" transparent={false} onRequestClose={() => setShowAboutPage(false)}>
        <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0a0a0f" : "#f4f4f8" }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 }}>
            <Pressable
              onPress={() => setShowAboutPage(false)}
              style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }, pressed && styles.pressedScale]}
            >
              <Ionicons name="arrow-back" size={20} color={settingsDarkMode ? "#fff" : "#0d0f14"} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: settingsDarkMode ? "#fff" : "#0d0f14", marginLeft: 14 }}>About</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
            {/* Hero card */}
            <View style={{
              borderRadius: 24, padding: 28, alignItems: "center", marginBottom: 20,
              backgroundColor: settingsDarkMode ? "#12132a" : "#ffffff",
              borderWidth: 1, borderColor: settingsDarkMode ? "rgba(0,229,160,0.12)" : "rgba(0,229,160,0.15)",
              shadowColor: "#00e5a0", shadowOffset: { width: 0, height: 10 },
              shadowOpacity: settingsDarkMode ? 0.2 : 0.08, shadowRadius: 24, elevation: 10,
            }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: "rgba(0,229,160,0.12)",
                borderWidth: 1, borderColor: "rgba(0,229,160,0.25)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="flash" size={34} color="#00e5a0" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "800", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.5, marginBottom: 4 }}>
                QuizForge
              </Text>
              <Text style={{ fontSize: 13, color: "#00e5a0", fontWeight: "600", letterSpacing: 0.5, marginBottom: 16 }}>Version 1.0.0</Text>
              <Text style={{ fontSize: 14, color: settingsDarkMode ? "#8888aa" : "#666677", textAlign: "center", lineHeight: 22 }}>
                Made to help students study smarter — transform any notes into powerful MCQ quizzes, track your progress, and master any subject faster.
              </Text>
            </View>

            {/* Guidance */}
            <View style={{
              borderRadius: 18, padding: 20, marginBottom: 14,
              backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.04)" : "#ffffff",
              borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
              shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
              shadowOpacity: settingsDarkMode ? 0.3 : 0.06, shadowRadius: 10, elevation: 4,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Ionicons name="school-outline" size={16} color="#00e5a0" />
                <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1, color: "#00e5a0" }}>UNDER THE GUIDANCE OF</Text>
              </View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: settingsDarkMode ? "#fff" : "#0d0f14" }}>Dr. Namrata Kumari</Text>
            </View>

            {/* Features */}
            {[
              { icon: "document-text-outline" as const, label: "Import quiz files (.txt / .qst)" },
              { icon: "layers-outline" as const, label: "Flashcard study decks" },
              { icon: "bar-chart-outline" as const, label: "Attempt tracking & score history" },
              { icon: "moon-outline" as const, label: "Dark & light mode" },
              { icon: "cloud-done-outline" as const, label: "Cloud sync across devices" },
            ].map((f) => (
              <View key={f.label} style={{
                flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13,
                borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
              }}>
                <View style={{ width: 38, height: 38, borderRadius: 11,
                  backgroundColor: settingsDarkMode ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
                  alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={f.icon} size={18} color="#6366f1" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "500", color: settingsDarkMode ? "#ccccdd" : "#333344" }}>{f.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Feedback — full-screen slide-up page ── */}
      <Modal visible={showFeedbackPage} animationType="slide" transparent={false} onRequestClose={() => setShowFeedbackPage(false)}>
        <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0a0a0f" : "#f4f4f8" }}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 }}>
            <Pressable
              onPress={() => { setShowFeedbackPage(false); setFeedbackText(""); }}
              style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)" }, pressed && styles.pressedScale]}
            >
              <Ionicons name="arrow-back" size={20} color={settingsDarkMode ? "#fff" : "#0d0f14"} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: settingsDarkMode ? "#fff" : "#0d0f14", marginLeft: 14 }}>Feedback</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{
              borderRadius: 24, padding: 24, marginBottom: 20,
              backgroundColor: settingsDarkMode ? "#12132a" : "#ffffff",
              borderWidth: 1, borderColor: settingsDarkMode ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.12)",
              shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 10 },
              shadowOpacity: settingsDarkMode ? 0.2 : 0.06, shadowRadius: 24, elevation: 10,
            }}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(59,130,246,0.12)",
                borderWidth: 1, borderColor: "rgba(59,130,246,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color="#3b82f6" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: settingsDarkMode ? "#fff" : "#0d0f14", marginBottom: 6, letterSpacing: -0.3 }}>
                Share your thoughts
              </Text>
              <Text style={{ fontSize: 14, color: settingsDarkMode ? "#8888aa" : "#666677", lineHeight: 20 }}>
                Found a bug? Have a suggestion? Want a new feature? We're all ears.
              </Text>
            </View>

            {/* Text area */}
            <TextInput
              multiline
              placeholder="Tell us what you think…"
              placeholderTextColor={settingsDarkMode ? "#3a3a5a" : "#c0c0d0"}
              style={{
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "#ffffff",
                borderRadius: 18, padding: 18,
                color: settingsDarkMode ? "#fff" : "#0d0f14", fontSize: 15,
                minHeight: 180, textAlignVertical: "top",
                borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                marginBottom: 20,
                shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
                shadowOpacity: settingsDarkMode ? 0.3 : 0.06, shadowRadius: 10, elevation: 4,
              }}
              value={feedbackText}
              onChangeText={setFeedbackText}
            />

            <Pressable
              onPress={() => { setShowFeedbackPage(false); setFeedbackText(""); }}
              style={({ pressed }) => [{
                height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center",
                backgroundColor: "#3b82f6",
                shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
              }, pressed && styles.pressedScale]}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Send Feedback</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Quiz Created Success Modal ── */}
      <Modal visible={showQuizCreatedModal !== null} animationType="fade" transparent onRequestClose={() => setShowQuizCreatedModal(null)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => setShowQuizCreatedModal(null)}>
          <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal, { paddingBottom: 28 }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(0, 229, 160, 0.12)" }]}>
              <Ionicons name="checkmark-circle" size={36} color="#00e5a0" />
            </View>
            <Text style={[styles.dialogTitle, !settingsDarkMode && styles.lightText]}>Quiz Created!</Text>
            <Text style={[styles.dialogDescription, !settingsDarkMode && styles.lightTextSub, { textAlign: "center", lineHeight: 20, marginBottom: 20 }]}>
              <Text style={{ color: settingsDarkMode ? "#ffffff" : "#0d0f14", fontWeight: "700" }}>"{showQuizCreatedModal?.title}"</Text>
              {" "}was created successfully with{" "}
              <Text style={{ color: "#00e5a0", fontWeight: "700" }}>{showQuizCreatedModal?.count} questions</Text>
              . Ready to practice!
            </Text>
            <Pressable
              onPress={() => setShowQuizCreatedModal(null)}
              style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#00e5a0", width: "100%" }, pressed && styles.pressedScale]}
            >
              <Text style={styles.dialogConfirmText}>Start Practicing →</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Quiz Options Popup Modal (Sleek Compact Format) */}
      <Modal
        visible={selectedQuiz !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedQuiz(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.quizOptionsCard, !settingsDarkMode && styles.lightModal, { maxHeight: "75%", paddingBottom: 10 }]}>
            {/* Header */}
            <View style={[styles.optionsHeader, !settingsDarkMode && styles.lightBorder]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.optionsTitle, !settingsDarkMode && styles.lightText]} numberOfLines={1}>
                  {selectedQuiz?.title}
                </Text>
                <Text style={[styles.optionsSubtitle, !settingsDarkMode && styles.lightTextSub]}>
                  {totalQuestions} Questions Available
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedQuiz(null)}
                style={styles.optionsCloseButton}
              >
                <Feather name="x" size={20} color="#888888" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.optionsScroll}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Question Selection Section */}
              <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub]}>Question Selection</Text>
              <View style={styles.chipsContainer}>
                {[
                  { value: "all" as const, label: "All" },
                  { value: "random" as const, label: "Random" },
                  { value: "range" as const, label: "Range" },
                  {
                    value: "unanswered" as const,
                    label: "Unanswered",
                    disabled: unansweredCount === 0,
                  },
                  {
                    value: "wrong" as const,
                    label: "Wrong",
                    disabled: wrongCount === 0,
                  },
                ].map(({ value, label, disabled }) => {
                  const isActive = selectionMode === value;
                  return (
                    <Pressable
                      key={value}
                      disabled={disabled}
                      onPress={() => setSelectionMode(value)}
                      style={[
                        styles.chipBtn,
                        !settingsDarkMode && styles.lightCard,
                        isActive && styles.chipBtnActive,
                        disabled && styles.chipBtnDisabled,
                      ]}
                    >
                      <Text style={[
                        styles.chipText,
                        !settingsDarkMode && styles.lightText,
                        isActive && styles.chipTextActive,
                        disabled && styles.chipTextDisabled,
                      ]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Inline Steppers for Random / Range Mode */}
              {selectionMode === "random" && (
                <View style={[styles.compactControlsRow, !settingsDarkMode && styles.lightCard]}>
                  <Text style={[styles.compactControlLabel, !settingsDarkMode && styles.lightText]}>Random Count</Text>
                  <Stepper
                    value={randomCount}
                    min={1}
                    max={totalQuestions}
                    onChange={(val) => setRandomCount(val)}
                    darkMode={settingsDarkMode}
                  />
                </View>
              )}

              {selectionMode === "range" && (
                <View style={[styles.compactControlsRow, !settingsDarkMode && styles.lightCard]}>
                  <Text style={[styles.compactControlLabel, !settingsDarkMode && styles.lightText]}>Set Range</Text>
                  <View style={styles.rangeStepperGroup}>
                    <Stepper
                      value={rangeStart}
                      min={1}
                      max={rangeEnd}
                      onChange={(val) => setRangeStart(val)}
                      darkMode={settingsDarkMode}
                    />
                    <Text style={[styles.rangeToText, !settingsDarkMode && styles.lightTextSub]}>to</Text>
                    <Stepper
                      value={rangeEnd}
                      min={rangeStart}
                      max={totalQuestions}
                      onChange={(val) => setRangeEnd(val)}
                      darkMode={settingsDarkMode}
                    />
                  </View>
                </View>
              )}

              {/* Timer & Gameplay Options (Sleek Combined iOS-style Card) */}
              <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub]}>Gameplay Configurations</Text>
              <View style={[styles.sectionCardCompact, !settingsDarkMode && styles.lightCard]}>
                {/* Time Limit Row */}
                <View style={styles.switchRowCompact}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchLabelCompact, !settingsDarkMode && styles.lightText]}>Time limit per question</Text>
                    {timePerQuestion !== null && (
                      <Text style={[styles.switchSubCompact, !settingsDarkMode && styles.lightTextSub]}>Limit: {timePerQuestion}s</Text>
                    )}
                  </View>
                  <ToggleSwitch
                    checked={timePerQuestion !== null}
                    onChange={(checked) => setTimePerQuestion(checked ? 30 : null)}
                    darkMode={settingsDarkMode}
                  />
                </View>

                {timePerQuestion !== null && (
                  <View style={styles.stepperSubRowCompact}>
                    <Text style={[styles.stepperSubRowTextCompact, !settingsDarkMode && styles.lightTextSub]}>Seconds limit</Text>
                    <Stepper
                      value={timePerQuestion}
                      min={5}
                      max={120}
                      step={5}
                      suffix="s"
                      onChange={(val) => setTimePerQuestion(val)}
                      darkMode={settingsDarkMode}
                    />
                  </View>
                )}

                <View style={[styles.switchRowSeparator, !settingsDarkMode && styles.lightBorderTop]} />

                {/* Shuffle Questions Row */}
                <View style={styles.switchRowCompact}>
                  <Text style={[styles.switchLabelCompact, !settingsDarkMode && styles.lightText]}>Shuffle question order</Text>
                  <ToggleSwitch checked={shuffleQuestions} onChange={setShuffleQuestions} darkMode={settingsDarkMode} />
                </View>

                <View style={[styles.switchRowSeparator, !settingsDarkMode && styles.lightBorderTop]} />

                {/* Shuffle Answers Row */}
                <View style={styles.switchRowCompact}>
                  <Text style={[styles.switchLabelCompact, !settingsDarkMode && styles.lightText]}>Shuffle answer options</Text>
                  <ToggleSwitch checked={shuffleAnswers} onChange={setShuffleAnswers} darkMode={settingsDarkMode} />
                </View>

                <View style={[styles.switchRowSeparator, !settingsDarkMode && styles.lightBorderTop]} />

                {/* Show Answers instantly Row */}
                <View style={styles.switchRowCompact}>
                  <Text style={[styles.switchLabelCompact, !settingsDarkMode && styles.lightText]}>Show answer after submit</Text>
                  <ToggleSwitch checked={showAnswerOnSubmit} onChange={setShowAnswerOnSubmit} darkMode={settingsDarkMode} />
                </View>
              </View>
            </ScrollView>

            {/* Sticky Start Button Footer */}
            <View style={[styles.modalStickyFooter, !settingsDarkMode && styles.lightBorderTop]}>
              <Pressable
                disabled={questionCount === 0}
                onPress={handleStartQuiz}
                style={({ pressed }) => [
                  styles.startQuizBtn,
                  questionCount === 0 && styles.startQuizBtnDisabled,
                  pressed && styles.opacityPress,
                ]}
              >
                <Ionicons name="play" size={18} color="#000000" />
                <Text style={styles.startQuizBtnText}>Start Quiz ({questionCount} Qs)</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Test Bottom Sheet Modal */}
      <Modal
        visible={showAddMenu}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMenu(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowAddMenu(false)}
        >
          <View style={{
            backgroundColor: settingsDarkMode ? "#0d1a2e" : "#ffffff",
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: Platform.OS === "ios" ? 36 : 24,
            overflow: "hidden",
          }} onStartShouldSetResponder={() => true}>

            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, marginBottom: 14,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }} />
            </View>

            {/* Import from File */}
            <AnimatedPressable
              onPress={async () => {
                setShowAddMenu(false);
                if (Platform.OS === "web") {
                  if (fileInputRef.current) { fileInputRef.current.click(); }
                } else {
                  try {
                    const result = await DocumentPicker.getDocumentAsync({
                      type: "*/*",
                      copyToCacheDirectory: true,
                    });
                    if (!result.canceled && result.assets && result.assets[0]) {
                      const fileUri = result.assets[0].uri;
                      const fileName = result.assets[0].name;
                      const text = await FileSystem.readAsStringAsync(fileUri);
                      handleImportQst(text, fileName);
                    }
                  } catch (err: any) {
                    Alert.alert("Error", "Failed to read the selected file: " + err.message);
                  }
                }
              }}
              style={{
                paddingVertical: 13, paddingHorizontal: 20,
              }}
              scaleTo={0.97}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12,
                  backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                  alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="document-text-outline" size={20} color={settingsDarkMode ? "#aaaacc" : "#666688"} />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "600",
                  color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Import from File (.txt)</Text>
              </View>
            </AnimatedPressable>

            <View style={{ height: 1, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", marginHorizontal: 20 }} />

            {/* Create Quiz */}
            <AnimatedPressable
              onPress={() => {
                setShowAddMenu(false);
                setCreationMode("quiz");
                setCreationStep("setup");
                setActiveTab("add");
              }}
              style={{
                paddingVertical: 13, paddingHorizontal: 20,
              }}
              scaleTo={0.97}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12,
                  backgroundColor: "rgba(99,102,241,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="create-outline" size={20} color="#6366f1" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "600",
                  color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Create Quiz</Text>
              </View>
            </AnimatedPressable>

            <View style={{ height: 1, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", marginHorizontal: 20 }} />

            {/* Flashcard set */}
            <AnimatedPressable
              onPress={() => {
                setShowAddMenu(false);
                setCreationMode("flashcard");
                setFcTitle(""); setFcCategory(""); setFcCards([{ front: "", back: "" }]); setFcCurrentIdx(0);
                setActiveTab("add");
              }}
              style={{
                paddingVertical: 13, paddingHorizontal: 20,
              }}
              scaleTo={0.97}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12,
                  backgroundColor: "rgba(99,102,241,0.12)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="copy-outline" size={20} color="#6366f1" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: "600",
                  color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Flashcard set</Text>
              </View>
            </AnimatedPressable>
          </View>
        </Pressable>
      </Modal>

      {confettiParticles.length > 0 && (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          {confettiParticles.map((p) => {
            let shapeStyle: any = { width: p.size, height: p.size, backgroundColor: p.color };
            if (p.shape === "circle") {
              shapeStyle.borderRadius = p.size / 2;
            } else if (p.shape === "triangle") {
              shapeStyle = {
                width: 0,
                height: 0,
                backgroundColor: "transparent",
                borderStyle: "solid",
                borderLeftWidth: p.size / 2,
                borderRightWidth: p.size / 2,
                borderBottomWidth: p.size,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderBottomColor: p.color,
              };
            }
            
            return (
              <View
                key={p.id}
                style={[
                  {
                    position: "absolute",
                    left: p.x,
                    top: p.y,
                    transform: [{ rotate: `${p.rotation}deg` }],
                  },
                  shapeStyle
                ]}
              />
            );
          })}
        </View>
      )}

      {/* Deck Report Modal */}
      <Modal visible={showDeckReport !== null} transparent animationType="fade" onRequestClose={() => setShowDeckReport(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal, { width: "90%", padding: 28 }]}>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(99,102,241,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="trophy-outline" size={32} color="#6366f1" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: settingsDarkMode ? "#ffffff" : "#0d0f14", textAlign: "center" }}>
                Deck Completed!
              </Text>
              <Text style={{ fontSize: 15, color: settingsDarkMode ? "#888899" : "#666677", marginTop: 6, textAlign: "center" }}>
                {showDeckReport?.deck?.title}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <View style={{ flex: 1, backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(34,197,94,0.2)" }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#22c55e", marginBottom: 4 }}>{showDeckReport?.attempt?.known || 0}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#22c55e", letterSpacing: 0.5 }}>KNOWN</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#ef4444", marginBottom: 4 }}>{showDeckReport?.attempt?.unknown || 0}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#ef4444", letterSpacing: 0.5 }}>STILL LEARNING</Text>
              </View>
            </View>

            <Pressable onPress={() => setShowDeckReport(null)}
              style={({ pressed }) => [{ backgroundColor: "#6366f1", borderRadius: 16, paddingVertical: 16, alignItems: "center", width: "100%" }, pressed && styles.pressedScale]}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    overflow: "hidden",
  },
  screenContainer: {
    flex: 1,
    overflow: "hidden",
  },
  homeContainer: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  topHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    height: 60,
    marginBottom: 16,
  },
  homeLogoText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  topHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  headerAvatar: {
    width: "100%",
    height: "100%",
  },
  homeScroll: {
    flex: 1,
  },
  homeScrollContent: {
    paddingBottom: 24,
  },
  homeGreeting: {
    fontSize: 14,
    color: "#6e727a",
  },
  homeSectionTitle: {
    fontSize: 22,
    fontWeight: "500",
    color: "#ffffff",
    marginTop: 6,
    marginBottom: 18,
    letterSpacing: 0.6,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  quizCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00e5a0",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWelcomeContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 229, 160, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyActionHint: {
    marginTop: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 20,
    borderRadius: 20,
    width: "100%",
  },
  emptyActionText: {
    fontSize: 14,
    color: "#cccccc",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  arrowDownAnimation: {
    marginTop: 4,
  },
  quizOptionsCard: {
    backgroundColor: "#0d0f14",
    borderRadius: 24,
    padding: 20,
    width: SCREEN_WIDTH - 32,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignSelf: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  optionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    paddingBottom: 16,
    marginBottom: 16,
  },
  optionsTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  optionsSubtitle: {
    color: "#6e727a",
    fontSize: 13,
    marginTop: 2,
  },
  optionsCloseButton: {
    padding: 4,
  },
  optionsScroll: {
    flexShrink: 1,
  },
  optionsScrollContent: {
    paddingBottom: 16,
  },
  optionsSectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6e727a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  optionRowContainer: {
    marginBottom: 12,
  },
  radioOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#00e5a0",
    backgroundColor: "#00e5a0",
  },
  radioCircleDisabled: {
    borderColor: "rgba(255, 255, 255, 0.05)",
    opacity: 0.4,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0d0f14",
  },
  radioLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  radioTextDisabled: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  radioSub: {
    color: "#6e727a",
    fontSize: 11,
    marginTop: 2,
  },
  inlineControlsContainer: {
    marginTop: 8,
    paddingLeft: 32,
  },
  rangeStepperGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rangeToText: {
    color: "#6e727a",
    fontSize: 12,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderRadius: 8,
    height: 36,
  },
  stepperBtn: {
    width: 36,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.3,
  },
  stepperValueContainer: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.06)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.06)",
    height: "100%",
  },
  stepperValueText: {
    color: "#00e5a0",
    fontWeight: "bold",
    fontSize: 13,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  switchRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  switchLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  switchSub: {
    color: "#6e727a",
    fontSize: 11,
    marginTop: 2,
  },
  stepperSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
  },
  stepperSubRowText: {
    color: "#6e727a",
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: "rgba(0, 229, 160, 0.04)",
    borderColor: "rgba(0, 229, 160, 0.15)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryQuestionCount: {
    color: "#00e5a0",
    fontSize: 22,
    fontWeight: "bold",
  },
  summaryText: {
    color: "#6e727a",
    fontSize: 12,
    marginBottom: 12,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningText: {
    color: "#f59e0b",
    fontSize: 12,
  },
  startQuizBtn: {
    backgroundColor: "#6366f1",
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  startQuizBtnDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    shadowOpacity: 0,
    opacity: 0.4,
  },
  startQuizBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },
  quizActionsContainer: {
    gap: 8,
  },
  actionBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  actionBtnRowText: {
    color: "#cccccc",
    fontSize: 14,
    fontWeight: "500",
  },
  tabLabel: {
    fontSize: 10,
    color: "#6e727a",
    marginTop: 3,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: "#6366f1",
    fontWeight: "700",
  },
  qCreateBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: "#0a0a0f",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 10,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 2,
  },
  centerTabContainer: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },
  centerOuterRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#ffffff",
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  centerOuterActive: {
    borderColor: "#00e5a0",
  },
  centerRingPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  centerInnerCircle: {
    backgroundColor: "#ffffff",
    width: "100%",
    height: "100%",
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  opacityPress: {
    opacity: 0.7,
  },
  switchContainer: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: "center",
  },
  switchCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  tabHeader: {
    marginBottom: 24,
  },
  tabTitle: {
    fontSize: 32,
    fontWeight: "500",
    color: "#ffffff",
    letterSpacing: 0.8,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  tabSubtitle: {
    fontSize: 14,
    color: "#888888",
    marginTop: 6,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    width: (SCREEN_WIDTH - 54) / 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  panelCard: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    marginBottom: 18,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: 0.4,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  statLabel: {
    fontSize: 12,
    color: "#888888",
    marginTop: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: "500",
    color: "#ffffff",
    marginBottom: 18,
    marginTop: 12,
    letterSpacing: 0.6,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  quizCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.09)",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
    // Deep layered shadow for "card floating off the surface" feel
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  attemptsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lightAttemptsBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  attemptsBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#bbbbbb",
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  lightAttemptsBadgeText: {
    color: "#555555",
  },
  quizCardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  quizAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  quizAvatarText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  quizCardTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.3,
    lineHeight: 22,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  quizCardMeta: {
    color: "#888888",
    fontSize: 12,
    marginTop: 4,
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  quizTime: {
    color: "#666666",
    fontSize: 12,
  },
  formContainer: {
    gap: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 8,
  },
  webInputDummy: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    height: 48,
    justifyContent: "center",
  },
  formInput: {
    color: "#ffffff",
    fontSize: 15,
    width: "100%",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  categoryButtonActive: {
    backgroundColor: "#00e5a0",
    borderColor: "#00e5a0",
  },
  categoryButtonText: {
    color: "#cccccc",
    fontSize: 13,
    fontWeight: "500",
  },
  categoryButtonTextActive: {
    color: "#000000",
    fontWeight: "bold",
  },
  createButton: {
    backgroundColor: "#00e5a0",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  createButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  videoPlayerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  videoThumbnailPlaceholder: {
    height: 160,
    backgroundColor: "#16181e",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  youtubePlayCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ff0000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff0000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  videoDurationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoCardDetails: {
    padding: 12,
  },
  videoCardTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  videoCardSub: {
    color: "#6e727a",
    fontSize: 11,
    marginTop: 2,
  },
  guideStepCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  guideStepText: {
    color: "#cccccc",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  codeBlockContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  codeLine: {
    color: "#b0b4bc",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    lineHeight: 16,
  },
  codeTag: {
    color: "#ff79c6",
    fontWeight: "600",
  },
  codeAnswer: {
    color: "#00e5a0",
    fontWeight: "600",
  },
  codeComment: {
    color: "#6272a4",
    fontStyle: "italic",
  },
  codeWrong: {
    color: "#ff5555",
    fontWeight: "600",
  },
  guideStepTip: {
    color: "#888888",
    fontSize: 11,
    fontStyle: "italic",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  stepItemRow: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 229, 160, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 160, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepBadgeText: {
    color: "#00e5a0",
    fontSize: 12,
    fontWeight: "bold",
  },
  stepItemTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  stepItemDesc: {
    color: "#6e727a",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  profileDetailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 12,
  },
  profileDetailName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  },
  profileDetailEmail: {
    color: "#666666",
    fontSize: 13,
    marginTop: 2,
  },
  menuList: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    color: "#dddddd",
    fontSize: 15,
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  centerModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#0d0f14",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderTopWidth: 1,
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 24,
  },
  balanceDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  balanceDetailLabel: {
    color: "#999999",
    fontSize: 14,
  },
  balanceDetailValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  bankDetailContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  bankDetailLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  bankMeta: {
    color: "#666666",
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseButton: {
    backgroundColor: "#ffffff",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  modalCloseButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "bold",
  },
  dialogCard: {
    backgroundColor: "#16181f",
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 22,
    width: SCREEN_WIDTH - 32,
    alignSelf: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 16,
  },
  dialogIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  dialogDescription: {
    fontSize: 14,
    color: "#bbbbbb",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  dialogAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 24,
  },
  dialogButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  dialogCancel: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  dialogCancelText: {
    color: "#bbbbbb",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  dialogConfirm: {
    flex: 1,
    backgroundColor: "#00e5a0",
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: "#00e5a0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  dialogConfirmText: {
    color: "#0d0f14",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  bottomSheetCard: {
    backgroundColor: "#0d0f14",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderTopWidth: 1,
    width: "100%",
  },
  bottomSheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  bottomSheetOptionsContainer: {
    gap: 0,
    marginBottom: 12,
  },
  bottomSheetOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255, 255, 255, 0.07)",
    paddingVertical: 11,
    paddingHorizontal: 4,
    gap: 12,
  },
  bottomSheetIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetOptionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSheetOptionSub: {
    color: "#6e727a",
    fontSize: 11,
    marginTop: 2,
  },
  bottomSheetCancelBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetCancelBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  sessionContainer: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    height: 60,
  },
  sessionCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  sessionQuizTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    maxWidth: SCREEN_WIDTH - 160,
  },
  sessionProgressText: {
    color: "#6e727a",
    fontSize: 11,
    marginTop: 2,
  },
  sessionTimerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 229, 160, 0.1)",
    borderColor: "rgba(0, 229, 160, 0.25)",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sessionTimerText: {
    color: "#00e5a0",
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 13,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 2,
    overflow: "hidden",
    marginVertical: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#00e5a0",
    borderRadius: 2,
  },
  sessionScroll: {
    flex: 1,
    marginTop: 10,
  },
  sessionScrollContent: {
    paddingBottom: 40,
  },
  sessionQuestionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  questionIndexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  questionIndexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#00e5a0",
    alignItems: "center",
    justifyContent: "center",
  },
  questionIndexCircleText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "bold",
  },
  questionTypeHelpText: {
    color: "#6e727a",
    fontSize: 11,
  },
  questionPromptText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  sessionOptionsContainer: {
    gap: 8,
  },
  sessionOptionBtn: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  sessionOptionBtnSelected: {
    backgroundColor: "rgba(0, 229, 160, 0.04)",
    borderColor: "rgba(0, 229, 160, 0.3)",
  },
  sessionOptionBtnCorrect: {
    backgroundColor: "rgba(0, 229, 160, 0.1)",
    borderColor: "rgba(0, 229, 160, 0.5)",
  },
  sessionOptionBtnWrong: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  optionLetterBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetterBoxSelected: {
    backgroundColor: "#00e5a0",
  },
  optionLetterBoxCorrect: {
    backgroundColor: "rgba(0, 229, 160, 0.2)",
  },
  optionLetterBoxWrong: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  optionLetterText: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "bold",
  },
  optionContentText: {
    color: "#ffffff",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  sessionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  sessionNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  sessionNavBtnDisabled: {
    opacity: 0.3,
  },
  sessionNavBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  finishSessionBtn: {
    backgroundColor: "#00e5a0",
    borderColor: "#00e5a0",
  },
  resultsScrollContent: {
    paddingBottom: 40,
    alignItems: "center",
  },
  resultsHeader: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  resultsIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 229, 160, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scoreSummaryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  scoreTextBig: {
    color: "#00e5a0",
    fontSize: 48,
    fontWeight: "bold",
    letterSpacing: -1,
  },
  scoreSubText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
  },
  xpBadge: {
    marginTop: 12,
    backgroundColor: "rgba(0, 229, 160, 0.1)",
    borderColor: "rgba(0, 229, 160, 0.2)",
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  xpBadgeText: {
    color: "#00e5a0",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  miniStatLabel: {
    color: "#6e727a",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  miniStatValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  wrongQuestionItem: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 14,
  },
  wrongQuestionPrompt: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginBottom: 6,
  },
  wrongAnswerText: {
    color: "#ef4444",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  correctAnswerText: {
    color: "#00e5a0",
    fontSize: 12,
    lineHeight: 16,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chipBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  chipBtnActive: {
    backgroundColor: "#00e5a0",
    borderColor: "#00e5a0",
  },
  chipBtnDisabled: {
    opacity: 0.3,
  },
  chipText: {
    color: "#cccccc",
    fontSize: 12,
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#000000",
    fontWeight: "bold",
  },
  chipTextDisabled: {
    color: "#555555",
  },
  compactControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  compactControlLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "500",
  },
  sectionCardCompact: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  switchRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  switchLabelCompact: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  switchSubCompact: {
    color: "#6e727a",
    fontSize: 11,
    marginTop: 2,
  },
  stepperSubRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingTop: 4,
  },
  stepperSubRowTextCompact: {
    color: "#6e727a",
    fontSize: 12,
  },
  switchRowSeparator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  modalStickyFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 16,
    marginTop: 8,
  },
  settingsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderRadius: 18,
    height: 64,
    paddingHorizontal: 20,
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  settingsBoxLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsBoxText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 16,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  signOutCompactBtn: {
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  signOutCompactBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  lightRootContainer: {
    backgroundColor: "#f4f4f8",
  },
  lightText: {
    color: "#0d0f14",
  },
  lightTextSub: {
    color: "#6e727a",
  },
  lightCard: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0, 0, 0, 0.07)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  lightTabBar: {
    backgroundColor: "#ffffff",
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  lightModal: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  lightInput: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  lightCodeBlock: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  lightCodeLine: {
    color: "#374151",
  },
  lightBorder: {
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  lightBorderTop: {
    borderTopColor: "rgba(0, 0, 0, 0.06)",
  },
  lightProgressBg: {
    backgroundColor: "rgba(0, 0, 0, 0.06)",
  },
  lightSessionContainer: {
    backgroundColor: "#f5f6f8",
  },

  // ────────────────────────────────────────────
  //  Press animation
  // ────────────────────────────────────────────
  pressedScale: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },

  // ────────────────────────────────────────────
  //  Tab bar active dot indicator
  // ────────────────────────────────────────────
  tabActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00e5a0",
    marginTop: 4,
  },

  // ────────────────────────────────────────────
  //  Landing Screen
  // ────────────────────────────────────────────
  landingSafeArea: {
    flex: 1,
    backgroundColor: "#080a0e",
  },
  landingContainer: {
    flex: 1,
    backgroundColor: "#080a0e",
    paddingHorizontal: 28,
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 36,
  },
  landingBlob1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0, 229, 160, 0.07)",
    top: -60,
    right: -80,
  },
  landingBlob2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59, 130, 246, 0.06)",
    bottom: 80,
    left: -60,
  },
  landingBlob3: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(168, 85, 247, 0.05)",
    top: SCREEN_HEIGHT * 0.42,
    right: -30,
  },
  landingTopSection: {
    alignItems: "center",
    paddingTop: 40,
  },
  landingLogoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "rgba(0, 229, 160, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 229, 160, 0.06)",
    marginBottom: 24,
    shadowColor: "#00e5a0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  landingLogoInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#00e5a0",
    alignItems: "center",
    justifyContent: "center",
  },
  landingAppName: {
    fontSize: 38,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginBottom: 10,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  landingTagline: {
    fontSize: 16,
    color: "#888888",
    textAlign: "center",
    lineHeight: 24,
    fontFamily: Platform.OS === "web" ? "Outfit, Inter, sans-serif" : undefined,
  },
  landingFeatures: {
    gap: 16,
    paddingVertical: 8,
  },
  landingFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  landingFeatureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  landingFeatureText: {
    flex: 1,
  },
  landingFeatureTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 3,
    fontFamily: Platform.OS === "web" ? "Outfit, Inter, sans-serif" : undefined,
  },
  landingFeatureSub: {
    color: "#666666",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Platform.OS === "web" ? "Outfit, Inter, sans-serif" : undefined,
  },
  landingCtaSection: {
    alignItems: "center",
    gap: 12,
  },
  landingCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00e5a0",
    height: 58,
    borderRadius: 16,
    width: "100%",
    shadowColor: "#00e5a0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  landingCtaBtnText: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  landingCtaNote: {
    color: "#555555",
    fontSize: 12,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === "web" ? "Outfit, Inter, sans-serif" : undefined,
  },

  // ─── Animated splash centre layout ─────────────────────────────────────
  landingSplashCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  landingDotRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  landingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },


  // ─── Auth Screen ─────────────────────────────────────────────────
  authRoot: {
    flex: 1,
    minHeight: 600,
    backgroundColor: "#0d0d2e",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 28,
    paddingTop: 8,
  },
  authBlobTL: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(99, 84, 255, 0.1)",
    top: -40,
    left: -60,
  },
  authBlobBR: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(0, 229, 160, 0.06)",
    bottom: 40,
    right: -40,
  },
  authHeroWrap: {
    width: 168,
    height: 168,
    borderRadius: 84,
    overflow: "hidden",
    marginTop: 20,
    marginBottom: 20,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  authHeroImg: {
    width: "100%",
    height: "100%",
  },
  authCopyBlock: {
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  authBigTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: -0.3,
    lineHeight: 30,
    marginBottom: 8,
  },
  authBigSub: {
    fontSize: 13,
    color: "#8888aa",
    textAlign: "center",
    lineHeight: 19,
  },
  authBtnStack: {
    width: "100%",
    gap: 10,
    marginBottom: 14,
  },
  authGooglePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "#ffffff",
    borderRadius: 50,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  authGooglePillText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111111",
  },
  authEmailPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 50,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  authEmailPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#bbbbdd",
  },
  authLoginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  authLoginRowTxt: {
    fontSize: 13,
    color: "#8888aa",
  },
  authLoginLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6366f1",
  },
  authSkipRow: {
    paddingVertical: 8,
    alignItems: "center",
  },
  authSkipTxt: {
    fontSize: 12,
    color: "#44445a",
    letterSpacing: 0.2,
  },
  // Email form sub-screen
  authBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 6,
    marginBottom: 2,
    paddingVertical: 4,
  },
  authBackText: {
    fontSize: 13,
    color: "#aaaacc",
    fontWeight: "500",
  },
  authEmailBody: {
    flex: 1,
    width: "100%",
    paddingTop: 8,
  },
  authPillToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 50,
    padding: 3,
    marginBottom: 16,
    marginTop: 14,
  },
  authPillBtn: {
    flex: 1,
    height: 34,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  authPillBtnOn: {
    backgroundColor: "#6366f1",
  },
  authPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#55557a",
  },
  authPillTextOn: {
    color: "#ffffff",
  },
  authField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  authFieldInput: {
    flex: 1,
    fontSize: 14,
    color: "#ffffff",
  },
  authErrBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  authErrTxt: {
    fontSize: 12,
    color: "#f87171",
    flex: 1,
    lineHeight: 17,
  },
  authBigGreenBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 50,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 4,
    marginBottom: 12,
  },
  authBigGreenBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
});

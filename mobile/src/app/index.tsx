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
  Keyboard,
  BackHandler,
  FlatList,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import IconHome from "tabler-icons-react-native/icons-js/IconHome";
import IconSwords from "tabler-icons-react-native/icons-js/IconSwords";
import IconUser from "tabler-icons-react-native/icons-js/IconUser";
import Svg, { Path } from "react-native-svg";

const CustomChartIcon = ({ size = 24, color = "#000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M6 14v6 M12 6v14 M18 10v10" />
  </Svg>
);

import { GestureHandlerRootView, FlingGestureHandler, Directions, State } from "react-native-gesture-handler";
import YoutubeIframe from "react-native-youtube-iframe";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { Buffer } from "buffer";
import * as mammoth from "mammoth/mammoth.browser.js";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser, onAuth, deleteAccount, resetPassword, type User } from "../lib/firebase";
import { syncUserToNeon, fetchMobileQuizzes, createMobileQuiz, updateMobileQuiz, deleteMobileQuiz, deleteUserFromNeon, sendFeedback, saveBattleHistory, fetchBattleHistory, parsePdfFromBackend } from "../lib/api";
import { createBattleRoom, joinBattleRoom, updateBattleScore, finishBattle, markPlayerFinished, listenToBattleRoom, getBattleRoom, type BattleRoom } from "../lib/multiplayer";
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
// Serialize questionsList → compact QST text (? prompt \n + correct \n - wrong)
// ~30KB for 100 questions — safe for Neon via HTTP
const questionsToSourceText = (title: string, category: string, qs: any[]): string => {
  if (!Array.isArray(qs) || qs.length === 0) return '';
  const header = `@title: ${title}\n@category: ${category}\n\n`;
  const body = qs.map((q: any) => {
    // Support both parseQstText format (prompt/answers) and AI format (question/options/answer)
    if (q.prompt && Array.isArray(q.answers)) {
      const opts = q.answers.map((a: any) => `${a.isCorrect ? '+' : '-'} ${a.text}`).join('\n');
      return `? ${q.prompt}\n${opts}`;
    }
    if (q.question && q.options) {
      const opts = Object.entries(q.options).map(([k, v]) =>
        `${k === q.answer ? '+' : '-'} ${v}`
      ).join('\n');
      return `? ${q.question}\n${opts}`;
    }
    return '';
  }).filter(Boolean).join('\n\n');
  return header + body;
};
import { useTranslation } from "react-i18next";
import "../lib/i18n";

// ── Flashcard API stubs (feature removed — dead code references kept for safety) ──
const createFlashcardDeck = async (..._args: any[]) => ({ deck: null, error: null });
const updateFlashcardDeck = async (..._args: any[]) => ({ deck: null, error: null });
const deleteFlashcardDeck = async (..._args: any[]) => ({ error: null });

// Get screen width/height for layout sizing
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const KeyboardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;
const handleModalCloseRequest = (closeAction: () => void) => {
  if (Keyboard.isVisible()) {
    Keyboard.dismiss();
  } else {
    closeAction();
  }
};

const renderFormattedText = (text: string, baseStyle?: any) => {
  if (!text) return null;
  const regex = /(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|<span style="color:#ef4444">.*?<\/span>|<span style="font-size:20px">.*?<\/span>|\$\$.*?\$\$|---)/g;
  const parts = text.split(regex);
  return (
    <Text style={baseStyle}>
      {parts.map((part, i) => {
        if (!part) return null;
        if (part === "---") return <Text key={i} style={{ opacity: 0.2 }}>{"\n──────────\n"}</Text>;
        if (part.startsWith("**") && part.endsWith("**")) return <Text key={i} style={{ fontWeight: "bold" }}>{part.slice(2, -2)}</Text>;
        if (part.startsWith("$$") && part.endsWith("$$")) return <Text key={i} style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontStyle: "italic", color: "#a855f7" }}>{part.slice(2, -2)}</Text>;
        if (part.startsWith("*") && part.endsWith("*")) return <Text key={i} style={{ fontStyle: "italic" }}>{part.slice(1, -1)}</Text>;
        if (part.startsWith("<u>") && part.endsWith("</u>")) return <Text key={i} style={{ textDecorationLine: "underline" }}>{part.slice(3, -4)}</Text>;
        if (part.startsWith('<span style="color:#ef4444">') && part.endsWith('</span>')) return <Text key={i} style={{ color: "#ef4444" }}>{part.slice(28, -7)}</Text>;
        if (part.startsWith('<span style="font-size:20px">') && part.endsWith('</span>')) return <Text key={i} style={{ fontSize: (baseStyle?.fontSize || 16) + 6 }}>{part.slice(29, -7)}</Text>;
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
};

const APP_LANGUAGES = [
  { id: "system", name: "System language", code: "en", nativeName: "", flag: "A文" },
  { id: "en", name: "English", code: "en", nativeName: "English", flag: "🇺🇸" },
  { id: "es", name: "Spanish", code: "es", nativeName: "Español", flag: "🇪🇸" },
  { id: "fr", name: "French", code: "fr", nativeName: "Français", flag: "🇫🇷" },
  { id: "hi", name: "Hindi", code: "hi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { id: "ru", name: "Russian", code: "ru", nativeName: "Русский", flag: "🇷🇺" },
  { id: "kk", name: "Kazakh", code: "kk", nativeName: "Қазақ тілі", flag: "🇰🇿" },
];

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
  disabled = false,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
  darkMode?: boolean;
  disabled?: boolean;
}) {
  const [localText, setLocalText] = useState(value.toString());

  useEffect(() => {
    setLocalText(value.toString());
  }, [value]);

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
        <Feather name="minus" size={14} color={value <= min ? (darkMode ? "#444" : "#ccc") : "#8B5CF6"} />
      </Pressable>
      
      <View style={[styles.stepperValueContainer, !darkMode && styles.lightBorder]}>
        {disabled ? (
          <Text style={[styles.stepperValueText, { color: darkMode ? "#FFFFFF" : "#000000" }]}>
            {value}
            {suffix}
          </Text>
        ) : (
          <TextInput
            style={[styles.stepperValueText, { color: darkMode ? "#FFFFFF" : "#000000", minWidth: 40, textAlign: "center", padding: 0 }]}
            value={localText}
            keyboardType="number-pad"
            onChangeText={(text) => {
              setLocalText(text);
              const num = parseInt(text, 10);
              if (!isNaN(num)) {
                onChange(Math.max(min, Math.min(max, num)));
              }
            }}
            onEndEditing={(e) => {
              const text = e.nativeEvent.text;
              if (text === "") {
                onChange(min);
                setLocalText(min.toString());
              }
            }}
            onBlur={() => {
              if (localText === "" || isNaN(parseInt(localText, 10))) {
                setLocalText(value.toString());
              }
            }}
          />
        )}
      </View>

      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        onLongPress={() => onChange(Math.min(max, value + (step * 10)))}
        delayLongPress={300}
        disabled={value >= max || disabled}
        style={({ pressed }) => [
          styles.stepperBtn,
          (value >= max || disabled) && styles.stepperBtnDisabled,
          pressed && styles.opacityPress,
        ]}
      >
        <Feather name="plus" size={14} color={value >= max ? (darkMode ? "#444" : "#ccc") : "#8B5CF6"} />
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


// ── Sample quiz — injected once on first launch ──────────────────────────
const SAMPLE_QUIZ = {
  id: "sample_quiz",
  isSample: true,
  title: "General Knowledge — Sample Quiz",
  category: "General",
  questions: 5,
  attempts: [] as any[],
  wrongQuestions: [] as any[],
  uniqueCorrectIds: [] as string[],
  questionsList: [
    { id: "sq1", prompt: "What is the capital city of Japan?",
      answers: [{ id: "sq1a", text: "Beijing", isCorrect: false }, { id: "sq1b", text: "Seoul", isCorrect: false }, { id: "sq1c", text: "Tokyo", isCorrect: true }, { id: "sq1d", text: "Bangkok", isCorrect: false }] },
    { id: "sq2", prompt: "Which planet is known as the Red Planet?",
      answers: [{ id: "sq2a", text: "Venus", isCorrect: false }, { id: "sq2b", text: "Mars", isCorrect: true }, { id: "sq2c", text: "Jupiter", isCorrect: false }, { id: "sq2d", text: "Saturn", isCorrect: false }] },
    { id: "sq3", prompt: "How many sides does a hexagon have?",
      answers: [{ id: "sq3a", text: "5", isCorrect: false }, { id: "sq3b", text: "7", isCorrect: false }, { id: "sq3c", text: "8", isCorrect: false }, { id: "sq3d", text: "6", isCorrect: true }] },
    { id: "sq4", prompt: "Who painted the Mona Lisa?",
      answers: [{ id: "sq4a", text: "Michelangelo", isCorrect: false }, { id: "sq4b", text: "Leonardo da Vinci", isCorrect: true }, { id: "sq4c", text: "Raphael", isCorrect: false }, { id: "sq4d", text: "Vincent van Gogh", isCorrect: false }] },
    { id: "sq5", prompt: "What is the chemical symbol for water?",
      answers: [{ id: "sq5a", text: "O2", isCorrect: false }, { id: "sq5b", text: "HO", isCorrect: false }, { id: "sq5c", text: "H2O", isCorrect: true }, { id: "sq5d", text: "CO2", isCorrect: false }] },
  ],
};

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

const BattleTimer = React.memo(({ startTime, settingsDarkMode }: { startTime: number, settingsDarkMode: boolean }) => {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const totalSecs = Math.floor(elapsed / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  const timeString = `${m}:${s < 10 ? "0" : ""}${s}`;

  return (
    <Text style={{ fontSize: 10, fontWeight: "800", color: settingsDarkMode ? "#52525b" : "#94a3b8", letterSpacing: 1 }}>
      ⏱️ {timeString}
    </Text>
  );
});

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

  useEffect(() => {
    AsyncStorage.getItem("user-language").then(setSavedAppLanguage);
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
      console.warn("Failed to play correct sound effect:", error);
    }
  };

  const playWrongSound = () => {
    try {
      wrongPlayer.volume = 0.3; // Subtle wrong-answer buzzer — quiet and non-distracting
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
  const [showLanding, setShowLanding] = useState(false);
  const [battlePopup, setBattlePopup] = useState<{myScore: number, opponentScore: number, opponentName: string, won: boolean} | null>(null);
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
  useEffect(() => {
    const unsub = onAuth(async (user) => {
      setFirebaseUser(user);

      if (user) {
        setIsSyncingData(true);
        try {
          // 3. Sync user profile to Neon FIRST to guarantee user exists
          const { error: syncErr } = await syncUserToNeon({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });

          if (syncErr) {
            console.warn("[NeonSync] user sync failed:", syncErr);
            neonUserReadyRef.current = false;
          } else {
            neonUserReadyRef.current = true;
            // 4. Fetch quizzes from Neon
            const quizzesRes = await fetchMobileQuizzes(user.uid);

            if (quizzesRes.error) {
              console.warn("[NeonSync] fetch failed:", quizzesRes.error);
            }

            if (!quizzesRes.error && quizzesRes.quizzes.length > 0) {
              const normalizedQuizzes = quizzesRes.quizzes.map((q) => {
                // Find the local copy so we can preserve its questionsList
                const localCopy = quizzesRef.current.find((l: any) => l.id === q.id || l.neonId === q.id);
                return {
                  id: q.id,
                  neonId: q.id,
                  title: q.title,
                  questions: q.questionCount,
                  category: q.category,
                  time: "Synced",
                  // Parse questionsList: new quizzes store it as JSON in sourceText
                  questionsList: (() => {
                    // 1. Prefer local copy (always most up to date)
                    if (localCopy?.questionsList?.length > 0) return localCopy.questionsList;
                    // 2. Try new format: sourceText is JSON array of questions
                    try {
                      const parsed = JSON.parse(q.sourceText);
                      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                    } catch {}
                    // 3. Legacy fallback: reconstruct from raw sourceText
                    try { return parseQstText(q.sourceText).questions; } catch { return []; }
                  })(),
                  attempts: (() => {
                    const dbAttempts = q.attempts ?? [];
                    const locAttempts = localCopy?.attempts ?? [];
                    const attemptMap = new Map();
                    for (const a of dbAttempts) attemptMap.set(a.id, a);
                    for (const a of locAttempts) attemptMap.set(a.id, a);
                    return Array.from(attemptMap.values()).sort((a, b) => Number(b.id) - Number(a.id));
                  })(),
                  uniqueCorrectIds: (() => {
                    return Array.from(new Set([...(q.uniqueCorrectIds ?? []), ...(localCopy?.uniqueCorrectIds ?? [])]));
                  })(),
                  wrongQuestions: (() => {
                    const wrongMap = new Map();
                    for (const w of (q.wrongQuestions ?? [])) wrongMap.set(w.id || w, w);
                    for (const w of (localCopy?.wrongQuestions ?? [])) wrongMap.set(w.id || w, w);
                    
                    const combinedCorrect = new Set([...(q.uniqueCorrectIds ?? []), ...(localCopy?.uniqueCorrectIds ?? [])]);
                    return Array.from(wrongMap.values()).filter(w => !combinedCorrect.has(w.id || w));
                  })(),
                };
              });
              setQuizzes((local: any[]) => {
                // Exclude sample_quiz — it lives in its own sampleQuiz state, not the main quizzes array
                const cleanLocal = local.filter((l) => l.id !== "sample_quiz");
                
                // Preserve local ordering
                const updatedLocal = cleanLocal.map(l => {
                  const synced = normalizedQuizzes.find((n) => n.id === l.id);
                  return synced || l;
                });

                // Append any completely new quizzes from the server
                const newFromServer = normalizedQuizzes.filter(n => !cleanLocal.find(l => l.id === n.id));

                return [...updatedLocal, ...newFromServer];
              });

              // Backfill local-only quizzes that aren't in Neon yet (exclude sample_quiz — it must never be uploaded)
              const neonIds = new Set(normalizedQuizzes.map((q) => q.id));
              const unsynced = quizzesRef.current.filter((q) => !q.isSample && q.id !== "sample_quiz" && !neonIds.has(q.id) && !q.neonId);
              console.log(`[NeonSync] Neon has ${normalizedQuizzes.length} quizzes, ${unsynced.length} local unsynced`);
              for (const q of unsynced) {
                createMobileQuiz({
                  userId: user.uid,
                  title: q.title,
                  category: q.category || "General",
                  questionCount: q.questionsList?.length ?? q.questions ?? 0,
                  sourceText: questionsToSourceText(q.title, q.category || 'General', q.questionsList ?? []),
                  attempts: q.attempts || [],
                  wrongQuestions: q.wrongQuestions || [],
                  uniqueCorrectIds: q.uniqueCorrectIds || [],
                }).then(({ quiz: saved }) => {
                  if (saved) {
                    setQuizzes((prev: any[]) =>
                      prev.map((pq) => pq.id === q.id ? { ...pq, id: saved.id, neonId: saved.id } : pq)
                    );
                    console.log(`[NeonSync] Backfilled quiz: ${saved.id}`);
                  }
                }).catch((err) => console.warn("[NeonSync] backfill failed:", err));
              }
            } else if (!quizzesRes.error) {
              // Neon is empty — upload all local quizzes
              console.log(`[NeonSync] Neon empty, uploading ${quizzesRef.current.length} local quizzes`);
              for (const q of quizzesRef.current) {
                if (q.neonId || q.isSample || q.id === "sample_quiz") continue; // already synced somehow or is sample
                createMobileQuiz({
                  userId: user.uid,
                  title: q.title,
                  category: q.category || "General",
                  questionCount: q.questionsList?.length ?? q.questions ?? 0,
                  sourceText: questionsToSourceText(q.title, q.category || 'General', q.questionsList ?? []),
                  attempts: q.attempts || [],
                  wrongQuestions: q.wrongQuestions || [],
                  uniqueCorrectIds: q.uniqueCorrectIds || [],
                }).then(({ quiz: saved, error: saveErr }) => {
                  if (saveErr) { console.warn("[NeonSync] upload failed:", saveErr); return; }
                  if (saved) {
                    setQuizzes((prev: any[]) =>
                      prev.map((pq) => pq.id === q.id ? { ...pq, id: saved.id, neonId: saved.id } : pq)
                    );
                    console.log(`[NeonSync] Uploaded quiz to Neon: ${saved.id}`);
                  }
                }).catch((err) => console.warn("[NeonSync] upload error:", err));
              }
            }

            // 5. Fetch battle history from Neon and merge
            const battleHistoryRes = await fetchBattleHistory(user.uid);
            if (!battleHistoryRes.error && battleHistoryRes.history.length > 0) {
              AsyncStorage.getItem("battle_history").then(val => {
                let localHistory = [];
                try { if (val) localHistory = JSON.parse(val); } catch {}
                
                // Merge based on quiz_title, scores, and date roughly (using date or just avoiding exact duplicates)
                // The easiest way is to use a Map keyed by `date` + `quizTitle`
                const mergedMap = new Map();
                localHistory.forEach((h: any) => mergedMap.set(`${h.date}_${h.quizTitle}`, h));
                
                // Add server history (map DB snake_case back to camelCase)
                battleHistoryRes.history.forEach((h: any) => {
                  const parsedDate = new Date(h.created_at).getTime();
                  const key = `${parsedDate}_${h.quiz_title}`;
                  if (!mergedMap.has(key)) {
                    mergedMap.set(key, {
                      date: parsedDate,
                      quizTitle: h.quiz_title,
                      myScore: h.my_score,
                      opponentScore: h.opponent_score,
                      opponentName: h.opponent_name,
                      won: h.won,
                      myTime: h.my_time,
                      opponentTime: h.opponent_time
                    });
                  }
                });
                
                const mergedArray = Array.from(mergedMap.values())
                  .sort((a, b) => a.date - b.date)
                  .slice(-50);
                
                setBattleHistory(mergedArray);
                AsyncStorage.setItem("battle_history", JSON.stringify(mergedArray));
              });
            }
          }
        } catch (e) {
          console.warn("[NeonSync] sync pipeline failed:", e);
        } finally {
          setIsSyncingData(false);
        }
      } else {
        neonUserReadyRef.current = false;
      }
    });
    return unsub;
  }, []);

  // ── Pre-load quizzes instantly before Firebase initializes (offline-first) ──
  // This runs in ~50ms. Firebase fires 2-3s later and silently updates if needed.
  useEffect(() => {
    (async () => {
      try {
        const [qRaw, sRaw] = await Promise.all([
          AsyncStorage.getItem(storageKey("quizzes")),
          AsyncStorage.getItem(`quizforge_starred_global`),
        ]);
        if (qRaw) {
          const parsed = JSON.parse(qRaw);
          setQuizzes(prev => prev.length === 0 ? parsed : prev);
        }
        if (sRaw) {
          setStarredQuestions(new Set(JSON.parse(sRaw)));
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
        console.warn("[Sample] inject failed:", e);
      }
    })();
  }, [dataLoaded]);

  useEffect(() => {
    if (showLanding) return; // still on splash
    AsyncStorage.getItem("quizforge_has_seen_auth").then((val) => {
      if (!val) {
        // First ever launch — show full auth screen
        openAuthScreen();
        AsyncStorage.setItem("quizforge_has_seen_auth", "1");
      }
    });
    // Load saved toggle preferences
    AsyncStorage.multiGet(["pref_shuffleQuestions", "pref_shuffleAnswers", "pref_showAnswerOnSubmit"]).then((pairs) => {
      pairs.forEach(([key, val]) => {
        if (key === "pref_shuffleQuestions" && val !== null) setShuffleQuestionsRaw(val === "1");
        if (key === "pref_shuffleAnswers" && val !== null) setShuffleAnswersRaw(val === "1");
        if (key === "pref_showAnswerOnSubmit" && val !== null) setShowAnswerOnSubmitRaw(val === "1");
      });
    });
    // Load battle history and pending battles
    AsyncStorage.multiGet(["battle_history", "pending_battles"]).then(async ([[_key1, histVal], [_key2, pendVal]]) => {
      let loadedHistory = [];
      if (histVal) {
        try { 
          loadedHistory = JSON.parse(histVal); 
          setBattleHistory(loadedHistory); 
        } catch {}
      }

      if (pendVal) {
        try {
          let pending = JSON.parse(pendVal) as {code: string, isHost: boolean}[];
          let updatedPending = [...pending];
          let historyUpdated = false;

          for (const pb of pending) {
            const room = await getBattleRoom(pb.code);
            if (!room) {
              updatedPending = updatedPending.filter(p => p.code !== pb.code);
              continue;
            }

            if (room.hostFinished && room.guestFinished) {
              const myScore = pb.isHost ? room.hostScore : room.guestScore;
              const oppScore = pb.isHost ? room.guestScore : room.hostScore;
              const oppName = pb.isHost ? (room.guestName || "Opponent") : room.hostName;
              const myTime = pb.isHost ? (room.hostTime ?? Infinity) : (room.guestTime ?? Infinity);
              const oppTime = pb.isHost ? (room.guestTime ?? Infinity) : (room.hostTime ?? Infinity);
              let effectiveWin = false;
              if (myScore > oppScore) effectiveWin = true;
              else if (myScore === oppScore) {
                effectiveWin = myTime < oppTime;
              }

              const entry = { date: Date.now(), quizTitle: room.quizTitle || "", myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin, myTime: myTime !== Infinity ? myTime : undefined, opponentTime: oppTime !== Infinity ? oppTime : undefined };
              loadedHistory = [...loadedHistory, entry].slice(-50);
              historyUpdated = true;
              updatedPending = updatedPending.filter(p => p.code !== pb.code);
            } else {
              const unsubscribe = listenToBattleRoom(pb.code, (data) => {
                if (data.hostFinished && data.guestFinished) {
                  const myScore = pb.isHost ? data.hostScore : data.guestScore;
                  const oppScore = pb.isHost ? data.guestScore : data.hostScore;
                  const oppName = pb.isHost ? (data.guestName || "Opponent") : data.hostName;
                  const myTime = pb.isHost ? (data.hostTime ?? Infinity) : (data.guestTime ?? Infinity);
                  const oppTime = pb.isHost ? (data.guestTime ?? Infinity) : (data.hostTime ?? Infinity);
                  let effectiveWin = false;
                  if (myScore > oppScore) effectiveWin = true;
                  else if (myScore === oppScore) {
                    effectiveWin = myTime < oppTime;
                  }
                  
                  setBattleHistory(prev => {
                    const next = [...prev, { date: Date.now(), quizTitle: data.quizTitle || "", myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin, myTime: myTime !== Infinity ? myTime : undefined, opponentTime: oppTime !== Infinity ? oppTime : undefined }].slice(-50);
                    AsyncStorage.setItem("battle_history", JSON.stringify(next));
                    return next;
                  });

                  setBattlePopup({ myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin });
                  if (effectiveWin) triggerConfettiBurst();

                  AsyncStorage.getItem("pending_battles").then(val => {
                    if (val) {
                      try {
                        const currentPending = JSON.parse(val);
                        const newPending = currentPending.filter((p: any) => p.code !== pb.code);
                        AsyncStorage.setItem("pending_battles", JSON.stringify(newPending));
                      } catch {}
                    }
                  });

                  unsubscribe();
                }
              });
            }
          }

          if (historyUpdated) {
            setBattleHistory(loadedHistory);
            AsyncStorage.setItem("battle_history", JSON.stringify(loadedHistory));
          }
          if (updatedPending.length !== pending.length) {
            AsyncStorage.setItem("pending_battles", JSON.stringify(updatedPending));
          }
        } catch {}
      }
    });
  }, [showLanding]);
  // ─────────────────────────────────────────────────────────────────



  const [activeTab, setActiveTab] = useState<"home" | "dashboard" | "add" | "guide" | "menu" | "insights" | "battle">("home");
  const [battleRoomCode, setBattleRoomCode] = useState("");
  const [battleRoomState, setBattleRoomState] = useState<BattleRoom | null>(null);
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
  const [battleHistory, setBattleHistory] = useState<Array<{date: number, quizTitle: string, myScore: number, opponentScore: number, opponentName: string, won: boolean, myTime?: number, opponentTime?: number}>>([]);
  const [battleConnError, setBattleConnError] = useState("");
  const [battleCreating, setBattleCreating] = useState(false);
  const [battleTimePerQuestion, setBattleTimePerQuestion] = useState<number | null>(null); // null = no limit
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

  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [showWrongReview, setShowWrongReview] = useState<boolean>(false);
  const [showQuizActions, setShowQuizActions] = useState<any | null>(null);
  const [renamingQuiz, setRenamingQuiz] = useState<any | null>(null);
  const [importErrorDetails, setImportErrorDetails] = useState<{ title: string; message: string; details?: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [deletingQuizConfirm, setDeletingQuizConfirm] = useState<any | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  // In-app modals (replaces Alert.alert)
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [selectedAttemptForModal, setSelectedAttemptForModal] = useState<any | null>(null);
  const [starredQuestions, setStarredQuestions] = useState<Set<string>>(new Set());
  const [homeFilter, setHomeFilter] = useState<"all"|"progress"|"notstarted"|"done">("all");
  const [homeSearch, setHomeSearch] = useState("");
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
  const [pdfViewQuiz, setPdfViewQuiz] = useState<any | null>(null);
  const [selectionMode, setSelectionMode] = useState<"all" | "random" | "range" | "unanswered" | "wrong">("all");
  const [randomCount, setRandomCount] = useState<number>(5);
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(5);
  const [shuffleQuestions, setShuffleQuestionsRaw] = useState<boolean>(false);
  const [shuffleAnswers, setShuffleAnswersRaw] = useState<boolean>(false);
  const [showAnswerOnSubmit, setShowAnswerOnSubmitRaw] = useState<boolean>(true);
  const [quizTimeLimit, setQuizTimeLimit] = useState<number | null>(null);
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

  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(0);
  const [battleQuestionTimeLeft, setBattleQuestionTimeLeft] = useState<number>(0); // per-question countdown in battle
  const [viewingInsightsQuiz, setViewingInsightsQuiz] = useState<any | null>(null);
  const [viewingInsightsDeck, setViewingInsightsDeck] = useState<any | null>(null);
  const [viewingInsightsQuizFromTab, setViewingInsightsQuizFromTab] = useState<string>("dashboard");
  const [qQuery, setQQuery] = useState("");
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const fileInputRef = React.useRef<any>(null);
  const quizFlatListRef = React.useRef<any>(null);
  const quizNumbersScrollRef = React.useRef<ScrollView>(null);
  const [confettiParticles, setConfettiParticles] = useState<any[]>([]);
  const [studyingDeck, setStudyingDeck] = useState<any | null>(null);

  // ── Hardware Back Button Handling ──
  useEffect(() => {
    const onBackPress = () => {
      if (activeSession) {
        if (activeSession.isFinished) {
          // Results page — back saves progress and goes straight to home
          saveAndExitQuizSession();
        } else {
          setShowQuitConfirm(true);
        }
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
        console.warn("Failed to set audio mode:", err);
      }
    };
    configureAudio();
  }, []);

  // Always-fresh ref so the interval closure never goes stale
  const handleTimerExpiredRef = React.useRef<() => void>(() => {});

  // Timer effect for Quiz Attempts
  React.useEffect(() => {
    let intervalId: any = null;

    if (activeSession && activeSession.quizTimeLimit !== null && activeSession.quizTimeLimit !== undefined && !activeSession.isFinished) {
      if (sessionTimeLeft <= 0) {
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
  }, [activeSession?.quizId, activeSession?.quizTimeLimit, activeSession?.isFinished]);

  // Keep ref always pointing to the freshest closure (re-runs every render)
  React.useEffect(() => {
    handleTimerExpiredRef.current = () => {
      // Use functional updaters so we always read the latest state,
      // even though this runs inside a stale setInterval closure.
      setActiveSession((currentSession: any) => {
        if (!currentSession) return currentSession;
        playSuccessSound();

        const questions = currentSession.questions;
        let correctCount = 0;
        let wrongCount = 0;
        let skippedCount = 0;
        const wrongQsForQuiz: any[] = [];
        const correctIdsInSession: string[] = [];

        questions.forEach((q: any) => {
          const selected = currentSession.answers[q.id] || [];
          if (selected.length === 0) {
            skippedCount++;
          } else {
            const correctIds = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
            const isAllCorrect = selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
            if (isAllCorrect) {
              correctCount++;
              correctIdsInSession.push(q.id);
            } else {
              wrongCount++;
              const correctText = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.text).join(", ");
              const selectedText = q.answers.filter((a: any) => selected.includes(a.id)).map((a: any) => a.text).join(", ");
              wrongQsForQuiz.push({ id: q.id, prompt: q.prompt, selected: selectedText, correct: correctText });
            }
          }
        });

        const scorePct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

        const baseAttemptData = {
          id: String(Date.now()),
          score: scorePct,
          correct: correctCount,
          wrong: wrongCount,
          skipped: skippedCount,
          timestamp: Date.now(),
          wrongQuestionIds: wrongQsForQuiz.map((q: any) => q.id),
          questionIds: questions.map((q: any) => q.id),
          timedOut: true,
        };

        // Save into quizzes using functional updater too
        setQuizzes((currentQuizzes) => {
          const updatedQuizzes = currentQuizzes.map((q: any) => {
            if (q.id === currentSession.quizId) {
              const currentUnique = q.uniqueCorrectIds || [];
              const updatedUniqueCorrectIds = Array.from(new Set([...currentUnique, ...correctIdsInSession]));
              const updatedAttempts = [baseAttemptData, ...(q.attempts || [])];
              
              const correctSet = new Set(correctIdsInSession);
              const wrongMap = new Map();
              
              (q.wrongQuestions || []).forEach((w: any) => {
                const wid = w.id || w;
                if (!correctSet.has(wid)) {
                  wrongMap.set(wid, w);
                }
              });
              
              wrongQsForQuiz.forEach((w: any) => {
                wrongMap.set(w.id, w);
              });
              
              const mergedWrongQuestions = Array.from(wrongMap.values());

              return {
                ...q,
                attempts: updatedAttempts,
                wrongQuestions: mergedWrongQuestions,
                uniqueCorrectIds: updatedUniqueCorrectIds,
              };
            }
            return q;
          });

          // Sync to Neon
          const updatedQ = updatedQuizzes.find((q: any) => q.id === currentSession.quizId);
          const neonId = updatedQ?.neonId ?? updatedQ?.id;
          if (firebaseUser && neonId && !String(neonId).startsWith("local_")) {
            updateMobileQuiz({
              userId: firebaseUser.uid,
              quizId: neonId,
              attempts: updatedQ.attempts,
              wrongQuestions: updatedQ.wrongQuestions,
              uniqueCorrectIds: updatedQ.uniqueCorrectIds,
            }).catch((err: any) => console.warn("[NeonSync] timed-out quiz save failed:", err));
          }

          return updatedQuizzes;
        });

        // Mark session finished
        return { ...currentSession, isFinished: true, timedOut: true };
      });
    };
  });

  // ── Per-question countdown timer (Battle mode only) ──────────────────────
  const battleQuestionTimerRef = React.useRef<any>(null);

  React.useEffect(() => {
    // Clear any existing interval whenever the question changes or session changes
    if (battleQuestionTimerRef.current) {
      clearInterval(battleQuestionTimerRef.current);
      battleQuestionTimerRef.current = null;
    }

    const session = activeSession;
    const tpq = battleTimePerQuestion;

    if (!session || !session.isBattle || !session.questions || session.isFinished) return;
    if (tpq == null || tpq <= 0) return;

    const currentIdx = session.currentIndex ?? 0;

    // Reset countdown for this question
    setBattleQuestionTimeLeft(tpq);

    battleQuestionTimerRef.current = setInterval(() => {
      setBattleQuestionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(battleQuestionTimerRef.current);
          battleQuestionTimerRef.current = null;

          // Auto-advance: use latest session state via functional updater
          setActiveSession((cur: any) => {
            if (!cur || cur.isFinished) return cur;
            const totalQs = cur.questions?.length ?? 0;
            const nextIdx = (cur.currentIndex ?? 0) + 1;

            if (nextIdx >= totalQs) {
              // Last question — finish the session
              const totalTimeMs = Date.now() - (cur.startTime || Date.now());
              if (cur.battleRoomCode) {
                markPlayerFinished(cur.battleRoomCode, cur.isHost, totalTimeMs).catch(console.error);
              }
              const finishedSession = { ...cur, isFinished: true };
              // Defer save so state update completes first
              setTimeout(() => saveAndExitQuizSession(false, finishedSession), 0);
              return finishedSession;
            }

            // Scroll FlatList to next question
            setTimeout(() => {
              quizFlatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
              quizNumbersScrollRef.current?.scrollTo({ x: nextIdx * 48, animated: true });
            }, 50);

            // NOTE: Do NOT create a nested setInterval here.
            // The useEffect that owns the timer will re-run because currentIndex
            // changed in state, and it will correctly reset + start a fresh interval.
            return { ...cur, currentIndex: nextIdx };
          });

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (battleQuestionTimerRef.current) {
        clearInterval(battleQuestionTimerRef.current);
        battleQuestionTimerRef.current = null;
      }
    };
  // Re-run when the question index changes OR a new battle session starts
  }, [activeSession?.isBattle, activeSession?.currentIndex, activeSession?.quizId, activeSession?.isFinished, battleTimePerQuestion]);


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
    } else if (selectionMode === "unanswered") {
      const neverAttemptedIds = new Set<string>(
        (selectedQuiz.attempts || []).flatMap((a: any) => a.questionIds || [])
      );
      const unansweredQs = filteredQuestions.filter((q: any) => !neverAttemptedIds.has(q.id));
      if (unansweredQs.length > 0) {
        filteredQuestions = unansweredQs;
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
      timePerQuestion: null,
      quizTimeLimit,
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

  const saveAndExitQuizSession = (exitSession: boolean = true, sessionToSave: any = activeSession) => {
    if (!sessionToSave || !sessionToSave.isFinished) {
      if (exitSession) setActiveSession(null);
      return;
    }

    if (sessionToSave.attemptSaved) {
      if (exitSession) setActiveSession(null);
      return;
    }

    const questions = sessionToSave.questions;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const wrongQsForQuiz: any[] = [];
    const correctIdsInSession: string[] = [];

    questions.forEach((q: any) => {
      const selected = sessionToSave.answers[q.id] || [];
      if (selected.length === 0) {
        skippedCount++;
      } else {
        const correctIds = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
        const isAllCorrect = selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
        if (isAllCorrect) {
          correctCount++;
          correctIdsInSession.push(q.id);
        } else {
          wrongCount++;
          const correctText = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.text).join(", ");
          const selectedText = q.answers.filter((a: any) => selected.includes(a.id)).map((a: any) => a.text).join(", ");
          wrongQsForQuiz.push({ id: q.id, prompt: q.prompt, selected: selectedText, correct: correctText });
        }
      }
    });

    const scorePct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const targetAttemptId = sessionToSave.targetAttemptId;
    const retryOfAttemptNum = sessionToSave.retryOfAttemptNum;
    // Always create a new attempt entry — never modify the original score
    const baseAttemptData = {
      id: String(Date.now()),
      score: scorePct, correct: correctCount, wrong: wrongCount, skipped: skippedCount,
      timestamp: Date.now(),
      wrongQuestionIds: wrongQsForQuiz.map(q => q.id),
      questionIds: sessionToSave.questions.map((q: any) => q.id),
      // Tag retries so the card can show "Retry of #N" instead of "Attempt #N"
      ...(targetAttemptId ? { mode: "retry", retryOfAttemptId: targetAttemptId, retryOfAttemptNum } : { mode: "full" }),
    };

    if (sessionToSave.quizId === "sample_quiz") {
      const q = sampleQuiz;
      const currentUnique = q.uniqueCorrectIds || [];
      const updatedUniqueCorrectIds = Array.from(new Set([...currentUnique, ...correctIdsInSession]));
      let updatedAttempts = q.attempts || [];
      updatedAttempts = [baseAttemptData, ...updatedAttempts];
      const correctSet = new Set(correctIdsInSession);
      const wrongMap = new Map();
      (q.wrongQuestions || []).forEach((w: any) => {
        const wid = w.id || w;
        if (!correctSet.has(wid)) wrongMap.set(wid, w);
      });
      wrongQsForQuiz.forEach((w: any) => { wrongMap.set(w.id, w); });
      const mergedWrongQuestions = Array.from(wrongMap.values());
      
      const updatedSample = { ...q, attempts: updatedAttempts, wrongQuestions: mergedWrongQuestions, uniqueCorrectIds: updatedUniqueCorrectIds };
      setSampleQuiz(updatedSample);
      AsyncStorage.setItem("quizforge_sample_data", JSON.stringify(updatedSample));
      
      // Update the insights view instantly if we are looking at the sample quiz
      if (viewingInsightsQuiz && viewingInsightsQuiz.id === "sample_quiz") {
        setViewingInsightsQuiz(updatedSample);
      }

      if (exitSession) {
        setActiveSession(null);
      } else {
        setActiveSession((curr: any) => curr ? { ...curr, attemptSaved: true, targetAttemptId: curr.targetAttemptId || baseAttemptData.id, retryOfAttemptNum: curr.retryOfAttemptNum || updatedAttempts.length } : null);
      }
      return;
    }

    const updatedQuizzes = quizzes.map((q: any) => {
      if (q.id === sessionToSave.quizId) {
        const currentUnique = q.uniqueCorrectIds || [];
        const updatedUniqueCorrectIds = Array.from(new Set([...currentUnique, ...correctIdsInSession]));
        let updatedAttempts = q.attempts || [];
        // Always prepend as a new entry — original attempt score stays locked
        updatedAttempts = [baseAttemptData, ...updatedAttempts];
        const correctSet = new Set(correctIdsInSession);
        const wrongMap = new Map();
        (q.wrongQuestions || []).forEach((w: any) => {
          const wid = w.id || w;
          if (!correctSet.has(wid)) wrongMap.set(wid, w);
        });
        wrongQsForQuiz.forEach((w: any) => { wrongMap.set(w.id, w); });
        const mergedWrongQuestions = Array.from(wrongMap.values());
        return { ...q, attempts: updatedAttempts, wrongQuestions: mergedWrongQuestions, uniqueCorrectIds: updatedUniqueCorrectIds };
      }
      return q;
    });

    setQuizzes(updatedQuizzes);
    setViewingInsightsQuiz(updatedQuizzes.find((q: any) => q.id === sessionToSave.quizId));

    if (exitSession) {
      setActiveSession(null);
    } else {
      const updatedQ = updatedQuizzes.find((q: any) => q.id === sessionToSave.quizId);
      const attemptLength = updatedQ?.attempts?.length || 1;
      setActiveSession((curr: any) => curr ? { ...curr, attemptSaved: true, targetAttemptId: curr.targetAttemptId || baseAttemptData.id, retryOfAttemptNum: curr.retryOfAttemptNum || attemptLength } : null);
    }

    const updatedQ = updatedQuizzes.find((q: any) => q.id === sessionToSave.quizId);
    const neonId = updatedQ?.neonId ?? updatedQ?.id;
    if (firebaseUser && neonId && !String(neonId).startsWith("local_")) {
      updateMobileQuiz({
        userId: firebaseUser.uid, quizId: neonId,
        attempts: updatedQ.attempts, wrongQuestions: updatedQ.wrongQuestions, uniqueCorrectIds: updatedQ.uniqueCorrectIds,
      }).catch((err) => console.warn("[NeonSync] quiz attempt update failed:", err));
    }
  };

  const playQuizDirectly = (quiz: any, mode: "all" | "random" | "range" | "unanswered" | "wrong") => {
    let qsList = quiz.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (quiz.questionsList || []);
    if (qsList.length === 0) {
      qsList = generateMockQuestionsForQuiz(quiz.title, quiz.questions);
    }

    let filteredQuestions = [...qsList];
    if (mode === "random") {
      const rndCount = Math.min(5, quiz.questions);
      filteredQuestions = filteredQuestions.sort(() => Math.random() - 0.5).slice(0, rndCount);
    } else if (mode === "wrong") {
      const wrongList = quiz.wrongQuestions || [];
      const allWrongIds = new Set<string>();
      (quiz.attempts || []).forEach((a: any) => {
        (a.wrongQuestionIds || []).forEach((id: string) => allWrongIds.add(id));
      });
      wrongList.forEach((w: any) => allWrongIds.add(w.id));
      
      if (allWrongIds.size > 0) {
        filteredQuestions = filteredQuestions.filter((q: any) => allWrongIds.has(q.id));
        
        if (filteredQuestions.length === 0) {
          if (Platform.OS === "web") {
            alert("Version Mismatch: Your previous incorrect questions belong to an older version of this quiz. Please clear the quiz history and try again.");
          } else {
            Alert.alert(
              "Version Mismatch", 
              "Your previous incorrect questions belong to an older version of this quiz. Please clear the quiz history to start fresh."
            );
          }
          return;
        }
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
    if (quizId === "sample_quiz") {
      const q = sampleQuiz;
      const nextAttempts = q.attempts.filter((a: any) => a.id !== attemptId);
      const nextWrong = nextAttempts.length === 0 ? [] : (q.wrongQuestions || []);
      const nextUnique = nextAttempts.length === 0 ? [] : (q.uniqueCorrectIds || []);
      const updatedSample = { ...q, attempts: nextAttempts, wrongQuestions: nextWrong, uniqueCorrectIds: nextUnique };
      setSampleQuiz(updatedSample);
      AsyncStorage.setItem("quizforge_sample_data", JSON.stringify(updatedSample));
      if (viewingInsightsQuiz && viewingInsightsQuiz.id === quizId) {
        setViewingInsightsQuiz(updatedSample);
      }
      if (Platform.OS === "web") {
        alert("Attempt history updated.");
      } else {
        Alert.alert("Success", "Attempt deleted successfully.");
      }
      return;
    }

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
    if (quizId === "sample_quiz") {
      const updatedSample = { ...sampleQuiz, attempts: [], wrongQuestions: [], uniqueCorrectIds: [] };
      setSampleQuiz(updatedSample);
      AsyncStorage.setItem("quizforge_sample_data", JSON.stringify(updatedSample));
      if (viewingInsightsQuiz && viewingInsightsQuiz.id === quizId) {
        setViewingInsightsQuiz(updatedSample);
      }
      return;
    }

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
    if (quizId === "sample_quiz") {
      setSampleDismissed(true);
      AsyncStorage.setItem("quizforge_sample_dismissed", "1");
      setViewingInsightsQuiz(null);
      setActiveTab("dashboard");
      return;
    }

    const quizToDelete = quizzes.find(q => q.id === quizId);
    if (quizToDelete && firebaseUser) {
      const neonId = quizToDelete.neonId ?? quizToDelete.id;
      if (!String(neonId).startsWith("local_")) {
        deleteMobileQuiz(firebaseUser.uid, neonId).catch((err) =>
          console.warn("[NeonSync] quiz delete failed:", err)
        );
      }
    }

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
        <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub, { marginBottom: 10, fontSize: 12 }]}>{t('insight.score_trends') || "SCORE TRENDS"}</Text>
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
    const questionsList = quiz.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (quiz.questionsList || []);
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
        
        <View style={{ height: 320, borderRadius: 12, overflow: "hidden" }}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {filtered.map((q: any, i: number) => {
              const isExpanded = expandedQId === q.id;
              return (
                <View key={q.id} style={{ borderRadius: 12, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                  <Pressable
                    onPress={() => setExpandedQId(isExpanded ? "directory" : q.id)}
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
          </ScrollView>
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
          <Feather name="arrow-left" size={16} color={settingsDarkMode ? "#ccccdd" : "#666677"} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: settingsDarkMode ? "#ccccdd" : "#666677" }}>
            {viewingInsightsQuizFromTab === "home" ? "Back to Home" : "Back to Statistics"}
          </Text>
        </Pressable>

        {/* Page Header */}
        <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: "rgba(0, 229, 160, 0.12)" }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: "#00e5a0" }}>{quiz.category}</Text>
            </View>
            <Text style={{ fontSize: 11, color: "#888888" }}>{quiz.questions} {t('actions.questions') || "Questions"}</Text>
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
                ? { backgroundColor: "rgba(245, 158, 11, 0.03)", borderColor: "rgba(245, 158, 11, 0.15)", shadowOpacity: 0, elevation: 0 } 
                : { backgroundColor: "rgba(245, 158, 11, 0.04)", borderColor: "rgba(245, 158, 11, 0.22)", shadowColor: "#f59e0b", shadowOpacity: 0.14, shadowRadius: 12 }
            ]}
          >
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
              <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{attempts.length > 0 ? `${highScore}%` : "—"}</Text>
            <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>{t('insight.peak_score') || "Peak Score"}</Text>
          </View>

          <View 
            style={[
              styles.statCard, 
              settingsDarkMode 
                ? { backgroundColor: "rgba(59, 130, 246, 0.03)", borderColor: "rgba(59, 130, 246, 0.15)", shadowOpacity: 0, elevation: 0 } 
                : { backgroundColor: "rgba(59, 130, 246, 0.04)", borderColor: "rgba(59, 130, 246, 0.22)", shadowColor: "#3b82f6", shadowOpacity: 0.14, shadowRadius: 12 }
            ]}
          >
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(59, 130, 246, 0.12)" }]}>
              <Ionicons name="analytics-outline" size={20} color="#3b82f6" />
            </View>
            <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{attempts.length > 0 ? `${avgScore}%` : "—"}</Text>
            <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>{t('insight.avg_score') || "Avg Score"}</Text>
          </View>

          <View 
            style={[
              styles.statCard, 
              settingsDarkMode 
                ? { backgroundColor: "rgba(168, 85, 247, 0.03)", borderColor: "rgba(168, 85, 247, 0.15)", shadowOpacity: 0, elevation: 0 } 
                : { backgroundColor: "rgba(168, 85, 247, 0.04)", borderColor: "rgba(168, 85, 247, 0.22)", shadowColor: "#a855f7", shadowOpacity: 0.14, shadowRadius: 12 }
            ]}
          >
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(168, 85, 247, 0.12)" }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#a855f7" />
            </View>
            <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{attempts.length}</Text>
            <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>{t('insight.sessions') || "Sessions"}</Text>
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
              backgroundColor: "#4f46e5",
              shadowColor: "#4f46e5", shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
            }, pressed && styles.pressedScale]}
          >
            <Ionicons name="play" size={18} color="#ffffff" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>{t('insight.start_test') || "Start Test"}</Text>
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
                {t('insight.incorrect') || "Incorrect"} ({wrongCount})
              </Text>
            </Pressable>
          )}
        </View>

        {/* Bookmarked Questions + Attempt buttons */}
        {(() => {
          const bookmarkedQs = (quiz.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (quiz.questionsList || [])).filter((q: any) => starredQuestions.has(q.id));
          const bookmarkCount = bookmarkedQs.length;
          return (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              {/* Bookmarked Questions — collapsible */}
              <Pressable
                onPress={() => setExpandedQId(expandedQId === "bookmarked" ? null : "bookmarked")}
                style={({ pressed }) => [{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  paddingHorizontal: 14, paddingVertical: 13, borderRadius: 14,
                  backgroundColor: expandedQId === "bookmarked"
                    ? (settingsDarkMode ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)")
                    : (settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"),
                  borderWidth: 1,
                  borderColor: expandedQId === "bookmarked"
                    ? "rgba(99,102,241,0.3)"
                    : (settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"),
                }, pressed && styles.opacityPress]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="bookmark" size={16} color={expandedQId === "bookmarked" ? "#6366f1" : (settingsDarkMode ? "#aaaacc" : "#666688")} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: expandedQId === "bookmarked" ? "#6366f1" : (settingsDarkMode ? "#ffffff" : "#0d0f14") }}>
                    Bookmarked
                  </Text>
                  {bookmarkCount > 0 && (
                    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                      backgroundColor: settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)" }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#6366f1" }}>{bookmarkCount}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name={expandedQId === "bookmarked" ? "chevron-up" : "chevron-down"} size={14}
                  color={settingsDarkMode ? "#6e727a" : "#999"} />
              </Pressable>

              {/* Attempt bookmarked questions */}
              <Pressable
                disabled={bookmarkCount === 0}
                onPress={() => {
                  if (bookmarkCount === 0) return;
                  const bookmarkedQuiz = { ...quiz, questionsList: bookmarkedQs, title: quiz.title };
                  playQuizDirectly(bookmarkedQuiz, "all");
                }}
                style={({ pressed }) => [{
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                  paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14,
                  backgroundColor: bookmarkCount > 0
                    ? "#818cf8"
                    : (settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"),
                  borderWidth: 1,
                  borderColor: bookmarkCount > 0 ? "#6366f1" : (settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"),
                  opacity: bookmarkCount === 0 ? 0.4 : 1,
                }, pressed && bookmarkCount > 0 && styles.pressedScale]}
              >
                <Ionicons name="play" size={14} color={bookmarkCount > 0 ? "#ffffff" : (settingsDarkMode ? "#666" : "#999")} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: bookmarkCount > 0 ? "#ffffff" : (settingsDarkMode ? "#666" : "#999") }}>
                  Attempt
                </Text>
              </Pressable>
            </View>
          );
        })()}
        {expandedQId === "bookmarked" && (() => {
          const bookmarkedQs = (quiz.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (quiz.questionsList || [])).filter((q: any) => starredQuestions.has(q.id));
          return (
            <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard, { marginBottom: 12 }]}>
              <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub, { marginBottom: 12 }]}>Bookmarked Questions</Text>
              {bookmarkedQs.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <Ionicons name="bookmark-outline" size={32} color={settingsDarkMode ? "#333" : "#ccc"} />
                  <Text style={{ fontSize: 13, color: settingsDarkMode ? "#666" : "#999", marginTop: 8 }}>No bookmarked questions yet.</Text>
                  <Text style={{ fontSize: 11, color: settingsDarkMode ? "#444" : "#bbb", marginTop: 4, textAlign: "center" }}>Tap the bookmark icon while viewing questions to save them here.</Text>
                </View>
              ) : (
                <View style={{ height: 300, borderRadius: 12, overflow: "hidden" }}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
                    {bookmarkedQs.map((q: any, i: number) => {
                      const isExpanded = expandedQId === q.id;
                      return (
                        <View key={q.id} style={{ borderRadius: 12, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.12)", overflow: "hidden" }}>
                          <Pressable
                            onPress={() => setExpandedQId(isExpanded ? "bookmarked" : q.id)}
                            style={{ flexDirection: "row", alignItems: "flex-start", padding: 10, backgroundColor: settingsDarkMode ? "rgba(99,102,241,0.04)" : "rgba(99,102,241,0.02)" }}
                          >
                            <Ionicons name="bookmark" size={11} color="#6366f1" style={{ marginRight: 7, marginTop: 2 }} />
                            <Text style={{ flex: 1, fontSize: 12, color: settingsDarkMode ? "#dddddd" : "#333333", lineHeight: 16 }} numberOfLines={isExpanded ? undefined : 2}>
                              {q.prompt}
                            </Text>
                            <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={13} color="#666" style={{ marginLeft: 6 }} />
                          </Pressable>
                          {isExpanded && (
                            <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", gap: 6 }}>
                              {q.answers.map((answer: any, aIdx: number) => (
                                <View key={aIdx} style={{ flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 8,
                                  backgroundColor: answer.isCorrect ? "rgba(0,229,160,0.06)" : "rgba(255,255,255,0.01)",
                                  borderWidth: 1, borderColor: answer.isCorrect ? "rgba(0,229,160,0.15)" : "transparent" }}>
                                  <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: answer.isCorrect ? "rgba(0,229,160,0.15)" : "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                                    <Text style={{ fontSize: 9, fontWeight: "bold", color: answer.isCorrect ? "#00e5a0" : "#888" }}>{answer.isCorrect ? "✓" : "-"}</Text>
                                  </View>
                                  <Text style={{ flex: 1, fontSize: 11, color: answer.isCorrect ? "#00e5a0" : (settingsDarkMode ? "#bbbbbb" : "#444444") }}>{answer.text}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          );
        })()}

        {/* Attempt Log History */}
        <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard]}>
          <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub, { marginBottom: 10, fontSize: 12 }]}>{t('insight.attempt_history') || "Attempt History"}</Text>
          {attempts.length > 0 ? (
            <View style={{ gap: 8 }}>
              {attempts.map((attempt: any, index: number) => {
                const attemptNum = attempts.length - index;
                const isRetry = attempt.mode === "retry";
                const label = isRetry
                  ? `Retry of #${attempt.retryOfAttemptNum}`
                  : `${t('insight.attempt') || "Attempt"} #${attemptNum}`;
                return (
                <Pressable
                  key={attempt.id || String(index)}
                  onPress={() => setSelectedAttemptForModal({ quizId: quiz.id, attempt, attemptNum })}
                  style={({ pressed }) => [
                    { padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                      backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                      borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
                    },
                    pressed && styles.opacityPress
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={{ fontSize: 12, fontWeight: "bold", color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>
                        {t('insight.attempt') || "Attempt"} #{attemptNum}
                      </Text>
                      {isRetry && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3,
                          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                          backgroundColor: settingsDarkMode ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)" }}>
                          <Ionicons name="refresh" size={9} color="#f59e0b" />
                          <Text style={{ fontSize: 9, color: "#f59e0b", fontWeight: "600" }}>
                            retry of #{attempt.retryOfAttemptNum}
                          </Text>
                        </View>
                      )}
                    </View>
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
                    <Ionicons name="chevron-forward" size={16} color={settingsDarkMode ? "#6e727a" : "#999999"} />
                  </View>
                </Pressable>
                );
              })}
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

  const renderDeckInsightsTab = () => {
    const deck = viewingInsightsDeck;
    if (!deck) return null;
    const attempts = deck.attempts || [];
    const latestAttempt = attempts[attempts.length - 1];
    const cardCount = (deck.cards || []).length;
    
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Link */}
        <Pressable 
          onPress={() => setActiveTab("home")}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 15 }}
        >
          <Feather name="arrow-left" size={16} color="#00e5a0" />
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#00e5a0" }}>Back to Flashcards</Text>
        </Pressable>

        {/* Page Header */}
        <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: "rgba(168, 85, 247, 0.12)" }}>
              <Text style={{ fontSize: 10, fontWeight: "bold", color: "#a855f7" }}>FLASHCARDS</Text>
            </View>
          </View>
          <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText, { fontSize: 20, marginTop: 4 }]} numberOfLines={2}>
            {deck.title}
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
              <Ionicons name="albums-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{cardCount}</Text>
            <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>Total Cards</Text>
          </View>

          <View 
            style={[
              styles.statCard, 
              settingsDarkMode 
                ? { backgroundColor: "rgba(34, 197, 94, 0.03)", borderColor: "rgba(34, 197, 94, 0.15)", shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 16 } 
                : { backgroundColor: "rgba(34, 197, 94, 0.04)", borderColor: "rgba(34, 197, 94, 0.22)", shadowColor: "#22c55e", shadowOpacity: 0.14, shadowRadius: 12 }
            ]}
          >
            <View style={[styles.statIconContainer, { backgroundColor: "rgba(34, 197, 94, 0.12)" }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
            </View>
            <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{latestAttempt ? latestAttempt.known : 0}</Text>
            <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>Mastered</Text>
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
              <Ionicons name="time-outline" size={20} color="#a855f7" />
            </View>
            <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{attempts.length}</Text>
            <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>Sessions</Text>
          </View>
        </View>

        {/* ── Primary actions ── */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          {/* Start Test — always shown */}
          <Pressable
            onPress={() => { startStudy(deck); }}
            style={({ pressed }) => [{
              flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
              height: 52, borderRadius: 16,
              backgroundColor: "#6366f1",
              shadowColor: "#6366f1", shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
            }, pressed && styles.pressedScale]}
          >
            <Ionicons name="play" size={18} color="#ffffff" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>Study Now</Text>
          </Pressable>
        </View>

        {/* Attempt Log History */}
        <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard]}>
          <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub, { marginBottom: 10, fontSize: 12 }]}>Session History</Text>
          {attempts.length > 0 ? (
            <View style={{ gap: 8 }}>
              {attempts.slice().reverse().map((attempt: any, index: number) => (
                <View
                  key={attempt.id || String(index)}
                  style={[
                    { padding: 12, borderRadius: 12, backgroundColor: "rgba(255, 255, 255, 0.02)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.05)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                    !settingsDarkMode && styles.lightCard
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[{ fontSize: 12, fontWeight: "bold", color: "#ffffff" }, !settingsDarkMode && styles.lightText]}>
                      Session #{attempts.length - index}
                    </Text>
                    <Text style={[{ fontSize: 10, color: "#888888", marginTop: 2 }, !settingsDarkMode && styles.lightTextSub]}>
                      {new Date(attempt.date).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 13, color: "#22c55e", fontWeight: "700" }}>{attempt.known} ✓</Text>
                    <Text style={{ fontSize: 13, color: "#ef4444", fontWeight: "700" }}>{attempt.unknown} ✗</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: "#666", textAlign: "center", paddingVertical: 10 }}>No sessions logged yet.</Text>
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
                const deckId = deck.id;
                const neonId = deck.neonId;
                setFlashcardDecks(flashcardDecks.filter(d => d.id !== deckId));
                if (firebaseUser && neonId && !String(neonId).startsWith("local_")) {
                  deleteFlashcardDeck(firebaseUser.uid, neonId).catch(err => console.warn("[NeonSync] deck delete failed:", err));
                }
                setActiveTab("home");
              }}
              style={({ pressed }) => [
                { flex: 1, padding: 10, borderRadius: 10, backgroundColor: "rgba(239, 68, 68, 0.15)", alignItems: "center", justifyContent: "center" },
                pressed && styles.opacityPress
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: "bold", color: "#ef4444" }}>Delete Deck</Text>
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
      let newCorrectCount = activeSession.correctCount || 0;
      const currentQuestion = activeSession.questions.find((q: any) => q.id === questionId);
      if (currentQuestion) {
        const selected = activeSession.answers[questionId] || [];
        const correctIds = currentQuestion.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
        const isAllCorrect = selected.length === correctIds.length && selected.every((id: string) => correctIds.includes(id));
        if (isAllCorrect) {
          playCorrectSound();
          newCorrectCount += 1;
          if (activeSession.isBattle && activeSession.battleRoomCode) {
            updateBattleScore(activeSession.battleRoomCode, activeSession.isHost, newCorrectCount);
          }
        } else {
          playWrongSound();
        }
      }

      setActiveSession({
        ...activeSession,
        submitted,
        correctCount: newCorrectCount
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
      let newCorrectCount = activeSession.correctCount || 0;
      
      if ((activeSession.showAnswerOnSubmit || activeSession.isBattle) && !submitted.includes(question.id)) {
        submitted.push(question.id);
        
        // Play correct/wrong sound
        const correctIds = question.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
        const isAllCorrect = currentAnswers.length === correctIds.length && currentAnswers.every((id: string) => correctIds.includes(id));
        if (isAllCorrect) {
          playCorrectSound();
          newCorrectCount += 1;
          
          if (activeSession.isBattle && activeSession.battleRoomCode) {
            updateBattleScore(activeSession.battleRoomCode, activeSession.isHost, newCorrectCount);
          }
        } else {
          playWrongSound();
        }
      }

      setActiveSession({
        ...activeSession,
        answers,
        submitted,
        correctCount: newCorrectCount
      });
    }
  };

  const handleNavigateSession = (idx: number) => {
    if (!activeSession) return;
    setActiveSession({
      ...activeSession,
      currentIndex: idx
    });
    quizNumbersScrollRef.current?.scrollTo({ x: Math.max(0, idx * 48 - SCREEN_WIDTH / 2 + 24), animated: true });
  };

  /** Persist a battle result into local history and clear it from pending queue */
  const saveBattleResult = (roomCode: string, myScore: number, opponentScore: number, opponentName: string, quizTitle: string, effectiveWin: boolean, myTime?: number, opponentTime?: number) => {
    const entry = {
      date: Date.now(),
      quizTitle,
      myScore,
      opponentScore,
      opponentName,
      won: effectiveWin,
      myTime,
      opponentTime
    };
    setBattleHistory(prev => {
      const next = [...prev, entry].slice(-50);
      AsyncStorage.setItem("battle_history", JSON.stringify(next));
      return next;
    });

    if (firebaseUser) {
      saveBattleHistory({
        userId: firebaseUser.uid,
        roomCode,
        quizTitle,
        myScore,
        opponentScore,
        opponentName,
        won: effectiveWin,
        myTime,
        opponentTime
      }).catch(console.error);
    }

    if (roomCode) {
      AsyncStorage.getItem("pending_battles").then(val => {
        if (val) {
          try {
            const currentPending = JSON.parse(val);
            const newPending = currentPending.filter((p: any) => p.code !== roomCode);
            AsyncStorage.setItem("pending_battles", JSON.stringify(newPending));
          } catch {}
        }
      });
    }
  };

  const handleFinishSession = () => {
    if (!activeSession) return;
    const totalQs = activeSession.questions.length;
    const answeredCount = Object.keys(activeSession.answers).length;
    const unanswered = totalQs - answeredCount;

    const finish = () => {
      playSuccessSound();
      const finishedSession = {
        ...activeSession,
        isFinished: true
      };
      if (activeSession.isBattle && activeSession.battleRoomCode) {
        // Mark this player as finished — pass total elapsed time for tie-breaking
        const totalTimeMs = Date.now() - (activeSession.startTime || Date.now());
        const roomCode = activeSession.battleRoomCode;
        const host = activeSession.isHost;
        markPlayerFinished(roomCode, host, totalTimeMs).catch(console.error);
        
        // Add to pending battles immediately so if the user force-closes on the waiting screen, it is preserved
        AsyncStorage.getItem("pending_battles").then(val => {
          let pending = [];
          try { if (val) pending = JSON.parse(val); } catch {}
          if (!pending.find((p: any) => p.code === roomCode)) {
            pending.push({ code: roomCode, isHost: host });
            AsyncStorage.setItem("pending_battles", JSON.stringify(pending));
          }
        });
      }
      setActiveSession(finishedSession);
      saveAndExitQuizSession(false, finishedSession);
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
        throw new Error("No questions found. Scorr format requires questions starting with '?' and answers starting with '+' or '-'.");
      }
      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const newQuiz: any = {
        id: localId,
        title: parsed.title || fileName.replace(/\.[^.]+$/, ""),
        questions: parsed.questions.length,
        category: parsed.category || "General",
        time: "Just now",
        questionsList: parsed.questions,
        attempts: [],
        wrongQuestions: [],
        uniqueCorrectIds: [],
      };
      setQuizzes([...quizzes, newQuiz]);
      setActiveTab("home");
      setCreationMode("pick");
      handleOpenQuizOptions(newQuiz);

      // Push to Neon if user row exists in DB
      console.log("[NeonSync-Import] Starting upload flow for imported quiz:", newQuiz.title);
      console.log("[NeonSync-Import] firebaseUser exists:", !!firebaseUser, firebaseUser ? firebaseUser.email : null);
      console.log("[NeonSync-Import] neonUserReadyRef.current status:", neonUserReadyRef.current);

      if (firebaseUser && neonUserReadyRef.current) {
        console.log("[NeonSync-Import] Calling POST /api/mobile-quizzes...");
        createMobileQuiz({
          userId: firebaseUser.uid,
          title: newQuiz.title,
          category: newQuiz.category,
          questionCount: newQuiz.questionsList?.length ?? newQuiz.questions,
          sourceText: text, // store the entire raw TXT file — parseQstText reconstructs questions on login
        }).then(({ quiz: saved, error }) => {
          if (saved && !error) {
            console.log("[NeonSync-Import] POST request succeeded! Quiz uploaded with DB ID:", saved.id);
            // Store neonId so future updates/deletes can reference it
            setQuizzes((prev: any[]) =>
              prev.map((q) => q.id === localId ? { ...q, id: saved.id, neonId: saved.id } : q)
            );
          } else {
            console.error("[NeonSync-Import] POST request failed! Error message from server:", error);
          }
        }).catch((err) => {
          console.error("[NeonSync-Import] POST request failed with network error:", err);
        });
      } else {
        console.warn("[NeonSync-Import] Upload skipped because user is not logged in OR backend registration is not ready.");
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
  const attemptedIds: Set<string> = new Set(
    (selectedQuiz?.attempts || []).flatMap((a: any) => a.questionIds || [])
  );
  const unansweredCount = selectedQuiz
    ? (selectedQuiz.questionsList || []).filter((q: any) => !attemptedIds.has(q.id)).length
    : totalQuestions;

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

  // ── Keep refs in sync + auto-save on every change ───────────────────────
  useEffect(() => {
    quizzesRef.current = quizzes;
    if (!dataLoaded) return;
    AsyncStorage.setItem(
      storageKey("quizzes"),
      JSON.stringify(quizzes)
    ).catch(e => console.warn("[Persist] quiz save failed:", e));

    // Schedule inactivity notifications
    const scheduleNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        
        if (quizzes.length === 0) {
          if (existingStatus === 'granted') {
            await Notifications.cancelAllScheduledNotificationsAsync();
          }
          return;
        }

        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') return;

        // Cancel existing notifications to reset the inactivity timer
        await Notifications.cancelAllScheduledNotificationsAsync();

        let totalQuestions = 0;
        let masteredQuestions = 0;

        quizzes.forEach((q) => {
          const qsList = q.questionsList && q.questionsList.length > 0 ? q.questionsList : q.questions;
          totalQuestions += (qsList?.length || 0);
          masteredQuestions += (q.uniqueCorrectIds?.length || 0);
        });

        const unresolvedQuestions = Math.max(0, totalQuestions - masteredQuestions);

        if (unresolvedQuestions > 0 && totalQuestions > 0) {
          // 24-hour notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Time to review! 🧠",
              body: `You have ${unresolvedQuestions} questions waiting to be mastered out of ${totalQuestions} total questions.`,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 24 * 60 * 60, // 24 hours
              repeats: false,
            },
          });

          // 7-day notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "It's been a while! 👋",
              body: "Get back to Scorr and practice your quizzes to keep your memory sharp.",
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 7 * 24 * 60 * 60, // 7 days
              repeats: false,
            },
          });
        }
      } catch (err) {
        console.warn("Failed to schedule inactivity notifications", err);
      }
    };

    scheduleNotifications();
  }, [quizzes, dataLoaded]);


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
  const [newQuizLanguage, setNewQuizLanguage] = useState("English");
  const [creationStep, setCreationStep] = useState<"setup" | "drafting">("setup");
  const [creationMode, setCreationMode] = useState<"pick" | "quiz">("pick");
  const [fcTitle, setFcTitle] = useState("");
  const [fcCategory, setFcCategory] = useState("");
  const [fcCards, setFcCards] = useState<{ front: string; back: string }[]>([{ front: "", back: "" }]);
  const [fcCurrentIdx, setFcCurrentIdx] = useState(0);
  const [studyCardIdx, setStudyCardIdx] = useState(0);
  const [studyQueue, setStudyQueue] = useState<string[]>([]);
  const [customStudyMode, setCustomStudyMode] = useState(false);
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
    setQuizTimeLimit(null);
    setShowTimeLimitDropdown(false);
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

    const generatedSourceText = `@title: ${newTitle.trim()}\n@category: ${newCategory.trim() || "General"}\n@language: ${newQuizLanguage}\n\n` + 
      finalQuestions.map(q => `? ${q.prompt}\n` + q.answers.map((a: any) => `${a.isCorrect ? '+' : '-'} ${a.text}`).join('\n')).join('\n\n');

    const localId = String(Date.now());
    const newQuiz = {
      id: localId,
      title: newTitle.trim(),
      category: newCategory.trim() || "General",
      questions: finalQuestions.length,
      time: "Just now",
      questionsList: finalQuestions,
      attempts: [],
      wrongQuestions: [],
      uniqueCorrectIds: []
    };

    setQuizzes([...quizzes, newQuiz]);
    setNewTitle("");
    setNewCategory("");
    setNewQuestionsCount("");
    setCreationStep("setup");
    
    setShowQuizCreatedModal({ title: newQuiz.title, count: newQuiz.questions });
    setActiveTab("dashboard");

    console.log("[NeonSync-Manual] Saving manually created quiz:", newQuiz.title);
    console.log("[NeonSync-Manual] firebaseUser exists:", !!firebaseUser, firebaseUser ? firebaseUser.email : null);
    console.log("[NeonSync-Manual] neonUserReadyRef.current status:", neonUserReadyRef.current);

    if (firebaseUser && neonUserReadyRef.current) {
      console.log("[NeonSync-Manual] Calling POST /api/mobile-quizzes...");
      createMobileQuiz({
        userId: firebaseUser.uid,
        title: newQuiz.title,
        category: newQuiz.category,
        questionCount: newQuiz.questionsList?.length ?? newQuiz.questions,
        sourceText: generatedSourceText,
      }).then(({ quiz: saved, error }) => {
        if (saved && !error) {
          console.log("[NeonSync-Manual] POST request succeeded! Quiz uploaded with DB ID:", saved.id);
          setQuizzes((prev: any[]) =>
            prev.map((q) => q.id === localId ? { ...q, id: saved.id, neonId: saved.id } : q)
          );
        } else {
          console.error("[NeonSync-Manual] POST request failed! Error message from server:", error);
        }
      }).catch((err) => {
        console.error("[NeonSync-Manual] POST request failed with network error:", err);
      });
    } else {
      console.warn("[NeonSync-Manual] Upload skipped because user is not logged in OR backend registration is not ready.");
    }
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
    // In battle mode: always show result immediately after selection (locked + colored)
    const showResult = activeSession.isBattle
      ? isAnswered
      : (activeSession.showAnswerOnSubmit && (activeSession.submitted || []).includes(currentQuestion.id));

    return (
      <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0a1020" : "#f4f4f8" }}>
        {/* Session Header / Battle Header */}
        {activeSession.isBattle ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
            backgroundColor: settingsDarkMode ? "#0a1020" : "#f4f4f8", borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <Pressable onPress={() => setShowQuitConfirm(true)} style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 10, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="close" size={20} color={settingsDarkMode ? "#71717a" : "#64748b"} />
              </Pressable>
              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: settingsDarkMode ? "#818cf8" : "#6366f1", letterSpacing: 2, textTransform: "uppercase" }}>⚔️  Quiz Clash</Text>
              </View>
              <View style={{ width: 36 }} />
            </View>
            
            {/* Scoreboard */}
            {(() => {
              const hostScore = battleRoomState?.hostScore || 0;
              const guestScore = battleRoomState?.guestScore || 0;
              // Always show current player on LEFT, opponent on RIGHT
              const myScore = activeSession.isHost ? hostScore : guestScore;
              const opponentScore = activeSession.isHost ? guestScore : hostScore;
              const myName = activeSession.isHost
                ? (battleRoomState?.hostName || firebaseUser?.displayName || "You")
                : (battleRoomState?.guestName || firebaseUser?.displayName || "You");
              const opponentName = activeSession.isHost
                ? (battleRoomState?.guestName || "Rival")
                : (battleRoomState?.hostName || "Host");

              let myFlex = 0.5;
              if (myScore > 0 || opponentScore > 0) {
                myFlex = myScore / (myScore + opponentScore);
              }
              const qTotal = activeSession.questions?.length || 0;
              const qCurrent = (activeSession.currentIndex || 0) + 1;

              return (
                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    {/* Left — always YOU */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 18 }}>🦊</Text>
                      <View>
                        <Text style={{ fontSize: 11, color: settingsDarkMode ? "#71717a" : "#64748b", fontWeight: "700" }}>{myName}</Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.5 }}>{myScore}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "center", gap: 4 }}>
                      <View style={{ backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: settingsDarkMode ? "#52525b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{qCurrent}/{qTotal}</Text>
                      </View>
                      <View style={{ backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                        <BattleTimer startTime={activeSession.startTime || Date.now()} settingsDarkMode={settingsDarkMode} />
                      </View>
                      {battleTimePerQuestion != null && (
                        <View style={{ backgroundColor: battleQuestionTimeLeft <= 5 ? "rgba(239,68,68,0.15)" : (settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                          paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
                          borderWidth: battleQuestionTimeLeft <= 5 ? 1 : 0,
                          borderColor: "rgba(239,68,68,0.4)" }}>
                          <Text style={{ fontSize: 13, fontWeight: "900", letterSpacing: -0.5,
                            color: battleQuestionTimeLeft <= 5 ? "#ef4444" : (settingsDarkMode ? "#94a3b8" : "#64748b") }}>
                            {battleQuestionTimeLeft}s
                          </Text>
                        </View>
                      )}
                    </View>
                    {/* Right — always OPPONENT */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 11, color: settingsDarkMode ? "#71717a" : "#64748b", fontWeight: "700" }}>{opponentName}</Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.5 }}>{opponentScore}</Text>
                      </View>
                      <Text style={{ fontSize: 18 }}>🐺</Text>
                    </View>
                  </View>
                  <View style={{ height: 6, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)", borderRadius: 99, overflow: "hidden", flexDirection: "row" }}>
                    <View style={{ flex: myFlex, backgroundColor: "#6366f1", borderRadius: 99 }} />
                    <View style={{ flex: 1 - myFlex, backgroundColor: "#ec4899", borderRadius: 99 }} />
                  </View>
                </View>
              );
            })()}
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Pressable onPress={() => setShowQuitConfirm(true)} style={({ pressed }) => [{ padding: 8, marginLeft: -8, marginRight: 8 }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="chevron-back" size={24} color={settingsDarkMode ? "#e2e8f0" : "#0d0f14"} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: settingsDarkMode ? "#f8fafc" : "#0d0f14" }} numberOfLines={1}>
                  {activeSession.quizTitle}
                </Text>
                <Text style={{ fontSize: 12, color: settingsDarkMode ? "#64748b" : "#666677", marginTop: 2 }}>
                  {activeSession.category || "Internal Medicine Mix"}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {activeSession.quizTimeLimit != null && (
                <View style={[styles.sessionTimerBox, sessionTimeLeft <= 30 && { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" }]}>
                  <Ionicons name="time-outline" size={13} color={sessionTimeLeft <= 30 ? "#ef4444" : "#00e5a0"} style={{ marginRight: 4 }} />
                  <Text style={[styles.sessionTimerText, sessionTimeLeft <= 30 && { color: "#ef4444" }]}>
                    {`${String(Math.floor(sessionTimeLeft / 60)).padStart(2, "0")}:${String(sessionTimeLeft % 60).padStart(2, "0")}`}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => setShowRestartConfirm(true)}
                style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: settingsDarkMode ? "#334155" : "#e1e4e8", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="refresh" size={18} color={settingsDarkMode ? "#94a3b8" : "#24292f"} />
              </Pressable>
              <Pressable
                onPress={() => {
                  const qId = currentQuestion.id;
                  setStarredQuestions(prev => {
                    const next = new Set(prev);
                    if (next.has(qId)) next.delete(qId); else next.add(qId);
                    return next;
                  });
                }}
                style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: settingsDarkMode ? "#334155" : "#e1e4e8", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name={starredQuestions.has(currentQuestion.id) ? "bookmark" : "bookmark-outline"} size={16} color={starredQuestions.has(currentQuestion.id) ? "#3b82f6" : (settingsDarkMode ? "#94a3b8" : "#24292f")} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Horizontal Number Progress */}
        <View style={{ marginBottom: 20 }}>
          <ScrollView 
            ref={quizNumbersScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
          >
            {activeSession.questions.map((q: any, i: number) => {
              const isActive = i === currentIndex;
              const isSubmitted = (activeSession.submitted || []).includes(q.id);
              const selected = activeSession.answers[q.id] || [];
              const isAnswered = selected.length > 0;
              
              let isCorrect = false;
              if (isAnswered) {
                const correctIds = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
                isCorrect = selected.length === correctIds.length && selected.every((id: string) => correctIds.includes(id));
              }

              let bgColor = "transparent";
              let textColor = settingsDarkMode ? "#94a3b8" : "#666677";
              
              if (activeSession.showAnswerOnSubmit && isSubmitted) {
                bgColor = isCorrect ? (settingsDarkMode ? "rgba(16, 185, 129, 0.2)" : "#d1fae5") : (settingsDarkMode ? "rgba(239, 68, 68, 0.2)" : "#fee2e2");
                textColor = isCorrect ? (settingsDarkMode ? "#34d399" : "#10b981") : (settingsDarkMode ? "#f87171" : "#ef4444");
              } else if (!activeSession.showAnswerOnSubmit && isAnswered) {
                 // if answered but not submitted yet (like in a mock test)
                 bgColor = settingsDarkMode ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0";
                 textColor = settingsDarkMode ? "#f1f5f9" : "#0f172a";
              }



              return (
                <Pressable
                  key={q.id}
                  onPress={() => {
                    if (activeSession.isBattle && battleTimePerQuestion != null) return; // Disable navigation in timed mode
                    handleNavigateSession(i);
                    quizFlatListRef.current?.scrollToIndex({ index: i, animated: false });
                  }}
                  style={{ alignItems: "center" }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 16, overflow: "hidden",
                    backgroundColor: bgColor,
                    borderWidth: 1, borderColor: bgColor === "transparent" ? "transparent" : bgColor,
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: textColor }}>{i + 1}</Text>
                  </View>
                  {isActive && (
                    <View style={{ marginTop: 4, width: 24, height: 2, backgroundColor: settingsDarkMode ? "#34d399" : "#059669", borderRadius: 1 }} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          ref={quizFlatListRef}
          data={activeSession.questions}
          keyExtractor={(item: any) => item.id}
          horizontal
          pagingEnabled
          scrollEnabled={!(activeSession.isBattle && battleTimePerQuestion != null)}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={currentIndex}
          getItemLayout={(data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            if (newIndex !== currentIndex) {
              handleNavigateSession(newIndex);
            }
          }}
          renderItem={({ item: qst, index: qIdx }) => {
            const itemSelectedAnswers = activeSession.answers[qst.id] || [];
            const itemShowResult = activeSession.showAnswerOnSubmit && (activeSession.submitted || []).includes(qst.id);

            return (
              <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
                  
                  {/* Battle: question label */}
                  {activeSession.isBattle ? (
                    <View style={{ marginBottom: 16, marginTop: 4 }}>
                      <View style={{ backgroundColor: "rgba(99,102,241,0.1)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(99,102,241,0.25)" }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#818cf8", letterSpacing: 1 }}>QUESTION {qIdx + 1}</Text>
                      </View>
                    </View>
                  ) : (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#2dd4bf", letterSpacing: 1 }}>
                      {activeSession.category?.toUpperCase() || "GASTROENTEROLOGY"} <Text style={{ color: settingsDarkMode ? "#64748b" : "#666677" }}>/ {qst.topic?.toUpperCase() || "PEPTIC ULCER DISEASE"}</Text>
                    </Text>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fbbf24" }} />
                  </View>
                  )}

                  <Text 
                    style={{ fontSize: 18, color: activeSession.isBattle ? "#f1f5f9" : (settingsDarkMode ? "#f1f5f9" : "#24292f"), lineHeight: 28, marginBottom: 20, textAlign: "left", fontWeight: activeSession.isBattle ? "600" : "500" }}
                  >
                    {qst.prompt}
                  </Text>

                  {/* Options */}
                  <View style={{ gap: 12 }}>
                    {qst.answers.map((answer: any, idx: number) => {
                      const isSelected = itemSelectedAnswers.includes(answer.id);
                      // In battle: show result immediately after any answer is selected, but DON'T dim others
                      const effectiveShowResult = activeSession.isBattle
                        ? itemSelectedAnswers.length > 0
                        : itemShowResult;
                      const correctHighlight = effectiveShowResult && answer.isCorrect;
                      const wrongHighlight = effectiveShowResult && isSelected && !answer.isCorrect;

                      // Determine border and background colors
                      let containerBg = settingsDarkMode ? "transparent" : "#ffffff";
                      let containerBorder = settingsDarkMode ? "rgba(255,255,255,0.15)" : "#e1e4e8";
                      let circleBg = settingsDarkMode ? "transparent" : "#f3f4f6";
                      let circleBorder = settingsDarkMode ? "rgba(255,255,255,0.3)" : "#ccc";
                      let textColor = settingsDarkMode ? "#e2e8f0" : "#24292f";

                      if (correctHighlight) {
                        containerBg = "rgba(34,197,94,0.15)";
                        containerBorder = "#22c55e";
                        circleBg = "#22c55e";
                        circleBorder = "#22c55e";
                        textColor = "#4ade80";
                      } else if (wrongHighlight) {
                        containerBg = "rgba(239,68,68,0.15)";
                        containerBorder = "#ef4444";
                        circleBg = "#ef4444";
                        circleBorder = "#ef4444";
                        textColor = "#f87171";
                      } else if (isSelected && !effectiveShowResult) {
                        // Just selected, not checked yet
                        containerBg = settingsDarkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9";
                        containerBorder = settingsDarkMode ? "#ffffff" : "#0d0f14";
                        circleBg = settingsDarkMode ? "#ffffff" : "#0d0f14";
                        circleBorder = settingsDarkMode ? "#ffffff" : "#0d0f14";
                      }

                      return (
                        <Pressable
                          key={answer.id}
                          disabled={effectiveShowResult}
                          onPress={() => handleAnswerSelect(qst, answer.id)}
                          style={({ pressed }) => [{
                            flexDirection: "row", alignItems: "center",
                            paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16,
                            backgroundColor: containerBg,
                            borderWidth: 1.5,
                            borderColor: containerBorder,
                          }, pressed && !effectiveShowResult && { opacity: 0.7, transform: [{ scale: 0.99 }] }]}
                        >
                          <View style={{
                            width: 34, height: 34, borderRadius: 17, overflow: "hidden",
                            backgroundColor: circleBg, borderWidth: 1, borderColor: circleBorder,
                            alignItems: "center", justifyContent: "center", marginRight: 16,
                          }}>
                            <Text style={{ fontSize: 14, fontWeight: "700",
                              color: (correctHighlight || wrongHighlight) ? "#fff" :
                                (isSelected && !effectiveShowResult) ? (settingsDarkMode ? "#000000" : "#ffffff") :
                                (settingsDarkMode ? "#94a3b8" : "#666677") }}>
                              {String.fromCharCode(65 + idx)}
                            </Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 15, color: textColor, lineHeight: 22,
                            fontWeight: (correctHighlight || wrongHighlight) ? "700" : "400" }}>
                            {answer.text}
                          </Text>
                          {correctHighlight && <Text style={{ fontSize: 16, marginLeft: 8 }}>✓</Text>}
                          {wrongHighlight && <Text style={{ fontSize: 16, marginLeft: 8 }}>✗</Text>}
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            );
          }}
        />

        {/* Floating Action Button */}
        <View style={{ position: "absolute", bottom: Math.max(insets.bottom, 20) + 20, right: 24, zIndex: 10 }}>
          {activeSession.showAnswerOnSubmit && currentQuestion.type === "multiple_choice" && !(activeSession.submitted || []).includes(currentQuestion.id) ? (
            <Pressable
              disabled={selectedAnswers.length === 0}
              onPress={() => handleCheckAnswer(currentQuestion.id)}
              style={({ pressed }) => [{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: settingsDarkMode ? "#6366f1" : "#4f46e5",
                alignItems: "center", justifyContent: "center",
                opacity: selectedAnswers.length === 0 ? 0.4 : (pressed ? 0.7 : 1),
                shadowColor: "#6366f1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6
              }]}
            >
              <Ionicons name="checkmark" size={28} color="#ffffff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                if (currentIndex < totalQs - 1) {
                  const newIdx = currentIndex + 1;
                  handleNavigateSession(newIdx);
                  quizFlatListRef.current?.scrollToIndex({ index: newIdx, animated: true });
                } else {
                  handleFinishSession();
                }
              }}
              style={({ pressed }) => [{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: activeSession.isBattle ? "#6366f1" : (settingsDarkMode ? "#6366f1" : "#4f46e5"),
                alignItems: "center", justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
                shadowColor: "#6366f1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6
              }]}
            >
              <Ionicons name={currentIndex === totalQs - 1 ? "checkmark" : "arrow-forward"} size={28} color="#ffffff" />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderResultsView = () => {
    if (!activeSession) return null;

    if (activeSession.isBattle) {
      const hostScore = activeSession.isHost ? (activeSession.correctCount || 0) : (battleRoomState?.hostScore || 0);
      const guestScore = activeSession.isHost ? (battleRoomState?.guestScore || 0) : (activeSession.correctCount || 0);
      const myScore = activeSession.correctCount || 0;
      const opponentScore = activeSession.isHost ? guestScore : hostScore;
      const opponentName = activeSession.isHost ? (battleRoomState?.guestName || "Rival") : (battleRoomState?.hostName || "Host");
      const myName = activeSession.isHost ? (battleRoomState?.hostName || "You") : (battleRoomState?.guestName || "You");

      const iFinished = activeSession.isFinished || false;
      const opponentFinished = activeSession.isHost ? (battleRoomState?.guestFinished || false) : (battleRoomState?.hostFinished || false);
      const bothFinished = iFinished && opponentFinished;

      // Trigger finishBattle once when both players are done
      // (done via useEffect-like guard using a ref to avoid calling on every render)
      if (bothFinished && battleRoomState?.status !== "finished") {
        // This is in render — use a ref to ensure only called once
        if (!battleFinishedCalledRef.current) {
          battleFinishedCalledRef.current = true;
          finishBattle(activeSession.battleRoomCode || "").catch(console.error);
        }
      } else if (!bothFinished) {
        battleFinishedCalledRef.current = false;
      }

      const exitBattle = () => {
        if (battleRoomState && (!battleRoomState.hostFinished || !battleRoomState.guestFinished)) {
          const code = battleRoomState.id;
          const host = isHost;
          const unsubscribe = listenToBattleRoom(code, (data) => {
            if (data.hostFinished && data.guestFinished) {
              const myScore = host ? data.hostScore : data.guestScore;
              const oppScore = host ? data.guestScore : data.hostScore;
              const oppName = host ? (data.guestName || "Opponent") : data.hostName;
              let effectiveWin = false;
              let myTime = host ? (data.hostTime ?? Infinity) : (data.guestTime ?? Infinity);
              let oppTime = host ? (data.guestTime ?? Infinity) : (data.hostTime ?? Infinity);
              if (myScore > oppScore) effectiveWin = true;
              else if (myScore === oppScore) {
                effectiveWin = myTime < oppTime;
              }
              saveBattleResult(code, myScore, oppScore, oppName, data.quizTitle || "", effectiveWin, myTime !== Infinity ? myTime : undefined, oppTime !== Infinity ? oppTime : undefined);
              setBattlePopup({ myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin });
              if (effectiveWin) triggerConfettiBurst();
              unsubscribe();
            }
          });
        }

        if (battleUnsubscribeRef.current) battleUnsubscribeRef.current();
        setBattleRoomCode("");
        setBattleRoomState(null);
        setActiveSession(null);
        setIsHost(false);
        setJoinCodeInput("");
        setActiveTab("battle");
      };

      // ── WAITING FOR OPPONENT ────────────────────────────────────────
      if (!bothFinished) {
        const isDark = settingsDarkMode;
        const bg = isDark ? "#0f172a" : "#f4f4f8";
        const cardBg = isDark ? "#1e293b" : "#ffffff";
        const txt = isDark ? "#ffffff" : "#0d0f14";
        const muted = isDark ? "#94a3b8" : "#64748b";
        const border = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";

        return (
          <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
            {/* My score card */}
            <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 24, width: "100%",
              borderWidth: 1, borderColor: border, alignItems: "center", marginBottom: 28 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                Your Score
              </Text>
              <Text style={{ fontSize: 56, fontWeight: "900", color: txt, letterSpacing: -2 }}>{myScore}</Text>
              <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                {activeSession.correctCount || 0} correct of {activeSession.questions?.length || 0} questions
              </Text>
            </View>

            {/* Waiting indicator */}
            <View style={{ alignItems: "center", marginBottom: 36, gap: 12 }}>
              <ActivityIndicator size="large" color={isDark ? "#818cf8" : "#6366f1"} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: txt }}>
                Waiting for {opponentName} to finish…
              </Text>
              <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
                Results will appear when both players are done.
              </Text>
            </View>

            {/* Exit button */}
            <Pressable
              onPress={exitBattle}
              style={({ pressed }) => [{
                borderWidth: 1.5, borderColor: isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0",
                paddingVertical: 14, borderRadius: 14, width: "100%", alignItems: "center",
              }, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ color: muted, fontSize: 15, fontWeight: "600" }}>Exit to Library</Text>
            </Pressable>
          </View>
        );
      }

      // ── FULL RESULTS (both finished) ────────────────────────────────
      const isWinner = myScore > opponentScore;
      // Tie-break by speed: lower time wins
      const myTimeState = activeSession.isHost ? battleRoomState?.hostTime : battleRoomState?.guestTime;
      const myTime = myTimeState ?? (Date.now() - (activeSession.startTime || Date.now()));
      const opponentTime = activeSession.isHost ? (battleRoomState?.guestTime ?? Infinity) : (battleRoomState?.hostTime ?? Infinity);
      const isTie = myScore === opponentScore;
      const tiebreakerWin = isTie && myTime < opponentTime;
      const isPerfectDraw = isTie && myTime === opponentTime;
      const effectiveWin = isWinner || tiebreakerWin;
      const totalQs = activeSession.questions?.length || 0;
      const accuracy = totalQs > 0 ? Math.round((activeSession.correctCount || 0) / totalQs * 100) : 0;

      return (
        <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
          <ScrollView contentContainerStyle={{ alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 80 }}>
            {/* Trophy badge */}
            <View style={{
              width: 110, height: 110, borderRadius: 55,
              backgroundColor: effectiveWin ? (settingsDarkMode ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)") : isPerfectDraw ? (settingsDarkMode ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)") : (settingsDarkMode ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)"),
              borderWidth: 1.5,
              borderColor: effectiveWin ? "rgba(34,197,94,0.35)" : isPerfectDraw ? "rgba(99,102,241,0.35)" : "rgba(239,68,68,0.25)",
              alignItems: "center", justifyContent: "center", marginBottom: 18
            }}>
              <Text style={{ fontSize: 50 }}>{effectiveWin ? "🏆" : isPerfectDraw ? "🤝" : "💀"}</Text>
            </View>

            <Text style={{ fontSize: 34, fontWeight: "900", letterSpacing: -1, marginBottom: 4,
              color: effectiveWin ? "#22c55e" : isPerfectDraw ? "#6366f1" : "#ef4444" }}>
              {effectiveWin ? "VICTORY!" : isPerfectDraw ? "DRAW!" : "DEFEATED"}
            </Text>
            {/* Tie-breaker explanation */}
            {isTie && !isPerfectDraw && (
              <View style={{ backgroundColor: tiebreakerWin ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 6,
                borderWidth: 1, borderColor: tiebreakerWin ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: tiebreakerWin ? "#22c55e" : "#ef4444" }}>
                  {tiebreakerWin ? "⚡ You were faster — tiebreaker win!" : "⚡ Opponent was faster — tiebreaker loss"}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: 14, color: settingsDarkMode ? "#64748b" : "#64748b", marginBottom: 28, textAlign: "center", fontWeight: "500" }}>
              {effectiveWin ? "You dominated the quiz!" : isPerfectDraw ? "Perfectly matched!" : "Better luck next time!"}
            </Text>

            {/* Score card */}
            <View style={{ flexDirection: "row",
              backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.04)" : "#ffffff",
              borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0",
              borderRadius: 18, padding: 18, width: "100%", marginBottom: 14, alignItems: "center", gap: 12 }}>
              {/* Me */}
              <View style={[{ flex: 1, alignItems: "center", padding: 10, borderRadius: 12 },
                effectiveWin && { backgroundColor: settingsDarkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.07)" }]}>
                <Text style={{ fontSize: 26 }}>🦊</Text>
                <Text style={{ fontSize: 11, color: settingsDarkMode ? "#71717a" : "#64748b", fontWeight: "700", marginBottom: 2 }}>{myName}</Text>
                <Text style={{ fontSize: 30, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -1 }}>{myScore}</Text>
                <Text style={{ fontSize: 10, color: settingsDarkMode ? "#52525b" : "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>pts</Text>
                {effectiveWin && <View style={{ backgroundColor: "rgba(34,197,94,0.2)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5 }}>Winner</Text>
                </View>}
              </View>

              <Text style={{ fontSize: 14, fontWeight: "900", color: settingsDarkMode ? "#3f3f46" : "#cbd5e1" }}>VS</Text>

              {/* Opponent */}
              <View style={[{ flex: 1, alignItems: "center", padding: 10, borderRadius: 12 },
                !effectiveWin && !isPerfectDraw && { backgroundColor: settingsDarkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.07)" }]}>
                <Text style={{ fontSize: 26 }}>🐺</Text>
                <Text style={{ fontSize: 11, color: settingsDarkMode ? "#71717a" : "#64748b", fontWeight: "700", marginBottom: 2 }}>{opponentName}</Text>
                <Text style={{ fontSize: 30, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -1 }}>{opponentScore}</Text>
                <Text style={{ fontSize: 10, color: settingsDarkMode ? "#52525b" : "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>pts</Text>
                {!effectiveWin && !isPerfectDraw && <View style={{ backgroundColor: "rgba(34,197,94,0.2)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5 }}>Winner</Text>
                </View>}
              </View>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 10, width: "100%", marginBottom: 32 }}>
              {[{label: "Questions", value: String(totalQs)}, {label: "Correct", value: String(activeSession.correctCount || 0)}, {label: "Accuracy", value: accuracy + "%"}].map((s) => (
                <View key={s.label} style={{ flex: 1,
                  backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.04)" : "#ffffff",
                  borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "#e2e8f0",
                  borderRadius: 14, padding: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 9, color: settingsDarkMode ? "#52525b" : "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</Text>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: settingsDarkMode ? "#fff" : "#0d0f14" }}>{s.value}</Text>
                </View>
              ))}
            </View>

            {/* Exit button */}
            <Pressable
              onPress={() => {
                const myTimeMs = activeSession.isHost ? (battleRoomState?.hostTime ?? Infinity) : (battleRoomState?.guestTime ?? Infinity);
                const oppTimeMs = activeSession.isHost ? (battleRoomState?.guestTime ?? Infinity) : (battleRoomState?.hostTime ?? Infinity);
                saveBattleResult(activeSession.battleRoomCode, myScore, opponentScore, opponentName, activeSession.quizTitle || "", effectiveWin, myTimeMs !== Infinity ? myTimeMs : undefined, oppTimeMs !== Infinity ? oppTimeMs : undefined);
                exitBattle();
              }}
              style={({ pressed }) => [{
                backgroundColor: "#6366f1",
                paddingVertical: 16, borderRadius: 14, width: "100%", alignItems: "center",
              }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>⚔️ Back to Battle Lobby</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }
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

    const wrongQuestionIds = wrongQsForQuiz.map((wq: any) => wq.id);
    const wrongQuestionObjects = questions.filter((q: any) => wrongQuestionIds.includes(q.id));

    const handleReattemptWrong = () => {
      if (wrongQuestionObjects.length === 0) return;
      setActiveSession({
        ...activeSession,
        attemptSaved: false,
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
        targetAttemptId: activeSession.targetAttemptId,
        retryOfAttemptNum: activeSession.retryOfAttemptNum,
        attemptSaved: false,
        questions: qsList,
        selectionMode: activeSession.selectionMode || "all",
        shuffleQuestions: activeSession.shuffleQuestions || false,
        shuffleAnswers: activeSession.shuffleAnswers || false,
        showAnswerOnSubmit: activeSession.showAnswerOnSubmit !== false,
        timePerQuestion: null,
        quizTimeLimit: activeSession.quizTimeLimit || null,
        currentIndex: 0,
        answers: {},
        submitted: [] as string[],
        isFinished: false,
        startedAt: Date.now()
      });
      setShowWrongReview(false);
    };

    const scorePct = totalQs > 0 ? Math.round((correctCount / totalQs) * 100) : 0;
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
                { backgroundColor: settingsDarkMode ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)", shadowOpacity: 0 },
                pressed && styles.opacityPress
              ]}
            >
              <Ionicons name="refresh" size={18} color={settingsDarkMode ? "#60a5fa" : "#2563eb"} />
              <Text style={[styles.startQuizBtnText, { color: settingsDarkMode ? "#60a5fa" : "#2563eb" }]}>Re-attempt Wrong Questions</Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleRetakeEntire}
            style={({ pressed }) => [
              styles.startQuizBtn,
              { backgroundColor: settingsDarkMode ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.1)", shadowOpacity: 0 },
              pressed && styles.opacityPress
            ]}
          >
            <Ionicons name="play" size={18} color={settingsDarkMode ? "#818cf8" : "#4f46e5"} />
            <Text style={[styles.startQuizBtnText, { color: settingsDarkMode ? "#818cf8" : "#4f46e5" }]}>Retake Entire Quiz</Text>
          </Pressable>

          <Pressable
            onPress={() => saveAndExitQuizSession()}
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
    if (!user) return "Scorr User";
    if (user.displayName) return user.displayName;
    if (user.email) {
      const localPart = user.email.split("@")[0];
      // Convert shashi.anand25 → "Shashi Anand"
      const parts = localPart.split(/[._\-+]/).filter(p => p.replace(/\d/g, "").length > 0);
      return parts.map(p => p.replace(/\d+/g, "").charAt(0).toUpperCase() + p.replace(/\d+/g, "").slice(1)).join(" ");
    }
    return "Scorr User";
  };

  const getUserInitial = (user: typeof firebaseUser | null): string => {
    const name = getUserFullName(user);
    return name.charAt(0).toUpperCase();
  };

  // ── SM-2 Spaced Repetition Logic ──
  const startStudy = (deck: any, custom: boolean = false) => {
    setCustomStudyMode(custom);
    const updatedDeck = {
      ...deck,
      cards: (deck.cards || []).map((c: any) => ({
        ...c,
        id: c.id || Date.now().toString() + Math.random().toString(),
        sm2_interval: c.sm2_interval ?? 0,
        sm2_repetition: c.sm2_repetition ?? 0,
        sm2_easeFactor: c.sm2_easeFactor ?? 2.5
      }))
    };
    
    setFlashcardDecks((prev: any[]) => prev.map(d => d.id === deck.id ? updatedDeck : d));
    
    const due = custom 
      ? updatedDeck.cards 
      : updatedDeck.cards.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now());
    
    setStudyQueue(due.map((c: any) => c.id));
    setStudyingDeck(updatedDeck);
    setStudyFlipped(false);
    flipAnim.setValue(0);
    swipeX.setValue(0);
    setStudyTypedAnswer("");
    setStudyChecked(false);
  };

  const calculateSM2 = (card: any, rating: "again" | "hard" | "good" | "easy") => {
    let { sm2_interval: interval, sm2_repetition: repetition, sm2_easeFactor: easeFactor } = card;
    let nextReviewDate = Date.now();

    if (rating === "again") {
      repetition = 0;
      interval = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      nextReviewDate += 60 * 1000; // due in 1 minute
    } else if (rating === "hard") {
      interval = Math.max(1, interval * 1.2);
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      nextReviewDate = repetition === 0 ? Date.now() + 10 * 60 * 1000 : Date.now() + interval * 24 * 60 * 60 * 1000;
    } else if (rating === "good") {
      if (repetition === 0) interval = 1;
      else if (repetition === 1) interval = 6;
      else interval = interval * easeFactor;
      repetition += 1;
      nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;
    } else if (rating === "easy") {
      if (repetition === 0) interval = 4;
      else interval = interval * easeFactor * 1.3;
      easeFactor += 0.15;
      repetition += 1;
      nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;
    }
    return { ...card, sm2_interval: interval, sm2_repetition: repetition, sm2_easeFactor: easeFactor, sm2_nextReviewDate: nextReviewDate };
  };

  const handleSM2Rating = (rating: "again" | "hard" | "good" | "easy") => {
    if (!studyingDeck || studyQueue.length === 0) return;
    
    Animated.timing(swipeX, {
      toValue: -Dimensions.get("window").width,
      duration: 150,
      useNativeDriver: true
    }).start(() => {
      const cardId = studyQueue[0];
      const currentCard = studyingDeck.cards.find((c: any) => c.id === cardId);
      if (!currentCard) {
        swipeX.setValue(0);
        return;
      }

      let newQueue = [...studyQueue.slice(1)];
      
      if (!customStudyMode) {
        const updatedCard = calculateSM2(currentCard, rating);
        if (rating === "again") {
          newQueue.push(cardId);
        }
        
        const updatedDeck = {
          ...studyingDeck,
          cards: studyingDeck.cards.map((c: any) => c.id === cardId ? updatedCard : c)
        };
        setStudyingDeck(updatedDeck);
        setFlashcardDecks((prev: any[]) => prev.map(d => d.id === studyingDeck.id ? updatedDeck : d));
        
        if (firebaseUser && updatedDeck.neonId) {
          updateFlashcardDeck({ userId: firebaseUser.uid, deckId: updatedDeck.neonId, cards: updatedDeck.cards })
            .catch(err => console.error("Failed to sync SM-2 progress", err));
        }
      }

      setStudyQueue(newQueue);
      setStudyFlipped(false);
      flipAnim.setValue(0);
      setStudyTypedAnswer("");
      setStudyChecked(false);

      swipeX.setValue(Dimensions.get("window").width);
      Animated.timing(swipeX, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      }).start();
    });
  };

  /** Opens battle options sheet – does NOT create room yet */
  const handleHostBattle = (quizId: string) => {
    const q = quizzes.find((q) => q.id === quizId);
    if (!q) return;
    setBattleOptionsQuiz(q);
    setBattleSelectionMode("all");
    setBattleRandomCount(Math.min(10, (q.questionsList?.length || q.questions || 10)));
    setBattleRangeStart(1);
    setBattleRangeEnd(Math.min(5, (q.questionsList?.length || q.questions || 5)));
    setBattleShuffleQ(false);
    setBattleShuffleA(false);
    setBattleTimePerQuestion(null);
    setBattleCreating(false);
    setShowBattleQuizSelector(false);
    setShowBattleOptions(true);
  };

  /** Actually creates the room after options are confirmed */
  const handleStartBattle = async () => {
    const q = battleOptionsQuiz;
    if (!q) return;

    setBattleError("");
    setBattleConnError("");
    setBattleCreating(true); // show loading inside modal
    try {
      let qsList: any[] = q.questionsList || [];
      if (!qsList || qsList.length === 0) {
        qsList = generateMockQuestionsForQuiz(q.title, q.questions || 1);
      }
      // Apply selection mode
      if (battleSelectionMode === "random") {
        qsList = [...qsList].sort(() => Math.random() - 0.5).slice(0, battleRandomCount);
      } else if (battleSelectionMode === "range") {
        qsList = qsList.slice(battleRangeStart - 1, battleRangeEnd);
      }
      if (battleShuffleQ) {
        qsList = [...qsList].sort(() => Math.random() - 0.5);
      }
      if (battleShuffleA) {
        qsList = qsList.map((q: any) => ({ ...q, answers: [...q.answers].sort(() => Math.random() - 0.5) }));
      }
      
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout. Please check your internet connection.")), 8000));
      const code = await Promise.race([
        createBattleRoom(q.id, q.title, qsList.length, qsList, firebaseUser?.uid || "guest", firebaseUser?.displayName || "Player", battleTimePerQuestion),
        timeoutPromise
      ]) as string;

      setBattleRoomCode(code);
      setIsHost(true);
      battleStartedRef.current = false;
      setBattleCreating(false);
      setShowBattleOptions(false); // close AFTER room created so user sees loading
      if (battleUnsubscribeRef.current) battleUnsubscribeRef.current();
      battleUnsubscribeRef.current = listenToBattleRoom(code, (data) => {
        setBattleRoomState(data);
        if (data.status === "playing" && !battleStartedRef.current) {
          battleStartedRef.current = true;
          startBattleSession(data, true);
        }
      });
    } catch (e: any) {
      setBattleCreating(false);
      setBattleError(e.message || "Failed to create room. Check your connection and try again.");
    }
  };

  const handleJoinBattle = async () => {
    if (!joinCodeInput.trim()) return;

    setBattleError("");
    setBattleCreating(true);
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout. Please check your internet connection.")), 8000));
      const res = await Promise.race([
        joinBattleRoom(joinCodeInput, firebaseUser?.uid || "guest2", firebaseUser?.displayName || "Player 2"),
        timeoutPromise
      ]) as { success: boolean; error?: string; quizId?: string };
      setBattleCreating(false);
      if (res.success) {
        setBattleRoomCode(joinCodeInput.toUpperCase().trim());
        setIsHost(false);
        battleStartedRef.current = false;
        if (battleUnsubscribeRef.current) battleUnsubscribeRef.current();
        battleUnsubscribeRef.current = listenToBattleRoom(joinCodeInput.toUpperCase().trim(), (data) => {
          setBattleRoomState(data);
          if (data.status === "playing" && !battleStartedRef.current) {
            battleStartedRef.current = true;
            startBattleSession(data, false);
          }
        });
      } else {
        setBattleError(res.error || "Room not found. Check the code and try again.");
      }
    } catch (e: any) {
      setBattleCreating(false);
      setBattleError(e.message || "Connection error. Please try again.");
    }
  };

  const startBattleSession = (data: BattleRoom, isHostFlag: boolean) => {
    let qsList = data.questions;
    if (!qsList || qsList.length === 0) {
      const quiz = quizzesRef.current.find((q: any) => q.id === data.quizId);
      if (quiz && quiz.questionsList && quiz.questionsList.length > 0) {
        qsList = [...quiz.questionsList];
      } else {
        setBattleError("Could not load questions for this match.");
        return;
      }
    }

    // Read timePerQuestion from Firestore room so both host & guest are in sync
    const tpq: number | null = (data as any).timePerQuestion ?? null;
    setBattleTimePerQuestion(tpq);
    if (tpq != null) setBattleQuestionTimeLeft(tpq);

    setActiveSession({
       quizId: data.quizId,
       quizTitle: data.quizTitle,
       questions: qsList,
       currentIndex: 0,
       answers: {},
       correctCount: 0,
       wrongCount: 0,
       startTime: Date.now(),
       isBattle: true,
       battleRoomCode: data.id,
       isHost: isHostFlag,
       attemptSaved: false,
       showAnswerOnSubmit: true,
       // no quizTimeLimit — battle uses per-question timer
    });
  };

  const renderBattleLobbyView = () => {
    const isDark = settingsDarkMode;

    // ── Sign-in gate ────────────────────────────────────────────────
    if (!firebaseUser) {
      return (
        <View style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f4f4f8", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)",
            borderWidth: 1.5, borderColor: isDark ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.2)",
            alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <Text style={{ fontSize: 44 }}>⚔️</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: "900", color: isDark ? "#fff" : "#0d0f14", letterSpacing: -0.5, marginBottom: 10, textAlign: "center" }}>Sign in to Battle</Text>
          <Text style={{ fontSize: 15, color: isDark ? "#94a3b8" : "#64748b", textAlign: "center", lineHeight: 22, marginBottom: 36 }}>
            Quiz Clash requires an account so your identity is verified and results are saved fairly.
          </Text>
          <Pressable
            onPress={() => setShowAuthScreen(true)}
            style={({ pressed }) => [{
              backgroundColor: "#6366f1", paddingVertical: 16, paddingHorizontal: 40,
              borderRadius: 16, alignItems: "center", width: "100%",
            }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Sign In / Create Account</Text>
          </Pressable>
        </View>
      );
    }

    const bg      = isDark ? "#0f172a" : "#f4f4f8";
    const cardBg  = isDark ? "rgba(255,255,255,0.045)" : "#ffffff";
    const cardBorder = isDark ? "rgba(255,255,255,0.09)" : "#e2e8f0";
    const txt     = isDark ? "#ffffff" : "#0d0f14";
    const muted   = isDark ? "#71717a" : "#64748b";
    const mutedSub = isDark ? "#3f3f46" : "#94a3b8";
    const sepColor = isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0";

    // ── Dynamic stats from history ────────────────────────────────────
    const totalWins = battleHistory.filter(h => h.won).length;
    const totalBattles = battleHistory.length;
    const winRate = totalBattles > 0 ? Math.round((totalWins / totalBattles) * 100) : 0;
    // Compute current day streak (consecutive days played)
    let dayStreak = 0;
    if (battleHistory.length > 0) {
      const sortedHistory = [...battleHistory].sort((a, b) => b.date - a.date);
      const uniqueDays = new Set(sortedHistory.map(h => new Date(h.date).toDateString()));
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const todayStr = today.toDateString();
      const yesterdayStr = yesterday.toDateString();
      
      if (uniqueDays.has(todayStr) || uniqueDays.has(yesterdayStr)) {
        let checkDate = uniqueDays.has(todayStr) ? today : yesterday;
        while (uniqueDays.has(checkDate.toDateString())) {
          dayStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }

    return (
      <KeyboardWrapper
        style={{ flex: 1, backgroundColor: bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* No orbs - clean background matches rest of app */}

        <ScrollView
          contentContainerStyle={{ padding: 22, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header row with history button */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <MaterialCommunityIcons name="sword-cross" size={19} color={isDark ? "#818cf8" : "#6366f1"} />
              <Text style={{ fontSize: 15, color: isDark ? "#818cf8" : "#6366f1", fontWeight: "700" }}>Battle Arena</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Pressable
                onPress={() => setShowBattleHistory(true)}
                style={({ pressed }) => [{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6,
                }, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="time-outline" size={13} color={muted} />
                <Text style={{ fontSize: 12, fontWeight: "500", color: muted }}>History</Text>
              </Pressable>
              
              <Pressable
                onPress={() => setActiveTab("menu")}
                style={({ pressed }) => [{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  alignItems: "center", justifyContent: "center"
                }, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="settings-outline" size={15} color={muted} />
              </Pressable>
            </View>
          </View>

          {/* Hero title */}
          <View style={{ alignItems: "center", marginBottom: 4 }}>
            <Text style={{ fontSize: 28, fontWeight: "500", color: txt, letterSpacing: -0.5 }}>
              Quiz<Text style={{ color: isDark ? "#818cf8" : "#6366f1" }}>Clash</Text>
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: muted, fontWeight: "400", textAlign: "center", marginBottom: 20 }}>
            Challenge friends. Prove your knowledge.
          </Text>

          {/* Error banner */}
          {battleError ? (
            <Pressable
              onPress={() => setBattleError("")}
              style={{ backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)",
                borderWidth: 1, borderColor: isDark ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.2)",
                padding: 14, borderRadius: 12, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <Text style={{ color: isDark ? "#f87171" : "#dc2626", fontSize: 14, flex: 1, fontWeight: "500" }}>{battleError}</Text>
              <Text style={{ fontSize: 12, color: muted }}>Tap to dismiss</Text>
            </Pressable>
          ) : null}

          {!battleRoomCode ? (
            <>
              {/* HOST CARD */}
              <Pressable
                onPress={() => setShowBattleQuizSelector(true)}
                style={({ pressed }) => [{
                  backgroundColor: cardBg,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }, pressed && { opacity: 0.8 }]}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 11,
                  backgroundColor: isDark ? "#2a2410" : "#fef3c7",
                  alignItems: "center", justifyContent: "center"
                }}>
                  <Ionicons name="trophy" size={19} color={isDark ? "#f0b429" : "#d97706"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: txt, marginBottom: 1 }}>Host a battle</Text>
                  <Text style={{ fontSize: 12, color: muted }}>Pick your quiz & invite opponents</Text>
                </View>
                <Feather name="chevron-right" size={17} color={mutedSub} />
              </Pressable>

              {/* Divider */}
              <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 14, gap: 10 }}>
                <View style={{ flex: 1, height: 0.5, backgroundColor: sepColor }} />
                <Text style={{ color: mutedSub, fontSize: 11 }}>or</Text>
                <View style={{ flex: 1, height: 0.5, backgroundColor: sepColor }} />
              </View>

              {/* JOIN CARD */}
              <View style={{
                backgroundColor: cardBg,
                borderRadius: 14, padding: 14, marginBottom: 20,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 11,
                    backgroundColor: isDark ? "#0f2620" : "#ccfbf1",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Ionicons name="locate" size={19} color={isDark ? "#2dd4a7" : "#0d9488"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: txt, marginBottom: 1 }}>Join a battle</Text>
                    <Text style={{ fontSize: 12, color: muted }}>Enter your friend's room code</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    style={{
                      flex: 1, height: 40,
                      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                      borderWidth: 0.5,
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                      borderRadius: 10, paddingHorizontal: 12,
                      fontSize: 13, color: txt, letterSpacing: 2
                    }}
                    placeholder="CODE"
                    placeholderTextColor={mutedSub}
                    maxLength={5}
                    value={joinCodeInput}
                    onChangeText={setJoinCodeInput}
                    autoCapitalize="characters"
                  />
                  <Pressable
                    onPress={handleJoinBattle}
                    disabled={joinCodeInput.length !== 5 || battleCreating}
                    style={({ pressed }) => {
                      const isReady = joinCodeInput.length === 5 && !battleCreating;
                      return [{
                        height: 40, paddingHorizontal: 18, borderRadius: 10,
                        backgroundColor: isReady ? (isDark ? "#2dd4a7" : "#0d9488") : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                        borderWidth: 0.5,
                        borderColor: isReady ? (isDark ? "#2dd4a7" : "#0d9488") : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"),
                        justifyContent: "center", alignItems: "center",
                      }, pressed && { opacity: 0.7 }];
                    }}
                  >
                    {battleCreating ? (
                      <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#ffffff"} />
                    ) : (
                      <Text style={{ color: (joinCodeInput.length === 5 && !battleCreating) ? "#ffffff" : (isDark ? "#777d99" : "#64748b"), fontSize: 13, fontWeight: (joinCodeInput.length === 5) ? "700" : "500" }}>Join</Text>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Dynamic Stats Row 1: Win Rate Circular */}
              {totalBattles > 0 && (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 14 }}>
                    <View style={{ 
                      width: 80, height: 80, borderRadius: 40,
                      borderWidth: 6, borderColor: isDark ? "rgba(139,143,240,0.3)" : "rgba(99,102,241,0.2)",
                      alignItems: "center", justifyContent: "center"
                    }}>
                      <Text style={{ fontSize: 17, fontWeight: "500", color: txt }}>{winRate}%</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: txt, marginBottom: 2 }}>Win rate</Text>
                      <Text style={{ fontSize: 11, color: muted }}>{totalWins} win{totalWins !== 1 ? 's' : ''} out of {totalBattles} battle{totalBattles !== 1 ? 's' : ''} played</Text>
                    </View>
                  </View>

                  {/* Dynamic Stats Row 2: Streaks & Total */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "rgba(232,130,90,0.12)" : "rgba(232,130,90,0.08)", borderRadius: 14, padding: 10 }}>
                      <Ionicons name="flame" size={19} color="#e8825a" />
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: "500", color: txt }}>{dayStreak}</Text>
                        <Text style={{ fontSize: 10, color: isDark ? "#c98e75" : "#e8825a" }}>day streak</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "rgba(240,180,41,0.12)" : "rgba(240,180,41,0.08)", borderRadius: 14, padding: 10 }}>
                      <Ionicons name="trophy" size={19} color="#f0b429" />
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: "500", color: txt }}>{totalWins}</Text>
                        <Text style={{ fontSize: 10, color: isDark ? "#cda85f" : "#f0b429" }}>total wins</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </>
          ) : (
            /* ── Waiting Room ── */
            <View style={{ alignItems: "center", paddingTop: 20 }}>
              {/* Avatar VS layout */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 28, marginBottom: 36 }}>
                <View style={{ alignItems: "center", gap: 10 }}>
                  <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)",
                    borderWidth: 2, borderColor: isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Text style={{ fontSize: 36 }}>🦊</Text>
                  </View>
                  <Text style={{ color: muted, fontSize: 13, fontWeight: "700" }}>{firebaseUser?.displayName?.split(" ")[0] || "You"}</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 22, fontWeight: "900", color: "#ec4899" }}>VS</Text>
                </View>
                <View style={{ alignItems: "center", gap: 10 }}>
                  <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.07)",
                    borderWidth: 2, borderColor: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.2)",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Text style={{ fontSize: 36, color: isDark ? "#818cf8" : "#6366f1", fontWeight: "900" }}>?</Text>
                  </View>
                  <Text style={{ color: muted, fontSize: 13, fontWeight: "700" }}>
                    {battleRoomState?.status === "playing" ? (isHost ? battleRoomState?.guestName : battleRoomState?.hostName) || "Rival" : "Waiting..."}
                  </Text>
                </View>
              </View>

              {/* Room code display */}
              {isHost && (
                <View style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                  borderWidth: 1, borderColor: cardBorder,
                  borderRadius: 20, padding: 24, width: "100%", alignItems: "center", marginBottom: 24
                }}>
                  <Text style={{ fontSize: 11, color: mutedSub, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>Share This Code</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                    {battleRoomCode.split("").map((ch, i) => (
                      <View key={i} style={{
                        width: 44, height: 54, borderRadius: 12,
                        backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)",
                        borderWidth: 2, borderColor: isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)",
                        alignItems: "center", justifyContent: "center"
                      }}>
                        <Text style={{ fontSize: 22, fontWeight: "900", color: isDark ? "#818cf8" : "#6366f1" }}>{ch}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={{ fontSize: 13, color: muted, fontWeight: "500" }}>Waiting for opponent to join...</Text>
                </View>
              )}

              {battleRoomState?.status === "playing" ? (
                <View style={{ alignItems: "center", gap: 10, marginBottom: 28 }}>
                  <View style={{
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)",
                    borderWidth: 2, borderColor: isDark ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.3)",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Text style={{ fontSize: 26 }}>✓</Text>
                  </View>
                  <Text style={{ fontSize: 18, color: "#22c55e", fontWeight: "800" }}>Opponent joined!</Text>
                  <Text style={{ fontSize: 14, color: muted }}>Starting match...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 28 }}>
                  {[0,1,2].map(i => (
                    <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isDark ? "#818cf8" : "#6366f1", opacity: 0.6 }} />
                  ))}
                </View>
              )}

              <Pressable
                onPress={() => {
                  if (battleUnsubscribeRef.current) battleUnsubscribeRef.current();
                  setBattleRoomCode("");
                  setBattleRoomState(null);
                }}
                style={({ pressed }) => [{ paddingVertical: 10, paddingHorizontal: 20 }, pressed && { opacity: 0.7 }]}
              >
                <Text style={{ color: "#ef4444", fontSize: 15, fontWeight: "700" }}>✕ Cancel & Leave</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* ── Quiz Selector Modal ── */}
        <Modal visible={showBattleQuizSelector} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBattleQuizSelector(false)}>
          <View style={{ flex: 1, backgroundColor: isDark ? "#0d0f1a" : "#f4f4f8", paddingTop: Platform.OS === 'ios' ? 0 : 40 }}>
            <View style={{
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              padding: 20, borderBottomWidth: 1, borderBottomColor: cardBorder
            }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: txt }}>⚔️ Select a Quiz</Text>
              <Pressable onPress={() => setShowBattleQuizSelector(false)}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color={muted} />
              </Pressable>
            </View>
            <FlatList
              data={quizzes}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleHostBattle(item.id)}
                  style={({ pressed }) => [{
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                    borderWidth: 1, borderColor: cardBorder,
                    borderRadius: 16, padding: 18,
                    flexDirection: "row", alignItems: "center", gap: 14,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.04, shadowRadius: 8, elevation: 1,
                  }, pressed && { opacity: 0.8, borderColor: isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)" }]}
                >
                  <View style={{
                    width: 46, height: 46, borderRadius: 12,
                    backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.09)",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Text style={{ fontSize: 22 }}>📝</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 3 }}>{item.title}</Text>
                    <Text style={{ fontSize: 12, color: muted, fontWeight: "500" }}>{item.questions} questions · {item.category}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={mutedSub} />
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: 60, gap: 12 }}>
                  <Text style={{ fontSize: 40 }}>📭</Text>
                  <Text style={{ textAlign: "center", color: muted, fontSize: 15, fontWeight: "500" }}>No quizzes yet.{"\n"}Create one to host a battle!</Text>
                </View>
              }
            />
          </View>
        </Modal>

        {/* ── Battle Options Modal ── */}
        <Modal visible={showBattleOptions} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!battleCreating) setShowBattleOptions(false); }}>
          <View style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f4f4f8" }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              padding: 20, borderBottomWidth: 1, borderBottomColor: cardBorder }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: txt }}>⚙️ Battle Options</Text>
              <Pressable onPress={() => { if (!battleCreating) setShowBattleOptions(false); }}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  alignItems: "center", justifyContent: "center", opacity: battleCreating ? 0.3 : 1 }}>
                <Ionicons name="close" size={20} color={muted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
              {/* Quiz info */}
              {battleOptionsQuiz && (
                <View style={{ backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.07)",
                  borderRadius: 14, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.15)" }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: txt, marginBottom: 4 }}>{battleOptionsQuiz.title}</Text>
                  <Text style={{ fontSize: 13, color: muted }}>{battleOptionsQuiz.questions} questions available</Text>
                </View>
              )}

              {/* Question Selection */}
              <Text style={{ fontSize: 12, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Question Selection</Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                {([{ value: "all" as const, label: "All" }, { value: "random" as const, label: "Random" }, { value: "range" as const, label: "Range" }]).map(({ value, label }) => {
                  const isActive = battleSelectionMode === value;
                  return (
                    <Pressable key={value} onPress={() => setBattleSelectionMode(value)}
                      style={[{
                        flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center",
                        borderWidth: 1.5,
                        backgroundColor: isActive ? (isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)") : cardBg,
                        borderColor: isActive ? (isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)") : cardBorder,
                      }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color: isActive ? (isDark ? "#818cf8" : "#6366f1") : txt }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Random count stepper */}
              {battleSelectionMode === "random" && (
                <View style={{ backgroundColor: cardBg,
                  borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: cardBorder,
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: txt }}>Number of questions</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Pressable onPress={() => setBattleRandomCount(Math.max(1, battleRandomCount - 1))}
                      style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 18, color: txt, fontWeight: "700" }}>−</Text>
                    </Pressable>
                    <TextInput 
                      style={{ fontSize: 18, fontWeight: "800", color: txt, minWidth: 32, textAlign: "center", padding: 0 }}
                      keyboardType="number-pad"
                      value={battleRandomCount === 0 ? "" : String(battleRandomCount)}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, '');
                        if (!cleaned) { setBattleRandomCount(0); return; }
                        const maxQ = battleOptionsQuiz?.questionsList?.length || battleOptionsQuiz?.questions || 50;
                        setBattleRandomCount(Math.max(1, Math.min(maxQ, parseInt(cleaned, 10))));
                      }}
                    />
                    <Pressable onPress={() => setBattleRandomCount(Math.min((battleOptionsQuiz?.questionsList?.length || battleOptionsQuiz?.questions || 50), battleRandomCount + 1))}
                      style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 18, color: txt, fontWeight: "700" }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Range count steppers */}
              {battleSelectionMode === "range" && (
                <View style={{ backgroundColor: cardBg,
                  borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: cardBorder,
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: txt }}>Question Range</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Pressable onPress={() => setBattleRangeStart(Math.max(1, battleRangeStart - 1))}
                        style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 16, color: txt, fontWeight: "700" }}>−</Text>
                      </Pressable>
                      <TextInput 
                        style={{ fontSize: 16, fontWeight: "800", color: txt, minWidth: 32, textAlign: "center", padding: 0 }}
                        keyboardType="number-pad"
                        value={battleRangeStart === 0 ? "" : String(battleRangeStart)}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9]/g, '');
                          if (!cleaned) { setBattleRangeStart(0); return; }
                          setBattleRangeStart(Math.max(1, Math.min(battleRangeEnd, parseInt(cleaned, 10))));
                        }}
                      />
                      <Pressable onPress={() => setBattleRangeStart(Math.min(battleRangeEnd, battleRangeStart + 1))}
                        style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 16, color: txt, fontWeight: "700" }}>+</Text>
                      </Pressable>
                    </View>
                    <Text style={{ fontSize: 14, color: muted, marginHorizontal: 2 }}>to</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Pressable onPress={() => setBattleRangeEnd(Math.max(battleRangeStart, battleRangeEnd - 1))}
                        style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 16, color: txt, fontWeight: "700" }}>−</Text>
                      </Pressable>
                      <TextInput 
                        style={{ fontSize: 16, fontWeight: "800", color: txt, minWidth: 32, textAlign: "center", padding: 0 }}
                        keyboardType="number-pad"
                        value={battleRangeEnd === 0 ? "" : String(battleRangeEnd)}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9]/g, '');
                          if (!cleaned) { setBattleRangeEnd(0); return; }
                          const maxQ = battleOptionsQuiz?.questionsList?.length || battleOptionsQuiz?.questions || 100;
                          setBattleRangeEnd(Math.max(battleRangeStart, Math.min(maxQ, parseInt(cleaned, 10))));
                        }}
                      />
                      <Pressable onPress={() => setBattleRangeEnd(Math.min(battleOptionsQuiz?.questionsList?.length || battleOptionsQuiz?.questions || 100, battleRangeEnd + 1))}
                        style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 16, color: txt, fontWeight: "700" }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* Time per question */}
              <Text style={{ fontSize: 12, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginTop: 4 }}>Time per Question</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {([null, 15, 20, 30, 45, 60] as (number | null)[]).map((t) => {
                  const isActive = battleTimePerQuestion === t;
                  const label = t === null ? "No Limit" : `${t}s`;
                  return (
                    <Pressable key={String(t)} onPress={() => setBattleTimePerQuestion(t)}
                      style={[{
                        paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5,
                        backgroundColor: isActive ? (isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)") : cardBg,
                        borderColor: isActive ? (isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)") : cardBorder,
                      }]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700",
                        color: isActive ? (isDark ? "#818cf8" : "#6366f1") : muted }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Toggles */}
              <Text style={{ fontSize: 12, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Gameplay Options</Text>
              <View style={{ backgroundColor: cardBg,
                borderRadius: 14, borderWidth: 1, borderColor: cardBorder, overflow: "hidden" }}>
                {[
                  { label: "Shuffle question order", sub: "Questions appear in random order", value: battleShuffleQ, set: setBattleShuffleQ },
                  { label: "Shuffle answer options", sub: "Answer choices appear randomized", value: battleShuffleA, set: setBattleShuffleA },
                ].map((row, i) => (
                  <View key={row.label}>
                    {i > 0 && <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9", marginLeft: 16 }} />}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: txt, marginBottom: 2 }}>{row.label}</Text>
                        <Text style={{ fontSize: 12, color: muted }}>{row.sub}</Text>
                      </View>
                      <ToggleSwitch checked={row.value} onChange={row.set} darkMode={isDark} />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Sticky Start Button */}
            <View style={{ position: "absolute", bottom: 0, left: 0, right: 0,
              padding: 20, paddingBottom: Platform.OS === "ios" ? 36 : 20,
              backgroundColor: isDark ? "#0f172a" : "#f4f4f8",
              borderTopWidth: 1, borderTopColor: cardBorder }}>
              <Pressable
                onPress={handleStartBattle}
                disabled={battleCreating}
                style={({ pressed }) => [{
                  backgroundColor: "#6366f1",
                  paddingVertical: 16, borderRadius: 14, alignItems: "center", justifyContent: "center",
                  flexDirection: "row", gap: 10,
                  opacity: battleCreating ? 0.85 : 1,
                }, pressed && !battleCreating && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
              >
                {battleCreating ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Creating Room…</Text>
                  </>
                ) : (
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>⚔️  Create Battle Room</Text>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ── Battle History Modal ── */}
        <Modal visible={showBattleHistory} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBattleHistory(false)}>
          <View style={{ flex: 1, backgroundColor: isDark ? "#0d0f1a" : "#f4f4f8", paddingTop: Platform.OS === 'ios' ? 0 : 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              padding: 20, borderBottomWidth: 1, borderBottomColor: cardBorder }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: txt }}>📜 Battle History</Text>
              <Pressable onPress={() => setShowBattleHistory(false)}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color={muted} />
              </Pressable>
            </View>
            {battleHistory.length === 0 ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
                <Text style={{ fontSize: 48 }}>⚔️</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: txt }}>No battles yet</Text>
                <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>Complete your first battle{"\n"}to see your history here!</Text>
              </View>
            ) : (
              <FlatList
                data={battleHistory}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={{ padding: 16, gap: 10 }}
                renderItem={({ item }) => {
                  const d = new Date(item.date);
                  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  return (
                    <View style={{
                      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                      borderRadius: 16, padding: 16,
                      borderWidth: 1, borderColor: item.won ? (isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)") : cardBorder,
                      flexDirection: "row", alignItems: "center", gap: 14,
                    }}>
                      <Text style={{ fontSize: 28 }}>{item.won ? "🏆" : "💀"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: txt, marginBottom: 2 }} numberOfLines={1}>{item.quizTitle}</Text>
                        <Text style={{ fontSize: 12, color: muted }}>vs {item.opponentName} · {dateStr}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <View style={{ backgroundColor: item.won ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: item.won ? "#22c55e" : "#ef4444" }}>
                            {item.won ? "WIN" : "LOSS"}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: muted }}>{item.myScore} – {item.opponentScore}</Text>
                        {item.myScore === item.opponentScore && item.myTime != null && item.opponentTime != null && (
                          <Text style={{ fontSize: 10, color: item.won ? "#22c55e" : "#ef4444", fontWeight: "600", marginTop: -2 }}>
                            {item.won ? "+" : "-"}{(Math.abs(item.opponentTime - item.myTime) / 1000).toFixed(1)}s
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </Modal>
      </KeyboardWrapper>
    );
  };

  // Render Sub-Views based on activeTab
  const renderContent = (overrideTab?: string) => {
    const tabToRender = overrideTab || activeTab;
    switch (tabToRender) {
      case "insights":
        return renderInsightsView();
      // case "deck-insights": removed (flashcard feature removed)

      case "battle":
        return renderBattleLobbyView();

      case "dashboard": {
        const isDark = settingsDarkMode;
        const bg     = isDark ? "#0f172a" : "#f4f4f8";
        const card   = isDark ? "#1e293b" : "#ffffff";
        const border = isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)";
        const border2 = isDark ? "#2a2a4a" : "rgba(99,102,241,0.15)";
        const txt    = isDark ? "#ffffff" : "#0d0f14";
        const muted  = isDark ? "#ffffff" : "#666677";

        const combinedQuizzes = (!sampleDismissed && sampleQuiz) ? [...quizzes, sampleQuiz] : quizzes;

        const totalAttempts  = combinedQuizzes.reduce((s, q) => s + (q.attempts || []).length, 0);
        const totalQuestions = combinedQuizzes.reduce((s, q) => s + (q.questions || 0), 0);
        const allAttempts = combinedQuizzes.flatMap(q => q.attempts || []);
        const totalCorrectAnswers = allAttempts.reduce((s: number, a: any) => s + (a.correct || 0), 0);
        const totalAttemptedQuestions = allAttempts.reduce((s: number, a: any) => s + ((a.correct || 0) + (a.wrong || 0) + (a.skipped || 0)), 0);
        const avgScore = totalAttemptedQuestions > 0
          ? Math.round((totalCorrectAnswers / totalAttemptedQuestions) * 100)
          : 0;
          
        const totalUniqueCorrect = combinedQuizzes.reduce((acc: number, q: any) => acc + (q.uniqueCorrectIds || []).length, 0);
        const overallProgressPct = totalQuestions > 0 
          ? Math.min(Number(((totalUniqueCorrect / totalQuestions) * 100).toFixed(1)), 100) 
          : 0;

        // For starred block
        const starredQList = combinedQuizzes.flatMap(q =>
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
            {/* ── Header ── */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
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
                {t('dashboard.accuracy') || "ACCURACY OVER ALL ATTEMPTS"}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
                  <Text style={{ fontSize: 48, fontWeight: "600", color: txt, letterSpacing: -2, lineHeight: 52 }}>
                    {avgScore}
                  </Text>
                  <Text style={{ fontSize: 20, color: muted, marginBottom: 8, fontWeight: "300" }}>%</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 11, color: muted }}>{totalAttempts} {totalAttempts !== 1 ? (t('dashboard.attempts') || "attempts") : (t('dashboard.attempt') || "attempt")}</Text>
                  <Text style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                    {t('dashboard.across') || "across"} {combinedQuizzes.length} {combinedQuizzes.length !== 1 ? (t('dashboard.quizzes') || "quizzes") : (t('dashboard.quiz') || "quiz")}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={{ marginTop: 14 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={{ fontSize: 10, color: muted, letterSpacing: 0.5 }}>{t('dashboard.completion') || "Completion (Mastered)"}</Text>
                  <Text style={{ fontSize: 10, color: muted, letterSpacing: 0.5 }}>
                    {totalUniqueCorrect} / {totalQuestions} ({overallProgressPct}%)
                  </Text>
                </View>
                <View style={{ height: 3, backgroundColor: isDark ? "#1e1e3a" : "rgba(0,0,0,0.06)", borderRadius: 2 }}>
                  <View style={{ height: 3, borderRadius: 2, width: `${overallProgressPct}%` as any,
                    backgroundColor: "#6366f1" }} />
                </View>
              </View>
            </View>

            {/* ── Stats grid — 3 cells ── */}
            <View style={{ flexDirection: "row", gap: 8, marginHorizontal: 20, marginTop: 12 }}>
              {[
                { label: t('dashboard.stats_quizzes') || "QUIZZES",   value: String(combinedQuizzes.length),        icon: "layers-outline"      as const },
                { label: t('dashboard.stats_questions') || "QUESTIONS", value: String(totalQuestions),         icon: "help-circle-outline" as const },
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

            {/* Starred Questions removed — now per-quiz via Bookmarked button in quiz insights */}

            {/* ── All Quizzes ── */}
            <View style={{ flexDirection: "row", justifyContent: "space-between",
              alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.2, color: muted, textTransform: "uppercase" }}>
                All Quizzes
              </Text>
            </View>

            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              {combinedQuizzes.map((quiz) => {
                const attempts = quiz.attempts || [];
                const uniqueCount = (quiz.uniqueCorrectIds || []).length;
                const qCount = quiz.questions || 1;
                const completionPct = attempts.length > 0 ? Math.min(Math.round((uniqueCount / qCount) * 100), 100) : null;
                
                let cardColor = "#5b6080";
                if (completionPct !== null) {
                  if (completionPct >= 75) cardColor = "#2dd4a7";
                  else if (completionPct >= 25) cardColor = "#8b8ff0";
                  else cardColor = "#f0a13c";
                }
                
                let badgeBg = "rgba(91,96,128,0.15)";
                if (completionPct !== null) {
                  if (completionPct >= 75) badgeBg = "rgba(45,212,167,0.15)";
                  else if (completionPct >= 25) badgeBg = "rgba(139,143,240,0.15)";
                  else badgeBg = "rgba(240,161,60,0.15)";
                }

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
                    <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: cardColor }} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: "500", color: txt }} numberOfLines={1}>
                          {quiz.title}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 5, flexWrap: "wrap" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: muted }} />
                            <Text style={{ fontSize: 10, color: muted }}>{quiz.questions} questions</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: muted }} />
                            <Text style={{ fontSize: 10, color: muted }}>
                              {attempts.length} attempt{attempts.length !== 1 ? "s" : ""}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={{ backgroundColor: completionPct !== null ? badgeBg : "rgba(91,96,128,0.15)", borderRadius: 6,
                        paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 12, fontWeight: "500", color: cardColor }}>
                          {completionPct !== null ? `${completionPct}%` : "Not started"}
                        </Text>
                      </View>
                    </View>
                    {/* Mini progress bar */}
                    <View style={{ height: 2, backgroundColor: isDark ? "#1e1e2e" : "rgba(0,0,0,0.06)", borderRadius: 2 }}>
                      {completionPct !== null && (
                        <View style={{ height: 2, borderRadius: 2, width: `${completionPct}%` as any, backgroundColor: cardColor }} />
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
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(40, insets.bottom + 40) }} showsVerticalScrollIndicator={false}>
              <View style={styles.tabHeader}>
                <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>{t('create_pick.pick_title') || "Create"}</Text>
                <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub]}>{t('create_pick.pick_subtitle') || "What would you like to make?"}</Text>
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
                      <Text style={[{ fontSize: 17, fontWeight: "800", letterSpacing: -0.2 }, !settingsDarkMode && styles.lightText]}>{t('create_pick.quiz_title') || "Quiz"}</Text>
                      <Text style={{ fontSize: 12, color: "#6e727a", marginTop: 2 }}>{t('create_pick.quiz_sub') || "Multiple-choice questions"}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#6366f1" />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {[
                      t('create_pick.tag_timed') || "Timed mode",
                      t('create_pick.tag_shuffle') || "Shuffle",
                      t('create_pick.tag_wrong') || "Wrong review",
                      t('create_pick.tag_multi') || "Multi-select"
                    ].map(tag => (
                      <View key={tag} style={{ backgroundColor: "rgba(99,102,241,0.1)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, color: "#6366f1", fontWeight: "600" }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>

              {/* Flashcards card */}
              <Pressable
                onPress={() => setCreationMode("pick")}
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
                      <Text style={[{ fontSize: 17, fontWeight: "800", letterSpacing: -0.2 }, !settingsDarkMode && styles.lightText]}>{t('create_pick.fc_title') || "Flashcards"}</Text>
                      <Text style={{ fontSize: 12, color: "#6e727a", marginTop: 2 }}>{t('create_pick.fc_sub') || "Flip-card study decks"}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#00e5a0" />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    {[
                      t('create_pick.tag_frontback') || "Front & back",
                      t('create_pick.tag_flip') || "Flip to reveal",
                      t('create_pick.tag_deck') || "Deck mode",
                      t('create_pick.tag_quick') || "Quick recall"
                    ].map(tag => (
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

        // ── Flashcard creation flow (dead code — tab removed) ─────────────
        // @ts-ignore — intentional: this is dead code kept for archive, will never match active tab
        if (creationMode === "pick" && false) {
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
                    // @ts-ignore — dead code, deck is null stub
                    setFlashcardDecks(prev => prev.map(d =>
                      // @ts-ignore
                      d.id === localId ? { ...d, id: (neonDeck as any).id, neonId: (neonDeck as any).id } : d
                    ));
                  } else {
                    console.warn("[NeonSync] deck create failed:", error);
                  }
                });
              }
            }
            setFcTitle(""); setFcCards([{ front: "", back: "" }]); setFcCurrentIdx(0);
            setCreationMode("pick");
            setActiveTab("home");
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
            <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
              {/* Header Bar */}
              <View style={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
                backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8",
              }}>
                <Pressable
                  onPress={() => { setEditingDeckId(null); setCreationMode("pick"); setActiveTab("home"); }}
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
                  <Text style={{ fontSize: 12, color: settingsDarkMode ? "#ffffff" : "#6e727a", marginTop: 1 }}>
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
                  <Text style={{ fontSize: 13, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#44445a" }}>
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
                  <Text style={{ fontSize: 13, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#888899" }}>
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
                  backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
                  borderWidth: 1,
                  borderColor: isFrontFocused
                    ? "rgba(99,102,241,0.5)"
                    : (settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                  overflow: "hidden",
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1,
                      color: settingsDarkMode ? "#ffffff" : "#a0a0b0" }}>FRONT</Text>
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
                      placeholderTextColor={settingsDarkMode ? "#6e727a" : "#c8c8d4"}
                      value={currentCard.front} onChangeText={updateFront} />
                  )}
                </View>

                {/* Back card */}
                <View style={{
                  borderRadius: 16, marginBottom: 16,
                  backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
                  borderWidth: 1,
                  borderColor: isBackFocused
                    ? "rgba(99,102,241,0.5)"
                    : (settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                  overflow: "hidden",
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1,
                      color: settingsDarkMode ? "#ffffff" : "#a0a0b0" }}>BACK</Text>
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
                      placeholderTextColor={settingsDarkMode ? "#6e727a" : "#c8c8d4"}
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
                {(() => {
                  const hasValidCards = fcCards.some((c: any) => c.front.trim() && c.back.trim());
                  return (
                    <Pressable onPress={saveDeck} disabled={!hasValidCards}
                      style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 6, height: 50, borderRadius: 14, marginTop: 10,
                        backgroundColor: hasValidCards ? "#818cf8" : (settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                      }, pressed && styles.pressedScale]}>
                      <Ionicons name="checkmark" size={16} color={hasValidCards ? "#ffffff" : (settingsDarkMode ? "#6e727a" : "#888899")} />
                      <Text style={{ fontSize: 14, fontWeight: "700", color: hasValidCards ? "#ffffff" : (settingsDarkMode ? "#6e727a" : "#888899") }}>Save Deck</Text>
                    </Pressable>
                  );
                })()}
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
                  <View style={{ backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
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
                <KeyboardWrapper
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  style={{ flex: 1 }}
                >
                  <Pressable
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" }}
                    onPress={() => setShowNameDeckModal(false)}
                  >
                    <Pressable
                      onPress={() => {}}
                      style={{ width: "88%", backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
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
                        style={{ backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8",
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
                </KeyboardWrapper>
              </Modal>

              {/* Ellipsis Bottom Sheet */}
              <Modal visible={showEllipsisMenu} transparent animationType="slide" onRequestClose={() => setShowEllipsisMenu(false)}>
                <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
                  onPress={() => setShowEllipsisMenu(false)}>
                  <View style={{ backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
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
                        setCreationMode("pick"); setActiveTab("home"); setShowEllipsisMenu(false);
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
                        <Text style={{ fontSize: 11, color: "#6366f1", fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 }}>{t('flashcards.front_label') || "FRONT"}</Text>
                        {renderFormattedText(currentCard.front || "(empty)", { fontSize: 16, color: settingsDarkMode ? "#ffffff" : "#0d0f14" })}
                      </View>
                      <View style={{ borderRadius: 14, padding: 16,
                        backgroundColor: settingsDarkMode ? "#0d0f14" : "#f0fff8",
                        borderWidth: 1.5, borderColor: "rgba(0,229,160,0.2)" }}>
                        <Text style={{ fontSize: 11, color: "#00e5a0", fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 }}>BACK</Text>
                        {renderFormattedText(currentCard.back || "(empty)", { fontSize: 16, color: settingsDarkMode ? "#ffffff" : "#0d0f14" })}
                      </View>
                    </View>
                    <Pressable onPress={() => setShowPreviewModal(false)}
                      style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#6366f1", width: "100%", paddingVertical: 16 }, pressed && styles.pressedScale]}>
                      <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Close</Text>
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
            <KeyboardWrapper
              behavior={Platform.OS === "ios" ? "padding" : "padding"}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 80}
            >
              <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(60, insets.bottom + 40) }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.tabHeader}>
                  <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>{t('create.title') || "Create Quiz"}</Text>
                  <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub]}>{t('create.subtitle') || "Setup a new custom MCQ quiz structure"}</Text>
                </View>
  
                <View style={styles.formContainer}>
                  <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>{t('create.quiz_title') || "Quiz Title"}</Text>
                  <Pressable style={[styles.webInputDummy, !settingsDarkMode && styles.lightInput]}>
                    <TextInput
                      placeholder={t('create.quiz_title_placeholder') || "e.g. Advanced Javascript"}
                      placeholderTextColor="#666"
                      style={[styles.formInput, !settingsDarkMode && styles.lightText]}
                      value={newTitle}
                      onChangeText={setNewTitle}
                    />
                  </Pressable>
  
  
  
                  <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>{t('create.num_questions') || "Questions Count"}</Text>
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
  
                  <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>{t('create.language')}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                    {["English", "Spanish", "French", "Hindi"].map((lang) => (
                      <Pressable
                        key={lang}
                        onPress={() => setNewQuizLanguage(lang)}
                        style={[
                          { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "#f0f0f0" },
                          newQuizLanguage === lang && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderWidth: 1, borderColor: "#6366f1" }
                        ]}
                      >
                        <Text style={[
                          { fontSize: 14, color: settingsDarkMode ? "#ccc" : "#666" },
                          newQuizLanguage === lang && { color: "#6366f1", fontWeight: "bold" }
                        ]}>{lang}</Text>
                      </Pressable>
                    ))}
                  </View>
  
                  <Pressable onPress={handleProceedToDrafting} style={styles.createButton}>
                    <Text style={styles.createButtonText}>{t('create.next_btn') || "Next: Draft Questions"}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </KeyboardWrapper>
          );
        }

        if (creationMode === "quiz" && creationStep === "drafting") {
        const currentDraftQuestion = draftQuestions[draftCurrentIndex];
        const totalDraftCount = parseInt(newQuestionsCount) || 0;
        // Layout tracking refs for precise scroll-to-option behaviour
        const draftFormContainerY = (globalThis as any)._draftFormContainerY ?? 0;
        const draftOptionsContainerY = (globalThis as any)._draftOptionsContainerY ?? 0;
        const draftOptionRowYs: number[] = (globalThis as any)._draftOptionRowYs ?? [];

        return (
          <KeyboardWrapper
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 80}
          >
            <ScrollView
              ref={(ref) => { (globalThis as any)._draftScrollRef = ref; }}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(80, insets.bottom + 60) }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.tabHeader}>
                <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>{t('create.draft_title') || "Draft Questions"}</Text>
                <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub]}>
                  Question {draftCurrentIndex + 1} of {totalDraftCount}
                </Text>
              </View>

              {currentDraftQuestion && (
                <View
                style={styles.formContainer}
                onLayout={(e) => { (globalThis as any)._draftFormContainerY = e.nativeEvent.layout.y; }}
              >
                  {/* Visual Progress Bar */}
                  <View style={{ width: "100%", height: 6, backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
                    <View style={{ width: `${((draftCurrentIndex + 1) / totalDraftCount) * 100}%`, height: "100%", backgroundColor: "#00e5a0" }} />
                  </View>

                  {/* Question Prompt */}
                  <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>{t('create.question_prompt') || "Question Prompt"}</Text>
                  <View style={[styles.webInputDummy, !settingsDarkMode && styles.lightInput, { height: 100, paddingVertical: 8 }]}>
                    <TextInput
                      placeholder={t('create.question_placeholder') || "Enter your question prompt here..."}
                      placeholderTextColor="#666"
                      multiline
                      style={[styles.formInput, !settingsDarkMode && styles.lightText, { height: "100%", textAlignVertical: "top" }]}
                      value={currentDraftQuestion.prompt}
                      onChangeText={updateDraftPrompt}
                    />
                  </View>

                  {/* Question Options/Answers */}
                  <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText, { marginTop: 15, marginBottom: 4 }]}>
                    {t('create.options') || "Options / Choices"}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#888888", marginBottom: 12 }}>
                    {t('create.options_desc') || "Type answer texts below and select the correct answer amongst them."}
                  </Text>

                  <View
                    style={{ gap: 10, marginBottom: 15 }}
                    onLayout={(e) => { (globalThis as any)._draftOptionsContainerY = e.nativeEvent.layout.y; }}
                  >
                    {currentDraftQuestion.answers.map((ans: any, optIdx: number) => {
                      const isOptionCorrect = ans.isCorrect;
                      return (
                        <View
                          key={ans.id || String(optIdx)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                          onLayout={(e) => {
                            if (!(globalThis as any)._draftOptionRowYs) (globalThis as any)._draftOptionRowYs = [];
                            (globalThis as any)._draftOptionRowYs[optIdx] = e.nativeEvent.layout.y;
                          }}
                        >
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
                              onFocus={() => {
                                if (optIdx >= 2) {
                                  setTimeout(() => {
                                    const rowY =
                                      ((globalThis as any)._draftFormContainerY ?? 0) +
                                      ((globalThis as any)._draftOptionsContainerY ?? 0) +
                                      (((globalThis as any)._draftOptionRowYs ?? [])[optIdx] ?? 0);
                                    // Scroll so the focused option sits ~80px below the top — not all the way down
                                    (globalThis as any)._draftScrollRef?.scrollTo({ y: Math.max(0, rowY - 80), animated: true });
                                  }, 300);
                                }
                              }}
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
                    <Text style={[{ fontSize: 12, fontWeight: "bold", color: "#00e5a0" }]}>{t('create.add_option') || "Add Option"}</Text>
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
          </KeyboardWrapper>
        );
        }
        return null;
      }

      // @ts-ignore — dead code, flashcard tab removed
      case "flashcards" as any: {
        // ── Flashcard study mode ─────────────────────────────────────
        if (studyingDeck) {
          const isDark  = settingsDarkMode;
          const cardBg  = isDark ? "#334155" : "#475569";
          const pageBg  = isDark ? "#0f172a" : "#f4f4f8";
          
          if (studyQueue.length === 0) {
            return (
              <View style={{ flex: 1, backgroundColor: pageBg, padding: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 30 }}>
                  <Pressable onPress={() => setStudyingDeck(null)} style={({pressed}) => [pressed && {opacity: 0.7}]}>
                    <Ionicons name="arrow-back" size={26} color={isDark ? "#ffffff" : "#0d0f14"} />
                  </Pressable>
                </View>
                <View style={{ marginTop: 40, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 28, fontWeight: "bold", color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 20, lineHeight: 36 }}>
                    Congratulations! You have finished this deck for now.
                  </Text>
                  <Text style={{ fontSize: 16, color: isDark ? "#cbd5e1" : "#475569", lineHeight: 26 }}>
                    If you wish to study outside of the regular schedule, you can <Text onPress={() => startStudy(studyingDeck, true)} style={{ color: "#60a5fa", fontWeight: "600", textDecorationLine: "underline" }}>Revise Deck</Text>.
                  </Text>
                </View>
              </View>
            );
          }

          const cardId = studyQueue[0];
          const card = studyingDeck.cards.find((c: any) => c.id === cardId) || studyingDeck.cards[0];
          const isCloze = studyingDeck.cardType === "Cloze";
          const isTypeInAnswer = studyingDeck.cardType === "Basic (type in the answer)";

          let frontText = card.front;
          let backText  = card.back;
          if (isCloze) {
            frontText = card.front.replace(/\{\{c1::(.*?)\}\}/g, "[...]");
            backText  = card.front.replace(/\{\{c1::(.*?)\}\}/g, "$1");
          }

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

          const newCount = studyQueue.filter(id => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition === 0; }).length;
          const learningCount = studyQueue.filter(id => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition > 0 && c.sm2_interval < 2; }).length;
          const reviewCount = studyQueue.filter(id => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition > 0 && c.sm2_interval >= 2; }).length;

          const againVal = calculateSM2(card, "again").sm2_interval;
          const hardVal = calculateSM2(card, "hard").sm2_interval;
          const goodVal = calculateSM2(card, "good").sm2_interval;
          const easyVal = calculateSM2(card, "easy").sm2_interval;

          const formatInt = (i: number, r: string) => {
            if (r === "again") return "<1m";
            if (r === "hard" && card.sm2_repetition === 0) return "<10m";
            return i < 2 ? "1d" : `${Math.floor(i)}d`;
          };

          const currentIndex = Math.min(studyingDeck.cards.length, Math.max(0, studyingDeck.cards.length - studyQueue.length) + 1);

          return (
            <View style={{ flex: 1, backgroundColor: isDark ? "#0d1117" : "#f4f4f8" }}>
              {/* Header */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
                <Pressable onPress={() => setStudyingDeck(null)} style={({pressed}) => [pressed && {opacity: 0.7}]}>
                  <Ionicons name="arrow-back" size={28} color={isDark ? "#ffffff" : "#0d0f14"} />
                </Pressable>
                
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Text style={{ color: "#60a5fa", fontSize: 16, fontWeight: "600" }}>{newCount}</Text>
                  <Text style={{ color: "#ef4444", fontSize: 16, fontWeight: "600" }}>{learningCount}</Text>
                  <Text style={{ color: "#22c55e", fontSize: 16, fontWeight: "600" }}>{reviewCount}</Text>
                </View>

                <View style={{ width: 28 }} />
              </View>
              
              <View style={{ paddingHorizontal: 20, paddingBottom: 16, alignItems: "center" }}>
                <Text style={{ color: isDark ? "#ffffff" : "#0d0f14", fontSize: 18, fontWeight: "500" }}>
                  {studyingDeck.title}
                </Text>
              </View>

              <View style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.2)" }} />

              {/* Card */}
              <View style={{ flex: 1, paddingHorizontal: 28, paddingBottom: 60, paddingTop: 20 }}>
                <Pressable onPress={() => { if (!isTypeInAnswer) flipCard(); }} style={{ width: "100%", height: "100%" }}>
                  {/* FRONT face */}
                  <Animated.View style={[{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 20, alignItems: "center", justifyContent: "center",
                    backgroundColor: isDark ? "#1e293b" : "#ffffff", padding: 24,
                  }, { transform: [{ translateX: swipeX }, { rotateY: frontInterpolate }], opacity: frontOpacity }]}>
                    {renderFormattedText(frontText, { fontSize: 22, fontWeight: "400", textAlign: "center",
                      lineHeight: 32, color: isDark ? "#ffffff" : "#0d0f14" })}
                    {isTypeInAnswer && (
                      <View style={{ width: "100%", marginTop: 28, gap: 12 }}>
                        <TextInput
                          placeholder="Type your answer…"
                          placeholderTextColor={"rgba(255,255,255,0.4)"}
                          style={{ backgroundColor: "rgba(0,0,0,0.1)",
                            borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
                            color: "#ffffff", fontSize: 16, textAlign: "center",
                            borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
                          value={studyTypedAnswer} onChangeText={setStudyTypedAnswer}
                        />
                        <Pressable onPress={() => { setStudyChecked(true); flipCard(); }}
                          style={({ pressed }) => [{ backgroundColor: "#ffffff", borderRadius: 14, height: 48,
                            alignItems: "center", justifyContent: "center" }, pressed && styles.pressedScale]}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: "#000000" }}>Check Answer</Text>
                        </Pressable>
                      </View>
                    )}
                    
                    <Pressable
                      onPress={() => { Speech.stop(); Speech.speak(frontText, { rate: 0.9, pitch: 1.0 }); }}
                      style={({ pressed }) => ({ position: "absolute", bottom: 16, right: 16, opacity: pressed ? 0.6 : 1 })}>
                      <Ionicons name="volume-high-outline" size={22} color="#ffffff" />
                    </Pressable>
                  </Animated.View>

                  {/* BACK face */}
                  <Animated.View style={[{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 20, alignItems: "center", justifyContent: "center",
                    backgroundColor: isDark ? "#1e293b" : "#ffffff", padding: 24,
                  }, { transform: [{ translateX: swipeX }, { rotateY: backInterpolate }], opacity: backOpacity }]}>
                    {renderFormattedText(backText, { fontSize: 22, fontWeight: "400", textAlign: "center",
                      lineHeight: 32, color: isDark ? "#ffffff" : "#0d0f14" })}
                    {isCloze && card.back.trim() ? (
                      <View style={{ width: "100%", marginTop: 20, paddingTop: 16,
                        borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}>
                        <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.4)",
                          fontWeight: "700", letterSpacing: 1, textAlign: "center", marginBottom: 6 }}>EXTRA NOTES</Text>
                        {renderFormattedText(card.back, { fontSize: 14, color: "#e2e8f0", textAlign: "center", lineHeight: 20 })}
                      </View>
                    ) : null}
                    {isTypeInAnswer && studyChecked && (
                      <View style={{ marginTop: 20, alignItems: "center", width: "100%" }}>
                        {studyTypedAnswer.trim().toLowerCase() === card.back.trim().toLowerCase() ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8,
                            backgroundColor: "rgba(34,197,94,0.2)", paddingHorizontal: 18,
                            paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.4)" }}>
                            <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
                            <Text style={{ color: "#4ade80", fontWeight: "700", fontSize: 14 }}>Correct!</Text>
                          </View>
                        ) : (
                          <View style={{ gap: 8, backgroundColor: "rgba(239,68,68,0.2)",
                            paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
                            alignItems: "center", width: "90%", borderWidth: 1, borderColor: "rgba(239,68,68,0.4)" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Ionicons name="close-circle" size={18} color="#f87171" />
                              <Text style={{ color: "#f87171", fontWeight: "700" }}>Incorrect</Text>
                            </View>
                            <Text style={{ fontSize: 13, color: "#f87171", textAlign: "center" }}>
                              Expected: <Text style={{ fontWeight: "700", color: "#ffffff" }}>{card.back}</Text>
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    <Pressable
                      onPress={() => { Speech.stop(); Speech.speak(backText, { rate: 0.9, pitch: 1.0 }); }}
                      style={({ pressed }) => ({ position: "absolute", bottom: 16, right: 16, opacity: pressed ? 0.6 : 1 })}>
                      <Ionicons name="volume-high-outline" size={22} color="#ffffff" />
                    </Pressable>
                  </Animated.View>
                </Pressable>
              </View>

              {/* Bottom Actions */}
              <View style={{ flexDirection: "row", height: 70 }}>
                {!studyFlipped ? (
                  <Pressable
                    onPress={() => { if(!isTypeInAnswer) flipCard(); }}
                    style={({ pressed }) => [{
                      backgroundColor: "#ffffff",
                      borderRadius: 12, height: 56,
                      alignItems: "center", justifyContent: "center", flex: 1, marginHorizontal: 20,
                      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8
                    }, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#000000" }}>Show Answer</Text>
                  </Pressable>
                ) : (
                  customStudyMode ? (
                    <Pressable 
                      onPress={() => handleSM2Rating("good")} 
                      style={({pressed}) => [{ flex: 1, backgroundColor: isDark ? "#ffffff" : "#0d0f14", alignItems: "center", justifyContent: "center", marginHorizontal: 20, borderRadius: 14, marginVertical: 8 }, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={{ color: isDark ? "#000000" : "#ffffff", fontSize: 16, fontWeight: "600" }}>Next</Text>
                    </Pressable>
                  ) : (
                    <>
                      <Pressable onPress={() => handleSM2Rating("again")} style={({pressed}) => [{ flex: 1, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}>
                        <Text style={{ color: "#fca5a5", fontSize: 12, marginBottom: 2 }}>{formatInt(againVal, "again")}</Text>
                        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "600" }}>Again</Text>
                      </Pressable>
                      <Pressable onPress={() => handleSM2Rating("hard")} style={({pressed}) => [{ flex: 1, backgroundColor: "#475569", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}>
                        <Text style={{ color: "#cbd5e1", fontSize: 12, marginBottom: 2 }}>{formatInt(hardVal, "hard")}</Text>
                        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "600" }}>Hard</Text>
                      </Pressable>
                      <Pressable onPress={() => handleSM2Rating("good")} style={({pressed}) => [{ flex: 1, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}>
                        <Text style={{ color: "#86efac", fontSize: 12, marginBottom: 2 }}>{formatInt(goodVal, "good")}</Text>
                        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "600" }}>Good</Text>
                      </Pressable>
                      <Pressable onPress={() => handleSM2Rating("easy")} style={({pressed}) => [{ flex: 1, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}>
                        <Text style={{ color: "#93c5fd", fontSize: 12, marginBottom: 2 }}>{formatInt(easyVal, "easy")}</Text>
                        <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "600" }}>Easy</Text>
                      </Pressable>
                    </>
                  )
                )}
              </View>
            </View>
          );
        }

        const allDecks = flashcardDecks;
        const isDark = settingsDarkMode;

        const openNewDeck = () => {
          setCreationMode("pick");
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
          const bg       = isDark ? "#0f172a" : "#f4f4f8";
          const cardBg   = isDark ? "#1e293b" : "#ffffff";
          const border   = isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)";
          const border2  = isDark ? "#2a1e3a" : "rgba(168,85,247,0.2)";
          const txt      = isDark ? "#ffffff" : "#0d0f14";
          const muted    = isDark ? "#ffffff" : "#666677";

          return (
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Topbar */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 52 }}>
              <View>
                <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>{t('flashcards.library') || "// your library"}</Text>
                <Text style={{ fontSize: 18, fontWeight: "600", color: txt, letterSpacing: -0.3 }}>{t('flashcards.fc_title') || "Flashcards"}</Text>
              </View>
              <Pressable onPress={openNewDeck} style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(168,85,247,0.15)", borderWidth: 1, borderColor: isDark ? "#3a2a4a" : "rgba(168,85,247,0.2)", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="add" size={18} color="#a855f7" />
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: cardBg, borderWidth: 1, borderColor: border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="search" size={16} color={muted} />
              <TextInput 
                placeholder={t('flashcards.search') || "Search decks..."} 
                placeholderTextColor={muted} 
                style={{ flex: 1, fontSize: 13, color: txt, fontWeight: "300", padding: 0 }} 
                value={homeSearch} 
                onChangeText={setHomeSearch} 
              />
            </View>

            {/* Filters */}
            <View style={{ marginTop: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                {[
                  { key: "all", label: t('flashcards.all_decks') || "All Decks" },
                  { key: "due", label: t('flashcards.due') || "Due to Review" },
                  { key: "progress", label: t('flashcards.progress') || "In Progress" },
                  { key: "mastered", label: t('flashcards.mastered') || "Mastered" }
                ].map(c => (
                  <Pressable key={c.key} onPress={() => setFlashcardFilter(c.key as any)}
                    style={({ pressed }) => [{
                      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: flashcardFilter === c.key ? "#8B5CF6" : "transparent",
                      borderWidth: 1, borderColor: flashcardFilter === c.key ? "#8B5CF6" : border,
                      alignSelf: "flex-start",
                    }, pressed && styles.pressedScale]}>
                    <Text style={{ fontSize: 11, letterSpacing: 0.5, color: flashcardFilter === c.key ? "#fff" : muted }}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>


            {/* List Head */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: muted, letterSpacing: 1.2, textTransform: "uppercase" }}>{t('flashcards.your_decks') || "Your decks"}</Text>
              <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: "#a855f7" }}>{allDecks.length} {allDecks.length === 1 ? (t('flashcards.deck_singular') || 'deck') : (t('flashcards.deck_plural') || 'decks')}</Text>
            </View>

            {/* Deck List Grid */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 40, marginTop: 10 }}>
              {(() => {
                if (allDecks.length === 0) {
                  return (
                    <View style={{ width: "100%", alignItems: "center", paddingTop: 60, gap: 12 }}>
                      <Ionicons name="copy-outline" size={36} color={muted} />
                      <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                        {t('flashcards.empty_create') || "Click + to create your first deck"}
                      </Text>
                    </View>
                  );
                }
                const filteredDecks = allDecks.filter((d: any) => {
                  const matchSearch = d.title.toLowerCase().includes(homeSearch.toLowerCase());
                  if (!matchSearch) return false;
                  
                  const cardCount = (d.cards || []).length;
                  const dueCount = (d.cards || []).filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
                  const masteredCount = (d.cards || []).filter((c: any) => c.sm2_repetition > 0).length;
                  const masteryPercent = cardCount === 0 ? 0 : Math.round((masteredCount / cardCount) * 100);

                  if (flashcardFilter === "due") return dueCount > 0;
                  if (flashcardFilter === "progress") return masteryPercent > 0 && masteryPercent < 100;
                  if (flashcardFilter === "mastered") return masteryPercent === 100 && cardCount > 0;
                  return true;
                });
                if (filteredDecks.length === 0) {
                  return (
                    <View style={{ width: "100%", alignItems: "center", paddingTop: 60, gap: 12 }}>
                      <Ionicons name="search-outline" size={36} color={muted} />
                      <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                        {t('flashcards.empty_search') || "No decks match your search"}
                      </Text>
                    </View>
                  );
                }


                return (
                  <>
                    {filteredDecks.map((deck: any) => {
                      const cardCount = (deck.cards || []).length;
                      const dueCount = (deck.cards || []).filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
                      const masteredCount = (deck.cards || []).filter((c: any) => c.sm2_repetition > 0).length;
                      const masteryPercent = cardCount === 0 ? 0 : Math.round((masteredCount / cardCount) * 100);
                      
                      return (
                        <View key={deck.id} style={{ width: "100%", marginBottom: 20 }}>
                          <AnimatedPressable 
                            onPress={() => { startStudy(deck); }}
                            style={{ flexDirection: "row", alignItems: "center", width: "100%" }}
                            scaleTo={0.97}
                          >
                            {/* Left Icon Wrapper */}
                            <View style={{ 
                              width: 52, height: 52, borderRadius: 12, 
                              backgroundColor: isDark ? "#232e42" : "#e0e7ff", 
                              alignItems: "center", justifyContent: "center", marginRight: 16 
                            }}>
                              <Ionicons name="copy-outline" size={24} color={isDark ? "#38bdf8" : "#3b82f6"} style={{ transform: [{ rotate: "-5deg" }] }} />
                            </View>
                            
                            {/* Text Content */}
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 4 }} numberOfLines={1}>
                                {deck.title}
                              </Text>
                              <Text style={{ fontSize: 13, color: isDark ? "#e2e8f0" : "#64748b", fontWeight: "600" }}>
                                {cardCount} {cardCount === 1 ? (t('flashcards.term') || 'term') : (t('flashcards.terms') || 'terms')} • {dueCount} {t('flashcards.due') || 'due'}
                              </Text>
                            </View>

                            {/* Options Button */}
                            <Pressable 
                              onPress={(e) => { e.stopPropagation(); setShowFlashcardOptions(deck); }} 
                              style={({pressed}) => [{ padding: 8, opacity: pressed ? 0.5 : 1 }]}
                            >
                              <Ionicons name="ellipsis-vertical" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
                            </Pressable>
                          </AnimatedPressable>
                        </View>
                      );
                    })}

                  </>
                );
              })()}
            </View>
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

            {/* Tutorial Video — react-native-youtube-iframe handles IFrame API properly */}
            <Text style={[styles.sectionHeading, !settingsDarkMode && styles.lightText]}>Watch Tutorial Video</Text>
            <View style={{ borderRadius: 16, overflow: "hidden", marginBottom: 20, backgroundColor: "#000" }}>
              <YoutubeIframe
                videoId="jLiU-vW5EuA"
                height={220}
                play={false}
                webViewStyle={{ backgroundColor: "#000" }}
                initialPlayerParams={{
                  modestbranding: true,
                  rel: false,
                  controls: true,
                }}
                onError={() => Linking.openURL("https://youtu.be/jLiU-vW5EuA")}
              />
            </View>

            {/* Format Instructions */}
            <Text style={[styles.sectionHeading, !settingsDarkMode && styles.lightText]}>Step 1: Format Your Text File (.qst)</Text>
            <View style={[styles.guideStepCard, !settingsDarkMode && styles.lightCard]}>
              <Text style={[styles.guideStepText, !settingsDarkMode && styles.lightTextSub]}>
                Scorr reads custom quizzes written in a simple text format. Create a plain text file ending in <Text style={{ color: "#00e5a0", fontWeight: "bold" }}>.qst</Text> and follow this layout:
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
          const bg      = isDark ? "#0f172a" : "#f4f4f8";
          const cardBg  = isDark ? "#1e293b" : "#ffffff";
          const border  = isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)";
          const muted   = isDark ? "#ffffff" : "#666677";
          const txt     = isDark ? "#ffffff" : "#0d0f14";

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
                <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: "600", color: txt, letterSpacing: -0.3 }}>
                    Profile
                  </Text>
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
                    <Text style={{ fontSize: 11, color: "#ffffff", marginTop: 3, fontWeight: "300" }} numberOfLines={1}>
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
                    <Pressable onPress={openAuthScreen}
                      style={({ pressed }) => [{ backgroundColor: "#6366f1", borderRadius: 10,
                        paddingHorizontal: 14, paddingVertical: 8 }, pressed && styles.pressedScale]}>
                      <Text style={{ fontSize: 11, fontWeight: "500", color: "#fff" }}>Sign in</Text>
                    </Pressable>
                  )}
                </View>

                {/* ── Preferences ── */}
                <Text style={{ fontSize: 10, color: muted, letterSpacing: 1.2, textTransform: "uppercase",
                  paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>{t('profile.preferences') || 'Preferences'}</Text>

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
                      <Text style={{ fontSize: 13, fontWeight: "500", color: txt }}>{t('profile.dark_mode') || 'Dark mode'}</Text>
                      <Text style={{ fontSize: 11, color: muted, marginTop: 2, fontWeight: "300" }}>
                        {settingsDarkMode ? (t('profile.enabled') || 'Currently enabled') : (t('profile.disabled') || 'Currently disabled')}
                      </Text>
                    </View>
                    <ToggleSwitch checked={settingsDarkMode} onChange={setSettingsDarkMode} darkMode={isDark} />
                  </Pressable>

                  {/* Language selector */}
                  <Pressable
                    onPress={() => setShowLanguageModal(true)}
                    style={({ pressed }) => [{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                      borderRadius: 14, padding: 14, paddingHorizontal: 16,
                      flexDirection: "row", alignItems: "center", gap: 12 }, pressed && styles.pressedScale]}>
                    <View style={{ width: 32, height: 32, borderRadius: 10,
                      backgroundColor: "rgba(99,102,241,0.1)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="language-outline" size={16} color="#6366f1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: txt }}>{t('profile.language') || 'Language'}</Text>
                      <Text style={{ fontSize: 11, color: muted, marginTop: 2, fontWeight: "300" }}>
                        {i18n.language === 'en' ? 'English' : 
                         i18n.language === 'es' ? 'Spanish' : 
                         i18n.language === 'fr' ? 'French' : 
                         i18n.language === 'hi' ? 'Hindi' : 
                         i18n.language === 'ru' ? 'Russian' : 
                         i18n.language === 'kk' ? 'Kazakh' : 'System language'}
                      </Text>
                    </View>
                    <Chevron />
                  </Pressable>
                </View>

                {/* ── Support ── */}
                <Text style={{ fontSize: 10, color: muted, letterSpacing: 1.2, textTransform: "uppercase",
                  paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>{t('profile.support') || 'Support'}</Text>

                <View style={{ paddingHorizontal: 20, gap: 6 }}>
                  <Row icon="book-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title={t('profile.guide') || "How to format quiz (.txt, .docx)"} sub={t('profile.guide_sub') || "Formatting guide"}
                    onPress={() => setActiveTab("guide")} right={<Chevron />} />
                  <Row icon="chatbubble-ellipses-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title={t('profile.feedback') || "Feedback"} sub={t('profile.feedback_sub') || "Help improve Scorr"}
                    onPress={() => setShowFeedbackPage(true)} right={<Chevron />} />
                </View>

                {/* ── About ── */}
                <Text style={{ fontSize: 10, color: muted, letterSpacing: 1.2, textTransform: "uppercase",
                  paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>{t('profile.about') || 'About'}</Text>

                <View style={{ paddingHorizontal: 20, gap: 6 }}>
                  <Row icon="lock-closed-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title={"Privacy policy"} 
                    onPress={() => setShowPrivacyPolicy(true)} right={<Chevron />} />
                  <Row icon="document-text-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title={"Terms of service"} 
                    onPress={() => setShowTermsOfService(true)} right={<Chevron />} />
                </View>

                {/* ── Danger zone ── */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 6 }}>
                  {firebaseUser && (
                    <Pressable
                      onPress={async () => {
                        setSignOutLoading(true);
                        await new Promise(r => setTimeout(r, 800));
                        
                        // Clear local quizzes state and storage to prevent cross-account merges
                        setQuizzes([]);
                        quizzesRef.current = [];
                        await AsyncStorage.removeItem("quizforge_quizzes_global");
                        await AsyncStorage.removeItem("quizforge_starred_global");
                        
                        await signOutUser();
                        setSignOutLoading(false);
                        setActiveTab("home");
                      }}
                      disabled={signOutLoading}
                      style={({ pressed }) => [{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                        borderRadius: 14, padding: 14, paddingHorizontal: 16,
                        flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }, pressed && styles.pressedScale]}>
                      <View style={{ width: 32, height: 32, borderRadius: 10,
                        backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="log-out-outline" size={16} color={txt} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: txt }}>Logout</Text>
                      </View>
                    </Pressable>
                  )}

                  {firebaseUser && (
                    <Pressable
                      onPress={() => setShowDeleteAccountConfirm(true)}
                      style={({ pressed }) => [{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                        borderRadius: 14, padding: 14, paddingHorizontal: 16,
                        flexDirection: "row", alignItems: "center", gap: 12 }, pressed && styles.pressedScale]}>
                      <View style={{ width: 32, height: 32, borderRadius: 10,
                        backgroundColor: "rgba(226,75,74,0.1)", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="trash-bin-outline" size={16} color="#e24b4a" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: "#e24b4a" }}>Delete account</Text>
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
          const bg       = isDark ? "#0f172a" : "#f4f4f8";
          const cardBg   = isDark ? "#1e293b" : "#ffffff";
          const border   = isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)";
          const muted    = isDark ? "#ffffff" : "#666677";
          const txt      = isDark ? "#ffffff" : "#0d0f14";

          const totalQuestionsInAllQuizzes = quizzes.reduce((acc: number, q: any) => acc + (q.questions || 1), 0);
          const totalCorrectInAllQuizzes = quizzes.reduce((acc: number, q: any) => acc + (q.uniqueCorrectIds || []).length, 0);
          const overallProgressPct = totalQuestionsInAllQuizzes > 0 
            ? Math.min(Number(((totalCorrectInAllQuizzes / totalQuestionsInAllQuizzes) * 100).toFixed(1)), 100) 
            : 0;

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

          if (!sampleDismissed) {
            const attempts = sampleQuiz.attempts || [];
            const uniqueCount = (sampleQuiz.uniqueCorrectIds || []).length;
            const qCount = sampleQuiz.questions || 1;
            const isCompleted = uniqueCount >= qCount;
            let showSample = true;
            if (homeSearch && !sampleQuiz.title.toLowerCase().includes(homeSearch.toLowerCase())) showSample = false;
            if (homeFilter === "progress" && (attempts.length === 0 || isCompleted)) showSample = false;
            if (homeFilter === "notstarted" && attempts.length > 0) showSample = false;
            if (homeFilter === "done" && (!isCompleted || attempts.length === 0)) showSample = false;
            if (showSample) {
              filtered.unshift(sampleQuiz);
            }
          }

          let combinedQuizzes = (!sampleDismissed && sampleQuiz) ? [sampleQuiz, ...quizzes] : quizzes;
          
          // Apply search filter before counting
          if (homeSearch) {
            const lowerSearch = homeSearch.toLowerCase();
            combinedQuizzes = combinedQuizzes.filter(q => q.title.toLowerCase().includes(lowerSearch));
          }

          const allCount = combinedQuizzes.length;
          let progressCount = 0;
          let notStartedCount = 0;
          let doneCount = 0;

          combinedQuizzes.forEach(q => {
            const attempts = q.attempts || [];
            const uniqueCount = (q.uniqueCorrectIds || []).length;
            const qCount = q.questions || 1;
            const isCompleted = uniqueCount >= qCount;
            
            if (attempts.length === 0) notStartedCount++;
            else if (isCompleted && attempts.length > 0) doneCount++;
            else progressCount++;
          });

          const chips: { key: "all"|"progress"|"notstarted"|"done"; label: string; count: number }[] = [
            { key: "all",        label: t('home.filter_all') || "All", count: allCount },
            { key: "progress",   label: t('home.filter_progress') || "In progress", count: progressCount },
            { key: "notstarted", label: t('home.filter_notstarted') || "Not started", count: notStartedCount },
            { key: "done",       label: t('home.filter_completed') || "Completed", count: doneCount },
          ];

          return (
            <View style={{ flex: 1, backgroundColor: bg }}>
              {/* ── Search & Profile ── */}
              <View style={{ marginHorizontal: 20, marginTop: 24, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 20 }}>
                {/* Search */}
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", 
                  borderRadius: 16,
                  paddingHorizontal: 12, paddingVertical: 6 }}>
                  <Ionicons name="search-outline" size={18} color={muted} />
                  <TextInput
                    placeholder="Search"
                    placeholderTextColor={muted}
                    value={homeSearch}
                    onChangeText={setHomeSearch}
                    style={{ flex: 1, fontSize: 15, color: txt, fontWeight: "400" }}
                  />
                  {homeSearch.length > 0 && (
                    <Pressable onPress={() => setHomeSearch("")}>
                      <Ionicons name="close-circle" size={18} color={muted} />
                    </Pressable>
                  )}
                </View>
                
                {/* Profile */}
                <Pressable
                  onPress={() => setActiveTab("menu")}
                  style={({ pressed }) => [{ width: 48, height: 48, borderRadius: 24,
                    backgroundColor: "rgba(99,102,241,0.12)",
                    borderWidth: 1, borderColor: isDark ? "#2a2a4a" : "rgba(99,102,241,0.2)",
                    alignItems: "center", justifyContent: "center", overflow: "hidden" },
                    pressed && styles.pressedScale]}
                >
                  {firebaseUser?.photoURL ? (
                    <Image source={{ uri: firebaseUser.photoURL }}
                      style={{ width: 48, height: 48, borderRadius: 24 }} />
                  ) : firebaseUser ? (
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#6366f1" }}>
                      {getUserInitial(firebaseUser)}
                    </Text>
                  ) : (
                    <Ionicons name="person-outline" size={24} color="#6366f1" />
                  )}
                </Pressable>
              </View>

              {/* ── Filter chips ── */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0, flexShrink: 0, marginBottom: 16 }}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 14, alignItems: "center" }}
              >
                {chips.map(c => {
                  const isActive = homeFilter === c.key;
                  return (
                    <Pressable key={c.key} onPress={() => setHomeFilter(c.key)}
                      style={({ pressed }) => [{
                        flexDirection: "row", alignItems: "center", gap: 4,
                        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                        backgroundColor: isActive ? "#8b8ff0" : "transparent",
                        borderWidth: 1, borderColor: isActive ? "#8b8ff0" : border,
                        alignSelf: "flex-start",
                      }, pressed && styles.pressedScale]}>
                      <Text style={{ fontSize: 11, letterSpacing: 0.5, fontWeight: isActive ? "500" : "400",
                        color: isActive ? "#1a1640" : muted }}>
                        {c.label}
                      </Text>
                      <View style={{
                        paddingHorizontal: isActive ? 7 : 4, paddingVertical: 1, borderRadius: 10,
                        backgroundColor: isActive ? "rgba(26,22,64,0.25)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)")
                      }}>
                        <Text style={{ fontSize: isActive ? 11 : 9, fontWeight: isActive ? "500" : "700", color: isActive ? "#1a1640" : muted }}>
                          {c.count}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>


              {/* ── Quiz list ── */}
              <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 12, paddingTop: 4, paddingBottom: 120 }}>
                {!dataLoaded ? (
                  // ── Skeleton cards while AsyncStorage / Firebase loads ──
                  [0, 1, 2].map((i) => (
                    <View key={i} style={{
                      backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                      borderRadius: 18, overflow: "hidden", padding: 18, paddingLeft: 20, gap: 10,
                      opacity: 1 - i * 0.2,
                    }}>
                      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: isDark ? "#2a2a4a" : "#e0e0f0" }} />
                      <View style={{ height: 14, width: "60%", borderRadius: 7, backgroundColor: isDark ? "#1e293b" : "#ebebf0" }} />
                      <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                        <View style={{ height: 10, width: 60, borderRadius: 5, backgroundColor: isDark ? "#1e293b" : "#ebebf0" }} />
                        <View style={{ height: 10, width: 50, borderRadius: 5, backgroundColor: isDark ? "#1e293b" : "#ebebf0" }} />
                        <View style={{ height: 10, width: 55, borderRadius: 5, backgroundColor: isDark ? "#1e293b" : "#ebebf0" }} />
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 12 }}>
                        <View style={{ height: 10, width: 28, borderRadius: 5, backgroundColor: isDark ? "#1e293b" : "#ebebf0" }} />
                        <View style={{ flex: 1, height: 2, borderRadius: 2, backgroundColor: isDark ? "#1e293b" : "#ebebf0" }} />
                      </View>
                    </View>
                  ))
                ) : (
                  <>
                    {filtered.map((quiz) => {
                      const attempts = quiz.attempts || [];
                      const uniqueCount = (quiz.uniqueCorrectIds || []).length;
                      const qCount = quiz.questions || 1;
                      const completionPct = attempts.length > 0 ? Math.min(Math.round((uniqueCount / qCount) * 100), 100) : null;
                      const multiplier = quiz.multiplier;

                      let cardColor = "#5b6080";
                      if (completionPct !== null) {
                        if (completionPct >= 75) cardColor = "#2dd4a7";
                        else if (completionPct >= 25) cardColor = "#8b8ff0";
                        else cardColor = "#f0a13c";
                      }

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
                          <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: cardColor }} />
                          
                          <View style={{ padding: 18, paddingLeft: 20 }}>
                            {/* Title row */}
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <Text style={{ fontSize: 15, fontWeight: "500", color: txt, letterSpacing: -0.2, flex: 1 }}
                                numberOfLines={1}>
                                {quiz.title}
                              </Text>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                {quiz.isSample && (
                                  <View style={{ backgroundColor: isDark ? "rgba(139,143,240,0.18)" : "rgba(99,102,241,0.1)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 10, fontWeight: "700", color: isDark ? "#a5a8f5" : "#6366f1", letterSpacing: 0.5 }}>SAMPLE</Text>
                                  </View>
                                )}
                                <Feather name="chevron-right" size={16} color={muted} style={{ marginTop: 2 }} />
                              </View>
                            </View>

                            {/* Meta tags */}
                            <View style={{ flexDirection: "row", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Ionicons name="help-circle-outline" size={14} color={muted} />
                                <Text style={{ fontSize: 12, color: muted }}>{quiz.questions} {t('actions.questions') || "questions"}</Text>
                              </View>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Ionicons name="refresh-outline" size={14} color={muted} />
                                <Text style={{ fontSize: 12, color: muted }}>{attempts.length} {t('actions.attempts') || "attempts"}</Text>
                              </View>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Ionicons name="checkmark-circle-outline" size={14} color={muted} />
                                <Text style={{ fontSize: 12, color: muted }}>{uniqueCount} correct</Text>
                              </View>
                              {multiplier && multiplier > 1 && (
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                  <Ionicons name="flash-outline" size={14} color={muted} />
                                  <Text style={{ fontSize: 12, color: muted }}>{multiplier}× streak</Text>
                                </View>
                              )}
                            </View>

                            {/* Bottom: score + bar */}
                            <View style={{ flexDirection: "row", alignItems: "center",
                              marginTop: 14, paddingTop: 4 }}>
                              <Text style={{ fontSize: 12, color: completionPct !== null ? cardColor : "#5b6080", minWidth: 30, fontWeight: completionPct !== null ? "500" : "400" }}>
                                {completionPct !== null ? `${completionPct}%` : "Not started"}
                              </Text>
                              <View style={{ flex: 1, height: 5, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
                                borderRadius: 3, marginLeft: 8 }}>
                                {completionPct !== null && (
                                  <View style={{ height: "100%", borderRadius: 3, width: `${completionPct}%` as any,
                                    backgroundColor: cardColor }} />
                                )}
                              </View>
                            </View>
                          </View>
                        </AnimatedPressable>
                      );
                    })}

                    {quizzes.length === 0 && !homeSearch && (
                      <View style={{ alignItems: "center", paddingTop: 48, paddingHorizontal: 24, gap: 10 }}>
                        <Ionicons name="document-text-outline" size={32} color={muted} style={{ opacity: 0.5 }} />
                        <Text style={{ fontSize: 13, color: muted, textAlign: "center", lineHeight: 19, opacity: 0.8 }}>
                          {"Create a .txt, .docx or .pdf file → tap + to import → start practicing"}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                          <Pressable onPress={() => setActiveTab("guide")} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                            <Text style={{ fontSize: 13, color: "#6366f1", fontWeight: "600" }}>Watch tutorial</Text>
                          </Pressable>
                          <Text style={{ fontSize: 13, color: muted, opacity: 0.4 }}>·</Text>
                          <Pressable onPress={() => setShowAddMenu(true)} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                            <Text style={{ fontSize: 13, color: "#6366f1", fontWeight: "600" }}>Import file</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {filtered.length === 0 && homeSearch ? (
                      <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
                        <Ionicons name="search-outline" size={36} color={muted} />
                        <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                          {t('home.empty_search') || "No quizzes match your search"}
                        </Text>
                      </View>
                    ) : null}

                    {filtered.length === 0 && !homeSearch && quizzes.length > 0 && (
                      <View style={{ alignItems: "center", paddingTop: 60, gap: 12 }}>
                        <Ionicons name="document-text-outline" size={36} color={muted} />
                        <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                          {t('home.empty_active') || "No active quizzes"}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>

              {/* Floating Action Button for Create Quiz */}
              <AnimatedPressable
                onPress={() => setShowAddMenu(true)}
                style={{
                  position: "absolute", right: 24, bottom: 24,
                  width: 56, height: 56, borderRadius: 28,
                  backgroundColor: "#8b8ff0",
                  alignItems: "center", justifyContent: "center",
                  shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.35, shadowRadius: 16, elevation: 12,
                }}
                scaleTo={0.9}
              >
                <Feather name="plus" size={28} color="#ffffff" />
              </AnimatedPressable>

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

  const openAuthScreen = () => {
    setAuthView("landing");
    authViewAnim.setValue(0);
    setAuthError(null);
    setShowAuthScreen(true);
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

  const handleResetPassword = async () => {
    if (!authEmail.trim()) {
      setAuthError("Please enter your email address to reset password.");
      return;
    }
    setAuthError(null);
    setAuthLoading(true);
    const { error } = await resetPassword(authEmail.trim());
    setAuthLoading(false);
    if (error) {
      setAuthError(error);
    } else {
      Alert.alert("Check your email", "A password reset link has been sent to " + authEmail);
    }
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

            {authMode === "signin" && (
              <Pressable onPress={handleResetPassword} style={{ alignSelf: "flex-end", marginTop: -4, marginBottom: 12, marginRight: 4 }}>
                <Text style={{ color: "#6366f1", fontSize: 13, fontWeight: "600" }}>Forgot Password?</Text>
              </Pressable>
            )}

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


  const SWIPE_TABS = ["home", "battle", "dashboard", "menu"];
  const swipeScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (SWIPE_TABS.includes(activeTab) && swipeScrollRef.current) {
      const idx = SWIPE_TABS.indexOf(activeTab);
      swipeScrollRef.current.scrollTo({ x: idx * Dimensions.get("window").width, animated: false });
    }
  }, [activeTab]);

  if (showAuthScreen) {
    return (
      <SafeAreaView style={[styles.landingSafeArea]} edges={["top", "left", "right", "bottom"]}>
        <KeyboardWrapper
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderAuthScreen()}
          </ScrollView>
        </KeyboardWrapper>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
    <SafeAreaView style={[styles.rootContainer, !settingsDarkMode && styles.lightRootContainer]} edges={["top", "left", "right"]}>
      {activeSession ? (
        renderActiveSessionView()
      ) : (
        <>
          {/* Dynamic Screen Area */}
          <View style={styles.screenContainer}>
            {SWIPE_TABS.includes(activeTab) ? (
              <ScrollView
                ref={swipeScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                contentOffset={{ x: SWIPE_TABS.includes(activeTab) ? SWIPE_TABS.indexOf(activeTab) * Dimensions.get("window").width : 0, y: 0 }}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                  const screenWidth = Dimensions.get("window").width;
                  const pageIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
                  const newTab = SWIPE_TABS[pageIndex];
                  if (newTab && newTab !== activeTab) {
                    setActiveTab(newTab as any);
                  }
                }}
              >
                {SWIPE_TABS.map((tab) => (
                  <View key={tab} style={{ width: Dimensions.get("window").width }}>
                    {renderContent(tab)}
                  </View>
                ))}
              </ScrollView>
            ) : (
              renderContent()
            )}
          </View>

          {/* Bottom Tab Bar — Quizlet-style (hidden during focused editing and study sessions to maximize screen real estate and prevent keyboard overlaps) */}
          {!( (activeTab === "add" && creationMode !== "pick") ) && (() => {
            const effectiveTab = activeTab === "insights" ? viewingInsightsQuizFromTab : activeTab;
            return (
            <View style={[
              styles.bottomTabBar,
              !settingsDarkMode && styles.lightTabBar,
              {
                paddingBottom: Math.max(insets.bottom, 16)
              }
            ]}>

              {/* Home */}
              <AnimatedPressable onPress={() => setActiveTab("home")} style={styles.tabItem} scaleTo={0.88}>
                <IconHome size={24}
                  color={effectiveTab === "home" ? "#818cf8" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"} />
                <Text style={[styles.tabLabel, effectiveTab === "home" && styles.tabLabelActive, { color: effectiveTab === "home" ? "#818cf8" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)" }]}>{t('tabs.home')}</Text>
              </AnimatedPressable>


              {/* Centre Battle */}
              <AnimatedPressable
                onPress={() => setActiveTab("battle")}
                style={styles.tabItem}
                scaleTo={0.88}
              >
                <IconSwords size={24} color={effectiveTab === "battle" ? "#818cf8" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"} />
                <Text style={[styles.tabLabel, effectiveTab === "battle" && styles.tabLabelActive, { color: effectiveTab === "battle" ? "#818cf8" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)" }]}>Battle</Text>
              </AnimatedPressable>

              {/* Statistics */}
              <AnimatedPressable onPress={() => setActiveTab("dashboard")} style={styles.tabItem} scaleTo={0.88}>
                <CustomChartIcon size={24}
                  color={effectiveTab === "dashboard" ? "#818cf8" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"} />
                <Text style={[styles.tabLabel, effectiveTab === "dashboard" && styles.tabLabelActive, { color: effectiveTab === "dashboard" ? "#818cf8" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)" }]}>{t('tabs.statistics')}</Text>
              </AnimatedPressable>

              {/* Profile (replaces menu) */}
              <AnimatedPressable onPress={() => setActiveTab("menu")} style={styles.tabItem} scaleTo={0.88}>
                <IconUser size={24}
                  color={effectiveTab === "menu" ? "#818cf8" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"} />
                <Text style={[styles.tabLabel, effectiveTab === "menu" && styles.tabLabelActive, { color: effectiveTab === "menu" ? "#818cf8" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)" }]}>{t('tabs.profile')}</Text>
              </AnimatedPressable>

            </View>
            );
          })()}

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
                {showQuizActions?.questions} {t('actions.questions') || "Questions"}
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
                color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('actions.start_test') || "Start Test"}</Text>
            </AnimatedPressable>

            <View style={{ height: 0.5, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", marginHorizontal: 24 }} />

            {/* View (PDF Mode) */}
            <AnimatedPressable
              onPress={() => {
                const quiz = showQuizActions;
                setPdfViewQuiz(quiz);
                setShowQuizActions(null);
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 17, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="eye-outline" size={22} color={settingsDarkMode ? "#ffffff" : "#0d0f14"} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1,
                color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>View</Text>
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
                color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('actions.statistics') || "Statistics"}</Text>
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
                color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('actions.rename') || "Rename"}</Text>
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
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1, color: "#ef4444" }}>{t('actions.delete') || "Delete"}</Text>
            </AnimatedPressable>
          </View>
        </Pressable>
      </Modal>

      {/* Rename Quiz Modal */}
      <Modal
        visible={renamingQuiz !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => handleModalCloseRequest(() => setRenamingQuiz(null))}
      >
        <KeyboardWrapper
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                      // Sync rename to Neon if logged in
                      const neonId = renamingQuiz.neonId ?? renamingQuiz.id;
                      if (firebaseUser && neonId && !String(neonId).startsWith("local_")) {
                        updateMobileQuiz({
                          userId: firebaseUser.uid,
                          quizId: neonId,
                          title: renameTitle.trim()
                        }).catch(err => console.warn("[NeonSync] quiz rename failed:", err));
                      }
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
        </KeyboardWrapper>
      </Modal>

      {/* Importing Loading Overlay */}
      <Modal visible={isImporting} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#1a1b2e', borderRadius: 20, padding: 32, alignItems: 'center', gap: 16, minWidth: 200 }}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>Importing Quiz...</Text>
            <Text style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>Parsing your questions</Text>
          </View>
        </View>
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
                    if (deletingQuizConfirm.id === "sample_quiz") {
                      setSampleDismissed(true);
                      AsyncStorage.setItem("quizforge_sample_dismissed", "1");
                      setDeletingQuizConfirm(null);
                      return;
                    }

                    setQuizzes(quizzes.filter(q => q.id !== deletingQuizConfirm.id));
                    setDeletingQuizConfirm(null);
                    // Delete from Neon if logged in and quiz is synced
                    const neonId = deletingQuizConfirm.neonId ?? deletingQuizConfirm.id;
                    if (firebaseUser && neonId && !String(neonId).startsWith("local_")) {
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
                  // Sync all resets to Neon
                  if (firebaseUser) {
                    quizzes.forEach(q => {
                      const neonId = q.neonId ?? q.id;
                      if (neonId && !String(neonId).startsWith("local_")) {
                        updateMobileQuiz({
                          userId: firebaseUser.uid,
                          quizId: neonId,
                          attempts: [],
                          wrongQuestions: [],
                          uniqueCorrectIds: []
                        }).catch(err => console.warn("[NeonSync] quiz reset failed:", err));
                      }
                    });
                  }
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

      {/* ── Delete Account Confirm ── */}
      <Modal visible={showDeleteAccountConfirm} animationType="fade" transparent onRequestClose={() => setShowDeleteAccountConfirm(false)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => setShowDeleteAccountConfirm(false)}>
          <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Ionicons name="warning-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.dialogTitle, !settingsDarkMode && styles.lightText, { color: "#ef4444" }]}>Delete Account</Text>
            <Text style={[styles.dialogDescription, !settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 20, lineHeight: 20 }]}>
              Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setShowDeleteAccountConfirm(false)}
                disabled={deleteAccountLoading}
                style={({ pressed }) => [styles.dialogCancel, !settingsDarkMode && { borderColor: "rgba(0,0,0,0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !settingsDarkMode && styles.lightText]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (firebaseUser) {
                    setDeleteAccountLoading(true);
                    try {
                      await deleteUserFromNeon(firebaseUser.uid);
                      await deleteAccount();
                      setShowDeleteAccountConfirm(false);
                      setActiveTab("home");
                    } catch (e) {
                      console.warn("Failed to delete account", e);
                      alert("Please re-authenticate and try again. For security, you must have signed in recently to delete your account.");
                      setShowDeleteAccountConfirm(false);
                    } finally {
                      setDeleteAccountLoading(false);
                    }
                  }
                }}
                disabled={deleteAccountLoading}
                style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#ef4444", shadowColor: "#ef4444" }, pressed && styles.pressedScale]}
              >
                {deleteAccountLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Delete</Text>
                )}
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

      {/* ── Restart Quiz Confirm — in-app modal ── */}
      <Modal visible={showRestartConfirm} animationType="fade" transparent onRequestClose={() => setShowRestartConfirm(false)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => setShowRestartConfirm(false)}>
          <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal, { paddingBottom: 24 }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(99,102,241,0.12)" }]}>
              <Ionicons name="refresh" size={30} color="#6366f1" />
            </View>
            <Text style={[styles.dialogTitle, !settingsDarkMode && styles.lightText]}>Restart Quiz?</Text>
            <Text style={[styles.dialogDescription, !settingsDarkMode && styles.lightTextSub, { textAlign: "center", lineHeight: 20, marginBottom: 24 }]}>
              This will erase all your current answers and let you start over.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => setShowRestartConfirm(false)}
                style={({ pressed }) => [styles.dialogCancel, !settingsDarkMode && { borderColor: "rgba(0,0,0,0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !settingsDarkMode && styles.lightText]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { 
                  setShowRestartConfirm(false); 
                  setActiveSession({
                    ...activeSession,
                    answers: {},
                    submitted: [],
                    currentIndex: 0,
                    isFinished: false,
                    startedAt: Date.now()
                  });
                  quizFlatListRef.current?.scrollToIndex({ index: 0, animated: false });
                  quizNumbersScrollRef.current?.scrollTo({ x: 0, animated: false });
                }}
                style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#6366f1" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Restart</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ── Attempt Actions Modal (Sleek Bottom Sheet) ── */}
      <Modal visible={!!selectedAttemptForModal} animationType="slide" transparent onRequestClose={() => setSelectedAttemptForModal(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setSelectedAttemptForModal(null)}>
          {selectedAttemptForModal && (
            <View style={{ backgroundColor: settingsDarkMode ? "#16162a" : "#ffffff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }} onStartShouldSetResponder={() => true}>
              {/* Drag Handle */}
              <View style={{ width: 40, height: 4, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)", borderRadius: 2, alignSelf: "center", marginBottom: 24 }} />
              
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14", letterSpacing: -0.5 }}>
                    Attempt #{selectedAttemptForModal.attemptNum}
                  </Text>
                  <Text style={{ fontSize: 13, color: settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 6 }}>
                    Score: {selectedAttemptForModal.attempt.score}% • {selectedAttemptForModal.attempt.correct} correct
                  </Text>
                </View>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="bar-chart" size={24} color="#6366f1" />
                </View>
              </View>
              
              <View style={{ gap: 12, width: "100%" }}>
                {/* Re-attempt Incorrect Action */}
                {(selectedAttemptForModal.attempt.wrongQuestionIds || []).length > 0 && (
                  <Pressable
                    onPress={() => {
                      const quiz = selectedAttemptForModal.quizId === "sample_quiz" ? sampleQuiz : quizzes.find(q => q.id === selectedAttemptForModal.quizId);
                      if (quiz) {
                        let qsList = quiz.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (quiz.questionsList && quiz.questionsList.length > 0 ? [...quiz.questionsList] : []);
                        if (qsList.length === 0) {
                          qsList = generateMockQuestionsForQuiz(quiz.title, quiz.questions);
                        }
                        const wrongIds = selectedAttemptForModal.attempt.wrongQuestionIds;
                        const filteredList = qsList.filter(q => wrongIds.includes(q.id));
                        if (filteredList.length > 0) {
                          setActiveSession({
                            quizId: quiz.id,
                            quizTitle: quiz.title,
                            questions: filteredList,
                            selectionMode: "wrong",
                            shuffleQuestions: false,
                            shuffleAnswers: false,
                            showAnswerOnSubmit: true,
                            timePerQuestion: null,
                            currentIndex: 0,
                            answers: {},
                            submitted: [] as string[],
                            isFinished: false,
                            startedAt: Date.now(),
                            targetAttemptId: selectedAttemptForModal.attempt.id,
                            retryOfAttemptNum: selectedAttemptForModal.attemptNum
                          });
                          setSelectedAttemptForModal(null);
                        }
                      }
                    }}
                    style={({ pressed }) => [
                      { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 20, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.03)" : "#f8fafc", borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e2e8f0" },
                      pressed && { opacity: 0.7, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "#f1f5f9" }
                    ]}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(245, 158, 11, 0.12)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                      <Ionicons name="refresh" size={20} color="#f59e0b" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#0f172a" }}>{t('profile.re_attempt_wrong') || "Re-attempt Incorrect"}</Text>
                      <Text style={{ fontSize: 12, color: settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>{selectedAttemptForModal.attempt.wrongQuestionIds.length} {t('profile.missed_questions') || "missed questions"}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={settingsDarkMode ? "#6e727a" : "#94a3b8"} />
                  </Pressable>
                )}

                {/* Delete Attempt Action */}
                <Pressable
                  onPress={() => {
                    handleDeleteAttemptOnMobile(selectedAttemptForModal.quizId, selectedAttemptForModal.attempt.id);
                    setSelectedAttemptForModal(null);
                  }}
                  style={({ pressed }) => [
                    { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 20, backgroundColor: settingsDarkMode ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.05)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.15)", marginTop: 12 },
                    pressed && { opacity: 0.7, backgroundColor: "rgba(239, 68, 68, 0.1)" }
                  ]}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(239, 68, 68, 0.12)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                    <Feather name="trash-2" size={18} color="#ef4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#ef4444" }}>{t('profile.delete_attempt') || "Delete Attempt"}</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Modal>

      {/* ── Feedback — full-screen slide-up page ── */}
      <Modal visible={showFeedbackPage} animationType="slide" transparent={false} onRequestClose={() => handleModalCloseRequest(() => setShowFeedbackPage(false))}>
        <KeyboardWrapper
          style={{ flex: 1, backgroundColor: settingsDarkMode ? "#000000" : "#f4f4f8" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
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

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{
              borderRadius: 24, padding: 24, marginBottom: 20,
              backgroundColor: settingsDarkMode ? "#121212" : "#ffffff",
              borderWidth: 1, borderColor: settingsDarkMode ? "#222222" : "#e5e5ea",
            }}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(59,130,246,0.12)",
                alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color="#3b82f6" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: settingsDarkMode ? "#fff" : "#0d0f14", marginBottom: 6, letterSpacing: -0.3 }}>
                {t('profile.feedback_title') || "Share your thoughts"}
              </Text>
              <Text style={{ fontSize: 14, color: settingsDarkMode ? "#8888aa" : "#666677", lineHeight: 20 }}>
                {t('profile.feedback_desc') || "Found a bug? Have a suggestion? Want a new feature? We're all ears."}
              </Text>
            </View>

            {/* Text area */}
            <TextInput
              multiline
              placeholder={t('profile.feedback_placeholder') || "Tell us what you think…"}
              placeholderTextColor={settingsDarkMode ? "#555555" : "#c0c0d0"}
              style={{
                backgroundColor: settingsDarkMode ? "#121212" : "#ffffff",
                borderRadius: 18, padding: 18,
                color: settingsDarkMode ? "#fff" : "#0d0f14", fontSize: 15,
                minHeight: 180, textAlignVertical: "top",
                borderWidth: 1, borderColor: settingsDarkMode ? "#222222" : "#e5e5ea",
                marginBottom: 20,
              }}
              value={feedbackText}
              onChangeText={setFeedbackText}
            />

            <Pressable
              onPress={async () => { 
                if (feedbackText.trim().length === 0) {
                  Alert.alert("Empty Feedback", "Please write something before sending.");
                  return;
                }
                setFeedbackLoading(true);
                const { ok, error } = await sendFeedback({
                  userId: firebaseUser?.uid,
                  userEmail: firebaseUser?.email || undefined,
                  message: feedbackText
                });
                setFeedbackLoading(false);
                if (ok) {
                  Alert.alert("Thank You!", "Your feedback has been sent directly to the developer.");
                  setShowFeedbackPage(false); 
                  setFeedbackText("");
                } else {
                  console.warn("Failed to send feedback", error);
                  Alert.alert("Error", "Could not send feedback. Please try again later.");
                }
              }}
              disabled={feedbackLoading}
              style={({ pressed }) => [{
                height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center",
                backgroundColor: feedbackLoading ? "#60a5fa" : "#3b82f6",
              }, pressed && !feedbackLoading && styles.pressedScale]}
            >
              {feedbackLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{t('profile.send_feedback') || "Send Feedback"}</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardWrapper>
      </Modal>

      {/* ── Privacy Policy Modal ── */}
      <Modal visible={showPrivacyPolicy} animationType="slide" transparent={false} onRequestClose={() => setShowPrivacyPolicy(false)}>
        <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0a0f1e" : "#f6f7fb" }}>

          {/* Sticky header */}
          <View style={{ paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
            backgroundColor: settingsDarkMode ? "#0a0f1e" : "#f6f7fb",
            borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable onPress={() => setShowPrivacyPolicy(false)}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 10,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="arrow-back" size={20} color={settingsDarkMode ? "#fff" : "#0d0f14"} />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: "700", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.3 }}>Privacy Policy</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

            {/* Hero banner */}
            <LinearGradient colors={settingsDarkMode ? ["#1a1040", "#0d1535"] : ["#ebe9ff", "#f0f4ff"]}
              style={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32, alignItems: "center" }}>
              <View style={{ width: 72, height: 72, borderRadius: 22,
                backgroundColor: settingsDarkMode ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.12)",
                borderWidth: 1.5, borderColor: settingsDarkMode ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.2)",
                alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="lock-closed" size={32} color="#6366f1" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14",
                letterSpacing: -0.5, textAlign: "center", marginBottom: 10 }}>Privacy Policy</Text>
              <Text style={{ fontSize: 13, color: settingsDarkMode ? "#818cf8" : "#6366f1", fontWeight: "600",
                textAlign: "center", marginBottom: 12 }}>Scorr App · Last updated June 2025</Text>
              <Text style={{ fontSize: 14, color: settingsDarkMode ? "#94a3b8" : "#555577",
                textAlign: "center", lineHeight: 22, maxWidth: 300 }}>
                We believe your data belongs to you. Here's exactly what we collect, why, and how we keep it safe.
              </Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
              {[
                { num: "01", icon: "person-outline" as const, accent: "#6366f1", title: "Information We Collect",
                  body: "When you sign in with Google or Email, we collect your name, email address, and profile photo solely to create your Scorr account. If you use the app without signing in, we collect no personal data whatsoever." },
                { num: "02", icon: "school-outline" as const, accent: "#8b5cf6", title: "Quiz & Flashcard Data",
                  body: "Your quizzes, flashcard decks, attempt history, correct/wrong answers, and study streaks are stored in our secure Neon (PostgreSQL) database and linked to your account. This enables your progress to sync seamlessly across devices." },
                { num: "03", icon: "phone-portrait-outline" as const, accent: "#06b6d4", title: "Local Storage",
                  body: "Your device uses AsyncStorage to cache quizzes and session data for offline access. This data lives only on your device and is never transmitted to or shared with any third party." },
                { num: "04", icon: "analytics-outline" as const, accent: "#10b981", title: "How We Use Your Data",
                  body: "Your data is used exclusively to power the Scorr experience — syncing your progress, displaying your stats, and personalising your study sessions. We do not sell, rent, or share your data with advertisers or any third parties, ever." },
                { num: "05", icon: "shield-checkmark-outline" as const, accent: "#f59e0b", title: "Data Security",
                  body: "All data in transit is protected by HTTPS/TLS encryption. Our Neon database sits behind authenticated API endpoints. Firebase Authentication handles all sign-in security. We never store raw passwords." },
                { num: "06", icon: "trash-outline" as const, accent: "#ef4444", title: "Deleting Your Data",
                  body: "You can permanently delete your account and all associated data at any time from Settings → Reset Statistics or by contacting us. Deletion removes your profile, quizzes, flashcards, and full attempt history from our servers immediately." },
                { num: "07", icon: "mail-outline" as const, accent: "#6366f1", title: "Contact Us",
                  body: "Questions about this policy or requests for data deletion? Reach us at recall.support@example.com and we'll respond within 48 hours." },
              ].map((s, i, arr) => (
                <View key={i}>
                  <View style={{ flexDirection: "row", gap: 14, paddingVertical: 20 }}>
                    {/* Left accent + number */}
                    <View style={{ alignItems: "center", width: 44 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14,
                        backgroundColor: `${s.accent}18`, borderWidth: 1.5,
                        borderColor: `${s.accent}30`, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={s.icon} size={20} color={s.accent} />
                      </View>
                      {i < arr.length - 1 && (
                        <View style={{ width: 1.5, flex: 1, marginTop: 8,
                          backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }} />
                      )}
                    </View>
                    {/* Content */}
                    <View style={{ flex: 1, paddingTop: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: s.accent, letterSpacing: 1.2 }}>{s.num}</Text>
                        <Text style={{ fontSize: 15, fontWeight: "700",
                          color: settingsDarkMode ? "#e2e8f0" : "#0d0f14", letterSpacing: -0.2 }}>{s.title}</Text>
                      </View>
                      <Text style={{ fontSize: 13.5, color: settingsDarkMode ? "#94a3b8" : "#555577",
                        lineHeight: 22 }}>{s.body}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Footer */}
              <View style={{ marginTop: 8, padding: 20, borderRadius: 16,
                backgroundColor: settingsDarkMode ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.06)",
                borderWidth: 1, borderColor: settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.12)",
                alignItems: "center" }}>
                <Ionicons name="shield-checkmark" size={24} color="#6366f1" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: settingsDarkMode ? "#818cf8" : "#4f46e5",
                  textAlign: "center", lineHeight: 20 }}>Your privacy is our priority.{"\n"}Scorr will never misuse your data.</Text>
              </View>
              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* ── Terms of Service Modal ── */}
      <Modal visible={showTermsOfService} animationType="slide" transparent={false} onRequestClose={() => setShowTermsOfService(false)}>
        <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0a0f1e" : "#f6f7fb" }}>

          {/* Sticky header */}
          <View style={{ paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
            backgroundColor: settingsDarkMode ? "#0a0f1e" : "#f6f7fb",
            borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable onPress={() => setShowTermsOfService(false)}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 10,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="arrow-back" size={20} color={settingsDarkMode ? "#fff" : "#0d0f14"} />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: "700", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.3 }}>Terms of Service</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

            {/* Hero banner */}
            <LinearGradient colors={settingsDarkMode ? ["#0d2010", "#0d1535"] : ["#e6fff5", "#f0f9ff"]}
              style={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32, alignItems: "center" }}>
              <View style={{ width: 72, height: 72, borderRadius: 22,
                backgroundColor: settingsDarkMode ? "rgba(0,229,160,0.2)" : "rgba(0,229,160,0.12)",
                borderWidth: 1.5, borderColor: settingsDarkMode ? "rgba(0,229,160,0.35)" : "rgba(0,229,160,0.25)",
                alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="document-text" size={32} color="#00e5a0" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14",
                letterSpacing: -0.5, textAlign: "center", marginBottom: 10 }}>Terms of Service</Text>
              <Text style={{ fontSize: 13, color: settingsDarkMode ? "#34d399" : "#059669", fontWeight: "600",
                textAlign: "center", marginBottom: 12 }}>Scorr App · Last updated June 2025</Text>
              <Text style={{ fontSize: 14, color: settingsDarkMode ? "#94a3b8" : "#555577",
                textAlign: "center", lineHeight: 22, maxWidth: 300 }}>
                Simple, fair terms for using Scorr. By using the app, you agree to these.
              </Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
              {[
                { num: "01", icon: "checkmark-circle-outline" as const, accent: "#00e5a0", title: "Acceptance of Terms",
                  body: "By downloading or using Scorr, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please uninstall the app and discontinue use." },
                { num: "02", icon: "phone-portrait-outline" as const, accent: "#06b6d4", title: "Use of the App",
                  body: "Scorr is a personal study tool for creating quizzes, studying flashcards, and tracking learning progress. You may not use Scorr for any unlawful purpose or to distribute harmful, abusive, or infringing content." },
                { num: "03", icon: "person-outline" as const, accent: "#6366f1", title: "User Accounts",
                  body: "You are responsible for maintaining the security of your account credentials. Notify us immediately of any unauthorised use. We are not liable for losses resulting from unauthorised access due to your negligence." },
                { num: "04", icon: "document-outline" as const, accent: "#8b5cf6", title: "Your Content",
                  body: "You own all quiz content, notes, and flashcards you create in Scorr. By using the app, you grant us a limited licence to store and process your content solely to provide the Scorr service back to you." },
                { num: "05", icon: "cloud-outline" as const, accent: "#3b82f6", title: "Cloud Sync & Data",
                  body: "When signed in, your quizzes and progress sync to our servers on a best-effort basis. While we work hard to ensure reliability, we cannot guarantee 100% uninterrupted access to cloud-synced data." },
                { num: "06", icon: "ban-outline" as const, accent: "#ef4444", title: "Prohibited Activities",
                  body: "You agree not to: reverse-engineer or decompile the app, attempt to gain unauthorised access to our servers or databases, use automated tools to scrape or abuse the service, or impersonate other users or Scorr staff." },
                { num: "07", icon: "construct-outline" as const, accent: "#f59e0b", title: "Modifications & Availability",
                  body: "We reserve the right to update, modify, or discontinue any features of Scorr at any time. We will notify users of significant changes where possible. Continued use after changes constitutes acceptance of the new terms." },
                { num: "08", icon: "shield-outline" as const, accent: "#94a3b8", title: "Disclaimer of Warranties",
                  body: "Scorr is provided \"as is\" without warranties of any kind. We do not guarantee that the app will be error-free or that AI-generated quiz content will always be 100% accurate. Always verify critical information from authoritative sources." },
                { num: "09", icon: "mail-outline" as const, accent: "#00e5a0", title: "Contact",
                  body: "Questions about these terms? Contact us at recall.support@example.com and we will respond within 48 hours." },
              ].map((s, i, arr) => (
                <View key={i}>
                  <View style={{ flexDirection: "row", gap: 14, paddingVertical: 20 }}>
                    {/* Left accent icon with connector line */}
                    <View style={{ alignItems: "center", width: 44 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14,
                        backgroundColor: `${s.accent}18`, borderWidth: 1.5,
                        borderColor: `${s.accent}30`, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={s.icon} size={20} color={s.accent} />
                      </View>
                      {i < arr.length - 1 && (
                        <View style={{ width: 1.5, flex: 1, marginTop: 8,
                          backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }} />
                      )}
                    </View>
                    {/* Content */}
                    <View style={{ flex: 1, paddingTop: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: s.accent, letterSpacing: 1.2 }}>{s.num}</Text>
                        <Text style={{ fontSize: 15, fontWeight: "700",
                          color: settingsDarkMode ? "#e2e8f0" : "#0d0f14", letterSpacing: -0.2 }}>{s.title}</Text>
                      </View>
                      <Text style={{ fontSize: 13.5, color: settingsDarkMode ? "#94a3b8" : "#555577",
                        lineHeight: 22 }}>{s.body}</Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Footer */}
              <View style={{ marginTop: 8, padding: 20, borderRadius: 16,
                backgroundColor: settingsDarkMode ? "rgba(0,229,160,0.06)" : "rgba(0,229,160,0.07)",
                borderWidth: 1, borderColor: settingsDarkMode ? "rgba(0,229,160,0.15)" : "rgba(0,229,160,0.15)",
                alignItems: "center" }}>
                <Ionicons name="document-text" size={24} color="#00e5a0" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: settingsDarkMode ? "#34d399" : "#059669",
                  textAlign: "center", lineHeight: 20 }}>These terms are designed to be fair and transparent.{"\n"}Thank you for using Scorr.</Text>
              </View>
              <View style={{ height: 40 }} />
            </View>
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
        onRequestClose={() => handleModalCloseRequest(() => setSelectedQuiz(null))}
      >
        <KeyboardWrapper
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedQuiz(null)}>
            <View style={[{
              backgroundColor: settingsDarkMode ? "#1E293B" : "#ffffff",
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingBottom: Platform.OS === "ios" ? 36 : 24,
              paddingHorizontal: 20,
              paddingTop: 12,
              width: "100%",
              maxHeight: "85%",
              overflow: "hidden",
              marginTop: "auto"
            }, !settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingBottom: 16 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }} />
            </View>

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
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Question Selection Section */}
              <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub]}>Question Selection</Text>
              <View 
                style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}
              >
                {[
                  { value: "all" as const, label: "All" },
                  {
                    value: "wrong" as const,
                    label: "Wrong",
                    disabled: wrongCount === 0,
                  },
                  { value: "range" as const, label: "Range" },
                  {
                    value: "unanswered" as const,
                    label: "Unanswered",
                    disabled: unansweredCount === 0,
                  },
                  { value: "random" as const, label: "Random" },
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
              {/* Unified Controls Row to Prevent Layout Shifts */}
              <View style={[styles.compactControlsRow, !settingsDarkMode && styles.lightCard, { minHeight: 48 }]}>
                {selectionMode === "random" ? (
                  <>
                    <Text style={[styles.compactControlLabel, !settingsDarkMode && styles.lightText]}>Random Count</Text>
                    <Stepper
                      value={randomCount}
                      min={1}
                      max={totalQuestions}
                      onChange={(val) => setRandomCount(val)}
                      darkMode={settingsDarkMode}
                    />
                  </>
                ) : selectionMode === "range" ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <Text style={[styles.compactControlLabel, !settingsDarkMode && styles.lightText]}>
                      {selectionMode === "all" ? "Total Questions" : selectionMode === "wrong" ? "Wrong Answers" : "Unanswered"}
                    </Text>
                    <Stepper
                      value={selectionMode === "all" ? totalQuestions : selectionMode === "wrong" ? wrongCount : unansweredCount}
                      min={1}
                      max={totalQuestions}
                      onChange={() => {}}
                      darkMode={settingsDarkMode}
                      disabled={true}
                    />
                  </>
                )}
              </View>

              {/* Timer & Gameplay Options (Sleek Combined iOS-style Card) */}
              <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub]}>Gameplay Configurations</Text>
              <View style={[styles.sectionCardCompact, !settingsDarkMode && styles.lightCard]}>
                {/* Time Limit Row */}
                <View style={[styles.switchRowCompact, { alignItems: "center", zIndex: 10, position: "relative" }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchLabelCompact, !settingsDarkMode && styles.lightText]}>Quiz time limit</Text>
                    <Text style={[styles.switchSubCompact, !settingsDarkMode && styles.lightTextSub]}>
                      {timeLimitText ? `Auto-submits after ${timeLimitText} min` : (quizTimeLimit !== null ? `Auto-submits after ${quizTimeLimit} min` : "No time limit")}
                    </Text>
                  </View>

                  {/* Input chip + chevron */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 3,
                      backgroundColor: settingsDarkMode ? "#1c2235" : "#ffffff",
                      borderWidth: 1,
                      borderColor: (timeLimitText || quizTimeLimit !== null)
                        ? (settingsDarkMode ? "#4f52a0" : "#c7c9f5")
                        : (settingsDarkMode ? "#252d40" : "#e8eaee"),
                      borderRadius: 10,
                      paddingHorizontal: 11,
                      paddingVertical: 7,
                      shadowColor: (timeLimitText || quizTimeLimit !== null) ? "#6366f1" : "#000000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: (timeLimitText || quizTimeLimit !== null) ? 0.25 : 0.08,
                      shadowRadius: (timeLimitText || quizTimeLimit !== null) ? 6 : 3,
                      elevation: (timeLimitText || quizTimeLimit !== null) ? 4 : 2,
                    }}>
                      <TextInput
                        value={timeLimitText}
                        onChangeText={(t) => {
                          // Allow free typing — only digits, max 3 chars
                          const clean = t.replace(/[^0-9]/g, "").slice(0, 3);
                          setTimeLimitText(clean);
                        }}
                        onBlur={() => {
                          // Commit to quizTimeLimit on blur
                          const n = parseInt(timeLimitText, 10);
                          if (!timeLimitText || isNaN(n) || n < 1) {
                            setQuizTimeLimit(null);
                            setTimeLimitText("");
                          } else if (n > 180) {
                            setQuizTimeLimit(180);
                            setTimeLimitText("180");
                          } else {
                            setQuizTimeLimit(n);
                          }
                        }}
                        placeholder="—"
                        placeholderTextColor={settingsDarkMode ? "#3a4260" : "#bbbec8"}
                        keyboardType="number-pad"
                        maxLength={3}
                        style={{
                          color: timeLimitText
                            ? (settingsDarkMode ? "#a5b4fc" : "#4f46e5")
                            : (settingsDarkMode ? "#3a4260" : "#bbbec8"),
                          fontSize: 14,
                          fontWeight: "700",
                          width: 30,
                          textAlign: "center",
                          padding: 0,
                          margin: 0,
                        }}
                      />
                      <Text style={{
                        color: quizTimeLimit !== null
                          ? (settingsDarkMode ? "#818cf8" : "#6366f1")
                          : (settingsDarkMode ? "#3a4260" : "#bbbec8"),
                        fontSize: 12,
                        fontWeight: "600",
                      }}>min</Text>
                    </View>

                    {/* Dropdown toggle chevron */}
                    <Pressable
                      onPress={() => setShowTimeLimitDropdown(v => !v)}
                      style={({ pressed }) => ({
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: showTimeLimitDropdown
                          ? (settingsDarkMode ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.1)")
                          : "transparent",
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Ionicons
                        name={showTimeLimitDropdown ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={settingsDarkMode ? "#6366f1" : "#4f46e5"}
                      />
                    </Pressable>
                  </View>

                  {/* Floating Preset dropdown */}
                  {showTimeLimitDropdown && (
                    <>
                      {/* Invisible overlay to catch outside clicks */}
                      <Pressable
                        style={{
                          position: "absolute",
                          top: -1000,
                          bottom: -1000,
                          left: -1000,
                          right: -1000,
                          zIndex: 90,
                        }}
                        onPress={() => setShowTimeLimitDropdown(false)}
                      />
                      <View style={{
                        position: "absolute",
                        top: "100%",
                        right: 16,
                        marginTop: 4,
                        backgroundColor: settingsDarkMode ? "#1e2436" : "#ffffff",
                        borderRadius: 12,
                        width: 150,
                        maxHeight: 240,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: settingsDarkMode ? 0.4 : 0.1,
                        shadowRadius: 16,
                        elevation: 20,
                        borderWidth: 1,
                        borderColor: settingsDarkMode ? "#2a3142" : "#eaecf0",
                        zIndex: 100,
                      }}>
                        <ScrollView
                          showsVerticalScrollIndicator={true}
                          contentContainerStyle={{ padding: 6 }}
                          nestedScrollEnabled={true}
                          scrollEnabled={true}
                          style={{ borderRadius: 12 }}
                        >
                          {[null, 5, 10, 15, 30, 60].map((preset) => {
                            const isActive = quizTimeLimit === preset;
                            const label = preset === null ? "No limit" : `${preset} min`;
                            return (
                              <Pressable
                                key={String(preset)}
                                onPress={() => {
                                  setQuizTimeLimit(preset);
                                  // Sync local text state with preset value
                                  setTimeLimitText(preset !== null ? String(preset) : "");
                                  setShowTimeLimitDropdown(false);
                                }}
                                style={({ pressed }) => ({
                                  paddingHorizontal: 12,
                                  paddingVertical: 10,
                                  borderRadius: 8,
                                  backgroundColor: isActive
                                    ? (settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)")
                                    : (pressed ? (settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)") : "transparent"),
                                  flexDirection: "row",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                })}
                              >
                                <Text style={{
                                  fontSize: 14,
                                  fontWeight: isActive ? "700" : "500",
                                  color: isActive 
                                    ? (settingsDarkMode ? "#818cf8" : "#4f46e5") 
                                    : (settingsDarkMode ? "#cbd5e1" : "#475569"),
                                }}>{label}</Text>
                                {isActive && (
                                  <Ionicons name="checkmark" size={16} color={settingsDarkMode ? "#818cf8" : "#4f46e5"} />
                                )}
                              </Pressable>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </>
                  )}
                </View>
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
          </Pressable>
        </KeyboardWrapper>
      </Modal>

      {/* ── View Mode Modal ── */}
      <Modal visible={!!pdfViewQuiz} animationType="slide" transparent={false} onRequestClose={() => setPdfViewQuiz(null)}>
        <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", backgroundColor: settingsDarkMode ? "#0f172a" : "#ffffff" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <Pressable onPress={() => setPdfViewQuiz(null)} style={({ pressed }) => [{ padding: 8, borderRadius: 10, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }, pressed && styles.opacityPress]}>
                <Ionicons name="arrow-back" size={20} color={settingsDarkMode ? "#ffffff" : "#0d0f14"} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color: settingsDarkMode ? "#6366f1" : "#6366f1", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 }}>Questions</Text>
                <Text style={{ color: settingsDarkMode ? "#ffffff" : "#0d0f14", fontSize: 17, fontWeight: "700" }} numberOfLines={1}>{pdfViewQuiz?.title}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {(() => {
                const bookmarkCount = (pdfViewQuiz?.questionsList || []).filter((q: any) => starredQuestions.has(q.id)).length;
                return bookmarkCount > 0 ? (
                  <View style={{ backgroundColor: "rgba(99,102,241,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Ionicons name="bookmark" size={13} color="#6366f1" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#6366f1" }}>{bookmarkCount}</Text>
                  </View>
                ) : null;
              })()}
              <Text style={{ color: settingsDarkMode ? "#6e727a" : "#999", fontSize: 12 }}>{(pdfViewQuiz?.questionsList || []).length} Qs</Text>
            </View>
          </View>

          <FlatList
            data={(() => {
              if (!pdfViewQuiz) return [];
              return pdfViewQuiz.questionsList || [];
            })()}
            keyExtractor={(item, index) => String(item.id || index)}
            contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 12, backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8" }}
            renderItem={({ item, index }) => (
              <View style={{
                backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: settingsDarkMode ? 0.15 : 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <Text style={{ flex: 1, color: settingsDarkMode ? "#ffffff" : "#0d0f14", fontSize: 16, fontWeight: "600", lineHeight: 24 }}>
                    <Text style={{ color: settingsDarkMode ? "#888888" : "#888888" }}>#{index + 1} </Text>
                    {item.prompt}
                  </Text>
                  <Pressable
                    onPress={() => {
                      const qId = item.id;
                      if (!qId) return;
                      setStarredQuestions(prev => {
                        const next = new Set(prev);
                        if (next.has(qId)) next.delete(qId);
                        else next.add(qId);
                        return next;
                      });
                    }}
                    style={({ pressed }) => [{ padding: 6, marginLeft: 8, marginTop: -2, borderRadius: 8 }, pressed && styles.opacityPress]}
                  >
                    <Ionicons
                      name={starredQuestions.has(item.id) ? "bookmark" : "bookmark-outline"}
                      size={20}
                      color={starredQuestions.has(item.id) ? "#6366f1" : (settingsDarkMode ? "#6e727a" : "#aaaaaa")}
                    />
                  </Pressable>
                </View>

                <View style={{ gap: 4 }}>
                  {(item.answers || []).map((ans: any, aIndex: number) => {
                    const isCorrect = ans.isCorrect;
                    return (
                      <View key={aIndex} style={{
                        backgroundColor: isCorrect 
                          ? (settingsDarkMode ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)")
                          : "transparent",
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                      }}>
                        <Text style={{
                          color: isCorrect 
                            ? (settingsDarkMode ? "#34d399" : "#059669")
                            : (settingsDarkMode ? "#a1a1aa" : "#475569"),
                          fontSize: 15,
                          lineHeight: 22,
                        }}>
                          {ans.text}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
                <Ionicons name="document-text-outline" size={48} color={settingsDarkMode ? "#333333" : "#cccccc"} />
                <Text style={{ marginTop: 12, color: settingsDarkMode ? "#888888" : "#666677", fontSize: 16 }}>No questions to display.</Text>
              </View>
            }
          />
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
            backgroundColor: settingsDarkMode ? "#1E293B" : "#ffffff",
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
              onPress={() => {
                setShowAddMenu(false);
                if (Platform.OS === "web") {
                  if (fileInputRef.current) { fileInputRef.current.click(); }
                } else {
                  // Wait for bottom sheet close animation before launching picker.
                  // Without this, Android swallows/delays the intent on most ROMs.
                  setTimeout(async () => {
                    try {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: "*/*",
                        copyToCacheDirectory: true,
                      });
                      if (!result.canceled && result.assets && result.assets[0]) {
                        const fileUri = result.assets[0].uri;
                        const fileName = result.assets[0].name;
                        const ext = fileName.split('.').pop()?.toLowerCase();
                        const fileSize = result.assets[0].size || 0;
                        if (ext === 'pdf' && fileSize > 4.5 * 1024 * 1024) {
                          Alert.alert(
                            "File Too Large",
                            "Please select a PDF under 4.5 MB."
                          );
                          return;
                        }

                        if (ext && !['txt', 'qst', 'md', 'docx', 'pdf'].includes(ext)) {
                          Alert.alert(
                            "Unsupported File",
                            `You can upload only .txt, .docx, and .pdf files. Your uploaded file is .${ext}`
                          );
                          return;
                        }
                        setIsImporting(true);
                        setTimeout(async () => {
                          try {
                            let text = "";
                            if (ext === "pdf") {
                              const pdfResult = await parsePdfFromBackend(fileUri, fileName);
                              if (pdfResult.error) {
                                throw new Error(`Backend PDF parsing failed: ${pdfResult.error}`);
                              }
                              text = pdfResult.text;
                            } else if (ext === "docx") {
                              const b64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
                              const buff = Buffer.from(b64, "base64");
                              const result = await mammoth.extractRawText({ arrayBuffer: buff });
                              text = result.value;
                            } else {
                              text = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
                            }
                            // Close the overlay FIRST, wait for it to fully dismiss,
                            // THEN show the quiz — otherwise the quiz options panel
                            // gets swallowed by the still-animating loading Modal on Android.
                            setIsImporting(false);
                            setTimeout(() => handleImportQst(text, fileName), 150);
                          } catch (err: any) {
                            if (ext === "pdf" || ext === "docx") {
                              setIsImporting(false);
                              Alert.alert("Error", `Failed to parse ${ext.toUpperCase()} file.\n\n${err.message}`);
                              return;
                            }
                            try {
                              const textFallback = await FileSystem.readAsStringAsync(fileUri);
                              setIsImporting(false);
                              setTimeout(() => handleImportQst(textFallback, fileName), 150);
                            } catch (err2: any) {
                              setIsImporting(false);
                              Alert.alert("Error", `Could not read the file. Make sure it is a valid .txt, .docx, or .pdf file.\n\n${err.message}`);
                            }
                          }
                        }, 50);
                      }
                    } catch (err: any) {
                      Alert.alert("Error", "Failed to open file picker: " + err.message);
                    }
                  }, 350);
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
                  color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('create_menu.import_txt') || "Import quiz from file (.txt, .docx)"}</Text>
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
                  color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('create_menu.create_manual') || "Create quiz manually"}</Text>
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

      {/* Flashcard Options Modal */}
      <Modal visible={showFlashcardOptions !== null} transparent animationType="slide" onRequestClose={() => setShowFlashcardOptions(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => setShowFlashcardOptions(null)}>
          <View style={{ backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 36 }} onStartShouldSetResponder={() => true}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", alignSelf: "center", marginBottom: 16 }} />
            <Text style={{ fontSize: 17, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14", paddingHorizontal: 20, marginBottom: 12 }}>
              {showFlashcardOptions?.title}
            </Text>
            
            <Pressable onPress={() => {
              const deck = showFlashcardOptions;
              setEditingDeckId(deck.id);
              setFcTitle(deck.title);
              setFcCards(deck.cards?.length > 0 ? JSON.parse(JSON.stringify(deck.cards)) : [{ front: "", back: "" }]);
              setFcCurrentIdx(0);
              setCardType(deck.cardType || "Basic");
              setCreationMode("pick");
              setActiveTab("add");
              setShowFlashcardOptions(null);
            }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: pressed ? (settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent" }]}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="pencil" size={20} color={settingsDarkMode ? "#fff" : "#000"} />
              </View>
              <Text style={{ fontSize: 15, color: settingsDarkMode ? "#fff" : "#000" }}>Edit Deck</Text>
            </Pressable>

            <Pressable onPress={() => {
              setViewingInsightsDeck(showFlashcardOptions);
              setActiveTab("dashboard");
              setShowFlashcardOptions(null);
            }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: pressed ? (settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent" }]}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="bar-chart-outline" size={20} color={settingsDarkMode ? "#fff" : "#000"} />
              </View>
              <Text style={{ fontSize: 15, color: settingsDarkMode ? "#fff" : "#000" }}>Statistics</Text>
            </Pressable>

            <Pressable onPress={() => {
              const deckId = showFlashcardOptions?.id;
              const neonId = showFlashcardOptions?.neonId;
              setFlashcardDecks(flashcardDecks.filter(d => d.id !== deckId));
              if (firebaseUser && neonId && !String(neonId).startsWith("local_")) {
                deleteFlashcardDeck(firebaseUser.uid, neonId).catch(err => console.warn("[NeonSync] deck delete failed:", err));
              }
              setShowFlashcardOptions(null);
            }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: pressed ? "rgba(239,68,68,0.06)" : "transparent" }]}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 15, color: "#ef4444" }}>Delete Deck</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showLanguageModal} animationType="slide" transparent={true} onRequestClose={() => setShowLanguageModal(false)}>
        <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#090d14" : "#f0f2f5" }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: "600", color: settingsDarkMode ? "#fff" : "#111" }}>Language</Text>
              <Pressable onPress={() => setShowLanguageModal(false)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(16,185,129,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color="#10b981" />
              </Pressable>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: settingsDarkMode ? "#1e293b" : "#e2e8f0", borderRadius: 8, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: "rgba(16,185,129,0.3)" }}>
                <TextInput
                  placeholder="Search"
                  placeholderTextColor={settingsDarkMode ? "#64748b" : "#94a3b8"}
                  style={{ flex: 1, color: settingsDarkMode ? "#fff" : "#000", fontSize: 15 }}
                  value={languageSearch}
                  onChangeText={setLanguageSearch}
                />
              </View>
              <View style={{ height: 2, backgroundColor: "#10b981", marginTop: -2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }} />
            </View>

            {/* List */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
              {APP_LANGUAGES.filter(l => l.name.toLowerCase().includes(languageSearch.toLowerCase()) || l.nativeName.toLowerCase().includes(languageSearch.toLowerCase())).map((l, idx) => {
                const isSelected = (l.id === 'system' && !savedAppLanguage) || (savedAppLanguage === l.code && l.id !== 'system');
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      if (l.id === "system") {
                        AsyncStorage.removeItem("user-language");
                        setSavedAppLanguage(null);
                        i18n.changeLanguage("en"); // fallback to en or device locale
                      } else {
                        i18n.changeLanguage(l.code);
                        AsyncStorage.setItem("user-language", l.code);
                        setSavedAppLanguage(l.code);
                      }
                      setShowLanguageModal(false);
                    }}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                      {l.id === 'system' ? (
                        <View style={{ width: 32, height: 24, borderRadius: 4, backgroundColor: settingsDarkMode ? "#334155" : "#cbd5e1", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 12, fontWeight: "bold", color: settingsDarkMode ? "#fff" : "#000" }}>A文</Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 24 }}>{l.flag}</Text>
                      )}
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#f8fafc" : "#0f172a" }}>
                          {l.id === 'system' ? l.name : l.nativeName || l.name}
                        </Text>
                        {l.id !== 'system' && (
                          <Text style={{ fontSize: 13, color: settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>{l.name}</Text>
                        )}
                      </View>
                    </View>
                    {/* Radio Button */}
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isSelected ? "#10b981" : (settingsDarkMode ? "#64748b" : "#cbd5e1"), alignItems: "center", justifyContent: "center" }}>
                      {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#10b981" }} />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Bottom Info Card */}
            <View style={{ margin: 20, padding: 16, borderRadius: 16, backgroundColor: settingsDarkMode ? "rgba(217,119,6,0.15)" : "rgba(217,119,6,0.1)", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(217,119,6,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="information" size={18} color="#d97706" />
              </View>
              <Text style={{ flex: 1, fontSize: 12, color: settingsDarkMode ? "#fbbf24" : "#b45309", lineHeight: 18 }}>
                If you have remarks on the translations, please feel free to write to the mail with suggestions for improvement.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* ── Battle Result Modal ── */}
      <Modal visible={!!battlePopup} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          {battlePopup && (
            <View style={{
              width: "100%", maxWidth: 360,
              backgroundColor: settingsDarkMode ? "#1e1e2e" : "#ffffff",
              borderRadius: 24, padding: 32, alignItems: "center",
              borderWidth: 1, borderColor: battlePopup.won ? "rgba(34,197,94,0.4)" : (settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")
            }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: battlePopup.won ? "rgba(34,197,94,0.15)" : (battlePopup.myScore === battlePopup.opponentScore ? "rgba(99,102,241,0.15)" : "rgba(239,68,68,0.15)"),
                alignItems: "center", justifyContent: "center", marginBottom: 20
              }}>
                <Text style={{ fontSize: 40 }}>{battlePopup.won ? "🏆" : (battlePopup.myScore === battlePopup.opponentScore ? "🤝" : "💀")}</Text>
              </View>
              
              <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: -0.5, marginBottom: 8,
                color: battlePopup.won ? "#22c55e" : (battlePopup.myScore === battlePopup.opponentScore ? "#6366f1" : "#ef4444") }}>
                {battlePopup.won ? "VICTORY!" : (battlePopup.myScore === battlePopup.opponentScore ? "DRAW!" : "DEFEATED")}
              </Text>
              
              <Text style={{ fontSize: 16, color: settingsDarkMode ? "#94a3b8" : "#64748b", marginBottom: 24, textAlign: "center" }}>
                Battle against <Text style={{ fontWeight: "700", color: settingsDarkMode ? "#f8fafc" : "#0f172a" }}>{battlePopup.opponentName}</Text>
              </Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%", marginBottom: 32 }}>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ fontSize: 12, color: settingsDarkMode ? "#94a3b8" : "#64748b", fontWeight: "700", marginBottom: 4, textTransform: "uppercase" }}>You</Text>
                  <Text style={{ fontSize: 36, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14" }}>{battlePopup.myScore}</Text>
                </View>
                <View style={{ paddingHorizontal: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: settingsDarkMode ? "#475569" : "#cbd5e1" }}>VS</Text>
                </View>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ fontSize: 12, color: settingsDarkMode ? "#94a3b8" : "#64748b", fontWeight: "700", marginBottom: 4, textTransform: "uppercase" }}>Opponent</Text>
                  <Text style={{ fontSize: 36, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14" }}>{battlePopup.opponentScore}</Text>
                </View>
              </View>
              
              <Pressable
                onPress={() => setBattlePopup(null)}
                style={({ pressed }) => [{
                  backgroundColor: battlePopup.won ? "#22c55e" : (settingsDarkMode ? "#334155" : "#e2e8f0"),
                  paddingVertical: 14, borderRadius: 14, width: "100%", alignItems: "center"
                }, pressed && { opacity: 0.8 }]}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: battlePopup.won ? "#fff" : (settingsDarkMode ? "#fff" : "#0f172a") }}>Awesome!</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>

    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    overflow: "hidden",
  },
  screenContainer: {
    flex: 1,
    overflow: "hidden",
  },
  homeContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
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
    marginTop: 2,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  tabLabelActive: {
    color: "#6366f1",
  },
  qCreateBtn: {
    // unused — Create button now uses plain tabItem style
  },
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.02)",
    paddingTop: 10,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 3,
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
    flexWrap: "nowrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  panelCard: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    marginBottom: 18,
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
    backgroundColor: "#0f172a",
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
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
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
    padding: 10,
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
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
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
    color: "#FFFFFF",
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lightTabBar: {
    backgroundColor: "#ffffff",
    borderTopColor: "rgba(0, 0, 0, 0.02)",
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

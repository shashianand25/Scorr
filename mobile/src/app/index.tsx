import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import IconHome from "tabler-icons-react-native/icons-js/IconHome";
import IconSwords from "tabler-icons-react-native/icons-js/IconSwords";
import IconUser from "tabler-icons-react-native/icons-js/IconUser";
import IconFolder from "tabler-icons-react-native/icons-js/IconFolder";
import { CustomChartIcon } from "../components/ui/CustomChartIcon";

import { GestureHandlerRootView, FlingGestureHandler, Directions, State } from "react-native-gesture-handler";
import YoutubeIframe from "react-native-youtube-iframe";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import { Buffer } from "buffer";
import * as mammoth from "mammoth/mammoth.browser.js";
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser, onAuth, deleteAccount, resetPassword, type User } from "../lib/firebase";
import { syncUserToNeon, fetchMobileQuizzes, createMobileQuiz, updateMobileQuiz, deleteMobileQuiz, deleteUserFromNeon, sendFeedback, saveBattleHistory, fetchBattleHistory, parsePdfFromBackend, parsePptFromBackend, fetchGeminiKey } from "../lib/api";
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


// ── Flashcard API stubs (feature removed — dead code references kept for safety) ──
const createFlashcardDeck = async (..._args: any[]) => ({ deck: null, error: null });
const updateFlashcardDeck = async (..._args: any[]) => ({ deck: null, error: null });
const deleteFlashcardDeck = async (..._args: any[]) => ({ error: null });

// Get screen width/height for layout sizing
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const KeyboardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;

const MCQ_PROMPT = (text: string) => `## Output Format

- Start every flashcard question with \`?\`
- Start every correct flashcard answer with \`+\`

- Start every MCQ question with \`#\`
- Start the correct MCQ option with \`+\`
- Start each incorrect MCQ option with \`-\`

Example:

? What is the SI unit of force?
+ Newton

# What is the SI unit of force?
+ Newton
- Joule
- Pascal
- Watt

## Content Generation

Generate at least {{MIN_FLASHCARDS}} flashcards and at least {{MIN_MCQS}} MCQs.

Cover the entire document. Ensure every major topic, section, definition, formula, process, table, diagram (where relevant), and key concept is represented. Generate more than the minimum whenever needed for complete coverage.

## Flashcard Rules

- One flashcard should test one distinct concept.
- Keep questions concise and unambiguous.
- Answers should be brief, accurate, and directly supported by the document.
- Avoid duplicate or nearly identical flashcards.

## MCQ Rules

- Every MCQ must have exactly 4 options.
- Exactly 1 option must be correct.
- Wrong options should be plausible and relevant.
- Include conceptual, application, comparison, calculation, and reasoning questions where appropriate.
- Avoid obvious giveaway answers and duplicate questions.

## General Rules

- Do not invent information not present in the document.
- Do not generate trivial or repetitive questions just to reach the minimum.
- Preserve technical terms, notation, and formulas from the source where appropriate.
- Output only the formatted flashcards and MCQs. Do not include explanations, headings, or markdown.

Text:
${text}`;

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

function AIGeneratingScreen({ onCancel }: { onCancel?: () => void }) {
  const sway = React.useRef(new Animated.Value(0)).current;
  const blink = React.useRef(new Animated.Value(1)).current;
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    // Subtle sway animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: -1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();

    // Blink text
    Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.4, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, []);

  const swayRotateFront = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-18deg", "-12deg"] });
  const swayTranslateXFront = sway.interpolate({ inputRange: [-1, 1], outputRange: [-2, 2] });

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "#0A0B14", alignItems: "center", justifyContent: "center", zIndex: 99999, paddingHorizontal: 16 }}>
      
      {/* Back button */}
      <SafeAreaView style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <Pressable onPress={onCancel} style={{ padding: 24 }}>
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </Pressable>
      </SafeAreaView>

      <View style={{ alignItems: "center", marginTop: -60, width: "100%" }}>
        {/* Animated Stacked Cards Icon */}
        <View style={{ width: 100, height: 100, alignItems: "center", justifyContent: "center", marginBottom: 30 }}>
          {/* Back Card (Cyan) */}
          <View style={{
            position: "absolute", width: 50, height: 70, borderRadius: 8,
            backgroundColor: "#48CAE4",
            transform: [{ rotate: "15deg" }, { translateX: 12 }, { translateY: 4 }],
          }} />
          {/* Front Card (Blue) animated */}
          <Animated.View style={{
            position: "absolute", width: 56, height: 76, borderRadius: 8,
            backgroundColor: "#4263EB",
            transform: [
              { rotate: swayRotateFront }, 
              { translateX: swayTranslateXFront },
              { translateY: -4 }
            ]
          }} />
        </View>

        {/* Blinking Text */}
        <Animated.View style={{ marginBottom: 24, opacity: blink }}>
          <Text style={{
            fontSize: elapsed >= 30 ? 26 : 34, 
            fontWeight: "800",
            textAlign: "center", 
            lineHeight: 42
          }}>
            {elapsed >= 60 ? (
              <>
                <Text style={{ color: "#60A5FA" }}>Almost </Text>
                <Text style={{ color: "#A78BFA" }}>there!</Text>
              </>
            ) : elapsed >= 30 ? (
              <>
                <Text style={{ color: "#60A5FA" }}>⏳ Taking longer </Text>
                <Text style={{ color: "#A78BFA" }}>than usual...</Text>
              </>
            ) : (
              <>
                <Text style={{ color: "#60A5FA" }}>Generating your{"\n"}</Text>
                <Text style={{ color: "#A78BFA" }}>flashcards...</Text>
              </>
            )}
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Text style={{
          fontSize: 16, color: "rgba(255,255,255,0.9)", textAlign: "center", fontWeight: "500", lineHeight: 24, paddingHorizontal: 20
        }}>
          {elapsed >= 60 
            ? "Large PDFs can take a few minutes to process.\nThanks for your patience." 
            : elapsed >= 30 
              ? "Please wait while we finish\nprocessing your file." 
              : "The conversion may take a while depending on\nthe size of your upload"}
        </Text>
      </View>
    </View>
  );
}

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
  const [backgroundQuizReady, setBackgroundQuizReady] = useState<any>(null);
  const isBackgroundGen = React.useRef(false);

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
  useEffect(() => {
    AsyncStorage.getItem("cachedFirebaseUser").then(val => {
      if (val) {
        try { setFirebaseUser(prev => prev || JSON.parse(val)); } catch {}
      }
    });
    
    const unsub = onAuth(async (user) => {
      setFirebaseUser(user);
      if (user) {
        AsyncStorage.setItem("cachedFirebaseUser", JSON.stringify({ uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL }));
      } else {
        AsyncStorage.removeItem("cachedFirebaseUser");
      }

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
                  const synced = normalizedQuizzes.find((n) => n.id === l.id || n.id === l.neonId);
                  return synced || l;
                });

                // Append any completely new quizzes from the server
                const newFromServer = normalizedQuizzes.filter(n => !cleanLocal.find(l => l.id === n.id || l.neonId === n.id));

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
                  sourceText: questionsToSourceText(q.title, q.category || 'General', q.questionsList ?? [], q.flashcards ?? []),
                  attempts: q.attempts || [],
                  wrongQuestions: q.wrongQuestions || [],
                  uniqueCorrectIds: q.uniqueCorrectIds || [],
                }).then(({ quiz: saved }) => {
                  if (saved) {
                    setQuizzes((prev: any[]) =>
                      prev.map((pq) => pq.id === q.id ? { ...pq, neonId: saved.id } : pq)
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
                  sourceText: questionsToSourceText(q.title, q.category || 'General', q.questionsList ?? [], q.flashcards ?? []),
                  attempts: q.attempts || [],
                  wrongQuestions: q.wrongQuestions || [],
                  uniqueCorrectIds: q.uniqueCorrectIds || [],
                }).then(({ quiz: saved, error: saveErr }) => {
                  if (saveErr) { console.warn("[NeonSync] upload failed:", saveErr); return; }
                  if (saved) {
                    setQuizzes((prev: any[]) =>
                      prev.map((pq) => pq.id === q.id ? { ...pq, neonId: saved.id } : pq)
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
                localHistory.forEach((h: any) => mergedMap.set(h.roomCode || `${h.date}_${h.quizTitle}`, h));
                
                // Add server history (map DB snake_case back to camelCase)
                battleHistoryRes.history.forEach((h: any) => {
                  if (!mergedMap.has(h.room_code)) {
                    mergedMap.set(h.room_code, {
                      date: new Date(h.created_at).getTime(),
                      roomCode: h.room_code,
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
  useEffect(() => {
    (async () => {
      try {
        const [qRaw, sRaw, dRaw] = await Promise.all([
          AsyncStorage.getItem(storageKey("quizzes")),
          AsyncStorage.getItem(`quizforge_starred_global`),
          AsyncStorage.getItem(`quizforge_flashcard_decks`),
        ]);
        if (qRaw) {
          const parsed = JSON.parse(qRaw);
          setQuizzes(prev => prev.length === 0 ? parsed : prev);
        }
        if (sRaw) {
          setStarredQuestions(new Set(JSON.parse(sRaw)));
        }
        if (dRaw) {
          const parsed = JSON.parse(dRaw);
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
    AsyncStorage.multiGet(["pref_shuffleQuestions", "pref_shuffleAnswers", "pref_showAnswerOnSubmit", "pref_autoSlideEnabled"]).then((pairs) => {
      pairs.forEach(([key, val]) => {
        if (key === "pref_shuffleQuestions" && val !== null) setShuffleQuestionsRaw(val === "1");
        if (key === "pref_shuffleAnswers" && val !== null) setShuffleAnswersRaw(val === "1");
        if (key === "pref_showAnswerOnSubmit" && val !== null) setShowAnswerOnSubmitRaw(val === "1");
        if (key === "pref_autoSlideEnabled" && val !== null) setAutoSlideEnabledRaw(val === "1");
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
              
              // Trigger the popup immediately since the user hasn't seen the result yet
              setBattlePopup({ myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin, myTime, opponentTime: oppTime });
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

                  setBattlePopup({ myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin, myTime, opponentTime: oppTime });
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
  const [battleHistory, setBattleHistory] = useState<Array<{date: number, quizTitle: string, myScore: number, opponentScore: number, opponentName: string, won: boolean, myTime?: number, opponentTime?: number}>>([]);
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
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [offlineModalParams, setOfflineModalParams] = useState<{ title: string; message: string; buttons?: { text: string; onPress: () => void; isPrimary?: boolean }[] } | null>(null);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
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
  const [shuffleAnswers, setShuffleAnswersRaw] = useState<boolean>(false);
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

  const [activeSession, setActiveSession] = useState<any | null>(null);
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
        return false; // Yield to OS default behavior
      }
      // On any other tab/page
      setActiveTab("home");
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeSession, studyingDeck, activeTab, viewingInsightsQuizFromTab]);


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

    const isPerQuestion = activeSession?.timePerQuestion != null;
    const isGlobal = activeSession?.quizTimeLimit != null;

    if (activeSession && (isPerQuestion || isGlobal) && !activeSession.isFinished) {
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
  }, [activeSession?.quizId, activeSession?.quizTimeLimit, activeSession?.timePerQuestion ? activeSession?.currentIndex : null, activeSession?.isFinished]);

  // Keep ref always pointing to the freshest closure (re-runs every render)
  React.useEffect(() => {
    handleTimerExpiredRef.current = () => {
      // Use functional updaters so we always read the latest state,
      // even though this runs inside a stale setInterval closure.
      setActiveSession((currentSession: any) => {
        if (!currentSession) return currentSession;
        
        if (currentSession.timePerQuestion != null) {
          // Per-question timer expired
          try { tickingPlayer.pause(); tickingPlayer.seekTo(0); } catch (e) {}
          
          const q = currentSession.questions[currentSession.currentIndex];
          let newAnswers = { ...currentSession.answers };
          let newSubmitted = [...currentSession.submitted];
          
          if (!newSubmitted.includes(q.id)) {
            newSubmitted.push(q.id);
          }
          
          const nextIdx = currentSession.currentIndex + 1;
          if (nextIdx < currentSession.questions.length) {
            // Auto-advance
            return {
              ...currentSession,
              answers: newAnswers,
              submitted: newSubmitted,
              currentIndex: nextIdx
            };
          } else {
            // Finish quiz
            return {
              ...currentSession,
              answers: newAnswers,
              submitted: newSubmitted,
              isFinished: true
            };
          }
        }
        
        // Global timer expired
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
              wrongQsForQuiz.push({ id: q.id, prompt: q.prompt, imageUrl: q.imageUrl, selected: selectedText, correct: correctText });
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
    
    if (savedSessions[selectedQuiz.id]) {
      setActiveSession(savedSessions[selectedQuiz.id]);
      setSelectedQuiz(null);
      return;
    }

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
      const attemptedIds = new Set<string>([
        ...(selectedQuiz.uniqueCorrectIds || []),
        ...(selectedQuiz.wrongQuestions || []).map((w: any) => w.id || w)
      ]);
      const unansweredQs = filteredQuestions.filter((q: any) => !attemptedIds.has(q.id));
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
      timePerQuestion: quizPerQuestionTimer,
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

  const saveAndExitQuizSession = (exitSession: boolean = true, sessionToSave: any = activeSessionRef.current || activeSession) => {
    if (!sessionToSave || !sessionToSave.isFinished) {
      if (sessionToSave && !sessionToSave.isFinished && sessionToSave.quizId) {
        setSavedSessions(prev => ({ ...prev, [sessionToSave.quizId]: sessionToSave }));
      }
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
          const selectedText = q.answers.filter((a: any) => selected.includes(a.id)).map((a: any) => a.text).join(", ");
          const correctText = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.text).join(", ");
          wrongQsForQuiz.push({ id: q.id, prompt: q.prompt, imageUrl: q.imageUrl, selected: selectedText, correct: correctText });
        }
      }
    });

    if (correctCount === 0 && wrongCount === 0) {
      if (exitSession) {
        setActiveSession(null);
      } else {
        setActiveSession((prev: any) => prev ? { ...prev, attemptSaved: true } : prev);
      }
      return;
    }

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
      if (!isConnected) {
        setSyncToastMessage("Offline. Changes will sync automatically.");
        setTimeout(() => setSyncToastMessage(null), 3000);
      }
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

  const recalculateRetriesAfterDeletion = (attemptsList: any[]) => {
    const idToNewNum: Record<string, number> = {};
    attemptsList.forEach((a: any, index: number) => {
      idToNewNum[a.id] = attemptsList.length - index;
    });

    return attemptsList.map((a: any) => {
      if (a.mode === "retry") {
        if (idToNewNum[a.retryOfAttemptId]) {
          return { ...a, retryOfAttemptNum: idToNewNum[a.retryOfAttemptId] };
        } else {
          return { ...a, retryOfAttemptNum: "-" };
        }
      }
      return a;
    });
  };

  const handleDeleteAttemptOnMobile = (quizId: string, attemptId: string) => {
    if (quizId === "sample_quiz") {
      const q = sampleQuiz;
      const filteredAttempts = q.attempts.filter((a: any) => a.id !== attemptId);
      const nextAttempts = recalculateRetriesAfterDeletion(filteredAttempts);
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
        const filteredAttempts = q.attempts.filter((a: any) => a.id !== attemptId);
        const nextAttempts = recalculateRetriesAfterDeletion(filteredAttempts);
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
      setActiveTab("home");
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

    AsyncStorage.getItem(`quiz_file_${quizId}`).then(uri => {
      if (uri) {
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }
      AsyncStorage.removeItem(`quiz_file_${quizId}`).catch(() => {});
    }).catch(() => {});

    const updatedQuizzes = quizzes.filter((q) => q.id !== quizId);
    setQuizzes(updatedQuizzes);
    setViewingInsightsQuiz(null);
    setActiveTab("home");
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

  const renderBookmarkedQuestionsView = () => {
    if (!viewingInsightsQuiz) return null;
    const quiz = viewingInsightsQuiz;
    const isDark = settingsDarkMode;
    // Match the global root container background
    const bg = isDark ? "#0f172a" : "#f4f4f8";
    const textMain = isDark ? "#ffffff" : "#0d0f14";
    const textSub = isDark ? "#9ca3af" : "#6b7280";
    const cardBg = isDark ? "#1e293b" : "#ffffff";
    const border = isDark ? "#334155" : "#e5e7eb";

    const bookmarkedQs = (quiz.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (quiz.questionsList || [])).filter((q: any) => starredQuestions.has(q.id));

    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        {/* Header matching Flashcard Options */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 24 }}>
          <Pressable onPress={() => setActiveTab("insights")} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6, marginLeft: -6 })}>
            <Ionicons name="arrow-back" size={24} color={isDark ? "#ffffff" : "#0f172a"} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: isDark ? "#ffffff" : "#0d0f14" }}>Bookmarked Questions</Text>
          {/* Use width: 36 to perfectly center the title against the 24px icon + 12px padding */}
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {bookmarkedQs.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, marginTop: 40 }}>
              <Ionicons name="bookmark-outline" size={64} color={isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"} style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 16, color: textSub, textAlign: "center" }}>No bookmarked questions yet.</Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              <Pressable 
                onPress={() => playQuizDirectly({ ...quiz, questionsList: bookmarkedQs }, "all")}
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: isDark ? "#6366f1" : "#4f46e5", paddingVertical: 14, borderRadius: 12, marginBottom: 12 }, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Attempt Bookmarked</Text>
              </Pressable>
              {bookmarkedQs.map((q: any, i: number) => {
                const isBookmarked = starredQuestions.has(q.id);
                return (
                <View key={q.id} style={{ padding: 16, borderRadius: 16, backgroundColor: cardBg, borderWidth: 1, borderColor: border }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: isDark ? "#f8fafc" : "#111827", lineHeight: 24 }}>
                      <Text style={{ color: isDark ? "#64748b" : "#9ca3af" }}>#{i + 1} </Text>
                      {q.prompt}
                    </Text>
                    <Pressable onPress={() => setStarredQuestions(prev => {
                      const next = new Set(prev);
                      if (next.has(q.id)) next.delete(q.id);
                      else next.add(q.id);
                      return next;
                    })} style={{ paddingLeft: 12 }}>
                      <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={isBookmarked ? (isDark ? "#94a3b8" : "#64748b") : (isDark ? "#64748b" : "#9ca3af")} />
                    </Pressable>
                  </View>
                  
                  <View style={{ gap: 8 }}>
                    {(q.options || []).map((opt: any, optIdx: number) => {
                      const isCorrect = opt.isCorrect;
                      return (
                        <View key={optIdx} style={[
                          { padding: 14, borderRadius: 12 },
                          isCorrect 
                            ? { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)" }
                            : { backgroundColor: "transparent" }
                        ]}>
                          <Text style={{ 
                            fontSize: 15, 
                            color: isCorrect ? (isDark ? "#34d399" : "#059669") : (isDark ? "#94a3b8" : "#4b5563"),
                            fontWeight: isCorrect ? "500" : "400"
                          }}>
                            {opt.text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )})}
            </View>
          )}
        </ScrollView>
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
    
    // Derived dark mode colors based on the requested design + supporting light mode
    const isDark = settingsDarkMode;
    const bg = isDark ? "#0B0F1E" : "#f4f4f8";
    const cardBg = isDark ? "#141930" : "#ffffff";
    const iconBg = isDark ? "#161B2E" : "#e5e7eb";
    const textMain = isDark ? "#F3F4F6" : "#111827";
    const textSub = isDark ? "#9CA3AF" : "#6B7280";
    const border = isDark ? "rgba(181, 168, 255, 0.12)" : "rgba(0,0,0,0.06)";

    return (
      <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 20, paddingTop: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Top Bar */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Pressable 
            onPress={() => setActiveTab(viewingInsightsQuizFromTab as any || "home")}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Feather name="arrow-left" size={18} color={textSub} />
            <Text style={{ fontSize: 14, color: textSub, fontWeight: "500" }}>
              {viewingInsightsQuizFromTab === "library" ? "Back to library" : "Back to home"}
            </Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable onPress={() => setShowQuizActions(quiz)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="ellipsis-vertical" size={18} color={textSub} />
            </Pressable>
          </View>
        </View>

        {/* Title Card */}
        <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: border, width: "100%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <View style={{ backgroundColor: isDark ? "#123324" : "#dcfce7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: isDark ? "#4ADE80" : "#166534", fontSize: 11, fontWeight: "600" }}>{quiz.category || "General"}</Text>
            </View>
            <Text style={{ fontSize: 12, color: textSub }}>{(quiz.questionsList || []).length} questions</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: "600", color: textMain, lineHeight: 24 }} numberOfLines={3} ellipsizeMode="tail">
            {(quiz.title || "").replace(/[\r\n]+/g, " ").replace(/[-_]/g, (match: string) => `${match}\u200B`)}
          </Text>
        </View>

        {/* Stats Grid (Temporarily Hidden for UI Testing) */}
        {/*
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <View style={{ flex: 1.2, backgroundColor: isDark ? "#2B2560" : "#ede9fe", borderRadius: 16, padding: 16, justifyContent: "center" }}>
            <Ionicons name="trophy" size={24} color={isDark ? "#B5A8FF" : "#7c3aed"} />
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 32, fontWeight: "700", color: isDark ? "#EDE9FE" : "#4c1d95", marginBottom: 2 }}>{attempts.length > 0 ? `${highScore}%` : "—"}</Text>
              <Text style={{ fontSize: 13, color: isDark ? "rgba(181, 168, 255, 0.9)" : "#6d28d9", fontWeight: "500" }}>Peak score</Text>
            </View>
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, padding: 14, justifyContent: "center", borderWidth: 1, borderColor: border }}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: textMain, marginBottom: 2 }}>{attempts.length > 0 ? `${avgScore}%` : "—"}</Text>
              <Text style={{ fontSize: 12, color: textSub, fontWeight: "500" }}>Avg score</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: cardBg, borderRadius: 16, padding: 14, justifyContent: "center", borderWidth: 1, borderColor: border }}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: textMain, marginBottom: 2 }}>{attempts.length}</Text>
              <Text style={{ fontSize: 12, color: textSub, fontWeight: "500" }}>Sessions</Text>
            </View>
          </View>
        </View>
        */}

        {/* Practice Modes */}
        <Text style={{ fontSize: 16, fontWeight: "600", color: textMain, marginTop: 12, marginBottom: 12, marginLeft: 4 }}>Practice</Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
          <Pressable onPress={() => handleOpenQuizOptions(quiz)} style={({pressed}) => [{ flex: 1, backgroundColor: cardBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: border, flexDirection: "row", alignItems: "center" }, pressed && {opacity: 0.8}]}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "#20264A" : "#e0e7ff", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
              <Ionicons name="help-circle" size={18} color={isDark ? "#7C9DFF" : "#4338ca"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: textMain, marginBottom: 4 }} numberOfLines={1}>Quiz</Text>
              <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.8)" : textSub }} numberOfLines={1}>{(quiz.questionsList || []).length} Questions</Text>
            </View>
            <Feather name="chevron-right" size={16} color={isDark ? "#FFFFFF" : "#9ca3af"} style={{ opacity: isDark ? 0.8 : 1 }} />
          </Pressable>

          <Pressable onPress={() => setStudyModeModalVisible(true)} style={({pressed}) => [{ flex: 1, backgroundColor: cardBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: border, flexDirection: "row", alignItems: "center" }, pressed && {opacity: 0.8}]}>
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "#2B2560" : "#ede9fe", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
              <Ionicons name="albums" size={16} color={isDark ? "#B5A8FF" : "#7c3aed"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: textMain, marginBottom: 4 }} numberOfLines={1}>Flashcards</Text>
              <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.8)" : textSub }} numberOfLines={1}>{(quiz.flashcards || []).length} Cards</Text>
            </View>
            <Feather name="chevron-right" size={16} color={isDark ? "#FFFFFF" : "#9ca3af"} style={{ opacity: isDark ? 0.8 : 1 }} />
          </Pressable>
        </View>
        <Pressable 
          onPress={() => handleHostBattle(quiz.id, "insights")} 
          style={({pressed}) => [{ 
            backgroundColor: cardBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, 
            borderWidth: 1, borderColor: border, flexDirection: "row", alignItems: "center", marginBottom: 32
          }, pressed && {opacity: 0.8}]}
        >
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "rgba(244,63,94,0.15)" : "#ffe4e6", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
            <Ionicons name="flame" size={18} color={isDark ? "#FB7185" : "#e11d48"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: textMain, marginBottom: 4 }} numberOfLines={1}>Multiplayer Battle</Text>
            <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.8)" : textSub }} numberOfLines={1}>Challenge a friend in real-time</Text>
          </View>
          <Feather name="chevron-right" size={16} color={isDark ? "#FFFFFF" : "#9ca3af"} style={{ opacity: isDark ? 0.8 : 1 }} />
        </Pressable>




        {/* Continue Last Attempt (if one exists) */}
        {savedSessions[quiz.id] && (
          <View style={{ marginBottom: 32 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: textSub, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, marginLeft: 4 }}>In Progress</Text>
            <Pressable 
              onPress={() => {
                setActiveSession(savedSessions[quiz.id]);
                setViewingInsightsQuizFromTab(activeTab);
                setActiveTab("quiz-active" as any);
              }}
              style={({pressed}) => [{ 
                backgroundColor: cardBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, 
                borderWidth: 1, borderColor: isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.5)", 
                flexDirection: "row", alignItems: "center"
              }, pressed && {opacity: 0.8}]}
            >
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#f59e0b", marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: textMain, marginBottom: 4 }}>Resume Attempt #{attempts.length + 1}</Text>
                <Text style={{ fontSize: 13, color: textSub }}>
                  {Object.keys(savedSessions[quiz.id].answers || {}).length} / {(savedSessions[quiz.id].questions || []).length} completed
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#f59e0b" }}>Continue</Text>
                <Feather name="arrow-right" size={16} color="#f59e0b" />
              </View>
            </Pressable>
          </View>
        )}

        {/* Past Attempts */}
        <Text style={{ fontSize: 12, fontWeight: "600", color: textSub, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, marginLeft: 4 }}>
          {savedSessions[quiz.id] ? "Past Attempts" : "Attempt History"}
        </Text>
        {attempts.length === 0 ? (
          <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: isDark ? "#2A3050" : "#d1d5db", borderRadius: 16, padding: 24, alignItems: "center" }}>
            <Ionicons name="bar-chart" size={24} color={isDark ? "#4B5165" : "#9ca3af"} style={{ marginBottom: 12 }} />
            <Text style={{ fontSize: 14, fontWeight: "500", color: textSub, marginBottom: 4 }}>No attempts yet</Text>
            <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9ca3af", textAlign: "center" }}>Take a test to start tracking scores.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {attempts.slice(0, expandedAttemptsMap[quiz.id] ? attempts.length : 3).map((attempt: any, index: number) => {
              const attemptNum = attempts.length - index;
              const isRetry = attempt.mode === "retry";
              return (
                <Pressable
                  key={attempt.id || index}
                  onPress={() => setSelectedAttemptForModal({ quizId: quiz.id, attempt, attemptNum })}
                  style={({pressed}) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: cardBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: border }, pressed && {opacity: 0.8}]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: textMain }}>Attempt #{attemptNum}</Text>
                      {isRetry && (
                        <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 10, fontWeight: "600", color: textSub }}>Retry of #{attempt.retryOfAttemptNum}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: textSub }}>{attempt.correct} correct · {attempt.wrong} wrong · {attempt.skipped} skipped</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "500", color: textMain }}>{attempt.score}%</Text>
                    <Feather name="chevron-right" size={18} color={textSub} />
                  </View>
                </Pressable>
              );
            })}
            
            {attempts.length > 3 && !expandedAttemptsMap[quiz.id] && (
              <Pressable
                onPress={() => setExpandedAttemptsMap(prev => ({ ...prev, [quiz.id]: true }))}
                style={({pressed}) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, marginTop: 4, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: 12 }, pressed && {opacity: 0.7}]}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: textMain }}>View all attempts</Text>
                <Feather name="arrow-down" size={16} color={textMain} style={{ marginLeft: 6 }} />
              </Pressable>
            )}
            
            {attempts.length > 3 && expandedAttemptsMap[quiz.id] && (
              <Pressable
                onPress={() => setExpandedAttemptsMap(prev => ({ ...prev, [quiz.id]: false }))}
                style={({pressed}) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, marginTop: 4 }, pressed && {opacity: 0.7}]}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: textSub }}>Show less</Text>
                <Feather name="chevron-up" size={16} color={textSub} style={{ marginLeft: 6 }} />
              </Pressable>
            )}
          </View>
        )}
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
      let isAllCorrect = false;
      const currentQuestion = activeSession.questions.find((q: any) => q.id === questionId);
      if (currentQuestion) {
        const selected = activeSession.answers[questionId] || [];
        const correctIds = currentQuestion.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
        isAllCorrect = selected.length === correctIds.length && selected.every((id: string) => correctIds.includes(id));
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

      if (activeSession.isBattle) {
        const cIndex = activeSession.currentIndex;
        setTimeout(() => {
          if (cIndex < activeSession.questions.length - 1) {
            const nextIdx = cIndex + 1;
            handleNavigateSession(nextIdx);
            quizFlatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
          } else {
            handleFinishSession();
          }
        }, 700);
      } else if (autoSlideEnabled && isAllCorrect && (activeSession.showAnswerOnSubmit || activeSession.isBattle)) {
        const cIndex = activeSession.currentIndex;
        setTimeout(() => {
          if (cIndex < activeSession.questions.length - 1) {
            const nextIdx = cIndex + 1;
            handleNavigateSession(nextIdx);
            quizFlatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
          }
        }, 800);
      }
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
      
      const correctIds = question.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
      const isAllCorrect = currentAnswers.length === correctIds.length && currentAnswers.every((id: string) => correctIds.includes(id));

      if ((activeSession.showAnswerOnSubmit || activeSession.isBattle) && !submitted.includes(question.id)) {
        submitted.push(question.id);
        
        // Play correct/wrong sound
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

      if (activeSession.isBattle) {
        const cIndex = activeSession.currentIndex;
        const isLast = cIndex >= activeSession.questions.length - 1;
        setTimeout(() => {
          if (!isLast) {
            const nextIdx = cIndex + 1;
            handleNavigateSession(nextIdx);
            quizFlatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
          } else {
            handleFinishSession();
          }
        }, isLast ? 0 : 700);
      } else if (autoSlideEnabled && isAllCorrect && (activeSession.showAnswerOnSubmit || activeSession.isBattle)) {
        const cIndex = activeSession.currentIndex;
        setTimeout(() => {
          if (cIndex < activeSession.questions.length - 1) {
            const nextIdx = cIndex + 1;
            handleNavigateSession(nextIdx);
            quizFlatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
          }
        }, 800);
      }
    }
  };

  const handleNavigateSession = (idx: number) => {
    const session = activeSessionRef.current || activeSession;
    if (!session) return;
    setActiveSession({
      ...session,
      currentIndex: idx
    });
    quizNumbersScrollRef.current?.scrollTo({ x: Math.max(0, idx * 48 - SCREEN_WIDTH / 2 + 24), animated: true });
  };

  /** Persist a battle result into local history and clear it from pending queue */
  const saveBattleResult = (roomCode: string, myScore: number, opponentScore: number, opponentName: string, quizTitle: string, effectiveWin: boolean, myTime?: number, opponentTime?: number) => {
    const entry = {
      date: Date.now(),
      roomCode,
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
    const session = activeSessionRef.current || activeSession;
    if (!session) return;
    const totalQs = session.questions.length;
    const answeredCount = Object.keys(session.answers).length;
    const unanswered = totalQs - answeredCount;

    const finish = () => {
      playSuccessSound();
      const currentSession = activeSessionRef.current || activeSession;
      const finishedSession = {
        ...currentSession,
        isFinished: true
      };

      if (currentSession.isBattle) {
        const totalTimeMs = Date.now() - (currentSession.startTime || Date.now());
        const roomCode = currentSession.battleRoomCode;
        if (roomCode) {
          const host = currentSession.isHost;
          markPlayerFinished(roomCode, host, totalTimeMs).catch(console.error);
          
          AsyncStorage.getItem("pending_battles").then(val => {
            let pending = [];
            try { if (val) pending = JSON.parse(val); } catch {}
            if (!pending.find((p: any) => p.code === roomCode)) {
              pending.push({ code: roomCode, isHost: host });
              AsyncStorage.setItem("pending_battles", JSON.stringify(pending));
            }
          });
        }
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

  const handleImportQst = (text: string, fileName: string, sourceUri?: string) => {
    try {
      const parsed = parseQstText(text);
      if (parsed.questions.length === 0) {
        throw new Error("No questions found. Scorr format requires questions starting with '?' and answers starting with '+' or '-'.");
      }
      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      if (sourceUri && Platform.OS !== "web") {
        const safeName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const destUri = `${FileSystem.documentDirectory}quiz_file_${localId}_${safeName}`;
        FileSystem.copyAsync({ from: sourceUri, to: destUri })
          .then(() => AsyncStorage.setItem(`quiz_file_${localId}`, destUri))
          .catch(e => console.log("Failed to save file", e));
      }

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
      setActiveTab("insights");
      setViewingInsightsQuiz(newQuiz);
      setViewingInsightsQuizFromTab("home");
      setCreationMode("pick");

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
              prev.map((q) => q.id === localId ? { ...q, neonId: saved.id } : q)
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
  const attemptedIds: Set<string> = new Set([
    ...(selectedQuiz?.uniqueCorrectIds || []),
    ...(selectedQuiz?.wrongQuestions || []).map((w: any) => w.id || w)
  ]);
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

  // ── Persist flashcard decks (SM2 ratings) ────────────────────────────────
  useEffect(() => {
    if (!dataLoaded) return;
    AsyncStorage.setItem(
      `quizforge_flashcard_decks`,
      JSON.stringify(flashcardDecks)
    ).catch(e => console.warn("[Persist] flashcard decks save failed:", e));
  }, [flashcardDecks, dataLoaded]);

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
  const [aiGenPhase, setAiGenPhase] = useState<null | "select" | "generating">(null);
  const [pendingAiFile, setPendingAiFile] = useState<{ text: string; fileName: string } | null>(null);

  const [fcTitle, setFcTitle] = useState("");
  const [fcCategory, setFcCategory] = useState("");
  const [fcCards, setFcCards] = useState<{ front: string; back: string }[]>([{ front: "", back: "" }]);
  const [fcCurrentIdx, setFcCurrentIdx] = useState(0);
  const [studyCardIdx, setStudyCardIdx] = useState(0);
  const [studyQueue, setStudyQueue] = useState<string[]>([]);
  const [studyQueueTotal, setStudyQueueTotal] = useState<number>(0);
  const [customStudyMode, setCustomStudyMode] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [noDueAtStart, setNoDueAtStart] = useState(false); // true when deck had 0 due before the session started
  // ── Study Mode Modal ──
  const [studyModeModalVisible, setStudyModeModalVisible] = useState(false);
  const [selectedStudyMode, setSelectedStudyMode] = useState<"spaced" | "simple">("spaced");
  const [studyCardCount, setStudyCardCount] = useState<"auto" | 10 | 20>("auto");
  const [studyFlipped, setStudyFlipped] = useState(false);
  const [sessionRatings, setSessionRatings] = useState({ perfect: 0, good: 0, hard: 0, again: 0 });
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const insightsFlipAnim = useRef(new Animated.Value(0)).current;
  const insightsSwipeX = useRef(new Animated.Value(0)).current;
  const insightsSwipeY = useRef(new Animated.Value(0)).current;
  const buttonSlideX = useRef(new Animated.Value(0)).current;

  // Stable refs so panResponder callbacks always read latest values
  React.useEffect(() => { fcIndexRef.current = fcIndex; }, [fcIndex]);
  React.useEffect(() => { viewingInsightsQuizRef.current = viewingInsightsQuiz; }, [viewingInsightsQuiz]);

  const insightsPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 5 || Math.abs(dy) > 5,
    // setValue has no driver concept — avoids native/JS driver clash entirely
    onPanResponderMove: (_, { dx, dy }) => {
      insightsSwipeX.setValue(dx);
      insightsSwipeY.setValue(dy);
    },
    onPanResponderRelease: (_, { dx, vx }) => {
      const cards = (viewingInsightsQuizRef.current?.flashcards) || [];
      const idx = fcIndexRef.current;
      const W = Dimensions.get('window').width;
      const doSwipe = (dir: 'left' | 'right') => {
        if (dir === 'left' && idx === cards.length - 1) {
          Animated.parallel([
            Animated.spring(insightsSwipeX, { toValue: 0, useNativeDriver: true, friction: 6 }),
            Animated.spring(insightsSwipeY, { toValue: 0, useNativeDriver: true, friction: 6 }),
          ]).start();
          return;
        }
        if (dir === 'right' && idx === 0) {
          Animated.parallel([
            Animated.spring(insightsSwipeX, { toValue: 0, useNativeDriver: true, friction: 6 }),
            Animated.spring(insightsSwipeY, { toValue: 0, useNativeDriver: true, friction: 6 }),
          ]).start();
          return;
        }

        const outVal = dir === 'right' ? W : -W;
        Animated.parallel([
          Animated.timing(insightsSwipeX, { toValue: outVal, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(insightsSwipeY, { toValue: 0, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(() => {
          if (dir === 'left') {
            setFcIndex(idx + 1);
          } else {
            setFcIndex(idx - 1);
          }
          setFcFlipped(false);
          insightsFlipAnim.setValue(0);
          
          insightsSwipeX.setValue(dir === 'left' ? W : -W);
          insightsSwipeY.setValue(0);
          
          setTimeout(() => {
            Animated.timing(insightsSwipeX, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
          }, 16);
        });
      };
      if (dx > 80 || vx > 1.2) doSwipe('right');
      else if (dx < -80 || vx < -1.2) doSwipe('left');
      else Animated.parallel([
        Animated.spring(insightsSwipeX, { toValue: 0, useNativeDriver: true, friction: 6 }),
        Animated.spring(insightsSwipeY, { toValue: 0, useNativeDriver: true, friction: 6 }),
      ]).start();
    },
    onPanResponderTerminate: () => {
      Animated.parallel([
        Animated.spring(insightsSwipeX, { toValue: 0, useNativeDriver: true, friction: 6 }),
        Animated.spring(insightsSwipeY, { toValue: 0, useNativeDriver: true, friction: 6 }),
      ]).start();
    },
  })).current;
  const [insightsKnown, setInsightsKnown] = useState(0);
  const [insightsUnknown, setInsightsUnknown] = useState(0);
  const swipeX   = useRef(new Animated.Value(0)).current;
  const studyTiltAnim = useRef(new Animated.Value(0)).current;
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
  const [selectedRating, setSelectedRating] = useState<string | null>(null);
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

  const handleShareQuiz = async (quiz: any) => {
    try {
      if (Platform.OS === "web") {
        Alert.alert("Not Available", "Sharing is not available on web.");
        return;
      }
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Not Available", "Sharing is not available on this device.");
        return;
      }
      
      const fileUri = await AsyncStorage.getItem(`quiz_file_${quiz.id}`);
      if (!fileUri) {
        Alert.alert("Error", "Original file not found.");
        return;
      }
      
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        Alert.alert("Error", "Original file not found on disk.");
        return;
      }
      
      await Sharing.shareAsync(fileUri, { dialogTitle: `Share ${quiz.title}` });
    } catch (err: any) {
      Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? err.message : getUserErrorMessage(err));
    }
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
    setActiveTab("home");

    console.log("[NeonSync-Manual] Saving manually created quiz:", newQuiz.title);
    console.log("[NeonSync-Manual] firebaseUser exists:", !!firebaseUser, firebaseUser ? firebaseUser.email : null);
    console.log("[NeonSync-Manual] neonUserReadyRef.current status:", neonUserReadyRef.current);

    if (firebaseUser && neonUserReadyRef.current) {
      if (!isConnected) {
        setSyncToastMessage("Offline. Changes will sync automatically.");
        setTimeout(() => setSyncToastMessage(null), 3000);
      }
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
            prev.map((q) => q.id === localId ? { ...q, neonId: saved.id } : q)
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

  const handleGenerateWithAI = async (text: string, fileName: string) => {
    isBackgroundGen.current = false;
    setAiGenPhase("generating");
    try {
      const { key, prompt: backendPrompt, error: keyError } = await fetchGeminiKey();
      if (keyError || !key) {
        throw new Error(keyError || "Could not fetch AI configuration from server.");
      }
      
      const GEMINI_URL = `https://asia-south1-aiplatform.googleapis.com/v1/projects/guardian-495515/locations/asia-south1/publishers/google/models/gemini-3.5-flash:generateContent?key=${key}`;
      
      const docSize = text.length;
      let minFlashcards = "20";
      let minMcqs = "20";
      if (docSize < 10000) {
        minFlashcards = "20";
        minMcqs = "20";
      } else if (docSize >= 10000 && docSize < 30000) {
        minFlashcards = "30-50";
        minMcqs = "25-40";
      } else if (docSize >= 30000 && docSize < 60000) {
        minFlashcards = "50-80";
        minMcqs = "40-60";
      } else if (docSize >= 60000 && docSize < 100000) {
        minFlashcards = "80-120";
        minMcqs = "60-100";
      } else {
        minFlashcards = "120-200";
        minMcqs = "100-150";
      }

      const CHUNK_SIZE = 50000;
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE));
      const CONCURRENCY = 3;
      const results: string[] = [];
      for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const batch = chunks.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(
          batch.map(chunk => {
            const promptTemplate = backendPrompt || MCQ_PROMPT("");
            let fullPrompt = promptTemplate;
            fullPrompt = fullPrompt.replace(/\{\{MIN_FLASHCARDS\}\}/g, minFlashcards);
            fullPrompt = fullPrompt.replace(/\{\{MIN_MCQS\}\}/g, minMcqs);

            if (fullPrompt.includes("[PASTE YOUR TEXT HERE]")) {
              fullPrompt = fullPrompt.replace("[PASTE YOUR TEXT HERE]", chunk);
            } else if (fullPrompt.includes("{{TEXT}}")) {
              fullPrompt = fullPrompt.replace("{{TEXT}}", chunk);
            } else if (fullPrompt.includes("[The extracted document text is inserted here]")) {
              fullPrompt = fullPrompt.replace("[The extracted document text is inserted here]", chunk);
            } else {
              fullPrompt = backendPrompt ? `${fullPrompt}\n\nText:\n${chunk}` : MCQ_PROMPT(chunk);
            }

            return fetch(GEMINI_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }], generationConfig: { maxOutputTokens: 65536, temperature: 0.2 } }),
            }).then(async r => { if (!r.ok) throw new Error((await r.json())?.error?.message || r.statusText); return (await r.json())?.candidates?.[0]?.content?.parts?.[0]?.text || ""; });
          })
        );
        results.push(...batchResults);
      }
      const raw = results.join("\n");
      const parsed = parseQstText(raw);
      if (parsed.questions.length === 0) throw new Error("Gemini didn't return any valid questions.");
      const localId = `ai_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const title = (parsed.title || fileName).replace(/\.[^.]+$/, "");
      const newQuiz: any = { id: localId, title, questions: parsed.questions.length, category: "AI Generated", time: "Just now", flashcards: parsed.flashcards || [], questionsList: parsed.questions.map((q: any) => ({ ...q, answers: [...q.answers].sort(() => Math.random() - 0.5) })), attempts: [], wrongQuestions: [], uniqueCorrectIds: [] };
      setQuizzes((prev: any[]) => [...prev, newQuiz]);
      if (isBackgroundGen.current) {
        setBackgroundQuizReady(newQuiz);
        isBackgroundGen.current = false;
      } else {
        setAiGenPhase(null);
        setTimeout(() => {
          setActiveTab("insights");
          setViewingInsightsQuiz(newQuiz);
          setViewingInsightsQuizFromTab("home");
        }, 300);
      }
      if (firebaseUser && neonUserReadyRef.current) {
        const sourceText = `@title: ${title}\n@category: AI Generated\n\n` + raw;
        createMobileQuiz({ userId: firebaseUser.uid, title, category: "AI Generated", questionCount: parsed.questions.length, sourceText }).then(({ quiz: saved, error }) => {
          if (saved && !error) setQuizzes((prev: any[]) => prev.map((q) => q.id === localId ? { ...q, neonId: saved.id } : q));
        });
      }
    } catch (err: any) {
      if (!isBackgroundGen.current) {
        setAiGenPhase(null);
      } else {
        isBackgroundGen.current = false;
      }
      let errMsg = err.message || "Unknown error";
      if (errMsg.includes("generativelanguage.googleapis.com") || errMsg.includes("UnknownHostException") || errMsg.includes("Network request failed")) {
         errMsg = "Network error: Please check your internet connection.";
      }
      if (Platform.OS === "web") alert("AI generation failed: " + errMsg);
      else Alert.alert("Generation Failed", typeof __DEV__ !== 'undefined' && __DEV__ ? errMsg : getUserErrorMessage(errMsg));
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
        {/* Offline Banner for Battle */}
        {activeSession.isBattle && (!isConnected || showReconnectedToast) && !offlineModalParams && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: isConnected ? "#34d399" : "#fbbf24", paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}>
            <Ionicons name={isConnected ? "checkmark-circle" : "warning"} size={16} color={isConnected ? "#064e3b" : "#78350f"} />
            <Text style={{ color: isConnected ? "#064e3b" : "#78350f", fontSize: 13, fontWeight: "700" }}>{isConnected ? "Reconnected" : "Connection lost. Reconnecting..."}</Text>
          </View>
        )}
        {/* Session Header / Battle Header */}
        {activeSession.isBattle ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
            backgroundColor: settingsDarkMode ? "#0a1020" : "#f4f4f8", borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>

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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
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
              {(activeSession.quizTimeLimit != null || activeSession.timePerQuestion != null) && (
                <View style={[styles.sessionTimerBox, sessionTimeLeft <= 30 && { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" }]}>
                  <Ionicons name="time-outline" size={13} color={sessionTimeLeft <= 30 ? "#ef4444" : "#00e5a0"} style={{ marginRight: 4 }} />
                  <Text style={[styles.sessionTimerText, sessionTimeLeft <= 30 && { color: "#ef4444" }]}>
                    {`${String(Math.floor(sessionTimeLeft / 60)).padStart(2, "0")}:${String(sessionTimeLeft % 60).padStart(2, "0")}`}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => setShowQuizSettingsModal(true)}
                style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: settingsDarkMode ? "#334155" : "#e1e4e8", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="settings" size={18} color={settingsDarkMode ? "#94a3b8" : "#24292f"} />
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
          {activeSession.isBattle || activeSession.timePerQuestion != null ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: settingsDarkMode ? "#e2e8f0" : "#334155" }}>
                Question {currentIndex + 1} of {totalQs}
              </Text>
            </View>
          ) : (
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
                textColor = settingsDarkMode ? "#ffffff" : "#0f172a";
              } else if (!activeSession.showAnswerOnSubmit && isAnswered) {
                 // if answered but not submitted yet (like in a mock test)
                 bgColor = settingsDarkMode ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0";
                 textColor = settingsDarkMode ? "#f1f5f9" : "#0f172a";
              }



              return (
                <Pressable
                  key={q.id}
                  onPress={() => {
                    if (activeSession.isBattle) return; // Disable navigation in battle mode
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
          )}
        </View>

        <FlatList
          ref={quizFlatListRef}
          data={activeSession.questions}
          keyExtractor={(item: any) => item.id}
          horizontal
          pagingEnabled
          scrollEnabled={!activeSession.isBattle && activeSession.timePerQuestion == null}
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
                  {activeSession.isBattle && (
                    <View style={{ marginBottom: 16, marginTop: 4 }}>
                      <View style={{ backgroundColor: "rgba(99,102,241,0.1)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(99,102,241,0.25)" }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#818cf8", letterSpacing: 1 }}>QUESTION {qIdx + 1}</Text>
                      </View>
                    </View>
                  )}

                  <Text 
                    style={{ fontSize: 18, color: activeSession.isBattle ? "#f1f5f9" : (settingsDarkMode ? "#f1f5f9" : "#24292f"), lineHeight: 28, marginBottom: 20, textAlign: "left", fontWeight: activeSession.isBattle ? "600" : "500" }}
                  >
                    {qst.prompt}
                  </Text>

                  {qst.imageUrl && (
                    <Image 
                      source={{ uri: qst.imageUrl }} 
                      style={{ width: "100%", height: 200, borderRadius: 12, marginBottom: 20, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} 
                      resizeMode="contain" 
                    />
                  )}

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
                      let circleBg = settingsDarkMode ? "transparent" : "#f1f5f9";
                      let circleBorder = settingsDarkMode ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1";
                      let textColor = settingsDarkMode ? "#e2e8f0" : "#24292f";

                      if (correctHighlight) {
                        containerBg = "rgba(34,197,94,0.15)";
                        containerBorder = "#22c55e";
                        circleBg = "#22c55e";
                        circleBorder = "#22c55e";
                        textColor = settingsDarkMode ? "#ffffff" : "#0f172a";
                      } else if (wrongHighlight) {
                        containerBg = "rgba(239,68,68,0.15)";
                        containerBorder = "#ef4444";
                        circleBg = "#ef4444";
                        circleBorder = "#ef4444";
                        textColor = settingsDarkMode ? "#ffffff" : "#0f172a";
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
                            paddingVertical: 16, paddingHorizontal: 16, borderRadius: 16,
                            backgroundColor: containerBg,
                            borderWidth: 1,
                            borderBottomWidth: 3,
                            borderColor: containerBorder,
                          }, pressed && !effectiveShowResult && { opacity: 0.7, transform: [{ scale: 0.99 }] }]}
                        >
                          <View style={{
                            width: 28, height: 28, borderRadius: 14, overflow: "hidden",
                            backgroundColor: circleBg, borderWidth: 1, borderColor: circleBorder,
                            alignItems: "center", justifyContent: "center", marginRight: 14,
                          }}>
                            <Text style={{ fontSize: 12, fontWeight: "800",
                              color: (correctHighlight || wrongHighlight) ? "#fff" :
                                (isSelected && !effectiveShowResult) ? (settingsDarkMode ? "#000000" : "#ffffff") :
                                (settingsDarkMode ? "#cbd5e1" : "#475569") }}>
                              {String.fromCharCode(65 + idx)}
                            </Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 15, color: textColor, lineHeight: 22,
                            fontWeight: "500" }}>
                            {answer.text}
                          </Text>
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
              setBattlePopup({ myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin, myTime, opponentTime: oppTime });
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
              <Pressable
                onPress={() => {
                  if (activeSession?.battleRoomCode) {
                    getBattleRoom(activeSession.battleRoomCode).then(data => {
                      if (data) setBattleRoomState(data);
                    });
                  }
                }}
                style={({ pressed }) => [{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }, pressed && { opacity: 0.7 }]}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#818cf8" : "#6366f1" }}>Refresh Status</Text>
              </Pressable>
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
    const reportCardQs: any[] = [];

    questions.forEach((q: any) => {
      const selected = activeSession.answers[q.id] || [];
      const correctIds = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
      
      let status = "skipped";
      if (selected.length === 0) {
        skippedCount++;
      } else {
        const isAllCorrect = selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
        if (isAllCorrect) {
          status = "correct";
          correctCount++;
        } else {
          status = "wrong";
          wrongCount++;
          wrongQsForQuiz.push({
            id: q.id,
            prompt: q.prompt,
            imageUrl: q.imageUrl,
            selected: q.answers.filter((a: any) => selected.includes(a.id)).map((a: any) => a.text).join(", "),
            correct: q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.text).join(", "),
          });
        }
      }

      reportCardQs.push({
        id: q.id,
        prompt: q.prompt,
        explanation: q.explanation,
        status,
        selectedTexts: q.answers.filter((a: any) => selected.includes(a.id)).map((a: any) => a.text),
        correctTexts: q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.text),
      });
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
        timePerQuestion: activeSession.timePerQuestion || null,
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
      <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc" }}>
        {/* Header with Close Button */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 0 }}>
          <Text style={{ fontSize: 24, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Quiz Results</Text>
          <Pressable onPress={() => saveAndExitQuizSession(true)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}>
            <Ionicons name="close" size={28} color={settingsDarkMode ? "#ffffff" : "#111827"} />
          </Pressable>
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Mascot */}
          <View style={{ alignItems: "center", marginBottom: 32, marginTop: 4 }}>
            {/* Mascot Placeholder */}
            <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="robot-happy" size={72} color="#00e5a0" />
              <View style={{ position: "absolute", bottom: -10, flexDirection: "row", gap: 6 }}>
                <View style={{ width: 16, height: 8, backgroundColor: "#00e5a0", borderRadius: 4, transform: [{rotate: "-20deg"}] }} />
                <View style={{ width: 20, height: 10, backgroundColor: "#00e5a0", borderRadius: 5 }} />
                <View style={{ width: 16, height: 8, backgroundColor: "#00e5a0", borderRadius: 4, transform: [{rotate: "20deg"}] }} />
              </View>
            </View>
          </View>

          {/* Score Box */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Text style={{ fontSize: 48, fontWeight: "800", color: "#84cc16" }}>{scorePct}%</Text>
            <Text style={{ fontSize: 15, color: settingsDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)", marginTop: 4 }}>
              {correctCount} out of {totalQs} correct
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#84cc16", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="checkmark-sharp" size={22} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{correctCount} Correct</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close-sharp" size={22} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{wrongCount} Incorrect</Text>
            </View>
          </View>

          {/* Answered Box */}
          <View style={{ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#0284c7", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}>{totalQs}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{totalQs} Answered</Text>
          </View>

          {/* Streak Box */}
          <View style={{ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(245, 158, 11, 0.2)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="flame" size={24} color="#f59e0b" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Streak: {dayStreak} day{dayStreak !== 1 ? 's' : ''}</Text>
          </View>

          {/* Report Card Button */}
          <Pressable 
            onPress={() => setShowWrongReview(true)}
            style={({pressed}) => ({ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", opacity: pressed ? 0.8 : 1 })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Text style={{ fontSize: 24 }}>📝</Text>
              <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Review Answers</Text>
            </View>
            <Feather name="chevron-right" size={22} color={settingsDarkMode ? "#ffffff" : "#111827"} />
          </Pressable>

          {/* Report Card Modal */}
          <Modal visible={showWrongReview} animationType="slide" transparent={false} onRequestClose={() => setShowWrongReview(false)}>
            <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                <Text style={{ fontSize: 20, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Report Card</Text>
                <Pressable onPress={() => setShowWrongReview(false)} style={{ padding: 8 }}>
                  <Ionicons name="close" size={28} color={settingsDarkMode ? "#ffffff" : "#111827"} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 100 }}>
                {reportCardQs.map((q: any, idx: number) => (
                  <View key={q.id} style={{ backgroundColor: settingsDarkMode ? "#161b2e" : "#ffffff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                    <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827", marginBottom: 16, lineHeight: 24 }}>
                      {idx + 1}. {q.prompt}
                    </Text>
                    <View style={{ height: 1, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", marginBottom: 16 }} />
                    
                    <Text style={{ fontSize: 13, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#111827", marginBottom: 12 }}>
                      Your answer:
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                      <View style={{ flex: 1 }}>
                        {q.status === "skipped" ? (
                          <Text style={{ fontSize: 15, color: settingsDarkMode ? "#ef4444" : "#dc2626", marginBottom: 16 }}>
                            Skipped
                          </Text>
                        ) : (
                          q.selectedTexts.map((text: string, i: number) => (
                            <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: i < q.selectedTexts.length - 1 ? 8 : 0 }}>
                              {q.status === "wrong" && <Ionicons name="close" size={16} color="#ef4444" style={{ marginTop: 2, marginRight: 8 }} />}
                              {q.status === "correct" && <Ionicons name="checkmark" size={16} color="#4ade80" style={{ marginTop: 2, marginRight: 8 }} />}
                              <Text style={{ flex: 1, fontSize: 15, color: settingsDarkMode ? (q.status === "wrong" ? "#fca5a5" : "#cbd5e1") : (q.status === "wrong" ? "#b91c1c" : "#334155"), lineHeight: 22 }}>
                                {text}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                      <View style={{ marginLeft: 16 }}>
                        {q.status === "wrong" ? (
                          <Ionicons name="close-circle" size={24} color="#ef4444" />
                        ) : q.status === "correct" ? (
                          <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                        ) : null}
                      </View>
                    </View>
                    
                    <Text style={{ fontSize: 13, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#111827", marginBottom: 12 }}>
                      Correct Answer:
                    </Text>
                    <View style={{ backgroundColor: "#65a30d", borderRadius: 8, padding: 16, marginBottom: q.explanation ? 16 : 0 }}>
                      {q.correctTexts.map((text: string, i: number) => (
                        <Text key={i} style={{ fontSize: 15, color: "#ffffff", fontWeight: "500", lineHeight: 22, marginBottom: i < q.correctTexts.length - 1 ? 8 : 0 }}>
                          {text}
                        </Text>
                      ))}
                    </View>

                    {q.explanation && (
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#111827", marginBottom: 8 }}>
                          Tip to remember:
                        </Text>
                        <Text style={{ fontSize: 14, color: settingsDarkMode ? "#cbd5e1" : "#475569", lineHeight: 20 }}>
                          {q.explanation}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </Modal>

        </ScrollView>

        {/* Bottom Pinned Continue Button */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingVertical: 20, paddingTop: 10, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc" }}>
          <Pressable
            onPress={() => saveAndExitQuizSession(true)}
            style={({ pressed }) => ({
              backgroundColor: "#ffffff",
              borderRadius: 16,
              height: 56,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1,
              shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>Continue</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // ── SM-2 Spaced Repetition Logic ──
  const startStudy = (deck: any, custom: boolean = false) => {
    setCustomStudyMode(custom);

    // Use the current in-state version of the deck so we never lose saved SM2 ratings.
    // Fall back to the passed deck only if it's not in state yet (e.g. brand new deck).
    const stateDeck = flashcardDecks.find((d: any) => d.id === deck.id) || deck;

    const updatedDeck = {
      ...stateDeck,
      cards: (stateDeck.cards || []).map((c: any) => ({
        ...c,
        id: c.id || Date.now().toString() + Math.random().toString(),
        sm2_interval: c.sm2_interval ?? 0,
        sm2_repetition: c.sm2_repetition ?? 0,
        sm2_easeFactor: c.sm2_easeFactor ?? 2.5,
        sm2_state: c.sm2_state ?? CardState.NEW,
      }))
    };
    
    const nowWithBuffer = Date.now() + 5000;
    const due = custom 
      ? updatedDeck.cards 
      : updatedDeck.cards.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= nowWithBuffer);
    
    setStudyQueue(due.map((c: any) => c.id));
    setStudyQueueTotal(due.length);
    setStudyingDeck(updatedDeck);
    setStudyFlipped(false);
    flipAnim.setValue(0);
    swipeX.setValue(0);
    setStudyTypedAnswer("");
    setStudyChecked(false);
    setIsPreviewMode(false);
    setNoDueAtStart(false); // real session — always show "Next steps" on completion
    setSessionRatings({ perfect: 0, good: 0, hard: 0, again: 0 });
  };



  const handleSM2Rating = (rating: "again" | "hard" | "good" | "easy" | "perfect") => {
    if (!studyingDeck || studyQueue.length === 0 || selectedRating !== null) return;
    
    // Convert "easy" to "perfect" for our tracking
    const trackingRating = rating === "easy" ? "perfect" : rating;
    setSessionRatings(prev => ({ ...prev, [trackingRating]: prev[trackingRating] + 1 }));
    
    setSelectedRating(rating);
    Animated.timing(swipeX, {
      toValue: -Dimensions.get("window").width,
      duration: 150,
      useNativeDriver: true
    }).start(() => {
      const cardId = studyQueue[0];
      const currentCard = studyingDeck.cards.find((c: any) => c.id === cardId);
      if (!currentCard) {
        swipeX.setValue(0);
        setSelectedRating(null);
        return;
      }

      let newQueue = [...studyQueue.slice(1)];
      
      const updatedCard = Scheduler.schedule(currentCard, rating);
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

      setStudyQueue(newQueue);
      setStudyFlipped(false);
      flipAnim.setValue(0);
      setStudyTypedAnswer("");
      setStudyChecked(false);
      setSelectedRating(null);

      if (newQueue.length > 0) {
        swipeX.setValue(Dimensions.get("window").width);
        Animated.timing(swipeX, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true
        }).start();
      } else {
        swipeX.setValue(0);
      }
    });
  };

  /** Opens battle options sheet – does NOT create room yet */
  const handleHostBattle = (quizId: string, source: "lobby" | "insights" = "lobby") => {
    let q = quizId === "sample_quiz" ? sampleQuiz : quizzes.find((q) => q.id === quizId);
    if (!q && viewingInsightsQuiz?.id === quizId) {
      q = viewingInsightsQuiz;
    }
    if (!q) {
      Alert.alert("Error", "Quiz not found. Please try again.");
      return;
    }
    setBattleOptionsSource(source);
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
    if (!isConnected) {
      setOfflineModalParams({
        title: "Can't Create Battle",
        message: "An internet connection is required to create a battle."
      });
      return;
    }
    const q = battleOptionsQuiz;
    if (!q) return;

    setBattleError("");
    setBattleConnError("");
    setBattleCreating(true); // show loading inside modal
    try {
      let qsList: any[] = q.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (q.questionsList || []);
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
      setActiveTab("battle" as any); // transition to Battle Lobby
      if (battleUnsubscribeRef.current) battleUnsubscribeRef.current();
      battleUnsubscribeRef.current = listenToBattleRoom(code, (data) => {
        setBattleRoomState(data);
        if (data.status === "playing" && !battleStartedRef.current) {
          battleStartedRef.current = true;
          setBattleCountdown(3);
          let c = 3;
          const iv = setInterval(() => {
            c--;
            if (c > 0) setBattleCountdown(c);
            else { clearInterval(iv); setBattleCountdown(null); startBattleSession(data, true); }
          }, 1000);
        }
      });
    } catch (e: any) {
      setBattleCreating(false);
      setBattleError(e.message || "Failed to create room. Check your connection and try again.");
    }
  };

  const handleJoinBattle = async () => {
    if (!isConnected) {
      setOfflineModalParams({
        title: "Can't Join Battle",
        message: "You're offline. Connect to the internet and try again."
      });
      return;
    }
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
            setBattleCountdown(3);
            let c = 3;
            const iv = setInterval(() => {
              c--;
              if (c > 0) setBattleCountdown(c);
              else { clearInterval(iv); setBattleCountdown(null); startBattleSession(data, false); }
            }, 1000);
          }
        });
        setJoinCodeInput("");
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

    const bg      = isDark ? "#0B0F1E" : "#f4f4f8";
    const cardBg  = isDark ? "#141930" : "#ffffff";
    const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0";
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <AnimatedPressable
                onPress={() => setActiveTab("home" as any)}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  alignItems: "center", justifyContent: "center"
                }}
              >
                <Ionicons name="chevron-back" size={20} color={isDark ? "#ffffff" : "#000000"} />
              </AnimatedPressable>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialCommunityIcons name="sword-cross" size={19} color={isDark ? "#818cf8" : "#6366f1"} />
                <Text style={{ fontSize: 15, color: isDark ? "#818cf8" : "#6366f1", fontWeight: "700" }}>Battle Arena</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AnimatedPressable
                onPress={() => setShowBattleHistory(true)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6,
                }}
              >
                <Ionicons name="time-outline" size={13} color={muted} />
                <Text style={{ fontSize: 12, fontWeight: "500", color: muted }}>History</Text>
              </AnimatedPressable>
              
              <AnimatedPressable
                onPress={() => setActiveTab("menu")}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  alignItems: "center", justifyContent: "center"
                }}
              >
                <Ionicons name="settings-outline" size={15} color={muted} />
              </AnimatedPressable>
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

          {/* Error banner removed to use inline errors */}

          {!battleRoomCode ? (
            <>
              {/* HOST CARD */}
              <AnimatedPressable
                onPress={() => setShowBattleQuizSelector(true)}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
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
              </AnimatedPressable>

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
                      borderWidth: battleError ? 1 : 0.5,
                      borderColor: battleError ? (isDark ? "#f87171" : "#ef4444") : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"),
                      borderRadius: 10, paddingHorizontal: 12,
                      fontSize: 13, color: txt, letterSpacing: 2
                    }}
                    placeholder="CODE"
                    placeholderTextColor={mutedSub}
                    maxLength={5}
                    value={joinCodeInput}
                    onChangeText={(text) => {
                      setJoinCodeInput(text);
                      if (battleError) setBattleError("");
                    }}
                    autoCapitalize="characters"
                  />
                  <AnimatedPressable
                    onPress={handleJoinBattle}
                    disabled={joinCodeInput.length !== 5 || battleCreating}
                    style={() => {
                      const isReady = joinCodeInput.length === 5 && !battleCreating;
                      return {
                        height: 40, paddingHorizontal: 18, borderRadius: 10,
                        backgroundColor: isReady ? (isDark ? "#2dd4a7" : "#0d9488") : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                        borderWidth: 0.5,
                        borderColor: isReady ? (isDark ? "#2dd4a7" : "#0d9488") : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"),
                        justifyContent: "center", alignItems: "center",
                      };
                    }}
                  >
                    {battleCreating ? (
                      <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#ffffff"} />
                    ) : (
                      <Text style={{ color: (joinCodeInput.length === 5 && !battleCreating) ? "#ffffff" : (isDark ? "#777d99" : "#64748b"), fontSize: 13, fontWeight: (joinCodeInput.length === 5) ? "700" : "500" }}>Join</Text>
                    )}
                  </AnimatedPressable>
                </View>
                {!!battleError && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 6, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 13 }}>⚠️</Text>
                    <Text style={{ color: isDark ? "#f87171" : "#ef4444", fontSize: 13, fontWeight: "500", flex: 1 }}>{battleError}</Text>
                  </View>
                )}
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

              {battleCountdown !== null ? (
                <View style={{ alignItems: "center", gap: 10, marginBottom: 28 }}>
                  <Text style={{ fontSize: 72, color: isDark ? "#818cf8" : "#6366f1", fontWeight: "900" }}>{battleCountdown}</Text>
                  <Text style={{ fontSize: 20, color: txt, fontWeight: "800", marginTop: -10 }}>Get Ready!</Text>
                </View>
              ) : battleRoomState?.status === "playing" ? (
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

      </KeyboardWrapper>
    );
  };

  const renderFlashcardsView = () => {
    if (!viewingInsightsQuiz) return null;
    const quiz = viewingInsightsQuiz;
    const cards = quiz.flashcards || [];
    const isDark = settingsDarkMode;

    if (cards.length === 0) {
      return (
        <View style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f4f4f8" }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 20, paddingTop: 20 }}>
            <Pressable onPress={() => setActiveTab("insights")} style={{ padding: 8 }}>
              <Ionicons name="close" size={28} color={isDark ? "#fff" : "#000"} />
            </Pressable>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingBottom: 60 }}>
             <Text style={{ fontSize: 50, marginBottom: 20 }}>📭</Text>
             <Text style={{ fontSize: 20, fontWeight: "700", color: isDark ? "#fff" : "#111827", textAlign: "center", marginBottom: 8 }}>No flashcards available.</Text>
             <Text style={{ fontSize: 15, color: isDark ? "#9ca3af" : "#6b7280", textAlign: "center", lineHeight: 22 }}>This quiz doesn't include flashcards.</Text>
          </View>
        </View>
      );
    }

    const W = Dimensions.get('window').width;
    const currentCard = cards[fcIndex] || cards[0];
    const nextCard = cards[fcIndex + 1];
    const frontText = currentCard.front;
    const backText  = currentCard.back;

    // Interpolations derived from insightsSwipeX (JS-driven so we can use non-native transforms)
    const rotate = insightsSwipeX.interpolate({ inputRange: [-W, 0, W], outputRange: ["-15deg", "0deg", "15deg"], extrapolate: "clamp" });
    const knowOpacity   = insightsSwipeX.interpolate({ inputRange: [0, 60], outputRange: [0, 1], extrapolate: "clamp" });
    const unknownOpacity = insightsSwipeX.interpolate({ inputRange: [-60, 0], outputRange: [1, 0], extrapolate: "clamp" });
    const nextCardScale  = insightsSwipeX.interpolate({ inputRange: [-W, 0, W], outputRange: [1, 0.94, 1], extrapolate: "clamp" });

    const frontInterpolate = insightsFlipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
    const backInterpolate  = insightsFlipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });
    const frontOpacity     = insightsFlipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0], extrapolate: "clamp" });
    const backOpacity      = insightsFlipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1], extrapolate: "clamp" });

    const flipCard = () => {
      const toVal = fcFlipped ? 0 : 180;
      Animated.spring(insightsFlipAnim, { toValue: toVal, friction: 8, tension: 10, useNativeDriver: true }).start();
      setFcFlipped(!fcFlipped);
    };

    // ── Text helpers ────────────────────────────────────────────────────────
    // Strip QST artefacts (leading "= "), collapse 2+ newlines into one, trim
    const cleanText = (t: string) =>
      t.replace(/^=\s*/gm, '').replace(/\n{2,}/g, '\n').trim();

    const cleanFront = cleanText(frontText);

    // Parse memory tip from back (e.g. "Memory Tip: Cluster = together as one")
    const memoryTipMatch = backText.match(/Memory Tip[:\s]+(.+)/i);
    const mainBackRaw = memoryTipMatch
      ? backText.replace(/Memory Tip[:\s]+.+/i, '')
      : backText;
    const mainBack = cleanText(mainBackRaw);
    const memoryTip = memoryTipMatch ? memoryTipMatch[1].trim() : null;

    // Card colour — same for both faces so the flip just reveals the other side
    const cardBg = isDark ? "#253344" : "#ffffff";

    return (
      <View style={{ flex: 1, backgroundColor: isDark ? "#0d0f1a" : "#f4f4f8" }}>

        {/* Header Row */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#111827" }}>
            {fcIndex + 1}/{cards.length}
          </Text>
          <Pressable onPress={() => setActiveTab("insights")} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
            <Ionicons name="close" size={26} color={isDark ? "#ffffff" : "#111827"} />
          </Pressable>
        </View>

        {/* Progress bar — full width teal */}
        <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#e0e0e8" }}>
          <View style={{ height: 4, backgroundColor: "#00d4aa", width: `${((fcIndex + 1) / cards.length) * 100}%` }} />
        </View>

        {/* Card Stack Area */}
        <View style={{ flex: 1, padding: 16, paddingTop: 20, paddingBottom: 40 }}>

          {/* Ghost of next card (commented out for cleaner carousel animation)
          {nextCard ? (
            <Animated.View style={{
              position: "absolute", left: 16, right: 16, top: 20, bottom: 8,
              borderRadius: 24,
              backgroundColor: isDark ? "#1e2b3a" : "#e4e6ef",
              transform: [{ scale: nextCardScale }],
              opacity: insightsFlipAnim.interpolate({ inputRange: [0, 44, 90, 136, 180], outputRange: [1, 0, 0, 0, 1], extrapolate: "clamp" }),
            }} />
          ) : null}
          */}

          {/* Transparent outer wrapper — handles pan + swipe rotate only, NO background */}
          <Animated.View
            {...insightsPanResponder.panHandlers}
            style={{
              flex: 1,
              // Shadow lives here so it wraps both faces
              shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? 0.5 : 0.15, shadowRadius: 24, elevation: 10,
              transform: [{ translateX: insightsSwipeX }, { translateX: buttonSlideX }, { translateY: insightsSwipeY }, { rotate }],
            }}
          >
            {/* ── FRONT FACE — full card with own background ── */}
            <Animated.View style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 24, backgroundColor: cardBg,
              backfaceVisibility: "hidden", overflow: "hidden",
              opacity: frontOpacity,
              transform: [{ perspective: 1200 }, { rotateY: frontInterpolate }],
            }}>
              {/* Speaker — top right */}
              <Pressable
                onPress={() => toggleSpeech(cleanFront)}
                style={({ pressed }) => ({ position: "absolute", top: 16, right: 16, zIndex: 10, opacity: pressed ? 0.5 : 1, padding: 8, backgroundColor: speakingText === cleanFront ? "rgba(255,255,255,1)" : "transparent", borderRadius: 12 })}
              >
                <Ionicons name="volume-high-outline" size={22} color={speakingText === cleanFront ? "#000" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.28)")} />
              </Pressable>

              {/* Term — centred horizontally and vertically */}
              <Pressable onPress={flipCard} style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, paddingVertical: 52 }}>
                {renderFormattedText(cleanFront, {
                  fontSize: 22, fontWeight: "500",
                  color: isDark ? "#f1f5f9" : "#111827",
                  lineHeight: 33, letterSpacing: 0.1,
                  textAlign: "center",
                })}
              </Pressable>
            </Animated.View>

            {/* ── BACK FACE — full card with own background ── */}
            <Animated.View style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 24, backgroundColor: cardBg,
              backfaceVisibility: "hidden", overflow: "hidden",
              opacity: backOpacity,
              transform: [{ perspective: 1200 }, { rotateY: backInterpolate }],
            }}>
              {/* Speaker — top right */}
              <Pressable
                onPress={() => toggleSpeech(mainBack)}
                style={({ pressed }) => ({ position: "absolute", top: 16, right: 16, zIndex: 10, opacity: pressed ? 0.5 : 1, padding: 8, backgroundColor: speakingText === mainBack ? "rgba(255,255,255,1)" : "transparent", borderRadius: 12 })}
              >
                <Ionicons name="volume-high-outline" size={22} color={speakingText === mainBack ? "#000" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.28)")} />
              </Pressable>

              {/* Definition + Memory Tip — vertically centred in card */}
              <Pressable onPress={flipCard} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40, paddingTop: 52 }}>
                {renderFormattedText(mainBack, {
                  fontSize: 18, fontWeight: "400",
                  color: isDark ? "#ffffff" : "#0f172a",
                  lineHeight: 28, letterSpacing: 0.1,
                })}
                {memoryTip ? (
                  <View style={{
                    marginTop: 24,
                    backgroundColor: isDark ? "rgba(0,0,0,0.32)" : "rgba(0,0,0,0.05)",
                    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
                  }}>
                    <Text style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)", lineHeight: 21 }}>
                      Memory Tip: {memoryTip}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>

          </Animated.View>
        </View>

        {/* Bottom Nav */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 32, paddingTop: 10 }}>
          <Pressable
            onPress={() => { 
              if (fcIndex > 0) { 
                Animated.timing(buttonSlideX, { toValue: W, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
                  setFcIndex(i => i - 1); 
                  setFcFlipped(false); 
                  insightsFlipAnim.setValue(0); 
                  insightsSwipeX.setValue(0); 
                  insightsSwipeY.setValue(0);
                  buttonSlideX.setValue(-W);
                  setTimeout(() => {
                    Animated.timing(buttonSlideX, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
                  }, 16);
                });
              } 
            }}
            disabled={fcIndex === 0}
            style={({ pressed }) => ({ opacity: fcIndex === 0 ? 0.25 : pressed ? 0.6 : 1, width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", alignItems: "center", justifyContent: "center" })}
          >
            <Ionicons name="chevron-back" size={24} color={isDark ? "#ffffff" : "#111827"} />
          </Pressable>

          <Text style={{ fontSize: 14, color: isDark ? "#ffffff" : "#111827", fontWeight: "500" }}>
            Tap the card to flip
          </Text>

          <Pressable
            onPress={() => { 
              if (fcIndex < cards.length - 1) { 
                Animated.timing(buttonSlideX, { toValue: -W, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
                  setFcIndex(i => i + 1); 
                  setFcFlipped(false); 
                  insightsFlipAnim.setValue(0); 
                  insightsSwipeX.setValue(0); 
                  insightsSwipeY.setValue(0);
                  buttonSlideX.setValue(W);
                  setTimeout(() => {
                    Animated.timing(buttonSlideX, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
                  }, 16);
                });
              } else { 
                setActiveTab("insights"); 
              } 
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", alignItems: "center", justifyContent: "center" })}
          >
            <Ionicons name={fcIndex === cards.length - 1 ? "checkmark" : "chevron-forward"} size={24} color={isDark ? "#ffffff" : "#111827"} />
          </Pressable>
        </View>
      </View>
    );
  };

  // Render Sub-Views based on activeTab
  const renderContent = (overrideTab?: string) => {
    const tabToRender = overrideTab || activeTab;
    switch (tabToRender) {
      case "insights":
        return renderInsightsView();
      case "insights-flashcard":
        return renderFlashcardsView();
      case "bookmarked-questions":
        return renderBookmarkedQuestionsView();
      case "library": {
        // ── My Library ────────────────────────────────────────────
        const bg       = "#0B0F1A";
        const toggleBg = "#1A1E2E";
        const activeBg = "#252A3D";
        const muted    = "#8B8FA8";
        const txt      = "#ffffff";
        const border   = "rgba(255,255,255,0.12)";
        const accentPurple = "#8AB4F8";
        const accentPillBg = "#1E3A5F";

        const isCoursesTab = libraryTab === "courses";

        const filteredQuizzes = [...quizzes].reverse().filter((q: any) =>
          !librarySearch || q.title.toLowerCase().includes(librarySearch.toLowerCase())
        );
        const filteredDecks = flashcardDecks.filter((d: any) =>
          !librarySearch || d.title.toLowerCase().includes(librarySearch.toLowerCase())
        );

        const groupByTime = (items: any[], getDate: (item: any) => number) => {
          const now = Date.now();
          const oneWeek  = 7  * 24 * 60 * 60 * 1000;
          const twoWeeks = 14 * 24 * 60 * 60 * 1000;
          const groups: { label: string; items: any[] }[] = [
            { label: "This week", items: [] },
            { label: "Last week", items: [] },
            { label: "Older",     items: [] },
          ];
          items.forEach(item => {
            const date = getDate(item);
            if (date === 0 || now - date < oneWeek)   groups[0].items.push(item);
            else if (now - date < twoWeeks)            groups[1].items.push(item);
            else                                       groups[2].items.push(item);
          });
          return groups.filter(g => g.items.length > 0);
        };

        const quizGroups = groupByTime(filteredQuizzes, (q: any) => {
          const a = q.attempts || []; return a.length > 0 ? (a[0].date || 0) : 0;
        });
        const deckGroups = groupByTime(filteredDecks, (d: any) => {
          const a = d.attempts || []; return a.length > 0 ? (a[a.length - 1].date || 0) : 0;
        });

        const hasItems = isCoursesTab ? filteredQuizzes.length > 0 : filteredDecks.length > 0;

        const renderRow = (item: any, type: "quiz" | "deck") => {
          const isQuiz     = type === "quiz";
          const icoName    = "copy-outline";
          const icoColor   = isQuiz ? "#8AB4F8" : "#67E8F9";
          const iconBgCol  = isQuiz ? "#1A2240" : "#0D3040";
          const attempts   = item.attempts || [];
          const wrongCount = (item.wrongQuestions || []).length;
          const linkedDeck = isQuiz ? flashcardDecks.find((d: any) => d.id === `temp-${item.id}`) : null;
          
          let cardCount = 0;
          let dueCount = 0;
          
          if (isQuiz) {
            const allFlashcards = item.flashcards || [];
            cardCount = allFlashcards.length;
            const fcCardsWithState = cardCount > 0 
              ? allFlashcards.map((c: any, idx: number) => {
                  const cardId = c.id || `fc-${idx}`;
                  const saved = linkedDeck?.cards?.find((sc: any) => sc.id === cardId);
                  return saved ?? c;
                })
              : [];
            dueCount = fcCardsWithState.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
          } else {
            cardCount = (item.cards || []).length;
            dueCount = (item.cards || []).filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
          }

          const questionCount = item.questions || 0;
          let subtitleParts: string[] = [];
          if (isQuiz) {
            subtitleParts = [
              `${questionCount} question${questionCount !== 1 ? "s" : ""}`,
              `${cardCount} card${cardCount !== 1 ? "s" : ""}`,
              `${dueCount} due`
            ];
          } else {
            subtitleParts = [
              `Flashcard set`,
              `${cardCount} term${cardCount !== 1 ? "s" : ""}`,
              `by you`
            ];
          }
          const subtitle = subtitleParts.join("  ·  ");

          return (
            <Pressable
              key={item.id}
              onPress={() => {
                if (isQuiz) {
                  setViewingInsightsQuiz(item);
                  setViewingInsightsQuizFromTab("library");
                  setActiveTab("insights");
                } else {
                  startStudy(item);
                }
              }}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center",
                paddingVertical: 12, marginBottom: 16,
                opacity: pressed ? 0.65 : 1,
              })}
            >
              {/* Flashcard stack icon */}
              <View style={{
                width: 46, height: 46, borderRadius: 12,
                backgroundColor: "#1C2B3A",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
                alignItems: "center", justifyContent: "center",
                marginRight: 14, flexShrink: 0,
              }}>
                {/* Back card — dark gray, rotated */}
                <View style={{
                  position: "absolute",
                  width: 13, height: 17,
                  borderRadius: 3,
                  backgroundColor: "#374151",
                  transform: [{ rotate: "-12deg" }, { translateX: -4 }, { translateY: 3 }],
                }} />
                {/* Front card — blue/teal */}
                <View style={{
                  position: "absolute",
                  width: 13, height: 17,
                  borderRadius: 3,
                  backgroundColor: icoColor,
                  transform: [{ translateX: 3 }, { translateY: -2 }],
                }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: txt, marginBottom: 4 }} numberOfLines={1}>
                  {item.title}
                </Text>
                {isQuiz ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 13, color: "#D1D5DB", fontWeight: "500" }}>
                      {questionCount} Question{questionCount !== 1 ? "s" : ""}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#D1D5DB", fontWeight: "500" }}>
                      •
                    </Text>
                    <Text style={{ fontSize: 13, color: "#D1D5DB", fontWeight: "500" }}>
                      {cardCount} Card{cardCount !== 1 ? "s" : ""}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#D1D5DB", fontWeight: "500" }}>
                      •
                    </Text>
                    <Text style={{ fontSize: 13, color: "#D1D5DB", fontWeight: "500" }}>
                      {dueCount} Due
                    </Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 13, color: "#D1D5DB", fontWeight: "500" }}>{subtitle}</Text>
                )}
              </View>
            </Pressable>
          );
        };

        const renderGroups = (groups: { label: string; items: any[] }[], type: "quiz" | "deck") => (
          <>
            {groups.map(group => (
              <View key={group.label}>
                <Text style={{ fontSize: 13, color: muted, marginBottom: 6, marginTop: 8 }}>
                  {group.label}
                </Text>
                {group.items.map(item => renderRow(item, type))}
              </View>
            ))}
          </>
        );

        return (
          <View style={{ flex: 1, backgroundColor: bg }}>

            <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 16 }}>
              <Text style={{ fontSize: 28, fontWeight: "600", color: txt }}>My Library</Text>
            </View>

            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginHorizontal: 20, marginBottom: 20 }} />



            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              marginHorizontal: 20, marginBottom: 8,
              borderRadius: 12, borderWidth: 1, borderColor: border,
              paddingHorizontal: 14, paddingVertical: 12,
            }}>
              <Ionicons name="search-outline" size={18} color={muted} />
              <TextInput
                placeholder="Search Library..."
                placeholderTextColor={muted}
                value={librarySearch}
                onChangeText={setLibrarySearch}
                style={{ flex: 1, fontSize: 15, color: txt, padding: 0 }}
              />
              {librarySearch.length > 0 && (
                <Pressable onPress={() => setLibrarySearch("")}>
                  <Ionicons name="close-circle" size={18} color={muted} />
                </Pressable>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            >
              {!hasItems ? (
                <View style={{ alignItems: "center", paddingTop: 64, gap: 14 }}>
                  <Ionicons name={isCoursesTab ? "flash-outline" : "copy-outline"} size={40} color={muted} />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: txt }}>
                    {librarySearch ? "No results found" : isCoursesTab ? "No courses yet" : "No uploads yet"}
                  </Text>
                  <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
                    {isCoursesTab ? "Create a quiz from any PDF or text" : "Create a flashcard deck to get started"}
                  </Text>
                  <Pressable
                    onPress={() => setShowAddMenu(true)}
                    style={({ pressed }) => ({
                      marginTop: 8, backgroundColor: "#4A6FFF",
                      borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>+ Create new</Text>
                  </Pressable>
                </View>
              ) : isCoursesTab
                  ? renderGroups(quizGroups, "quiz")
                  : renderGroups(deckGroups, "deck")
              }
            </ScrollView>
          </View>
        );
      }


      case "battle":
        return renderBattleLobbyView();



      case "add": {
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
              {showDeckPicker && (
              <Modal visible={true} transparent animationType="slide" onRequestClose={() => setShowDeckPicker(false)}>
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
              )}

              {/* Deck Naming Modal */}
              {showNameDeckModal && (
              <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShowNameDeckModal(false)}>
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
              )}

              {/* Ellipsis Bottom Sheet */}
              {showEllipsisMenu && (
              <Modal visible={true} transparent animationType="slide" onRequestClose={() => setShowEllipsisMenu(false)}>
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
              )}

              {/* Card Preview Modal */}
              {showPreviewModal && (
              <Modal visible={true} transparent animationType="slide" onRequestClose={() => setShowPreviewModal(false)}>
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
              )}

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
                          { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: settingsDarkMode ? "#141930" : "#f0f0f0" },
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
          
          if (studyQueue.length === 0 && !isPreviewMode) {
            // ── Completion screen ────────────────────────────────────────
            const allCards: any[] = studyingDeck.cards || [];
            const totalCards = allCards.length;
            // Count cards that have been seen at least once (sm2_nextReviewDate set)
            const reviewedCards = allCards.filter((c: any) => !!c.sm2_nextReviewDate).length;
            const reviewedPct = totalCards > 0 ? Math.round((reviewedCards / totalCards) * 100) : 0;
            // Count truly mastered (graduated to Review interval ≥ 1 day)
            // Require at least 2 repetitions and 3-day interval to count as truly mastered (SM-2 convention)
            const masteredCards = allCards.filter((c: any) => (c.sm2_repetition ?? 0) >= 2 && (c.sm2_interval ?? 0) >= 3).length;

            // Upcoming cards — not yet due, sorted soonest first
            const nowMs = Date.now();
            const upcomingCards = allCards
              .filter((c: any) => c.sm2_nextReviewDate && c.sm2_nextReviewDate > nowMs)
              .sort((a: any, b: any) => a.sm2_nextReviewDate - b.sm2_nextReviewDate);

            // Next review time (soonest due card)
            const nextReviewMs = upcomingCards.length > 0 ? upcomingCards[0].sm2_nextReviewDate : null;
            const formatCountdown = (ms: number) => {
              const diff = ms - nowMs;
              if (diff <= 0) return "now";
              const secs = Math.floor(diff / 1000);
              const mins = Math.floor(secs / 60);
              const hrs  = Math.floor(mins / 60);
              const days = Math.floor(hrs / 24);
              if (days > 0) return `${days}d ${hrs % 24}h`;
              if (hrs > 0) return `${hrs}h ${mins % 60}m`;
              if (mins > 0) return `${mins}m`;
              return "< 1m";
            };

            const formatRelative = (ms: number) => {
              const diff = ms - nowMs;
              if (diff <= 0) return "now";
              const secs = Math.floor(diff / 1000);
              const mins = Math.floor(secs / 60);
              const hrs  = Math.floor(mins / 60);
              const days = Math.floor(hrs / 24);
              if (days >= 2) return `in ${days} days`;
              if (days === 1) return "tomorrow";
              if (hrs > 0) return `in ${hrs}h ${mins % 60}m`;
              if (mins > 0) return `in ${mins}m`;
              return "in < 1m";
            };

            // New (unseen) cards available to learn
            const newCards = allCards.filter((c: any) => !c.sm2_nextReviewDate && (c.sm2_repetition ?? 0) === 0);

            // Preview candidates — next 5 upcoming
            const previewCandidates = upcomingCards.slice(0, 5);

            const handleGoBack = () => {
              setIsPreviewMode(false);
              if (viewingInsightsQuiz) {
                setStudyingDeck(null);
                setActiveTab("insights" as any);
              } else {
                setStudyingDeck(null);
              }
            };

            const handleLearnNew = () => {
              if (newCards.length === 0) return;
              setIsPreviewMode(false);
              // Build a deck of only new cards
              const newDeck = { ...studyingDeck, cards: newCards };
              setStudyQueue(newCards.map((c: any) => c.id));
              setStudyQueueTotal(newCards.length);
              setStudyingDeck(newDeck);
              setStudyFlipped(false);
              flipAnim.setValue(0);
              swipeX.setValue(0);
              setStudyTypedAnswer("");
              setStudyChecked(false);
            };

            const handlePreviewNext = () => {
              if (previewCandidates.length === 0) return;
              // Save the full deck so we can restore it after preview finishes
              previewSourceDeckRef.current = studyingDeck;
              const previewDeck = { ...studyingDeck, cards: previewCandidates };
              setStudyQueue(previewCandidates.map((c: any) => c.id));
              setStudyQueueTotal(previewCandidates.length);
              setStudyingDeck(previewDeck);
              setIsPreviewMode(true);
              setStudyFlipped(false);
              flipAnim.setValue(0);
              swipeX.setValue(0);
            };

            const masteredPct = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

            const handleReviewAll = () => {
              setIsPreviewMode(false);
              // Start a full SM-2 review of all cards in the deck, regardless of due date
              const allDeck = { ...studyingDeck, cards: allCards };
              setStudyQueue(allCards.map((c: any) => c.id));
              setStudyingDeck(allDeck);
              setStudyFlipped(false);
              flipAnim.setValue(0);
              swipeX.setValue(0);
              setStudyTypedAnswer("");
              setStudyChecked(false);
            };

            const bg      = isDark ? "#0B0F1E" : "#f4f4f8";
            const surface = isDark ? "#141930" : "#ffffff";
            const border  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
            const txt     = isDark ? "#ffffff" : "#0d0f14";
            const muted   = isDark ? "rgba(255,255,255,0.7)" : "#64748b";
            const sep     = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

            // ── Branch: 0-due-at-start → "You're all caught up!" screen ──────
            if (noDueAtStart) {
              return (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: bg, zIndex: 99 }}>
                  <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Hero */}
                    <View style={{ alignItems: "center", paddingTop: 72, paddingBottom: 28, paddingHorizontal: 24 }}>
                      <View style={{
                        width: 100, height: 100, borderRadius: 50,
                        backgroundColor: isDark ? "rgba(0,212,170,0.1)" : "rgba(0,212,170,0.12)",
                        borderWidth: 1.5, borderColor: "rgba(0,212,170,0.35)",
                        alignItems: "center", justifyContent: "center",
                        marginBottom: 24,
                        shadowColor: "#00d4aa", shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
                      }}>
                        <Text style={{ fontSize: 46 }}>🎉</Text>
                      </View>
                      <Text style={{ fontSize: 30, fontWeight: "800", color: txt,
                        textAlign: "center", letterSpacing: -0.5, marginBottom: 8 }}>
                        You're all caught up!
                      </Text>
                      <Text style={{ fontSize: 15, color: muted, textAlign: "center", lineHeight: 22, marginBottom: 18 }}>
                        All due cards have been reviewed.
                      </Text>
                      {nextReviewMs ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7,
                          backgroundColor: "rgba(0,212,170,0.1)",
                          borderRadius: 24, paddingHorizontal: 18, paddingVertical: 9,
                          borderWidth: 1, borderColor: "rgba(0,212,170,0.3)" }}>
                          <Ionicons name="time-outline" size={15} color="#00d4aa" />
                          <Text style={{ fontSize: 14, color: "#00d4aa", fontWeight: "700" }}>
                            Next review in {formatCountdown(nextReviewMs)}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Stat tiles */}
                    <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 14 }}>
                      <View style={{ flex: 1, backgroundColor: surface, borderRadius: 20,
                        padding: 18, borderWidth: 1, borderColor: border,
                        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#00d4aa" }} />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#00d4aa",
                            letterSpacing: 1.1, textTransform: "uppercase" }}>Reviewed</Text>
                        </View>
                        <Text style={{ fontSize: 32, fontWeight: "800", color: txt, lineHeight: 36 }}>{reviewedCards}</Text>
                        <Text style={{ fontSize: 12, color: muted, marginTop: 3, marginBottom: 14 }}>of {totalCards} cards</Text>
                        <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#e8f0fe", borderRadius: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: "#00d4aa", width: `${reviewedPct}%` as any }} />
                        </View>
                      </View>
                      <View style={{ flex: 1, backgroundColor: surface, borderRadius: 20,
                        padding: 18, borderWidth: 1, borderColor: border,
                        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#818cf8" }} />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#818cf8",
                            letterSpacing: 1.1, textTransform: "uppercase" }}>Mastered</Text>
                        </View>
                        <Text style={{ fontSize: 32, fontWeight: "800", color: txt, lineHeight: 36 }}>{masteredCards}</Text>
                        <Text style={{ fontSize: 12, color: muted, marginTop: 3, marginBottom: 14 }}>of {totalCards} cards</Text>
                        <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#e8f0fe", borderRadius: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: "#818cf8", width: `${masteredPct}%` as any }} />
                        </View>
                      </View>
                    </View>

                    {/* Coming up */}
                    {upcomingCards.length > 0 && (
                      <View style={{ marginHorizontal: 20, backgroundColor: surface, borderRadius: 20,
                        borderWidth: 1, borderColor: border, marginBottom: 20, overflow: "hidden",
                        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 3 }}>
                        <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
                          borderBottomWidth: 1, borderBottomColor: sep }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.1,
                            textTransform: "uppercase", color: muted }}>Coming Up</Text>
                        </View>
                        {upcomingCards.slice(0, 5).map((c: any, i: number) => (
                          <View key={c.id || i} style={{ flexDirection: "row", alignItems: "center",
                            paddingHorizontal: 18, paddingVertical: 13,
                            borderTopWidth: i === 0 ? 0 : 1, borderTopColor: sep }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3,
                              backgroundColor: "#00d4aa", marginRight: 14, flexShrink: 0, opacity: 0.7 }} />
                            <Text style={{ flex: 1, fontSize: 14, color: txt, lineHeight: 20 }} numberOfLines={1}>
                              {c.front || c.question || c.prompt || "Card"}
                            </Text>
                            <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#f1f5f9",
                              borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                              marginLeft: 12, flexShrink: 0 }}>
                              <Text style={{ fontSize: 12, color: muted, fontWeight: "500" }}>
                                {formatRelative(c.sm2_nextReviewDate)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Actions */}
                    <View style={{ paddingHorizontal: 20, gap: 10 }}>
                      {/* Review All */}
                      <Pressable
                        onPress={handleReviewAll}
                        style={({ pressed }) => ({
                          flexDirection: "row", alignItems: "center", justifyContent: "center",
                          gap: 10, height: 58, borderRadius: 18,
                          backgroundColor: newCards.length > 0 ? (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0") : "#6366f1",
                          borderWidth: newCards.length > 0 ? 1 : 0,
                          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                          opacity: pressed ? 0.85 : 1,
                          shadowColor: newCards.length > 0 ? "transparent" : "#6366f1", shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: newCards.length > 0 ? 0 : 0.3, shadowRadius: 10, elevation: newCards.length > 0 ? 0 : 5,
                        })}
                      >
                        <Ionicons name="refresh-circle-outline" size={22} color={newCards.length > 0 ? (isDark ? "#ffffff" : "#0f172a") : "#ffffff"} />
                        <Text style={{ fontSize: 16, fontWeight: "700", color: newCards.length > 0 ? (isDark ? "#ffffff" : "#0f172a") : "#ffffff" }}>
                          Review All Cards
                        </Text>
                      </Pressable>

                      {/* Learn New — indigo */}
                      {newCards.length > 0 && (
                        <Pressable
                          onPress={handleLearnNew}
                          style={({ pressed }) => ({
                            flexDirection: "row", alignItems: "center", justifyContent: "center",
                            gap: 10, height: 56, borderRadius: 18,
                            backgroundColor: "#6366f1",
                            opacity: pressed ? 0.85 : 1,
                            shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
                          })}
                        >
                          <Ionicons name="book-outline" size={20} color="#fff" />
                          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                            Learn New Cards ({newCards.length})
                          </Text>
                        </Pressable>
                      )}

                      {/* Preview Next — ghost */}
                      {previewCandidates.length > 0 && (
                        <Pressable
                          onPress={handlePreviewNext}
                          style={({ pressed }) => ({
                            flexDirection: "row", alignItems: "center", justifyContent: "center",
                            gap: 10, height: 52, borderRadius: 18,
                            backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#e8eaf6",
                            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(99,102,241,0.15)",
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Ionicons name="eye-outline" size={18} color={isDark ? "#94a3b8" : "#6366f1"} />
                          <Text style={{ fontSize: 15, fontWeight: "600",
                            color: isDark ? "#cbd5e1" : "#4338ca" }}>
                            Preview Next {previewCandidates.length}
                          </Text>
                        </Pressable>
                      )}

                      {/* Back — text only */}
                      <Pressable
                        onPress={() => { setNoDueAtStart(false); handleGoBack(); }}
                        style={({ pressed }) => ({
                          flexDirection: "row", alignItems: "center", justifyContent: "center",
                          gap: 6, height: 44, opacity: pressed ? 0.5 : 1,
                        })}
                      >
                        <Ionicons name="chevron-back" size={16} color={muted} />
                        <Text style={{ fontSize: 14, fontWeight: "500", color: muted }}>
                          {viewingInsightsQuiz ? "Back to Quiz" : "Back to Deck"}
                        </Text>
                      </Pressable>
                    </View>
                  </ScrollView>
                </View>
              );
            }

            // ── After a real study session → "Next steps" screen ────────────
            return (
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc", zIndex: 99 }}>
                {/* Header with Close Button */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 }}>
                  <Text style={{ fontSize: 24, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Next steps</Text>
                  <Pressable onPress={handleGoBack} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}>
                    <Ionicons name="close" size={28} color={settingsDarkMode ? "#ffffff" : "#111827"} />
                  </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                  {/* Performance Breakdown Box */}
                  <View style={{ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                    {/* Perfectly */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#84cc16", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="checkmark-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Perfectly</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{sessionRatings.perfect}</Text>
                    </View>
                    {/* Well */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#84cc16", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="checkmark-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Well</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{sessionRatings.good}</Text>
                    </View>
                    {/* Not quite */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="close-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Not quite</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{sessionRatings.hard}</Text>
                    </View>
                    {/* Not at all */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="close-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Not at all</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{sessionRatings.again}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ gap: 12 }}>
                    <Pressable onPress={() => {
                        setStudyQueue(studyingDeck.cards.map((c: any) => c.id));
                        setStudyQueueTotal(studyingDeck.cards.length);
                        setIsPreviewMode(true);
                      }} style={({pressed}) => ({ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", opacity: pressed ? 0.8 : 1 })}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                        <Text style={{ fontSize: 24 }}>📝</Text>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Preview Flashcards</Text>
                      </View>
                      <Feather name="chevron-right" size={22} color={settingsDarkMode ? "#ffffff" : "#111827"} />
                    </Pressable>

                    <Pressable 
                      onPress={() => {
                        setStudyingDeck(null);
                        setActiveTab("insights" as any);
                        setTimeout(() => handleOpenQuizOptions(viewingInsightsQuiz || quizzes[0] || {} as any), 300);
                      }} 
                      style={({pressed}) => ({ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", opacity: pressed ? 0.8 : 1 })}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                        <Text style={{ fontSize: 24 }}>❓</Text>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Play Quiz</Text>
                      </View>
                      <Feather name="chevron-right" size={22} color={settingsDarkMode ? "#ffffff" : "#111827"} />
                    </Pressable>
                  </View>
                </ScrollView>

                {/* Bottom Pinned Done Button */}
                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingVertical: 20, paddingTop: 10, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc" }}>
                  <Pressable
                    onPress={handleGoBack}
                    style={({ pressed }) => ({
                      backgroundColor: "#ffffff",
                      borderRadius: 16,
                      height: 56,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.8 : 1,
                      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8
                    })}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>Done</Text>
                  </Pressable>
                </View>
              </View>
            );
          }

          const cardId = studyQueue[0];
          const card = studyingDeck.cards.find((c: any) => c.id === cardId) || studyingDeck.cards[0];
          const isCloze = studyingDeck.cardType === "Cloze";
          const isTypeInAnswer = studyingDeck.cardType === "Basic (type in the answer)";

          let frontText = card.front || card.question || card.prompt || "";
          let backText  = card.back || card.answer || "";
          if (isCloze) {
            frontText = String(frontText).replace(/\{\{c1::(.*?)\}\}/g, "[...]");
            backText  = String(frontText).replace(/\{\{c1::(.*?)\}\}/g, "$1");
          }

          const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg","180deg"] });
          const backInterpolate  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg","360deg"] });
          const frontOpacity     = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0], extrapolate: "clamp" });
          const backOpacity      = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1], extrapolate: "clamp" });
          
          const swipeRotate = studyTiltAnim.interpolate({ inputRange: [-20, 0, 20], outputRange: ["-20deg", "0deg", "20deg"], extrapolate: "clamp" });

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

          return (
            <View style={{ flex: 1, backgroundColor: isDark ? "#0d0f1a" : "#f4f4f8" }}>

              {/* Header Row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#111827" }}>
                    {studyQueueTotal - studyQueue.length + 1}/{studyQueueTotal || 1}
                  </Text>
                  {isPreviewMode && (
                    <View style={{ backgroundColor: "rgba(99,102,241,0.18)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#818cf8", letterSpacing: 0.8 }}>PREVIEW</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => {
                  if (viewingInsightsQuiz) {
                    setStudyingDeck(null);
                    setActiveTab("insights");
                  } else {
                    setStudyingDeck(null);
                  }
                }} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
                  <Ionicons name="close" size={26} color={isDark ? "#ffffff" : "#111827"} />
                </Pressable>
              </View>

              {/* Progress bar */}
              <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#e0e0e8" }}>
                <View style={{ height: 4, backgroundColor: "#00d4aa", width: `${((studyQueueTotal - studyQueue.length + 1) / (studyQueueTotal || 1)) * 100}%` }} />
              </View>

              {/* Card Stack Area — same structure as Simple Preview */}
              <View style={{ flex: 1, padding: 16, paddingTop: 20 }}>

                {/* Transparent outer wrapper — handles swipe translate + shadow */}
                <Animated.View
                  style={{
                    flex: 1,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: isDark ? 0.5 : 0.15, shadowRadius: 24, elevation: 10,
                    transform: [{ translateX: swipeX }],
                  }}
                >
                  {/* FRONT FACE */}
                  <Animated.View style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 24, backgroundColor: isDark ? "#253344" : "#ffffff",
                    backfaceVisibility: "hidden", overflow: "hidden",
                    opacity: frontOpacity,
                    transform: [{ perspective: 1200 }, { rotateY: frontInterpolate }],
                  }}>
                    {/* Speaker — top right */}
                    <Pressable
                      onPress={() => toggleSpeech(frontText)}
                      style={({ pressed }) => ({ position: "absolute", top: 16, right: 16, zIndex: 10, opacity: pressed ? 0.5 : 1, padding: 8, backgroundColor: speakingText === frontText ? "rgba(255,255,255,1)" : "transparent", borderRadius: 12 })}
                    >
                      <Ionicons name="volume-high-outline" size={22} color={speakingText === frontText ? "#000" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.28)")} />
                    </Pressable>

                    {/* Term — centred */}
                    <Pressable onPress={() => { if (!isTypeInAnswer) flipCard(); }} style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, paddingVertical: 52 }}>
                      {renderFormattedText(frontText, {
                        fontSize: 22, fontWeight: "500",
                        color: isDark ? "#f1f5f9" : "#111827",
                        lineHeight: 33, letterSpacing: 0.1,
                        textAlign: "center",
                      })}
                      {isTypeInAnswer && (
                        <View style={{ width: "100%", marginTop: 28, gap: 12 }}>
                          <TextInput
                            placeholder="Type your answer…"
                            placeholderTextColor={"rgba(255,255,255,0.4)"}
                            style={{ backgroundColor: "rgba(0,0,0,0.1)",
                              borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
                              color: isDark ? "#ffffff" : "#0d0f14", fontSize: 16, textAlign: "center",
                              borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
                            value={studyTypedAnswer} onChangeText={setStudyTypedAnswer}
                          />
                          <Pressable onPress={() => { setStudyChecked(true); flipCard(); }}
                            style={({ pressed }) => [{ backgroundColor: isDark ? "#ffffff" : "#0d0f14", borderRadius: 14, height: 48,
                              alignItems: "center", justifyContent: "center" }, pressed && styles.pressedScale]}>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#000000" : "#ffffff" }}>Check Answer</Text>
                          </Pressable>
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>

                  {/* BACK FACE */}
                  <Animated.View style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 24, backgroundColor: isDark ? "#253344" : "#ffffff",
                    backfaceVisibility: "hidden", overflow: "hidden",
                    opacity: backOpacity,
                    transform: [{ perspective: 1200 }, { rotateY: backInterpolate }],
                  }}>
                    {/* Speaker — top right */}
                    <Pressable
                      onPress={() => toggleSpeech(backText)}
                      style={({ pressed }) => ({ position: "absolute", top: 16, right: 16, zIndex: 10, opacity: pressed ? 0.5 : 1, padding: 8, backgroundColor: speakingText === backText ? "rgba(255,255,255,1)" : "transparent", borderRadius: 12 })}
                    >
                      <Ionicons name="volume-high-outline" size={22} color={speakingText === backText ? "#000" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.28)")} />
                    </Pressable>

                    {/* Answer + extras */}
                    <Pressable onPress={() => { if (!isTypeInAnswer) flipCard(); }} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40, paddingTop: 52 }}>
                      {renderFormattedText(backText, {
                        fontSize: 18, fontWeight: "400",
                        color: isDark ? "#ffffff" : "#0f172a",
                        lineHeight: 28, letterSpacing: 0.1,
                      })}
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
                                Expected: <Text style={{ fontWeight: "700", color: isDark ? "#ffffff" : "#000" }}>{card.back}</Text>
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>

                </Animated.View>
              </View>

              {/* Bottom Actions — fixed height so card never shifts */}
              <View style={{ height: 160, justifyContent: "center", borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
              {isPreviewMode ? (
                // ── Preview mode: no rating buttons, just flip + advance ──
                <View style={{ paddingHorizontal: 20, gap: 12 }}>
                  {!studyFlipped ? (
                    <Pressable
                      onPress={() => { if (!isTypeInAnswer) flipCard(); }}
                      style={({ pressed }) => [{ backgroundColor: "#ffffff", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>Show Answer</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        // Advance without updating SM2
                        const newQueue = studyQueue.slice(1);
                        setStudyQueue(newQueue);
                        setStudyFlipped(false);
                        flipAnim.setValue(0);
                        swipeX.setValue(0);
                        if (newQueue.length === 0) {
                          // Restore full deck so completion screen has accurate data
                          if (previewSourceDeckRef.current) {
                            setStudyingDeck(previewSourceDeckRef.current);
                            previewSourceDeckRef.current = null;
                          }
                          setIsPreviewMode(false);
                        }
                      }}
                      style={({ pressed }) => [{ backgroundColor: isDark ? "#334155" : "#e2e8f0", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#0f172a" }}>Next</Text>
                      <Ionicons name="chevron-forward" size={18} color={isDark ? "#ffffff" : "#0f172a"} />
                    </Pressable>
                  )}
                  <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)", textAlign: "center" }}>
                    Preview only — no changes to your review schedule
                  </Text>
                </View>
              ) : !studyFlipped ? (
                <View style={{ paddingHorizontal: 20 }}>
                  <Pressable
                    onPress={() => { if (!isTypeInAnswer) flipCard(); }}
                    style={({ pressed }) => [{ backgroundColor: "#ffffff", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>Show Answer</Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <Text style={{ textAlign: "center", fontSize: 14, color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 14 }}>How well did you know this?</Text>
                  <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 12 }}>
                    {[
                      { rating: "again"   as const, num: "1", label: "Again",   color: "#ef4444" },
                      { rating: "hard"    as const, num: "2", label: "Hard",    color: "#eab308" },
                      { rating: "good"    as const, num: "3", label: "Good",    color: "#22c55e" },
                      { rating: "perfect" as const, num: "4", label: "Perfect", color: "#00d4aa" },
                    ].map(({ rating, num, label, color }) => (
                      <Pressable
                        key={rating}
                        onPress={() => handleSM2Rating(rating)}
                        style={({ pressed }) => ({ flex: 1, alignItems: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}
                      >
                        {({ pressed }) => (
                          <>
                            <View style={{
                              width: "100%", height: 52,
                              borderRadius: 12, borderWidth: 1.5, borderColor: color,
                              alignItems: "center", justifyContent: "center",
                              backgroundColor: selectedRating === rating || pressed ? color : "transparent", marginBottom: 8,
                            }}>
                              <Text style={{ fontSize: 20, fontWeight: "700", color: (selectedRating === rating || pressed) ? (rating === "hard" || rating === "perfect" ? "#000" : "#fff") : color }}>{num}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#ffffff" : "#0d0f14", textAlign: "center" }}>
                              {label}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
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
          const isDark  = true; // Forced dark theme
          const bg      = "#0B0F1E";
          const cardBg  = "#141930";
          const border  = "rgba(255,255,255,0.07)";
          const muted   = "#8B8FA8";
          const txt     = "#ffffff";

          const Row = ({ icon, iconBg, iconColor, title, sub, onPress, right }: any) => (
            <AnimatedPressable onPress={onPress}
              style={{
                backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                borderRadius: 14, padding: 14, paddingHorizontal: 16,
                flexDirection: "row", alignItems: "center", gap: 12,
              }}>
              <View style={{ width: 32, height: 32, borderRadius: 10,
                backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={icon} size={16} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: title === "Reset statistics" ? "#e24b4a" : txt }}>
                  {title}
                </Text>
                {sub ? <Text style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.7)", marginTop: 2, fontWeight: "400" }}>{sub}</Text> : null}
              </View>
              {right}
            </AnimatedPressable>
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
                    <Text style={{ fontSize: 15, fontWeight: "500", color: txt }} numberOfLines={1}>
                      {firebaseUser ? getUserFullName(firebaseUser) : "Guest"}
                    </Text>
                    <Text style={{ fontSize: 11, color: muted, marginTop: 3, fontWeight: "300" }} numberOfLines={1}>
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

                  {/* Language selector */}
                  <AnimatedPressable
                    onPress={() => setShowLanguageModal(true)}
                    style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                      borderRadius: 14, padding: 14, paddingHorizontal: 16,
                      flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10,
                      backgroundColor: "rgba(99,102,241,0.1)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="language-outline" size={16} color="#6366f1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: txt }}>{t('profile.language') || 'Language'}</Text>
                      <Text style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.7)", marginTop: 2, fontWeight: "400" }}>
                        {i18n.language === 'en' ? 'English' : 
                         i18n.language === 'es' ? 'Spanish' : 
                         i18n.language === 'fr' ? 'French' : 
                         i18n.language === 'hi' ? 'Hindi' : 
                         i18n.language === 'ru' ? 'Russian' : 
                         i18n.language === 'kk' ? 'Kazakh' : 'System language'}
                      </Text>
                    </View>
                    <Chevron />
                  </AnimatedPressable>
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
                    <AnimatedPressable
                      onPress={() => setShowLogoutConfirm(true)}
                      disabled={signOutLoading}
                      style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                        borderRadius: 14, padding: 14, paddingHorizontal: 16,
                        flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10,
                        backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="log-out-outline" size={16} color={txt} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: txt }}>Logout</Text>
                      </View>
                    </AnimatedPressable>
                  )}

                  {firebaseUser && (
                    <AnimatedPressable
                      onPress={() => setShowDeleteAccountConfirm(true)}
                      style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                        borderRadius: 14, padding: 14, paddingHorizontal: 16,
                        flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10,
                        backgroundColor: "rgba(226,75,74,0.1)", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="trash-bin-outline" size={16} color="#e24b4a" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: "#e24b4a" }}>Delete account</Text>
                      </View>
                    </AnimatedPressable>
                  )}
                </View>

              </ScrollView>
            </View>
          );
        })();


      default:
        // ── Home Screen (Hybrid Design) ──────────────────────────────
        return (() => {
          const bg         = "#0B0F1E";
          const cardBg     = "#141930";
          const searchBg   = "#1A1F38";
          const accentBlue = "#4A6FFF";
          const accentGrn  = "#4ADE80";
          const accentOrng = "#F97316";
          const accentPurp = "#B5A8FF";
          const pillBg     = "#2B2560";
          const muted      = "#8B8FA8";
          const txt        = "#ffffff";
          const border     = "rgba(255,255,255,0.07)";
          const iconBg     = "#1C2448";

          // ── Jump Back In data ─────────────────────────────────────
          const inProgressQuizzes = quizzes.filter((q: any) => {
            const uniqueCount = (q.uniqueCorrectIds || []).length;
            const qCount = q.questions || 1;
            return uniqueCount < qCount;
          });
          const inProgressDecks = flashcardDecks.filter((d: any) => (d.cards || []).length > 0);

          type JumpItem = { id: string; title: string; type: "quiz"|"flashcard"; progress: number; label: string; raw: any; };
          const jumpItems: JumpItem[] = [
            ...inProgressQuizzes.slice(0, 4).map((q: any): JumpItem => {
              const done = (q.uniqueCorrectIds || []).length;
              const total = q.questions || 1;
              const isNew = (q.attempts || []).length === 0;
              return { id: q.id, title: q.title, type: "quiz", progress: done / total,
                label: isNew ? "Not started" : `${Math.round((done / total) * 100)}% complete`, raw: q };
            }),
            ...inProgressDecks.slice(0, 3).map((d: any): JumpItem => {
              const cards = d.cards || [];
              const studied = cards.filter((c: any) => !!c.sm2_nextReviewDate).length;
              const isNew = studied === 0;
              return { id: d.id, title: d.title, type: "flashcard", progress: cards.length > 0 ? studied / cards.length : 0,
                label: isNew ? "Not started" : `${studied}/${cards.length} cards sorted`, raw: d };
            }),
          ];

          type RecentItem = { id: string; title: string; type: "quiz"|"flashcard"; sub: string; raw: any; ts: number; };
          const allRecents: RecentItem[] = [
            ...quizzes.map((q: any): RecentItem => {
              const linkedDeck = flashcardDecks.find((d: any) => d.id === `temp-${q.id}`);
              const allFlashcards = q.flashcards || [];
              const cardCount = allFlashcards.length;
              const fcCardsWithState = cardCount > 0 
                ? allFlashcards.map((c: any, idx: number) => {
                    const cardId = c.id || `fc-${idx}`;
                    const saved = linkedDeck?.cards?.find((sc: any) => sc.id === cardId);
                    return saved ?? c;
                  })
                : [];
              const due = fcCardsWithState.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
              return {
                id: q.id, title: q.title, type: "quiz",
                sub: `${q.questions || 0} questions  ·  ${cardCount} cards  ·  ${due} due`, raw: q,
                ts: (q.attempts || []).length > 0 ? (q.attempts[0].date || 0) : 0,
              };
            }),
            ...flashcardDecks.map((d: any): RecentItem => ({
              id: d.id, title: d.title, type: "flashcard",
              sub: `Flashcard set  ·  ${(d.cards || []).length} terms  ·  by you`, raw: d,
              ts: (d.attempts || []).length > 0 ? (d.attempts[d.attempts.length - 1].date || 0) : 0,
            })),
          ].sort((a, b) => b.ts - a.ts).slice(0, 6);

          const hasContent = jumpItems.length > 0 || allRecents.length > 0;
          const userInitial = firebaseUser ? getUserInitial(firebaseUser) : "";

          const goQuiz = (q: any) => { setViewingInsightsQuiz(q); setViewingInsightsQuizFromTab("home"); setActiveTab("insights"); };

          return (
            <View style={{ flex: 1, backgroundColor: bg }}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 90 }}
              >
                {/* ── Top: Search + Avatar ── */}
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8,
                }}>
                  {/* Search pill */}
                  <View style={{
                    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
                    backgroundColor: searchBg, borderRadius: 28,
                    paddingHorizontal: 16, paddingVertical: 12,
                    borderWidth: 1, borderColor: border,
                  }}>
                    <Ionicons name="search-outline" size={17} color={muted} />
                    <TextInput
                      placeholder="Search"
                      placeholderTextColor={muted}
                      value={homeSearch}
                      onChangeText={setHomeSearch}
                      style={{ flex: 1, fontSize: 15, color: txt, padding: 0 }}
                    />
                    {homeSearch.length > 0 && (
                      <Pressable onPress={() => setHomeSearch("")}>
                        <Ionicons name="close-circle" size={17} color={muted} />
                      </Pressable>
                    )}
                  </View>

                  {/* Avatar circle */}
                  <AnimatedPressable
                    onPress={() => setActiveTab("menu")}
                    style={{
                      width: 46, height: 46, borderRadius: 23,
                      backgroundColor: "#1C2244",
                      alignItems: "center", justifyContent: "center", overflow: "hidden",
                      borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)",
                    }}
                  >
                    {firebaseUser?.photoURL ? (
                      <Image source={{ uri: firebaseUser.photoURL }} style={{ width: 46, height: 46, borderRadius: 23 }} />
                    ) : firebaseUser ? (
                      <Text style={{ fontSize: 17, fontWeight: "700", color: accentPurp }}>{userInitial}</Text>
                    ) : (
                      <Ionicons name="person" size={20} color={accentPurp} />
                    )}
                  </AnimatedPressable>
                </View>

                {/* ── New user: sample try-it-out card ── */}
                {!hasContent && !homeSearch && !sampleDismissed && sampleQuiz && (
                  <View style={{ marginTop: 24, marginBottom: 8 }}>
                    <View style={{ paddingHorizontal: 20, marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: txt }}>Try your first quiz 👋</Text>
                      <Text style={{ fontSize: 13, color: muted }}>New user</Text>
                    </View>

                    <View
                      style={{
                        marginHorizontal: 20,
                        backgroundColor: cardBg,
                        borderRadius: 20, padding: 20,
                        borderWidth: 1, borderColor: border,
                      }}
                    >
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: txt }} numberOfLines={1}>{sampleQuiz.title}</Text>
                        <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                          {sampleQuiz.questions} questions  ·  {(sampleQuiz.flashcards || []).length} flashcards
                        </Text>
                      </View>
                      <AnimatedPressable
                        onPress={() => goQuiz(sampleQuiz)}
                        style={{
                          backgroundColor: "#6366f1",
                          paddingVertical: 14, borderRadius: 16,
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>
                          Study Set
                        </Text>
                      </AnimatedPressable>
                    </View>
                  </View>
                )}

                {/* ── Jump Back In ── */}
                {jumpItems.length > 0 && !homeSearch && (
                  <View style={{ marginTop: 20, marginBottom: 8 }}>
                    <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: txt, marginBottom: 2 }}>
                        Continue learning
                      </Text>
                      <Text style={{ fontSize: 13, color: muted }}>
                        In-progress decks or new decks waiting to start
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={SCREEN_WIDTH - 40}
                      snapToAlignment="start"
                      contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                      onScroll={(e) => {
                        const page = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
                        setJumpPage(Math.max(0, Math.min(page, jumpItems.length - 1)));
                      }}
                      scrollEventThrottle={16}
                    >
                      {jumpItems.map((item) => {
                        const pct = Math.min(Math.round(item.progress * 100), 100);
                        return (
                          <View
                            key={item.id}
                            style={{
                              width: SCREEN_WIDTH - 52,
                              backgroundColor: cardBg, // Use consistent card background
                              borderRadius: 18,
                              padding: 18,
                              borderWidth: 1,
                              borderColor: border,
                            }}
                          >
                            {/* Title row */}
                            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, minHeight: 44 }}>
                              <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF", flex: 1, lineHeight: 22 }} numberOfLines={2}>
                                {item.title}
                              </Text>
                              <Ionicons name="ellipsis-vertical" size={18} color={muted} style={{ marginLeft: 8, marginTop: 2 }} />
                            </View>

                            {/* Progress bar */}
                            <View style={{ height: 12, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 6, marginBottom: 12, overflow: "hidden", flexDirection: "row" }}>
                              {pct > 0 && (
                                <View style={{ width: `${Math.max(pct - 12, 0)}%` as any, backgroundColor: "#10B981" }} />
                              )}
                              {pct > 0 && pct < 100 && (
                                <View style={{ width: "12%", backgroundColor: "#F59E0B", borderTopRightRadius: 6, borderBottomRightRadius: 6 }} />
                              )}
                            </View>

                            {/* Label */}
                            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "500", marginBottom: 20 }}>{item.label}</Text>

                            {/* Continue button — blue pill */}
                            <Pressable
                              onPress={() => {
                                if (item.type === "quiz") goQuiz(item.raw);
                                else startStudy(item.raw);
                              }}
                              style={({ pressed }) => ({
                                backgroundColor: "#4F46E5",
                                borderRadius: 24,
                                paddingVertical: 14,
                                alignItems: "center",
                                opacity: pressed ? 0.85 : 1,
                              })}
                            >
                              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Continue</Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </ScrollView>

                    {/* Dot pagination */}
                    {jumpItems.length > 1 && (
                      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 16 }}>
                        {jumpItems.map((_, idx) => (
                          <View
                            key={idx}
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: idx === jumpPage ? "#FFFFFF" : "rgba(255,255,255,0.3)",
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* ── Battle Arena Banner ── */}
                {!homeSearch && (
                  <View style={{ marginTop: jumpItems.length > 0 || !hasContent ? 28 : 20, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: txt, marginBottom: 14 }}>Multiplayer</Text>
                    
                    <Pressable
                      onPress={() => setActiveTab("battle" as any)}
                      style={({ pressed }) => ({
                        backgroundColor: cardBg,
                        borderRadius: 20, padding: 20,
                        borderWidth: 1, borderColor: border,
                        flexDirection: "row", alignItems: "center",
                        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(251, 113, 133, 0.15)", alignItems: "center", justifyContent: "center", marginRight: 16 }}>
                        <Ionicons name="flame" size={24} color="#FB7185" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 4 }}>Battle Arena</Text>
                        <Text style={{ fontSize: 13, color: muted }}>Challenge friends in real-time matches</Text>
                      </View>
                      <Feather name="chevron-right" size={20} color={muted} />
                    </Pressable>
                  </View>
                )}

                {/* ── Create Flashcards Banner ── */}
                {!homeSearch && (
                  <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: txt, marginBottom: 14 }}>Study exactly what you need</Text>
                    
                    <View style={{
                        backgroundColor: cardBg,
                        borderRadius: 20, padding: 20,
                        borderWidth: 1, borderColor: border,
                        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2,
                      }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                        <Ionicons name="albums" size={32} color="#4F46E5" />
                      </View>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: txt, marginBottom: 4 }}>Create your own flashcards</Text>
                      <Text style={{ fontSize: 14, color: "#FFFFFF", marginBottom: 20 }}>Study exactly what's on your test</Text>
                      
                      {/* Image placeholder */}
                      <View style={{ height: 120, backgroundColor: "#E0F2FE", borderRadius: 12, marginBottom: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        <Ionicons name="document-text" size={64} color="#4F46E5" style={{ opacity: 0.8 }} />
                      </View>
                      
                      <Pressable
                        onPress={() => setShowAddMenu(true)}
                        style={({ pressed }) => ({
                          backgroundColor: "#4F46E5",
                          borderRadius: 24, paddingVertical: 14,
                          alignItems: "center",
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Create flashcards</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* ── More Options ── */}
                {!homeSearch && (
                  <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: txt, marginBottom: 14 }}>More</Text>
                    
                    <Pressable
                      onPress={async () => {
                        try {
                          await Share.share({
                            message: 'https://play.google.com/store/apps/details?id=com.radium230sorganization.quizforge'
                          });
                        } catch (error) {
                          console.log(error);
                        }
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: cardBg,
                        borderRadius: 16, padding: 20,
                        borderWidth: 1, borderColor: border,
                        flexDirection: "row", alignItems: "center",
                        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 4 }}>Invite your friends</Text>
                        <Text style={{ fontSize: 13, color: muted }}>Learn together and grow faster</Text>
                      </View>
                      <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 32 }}>💌</Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setShowFeedbackPage(true)}
                      style={({ pressed }) => ({
                        marginTop: 12,
                        backgroundColor: cardBg,
                        borderRadius: 16, padding: 20,
                        borderWidth: 1, borderColor: border,
                        flexDirection: "row", alignItems: "center",
                        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 4 }}>Feedback</Text>
                        <Text style={{ fontSize: 13, color: muted }}>Help us improve</Text>
                      </View>
                      <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 32 }}>💡</Text>
                      </View>
                    </Pressable>
                  </View>
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
      {/* Offline Sync Toast */}
      {!!syncToastMessage && (
        <View style={{ position: "absolute", top: Platform.OS === "ios" ? 52 : 24, left: 20, right: 20, zIndex: 1000, backgroundColor: settingsDarkMode ? "#334155" : "#475569", padding: 12, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 10, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 }}>
          <Ionicons name="cloud-offline" size={20} color="#cbd5e1" />
          <Text style={{ color: "#f8fafc", fontSize: 13, fontWeight: "500", flex: 1 }}>{syncToastMessage}</Text>
        </View>
      )}

      {/* Background Quiz Ready Toast */}
      {!!backgroundQuizReady && (
        <View style={{ position: "absolute", top: Platform.OS === "ios" ? 52 : 24, left: 20, right: 20, zIndex: 1000, backgroundColor: "#48CAE4", padding: 16, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 12, elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
          <Ionicons name="checkmark-circle" size={24} color="#0A0B14" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#0A0B14", fontSize: 16, fontWeight: "800" }}>Quiz Ready!</Text>
            <Text style={{ color: "rgba(10,11,20,0.8)", fontSize: 13, fontWeight: "500", marginTop: 2 }} numberOfLines={1}>{backgroundQuizReady.title}</Text>
          </View>
          <Pressable 
            style={{ backgroundColor: "#0A0B14", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}
            onPress={() => {
              const quiz = backgroundQuizReady;
              setBackgroundQuizReady(null);
              setActiveTab("insights");
              setViewingInsightsQuiz(quiz);
              setViewingInsightsQuizFromTab("home");
            }}
          >
            <Text style={{ color: "#48CAE4", fontWeight: "800", fontSize: 13 }}>View</Text>
          </Pressable>
          <Pressable onPress={() => setBackgroundQuizReady(null)} style={{ padding: 4 }}>
            <Ionicons name="close" size={20} color="rgba(10,11,20,0.5)" />
          </Pressable>
        </View>
      )}
    <SafeAreaView style={[styles.rootContainer, !settingsDarkMode && styles.lightRootContainer]} edges={["top", "left", "right"]}>
      {activeSession ? (
        renderActiveSessionView()
      ) : (
        <>
          <View style={styles.screenContainer}>
            {renderContent()}
          </View>

          {/* Bottom Tab Bar — Quizlet-style (hidden during focused editing and study sessions to maximize screen real estate and prevent keyboard overlaps) */}
          {!( (activeTab === "add" && creationMode !== "pick") || activeTab === ("flashcards" as any) || activeTab === ("insights-flashcard" as any) ) && (() => {
            const effectiveTab = (activeTab === "insights" || activeTab === "bookmarked-questions") ? viewingInsightsQuizFromTab : activeTab === "library" ? "library" : activeTab;
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
                  strokeWidth={effectiveTab === "home" ? 2.5 : 2}
                  color={effectiveTab === "home" ? "#FFFFFF" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"} />
                <Text style={[styles.tabLabel, { color: effectiveTab === "home" ? "#FFFFFF" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)", fontWeight: effectiveTab === "home" ? "800" : "500" }]}>{t('tabs.home')}</Text>
              </AnimatedPressable>


              {/* Create */}
              <AnimatedPressable
                onPress={() => setShowAddMenu(true)}
                style={styles.tabItem}
                scaleTo={0.88}
              >
                <FontAwesome6 name="plus" size={22} color={settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"} />
                <Text style={[styles.tabLabel, { color: settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)", fontWeight: "500" }]}>Create</Text>
              </AnimatedPressable>

              {/* Library */}
              <AnimatedPressable
                onPress={() => setActiveTab("library" as any)}
                style={styles.tabItem}
                scaleTo={0.88}
              >
                <IconFolder size={24}
                  strokeWidth={effectiveTab === "library" ? 2.5 : 2}
                  color={effectiveTab === "library" ? "#FFFFFF" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"} />
                <Text style={[styles.tabLabel, { color: effectiveTab === "library" ? "#FFFFFF" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)", fontWeight: effectiveTab === "library" ? "800" : "500" }]}>Library</Text>
              </AnimatedPressable>

              {/* Profile */}
              <AnimatedPressable onPress={() => setActiveTab("menu")} style={styles.tabItem} scaleTo={0.88}>
                <IconUser size={24}
                  strokeWidth={effectiveTab === "menu" ? 2.5 : 2}
                  color={effectiveTab === "menu" ? "#FFFFFF" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"} />
                <Text style={[styles.tabLabel, { color: effectiveTab === "menu" ? "#FFFFFF" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)", fontWeight: effectiveTab === "menu" ? "800" : "500" }]}>{t('tabs.profile')}</Text>
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

    </SafeAreaView>
      {/* ── All Modals ── outside SafeAreaView so they never affect flex layout ── */}
      <AppModals p={{
        showQuizActions, setShowQuizActions, renamingQuiz, setRenamingQuiz, renameTitle, setRenameTitle,
        isImporting, importErrorDetails, setImportErrorDetails, deletingQuizConfirm, setDeletingQuizConfirm,
        showResetConfirm, setShowResetConfirm, showDeleteAccountConfirm, setShowDeleteAccountConfirm,
        showLogoutConfirm, setShowLogoutConfirm,
        deleteAccountLoading, setDeleteAccountLoading, showQuitConfirm, setShowQuitConfirm,
        offlineModalParams, setOfflineModalParams, showQuizSettingsModal, setShowQuizSettingsModal,
        showRestartConfirm, setShowRestartConfirm, selectedAttemptForModal, setSelectedAttemptForModal,
        showFeedbackPage, setShowFeedbackPage, feedbackText, setFeedbackText, feedbackLoading, setFeedbackLoading,
        showPrivacyPolicy, setShowPrivacyPolicy, showTermsOfService, setShowTermsOfService,
        showQuizCreatedModal, setShowQuizCreatedModal, selectedQuiz, setSelectedQuiz,
        pdfViewQuiz, setPdfViewQuiz, showDeckReport, setShowDeckReport,
        showFlashcardOptions, setShowFlashcardOptions, showLanguageModal, setShowLanguageModal,
        savedAppLanguage, setSavedAppLanguage, languageSearch, setLanguageSearch,
        battlePopup, setBattlePopup, settingsDarkMode, firebaseUser,
        quizzes, setQuizzes, flashcardDecks, setFlashcardDecks, sampleQuiz, setSampleDismissed,
        activeSession, setActiveSession, starredQuestions, setStarredQuestions,
        handleOpenQuizOptions, handleShareQuiz, handleStartQuiz, handleFinishSession,
        handleImportQst, handleDeleteAttemptOnMobile, saveAndExitQuizSession, handleClearHistoryOnMobile,
        setActiveTab, setViewingInsightsQuiz, setViewingInsightsDeck, setViewingInsightsQuizFromTab,
        selectionMode, setSelectionMode, randomCount, setRandomCount,
        rangeStart, setRangeStart, rangeEnd, setRangeEnd,
        shuffleQuestions, setShuffleQuestions, shuffleAnswers, setShuffleAnswers,
        showAnswerOnSubmit, setShowAnswerOnSubmit, autoSlideEnabled, setAutoSlideEnabled,
        quizTimeLimit, setQuizTimeLimit, quizPerQuestionTimer, setQuizPerQuestionTimer, timeLimitText, setTimeLimitText,
        showTimeLimitDropdown, setShowTimeLimitDropdown, triggerConfettiBurst,
        neonUserReadyRef, setCreationMode, setCreationStep, setFcTitle, setFcCards,
        setFcCurrentIdx, setCardType, setEditingDeckId, updateMobileQuiz, deleteMobileQuiz,
        sendFeedback, deleteAccount, deleteUserFromNeon, handleLogout: async () => {
          setSignOutLoading(true);
          await new Promise(r => setTimeout(r, 800));
          setQuizzes([]);
          quizzesRef.current = [];
          await AsyncStorage.removeItem("quizforge_quizzes_global");
          await AsyncStorage.removeItem("quizforge_starred_global");
          await signOutUser();
          setSignOutLoading(false);
          setActiveTab("home");
        },
        confettiParticles, setConfettiParticles,
        deleteFlashcardDeck, fileInputRef, isConnected, parsePdfFromBackend, parsePptFromBackend,
        handleGenerateWithAI, aiGenPhase, setAiGenPhase,
        quizFlatListRef, quizNumbersScrollRef, setIsImporting, pendingAiFile, setPendingAiFile,
        showAddMenu, setShowAddMenu
      }} />

      {/* ── AI Generation Screen ── */}
      {aiGenPhase === "generating" && <AIGeneratingScreen onCancel={() => { isBackgroundGen.current = true; setAiGenPhase(null); }} />}

      {/* ── Battle Modals ── */}
      {(() => {
        const isDark = settingsDarkMode;
        const bg      = isDark ? "#0B0F1E" : "#f4f4f8";
        const cardBg  = isDark ? "#141930" : "#ffffff";
        const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
        const txt     = isDark ? "#ffffff" : "#0d0f14";
        const muted   = isDark ? "rgba(255,255,255,0.7)" : "#64748b";
        const mutedSub = isDark ? "rgba(255,255,255,0.4)" : "#94a3b8";
        return (
          <>
        {/* ── Quiz Selector Modal ── */}
        {showBattleQuizSelector && (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBattleQuizSelector(false)}>
          <View style={{ flex: 1, backgroundColor: bg }}>
            <SafeAreaView style={{ backgroundColor: bg }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: txt, letterSpacing: -0.4 }}>Select a Quiz</Text>
                </View>
                <Pressable
                  onPress={() => setShowBattleQuizSelector(false)}
                  style={({ pressed }) => [{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    alignItems: "center", justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  }]}
                >
                  <Ionicons name="close" size={18} color={txt} />
                </Pressable>
              </View>
            </SafeAreaView>
            <FlatList
              data={(!sampleDismissed && sampleQuiz) ? [sampleQuiz, ...quizzes].reverse() : [...quizzes].reverse()}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleHostBattle(item.id)}
                  style={({ pressed }) => [{
                    backgroundColor: cardBg,
                    borderWidth: 1, borderColor: cardBorder,
                    borderRadius: 16, padding: 18,
                    flexDirection: "row", alignItems: "center", gap: 14,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.04, shadowRadius: 8, elevation: isDark ? 0 : 1,
                  }, pressed && { opacity: 0.8, borderColor: isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)" }]}
                >
                  <View style={{
                    width: 46, height: 46, borderRadius: 12,
                    backgroundColor: isDark ? "rgba(129,140,248,0.15)" : "rgba(79,70,229,0.1)",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Ionicons name="document-text" size={22} color={isDark ? "#818cf8" : "#4f46e5"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 3 }} numberOfLines={1}>{item.title.replace(/[\r\n]+/g, ' ')}</Text>
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
        )}

        {/* ── Battle Options Modal ── */}
        {showBattleOptions && (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!battleCreating) setShowBattleOptions(false); }}>
          <View style={{ flex: 1, backgroundColor: isDark ? "#0B0F1C" : "#f4f4f8" }}>

            {/* Header with safe area */}
            <SafeAreaView style={{ backgroundColor: isDark ? "#0B0F1C" : "#f4f4f8" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: txt, letterSpacing: -0.4 }}>Battle Setup</Text>
                  {battleOptionsQuiz && (
                    <Text style={{ fontSize: 13, color: muted, marginTop: 3 }} numberOfLines={1}>
                      {battleOptionsQuiz.title.replace(/[\r\n]+/g, ' ')}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => { if (!battleCreating) setShowBattleOptions(false); }}
                  style={({ pressed }) => [{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    alignItems: "center", justifyContent: "center",
                    opacity: battleCreating ? 0.3 : pressed ? 0.6 : 1,
                  }]}
                >
                  <Ionicons name="close" size={18} color={txt} />
                </Pressable>
              </View>
            </SafeAreaView>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160, paddingTop: 4 }}
              showsVerticalScrollIndicator={false}
            >

              {/* Questions available pill */}
              {battleOptionsQuiz && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 28 }}>
                  <View style={{ backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#818cf8" : "#6366f1" }}>
                      {battleOptionsQuiz.questions} questions available
                    </Text>
                  </View>
                </View>
              )}

              {/* Question Selection */}
              <Text style={{ fontSize: 11, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Questions</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                {([{ value: "all" as const, label: "All" }, { value: "random" as const, label: "Random" }, { value: "range" as const, label: "Range" }]).map(({ value, label }) => {
                  const isActive = battleSelectionMode === value;
                  return (
                    <Pressable key={value} onPress={() => setBattleSelectionMode(value)}
                      style={({ pressed }) => [{
                        flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
                        backgroundColor: isActive
                          ? (isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)")
                          : (isDark ? "#141930" : "rgba(0,0,0,0.03)"),
                        borderWidth: 1.5,
                        borderColor: isActive
                          ? (isDark ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.4)")
                          : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"),
                        opacity: pressed ? 0.75 : 1,
                      }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color: isActive ? (isDark ? "#a5b4fc" : "#6366f1") : muted }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Random count stepper */}
              {battleSelectionMode === "random" && (
                <View style={{ backgroundColor: isDark ? "#141930" : "#ffffff",
                  borderRadius: 14, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb",
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: txt }}>Number of questions</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Pressable onPress={() => setBattleRandomCount(Math.max(1, battleRandomCount - 1))}
                      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
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
                      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 18, color: txt, fontWeight: "700" }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Range steppers */}
              {battleSelectionMode === "range" && (
                <View style={{ backgroundColor: isDark ? "#141930" : "#ffffff",
                  borderRadius: 14, padding: 18, marginBottom: 24, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb",
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: txt }}>Range</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {[{ val: battleRangeStart, set: (v: number) => setBattleRangeStart(Math.max(1, Math.min(battleRangeEnd, v))) },
                      { val: battleRangeEnd, set: (v: number) => setBattleRangeEnd(Math.max(battleRangeStart, Math.min(battleOptionsQuiz?.questionsList?.length || 100, v))) }
                    ].map((item, idx) => (
                      <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {idx === 1 && <Text style={{ fontSize: 13, color: muted, marginHorizontal: 4 }}>to</Text>}
                        <Pressable onPress={() => item.set(item.val - 1)}
                          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 16, color: txt, fontWeight: "700" }}>−</Text>
                        </Pressable>
                        <TextInput
                          style={{ fontSize: 16, fontWeight: "800", color: txt, minWidth: 32, textAlign: "center", padding: 0 }}
                          keyboardType="number-pad"
                          value={item.val === 0 ? "" : String(item.val)}
                          onChangeText={(text) => {
                            const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
                            if (!isNaN(n)) item.set(n);
                          }}
                        />
                        <Pressable onPress={() => item.set(item.val + 1)}
                          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 16, color: txt, fontWeight: "700" }}>+</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Time per question */}
              <Text style={{ fontSize: 11, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Time per Question</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {([null, 15, 20, 30, 45, 60] as (number | null)[]).map((t) => {
                  const isActive = battleTimePerQuestion === t;
                  const label = t === null ? "No Limit" : `${t}s`;
                  return (
                    <Pressable key={String(t)} onPress={() => setBattleTimePerQuestion(t)}
                      style={({ pressed }) => [{
                        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
                        backgroundColor: isActive
                          ? (isDark ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)")
                          : (isDark ? "#141930" : "rgba(0,0,0,0.03)"),
                        borderWidth: 1.5,
                        borderColor: isActive
                          ? (isDark ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.4)")
                          : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"),
                        opacity: pressed ? 0.7 : 1,
                      }]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: isActive ? (isDark ? "#a5b4fc" : "#6366f1") : muted }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Gameplay toggles */}
              <Text style={{ fontSize: 11, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Gameplay</Text>
              <View style={{ backgroundColor: isDark ? "#141930" : "#ffffff",
                borderRadius: 16, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.07)" : "#e5e7eb", overflow: "hidden" }}>
                {[
                  { label: "Shuffle questions", sub: "Randomize question order", value: battleShuffleQ, set: setBattleShuffleQ },
                  { label: "Shuffle answers", sub: "Randomize answer choices", value: battleShuffleA, set: setBattleShuffleA },
                ].map((row, i) => (
                  <View key={row.label}>
                    {i > 0 && <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", marginLeft: 18 }} />}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 }}>
                      <View style={{ flex: 1, marginRight: 16 }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: txt, marginBottom: 2 }}>{row.label}</Text>
                        <Text style={{ fontSize: 12, color: muted }}>{row.sub}</Text>
                      </View>
                      <ToggleSwitch checked={row.value} onChange={row.set} darkMode={isDark} />
                    </View>
                  </View>
                ))}
              </View>

            </ScrollView>

            {/* Sticky bottom — CTA + optional join code */}
            <View style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              backgroundColor: isDark ? "#0B0F1C" : "#f4f4f8",
              borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              paddingHorizontal: 20, paddingTop: 16, paddingBottom: Platform.OS === "ios" ? 36 : 20,
              gap: 10,
            }}>
              {/* Join code row — shown when from insights, uses indigo palette */}
              {battleOptionsSource === "insights" && (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <TextInput
                    style={{
                      flex: 1, height: 46,
                      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                      borderWidth: 1,
                      borderColor: battleError
                        ? (isDark ? "#f87171" : "#ef4444")
                        : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"),
                      borderRadius: 12, paddingHorizontal: 14,
                      fontSize: 14, fontWeight: "700", color: txt, letterSpacing: 3,
                    }}
                    placeholder="ROOM CODE"
                    placeholderTextColor={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)"}
                    maxLength={5}
                    value={joinCodeInput}
                    onChangeText={(text) => { setJoinCodeInput(text); if (battleError) setBattleError(""); }}
                    autoCapitalize="characters"
                  />
                  <Pressable
                    onPress={async () => {
                      if (!joinCodeInput || joinCodeInput.length < 5) return;
                      setShowBattleOptions(false);
                      setActiveTab("battle" as any);
                      await handleJoinBattle();
                    }}
                    disabled={!joinCodeInput || joinCodeInput.length < 5 || battleCreating}
                    style={({ pressed }) => [{
                      height: 46, paddingHorizontal: 18, borderRadius: 12,
                      backgroundColor: (!joinCodeInput || joinCodeInput.length < 5)
                        ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)")
                        : (isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)"),
                      borderWidth: 1,
                      borderColor: (!joinCodeInput || joinCodeInput.length < 5)
                        ? (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)")
                        : (isDark ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.4)"),
                      alignItems: "center", justifyContent: "center",
                      opacity: pressed ? 0.7 : 1,
                    }]}
                  >
                    {battleCreating
                      ? <ActivityIndicator size="small" color={isDark ? "#a5b4fc" : "#6366f1"} />
                      : <Text style={{ fontSize: 14, fontWeight: "700", color: (!joinCodeInput || joinCodeInput.length < 5) ? muted : (isDark ? "#a5b4fc" : "#6366f1") }}>Join</Text>
                    }
                  </Pressable>
                </View>
              )}
              {battleError ? <Text style={{ fontSize: 12, color: "#f87171", marginTop: -4 }}>{battleError}</Text> : null}

              {/* Create Room CTA */}
              <Pressable
                onPress={handleStartBattle}
                disabled={battleCreating}
                style={({ pressed }) => [{
                  borderRadius: 16, overflow: "hidden",
                  shadowColor: "#4f46e5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
                  opacity: battleCreating ? 0.7 : 1,
                }, pressed && !battleCreating && { transform: [{ scale: 0.98 }] }]}
              >
                <LinearGradient
                  colors={["#6366f1", "#4f46e5"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 17, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }}
                >
                  {battleCreating ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Creating Room…</Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="sword-cross" size={20} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Create Battle Room</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>
        )}

        {/* ── Battle History Modal ── */}
        {/* ── Battle History Modal ── */}
        {showBattleHistory && (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBattleHistory(false)}>
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
                data={[...battleHistory].sort((a, b) => b.date - a.date)}
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
        )}
          </>
        );
      })()}
      {/* ── Study Mode Modal ── */}
      {studyModeModalVisible && (() => {
        const isDark = settingsDarkMode;
        const quiz = viewingInsightsQuiz;
        const allCards = quiz?.flashcards || [];
        const dueCards = allCards.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now());
        const countLabel = `${allCards.length} Flashcards available`;

        const getLimit = () => {
          if (studyCardCount === "auto") return null;
          return studyCardCount;
        };

        const handleStart = () => {
          if (selectedStudyMode === "spaced" && dueCards.length === 0) {
            // No due cards — go straight to the completion screen instead of an alert
            setStudyModeModalVisible(false);
            const savedDeck = flashcardDecks.find((d: any) => d.id === `temp-${quiz?.id}`);
            const savedCardsMap = new Map((savedDeck?.cards || []).map((c: any) => [c.id, c]));
            const mergedCards = allCards.map((c: any, i: number) => {
              const cardId = c.id || `fc-${i}`;
              const saved = savedCardsMap.get(cardId) as any;
              return {
                ...c, id: cardId,
                sm2_interval:       saved?.sm2_interval       ?? c.sm2_interval       ?? 0,
                sm2_repetition:     saved?.sm2_repetition     ?? c.sm2_repetition     ?? 0,
                sm2_easeFactor:     saved?.sm2_easeFactor     ?? c.sm2_easeFactor     ?? 2.5,
                sm2_state:          saved?.sm2_state          ?? c.sm2_state          ?? CardState.NEW,
                sm2_nextReviewDate: saved?.sm2_nextReviewDate ?? c.sm2_nextReviewDate ?? null,
              };
            });
            const tempDeck = { id: `temp-${quiz?.id}`, neonId: null,
              title: quiz?.title || "Flashcards", cardType: "Basic", cards: mergedCards };
            setFlashcardDecks((prev: any[]) => {
              const exists = prev.find((d: any) => d.id === tempDeck.id);
              return exists
                ? prev.map((d: any) => d.id === tempDeck.id ? { ...d, cards: mergedCards } : d)
                : [...prev, tempDeck];
            });
            setStudyingDeck(tempDeck);
            setStudyQueue([]);         // empty queue → completion screen
            setIsPreviewMode(false);
            flipAnim.setValue(0);
            swipeX.setValue(0);
            setActiveTab("flashcards" as any);
            return;
          }

          setStudyModeModalVisible(false);
          if (selectedStudyMode === "simple") {
            setFcIndex(0);
            setFcFlipped(false);
            insightsFlipAnim.setValue(0);
            insightsSwipeX.setValue(0);
            insightsSwipeY.setValue(0);
            setActiveTab("insights-flashcard" as any);
          } else {
            const limit = getLimit();

            // Look up any previously saved SM2 progress for this quiz's flashcards
            const savedDeck = flashcardDecks.find((d: any) => d.id === `temp-${quiz?.id}`);
            const savedCardsMap = new Map((savedDeck?.cards || []).map((c: any) => [c.id, c]));

            // Merge SM2 data from saved deck into the current flashcards
            const mergedCards = allCards.map((c: any, i: number) => {
              const cardId = c.id || `fc-${i}`;
              const saved = savedCardsMap.get(cardId) as any;
              return {
                ...c,
                id: cardId,
                sm2_interval:       saved?.sm2_interval       ?? c.sm2_interval       ?? 0,
                sm2_repetition:     saved?.sm2_repetition     ?? c.sm2_repetition     ?? 0,
                sm2_easeFactor:     saved?.sm2_easeFactor     ?? c.sm2_easeFactor     ?? 2.5,
                sm2_state:          saved?.sm2_state          ?? c.sm2_state          ?? CardState.NEW,
                sm2_nextReviewDate: saved?.sm2_nextReviewDate ?? c.sm2_nextReviewDate ?? null,
              };
            });

            // Filter for due cards — add 5s buffer so "again" cards (nextReviewDate ≈ now) always qualify
            const now = Date.now() + 5000;
            const mergedDue = mergedCards.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= now);

            if (mergedDue.length === 0) {
              // No due cards — navigate to the full completion screen so user
              // can still Preview Next 5, Learn New Cards, Review All, etc.
              setStudyModeModalVisible(false);
              const tempDeck = {
                id: `temp-${quiz?.id}`,
                neonId: null,
                title: quiz?.title || "Flashcards",
                cardType: "Basic",
                cards: mergedCards,          // full merged deck, not just due
              };
              setFlashcardDecks((prev: any[]) => {
                const exists = prev.find((d: any) => d.id === tempDeck.id);
                return exists
                  ? prev.map((d: any) => d.id === tempDeck.id ? { ...d, cards: mergedCards } : d)
                  : [...prev, tempDeck];
              });
              setStudyingDeck(tempDeck);
              setStudyQueue([]);           // empty queue → triggers completion screen
              setIsPreviewMode(false);
              setNoDueAtStart(true);       // flag: we got here because 0 cards were due
              flipAnim.setValue(0);
              swipeX.setValue(0);
              setActiveTab("flashcards" as any);
              return;
            }

            const cardsToStudy = limit ? mergedDue.slice(0, limit) : mergedDue;
            const tempDeck = {
              id: `temp-${quiz?.id}`,
              neonId: null,
              title: quiz?.title || "Flashcards",
              cardType: "Basic",
              cards: cardsToStudy,
            };

            // Save/update the temp deck in state so SM2 data persists
            setFlashcardDecks((prev: any[]) => {
              const exists = prev.find((d: any) => d.id === tempDeck.id);
              if (exists) {
                return prev.map((d: any) => d.id === tempDeck.id ? { ...d, cards: mergedCards } : d);
              }
              return [...prev, { ...tempDeck, cards: mergedCards }];
            });

            startStudy(tempDeck, false);
            setActiveTab("flashcards" as any);
          }
        };

        return (
          <Modal
            visible={studyModeModalVisible}
            animationType="fade"
            transparent={false}
            onRequestClose={() => setStudyModeModalVisible(false)}
          >
            <KeyboardAvoidingView style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f4f4f8" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={{ flex: 1, paddingTop: Platform.OS === "ios" ? 60 : 64 }}>


                  {/* Header */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 24 }}>
                    <Text style={{ fontSize: 24, fontWeight: "500", color: isDark ? "#ffffff" : "#0d0f14", fontFamily: "serif" }}>Study Mode</Text>
                <Pressable onPress={() => setStudyModeModalVisible(false)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6 })}>
                  <Feather name="x" size={24} color={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"} />
                </Pressable>
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Spaced Repetition option */}
                <Pressable
                  onPress={() => setSelectedStudyMode("spaced")}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: "transparent",
                    borderRadius: 16, padding: 18, marginBottom: 14,
                    borderWidth: 2,
                    borderColor: selectedStudyMode === "spaced" ? "#34d399" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"),
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ width: 40, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                    <Text style={{ fontSize: 26 }}>🧠</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 3 }}>Spaced Repetition</Text>
                    <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>Optimizes retention with smart scheduling</Text>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selectedStudyMode === "spaced" ? "#34d399" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)"), alignItems: "center", justifyContent: "center" }}>
                    {selectedStudyMode === "spaced" && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#34d399" }} />}
                  </View>
                </Pressable>

                {/* Simple Review option */}
                <Pressable
                  onPress={() => setSelectedStudyMode("simple")}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: "transparent",
                    borderRadius: 16, padding: 18, marginBottom: 28,
                    borderWidth: 2,
                    borderColor: selectedStudyMode === "simple" ? "#34d399" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"),
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ width: 40, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                    <Text style={{ fontSize: 26 }}>📋</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 3 }}>Simple Review</Text>
                    <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>Browse all cards at your own pace</Text>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selectedStudyMode === "simple" ? "#34d399" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)"), alignItems: "center", justifyContent: "center" }}>
                    {selectedStudyMode === "simple" && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#34d399" }} />}
                  </View>
                </Pressable>


              </ScrollView>

              {/* Start Flashcards button — pinned to bottom */}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 44 : 36, paddingTop: 16, backgroundColor: isDark ? "#0f172a" : "#f4f4f8" }}>
                <Pressable
                  onPress={handleStart}
                  style={({ pressed }) => [
                    { backgroundColor: "#ffffff", borderRadius: 12, paddingVertical: 18, alignItems: "center" },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>Start Flashcards</Text>
                </Pressable>
              </View>
            </View>
            </KeyboardAvoidingView>
          </Modal>
        );
      })()}
    </View>
  );
}

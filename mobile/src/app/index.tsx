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
import { BattleLobbyScreen, FlashcardsScreen } from "../screens/BattleAndFlashcardScreens";
import { AuthScreen } from "../screens/AuthScreen";
import { MainContentScreen } from "../screens/MainContentScreen";
import { AIGeneratingScreen, FullscreenBattleCountdown } from "../components/AIGeneratingScreen";



// ── Flashcard API stubs (feature removed — dead code references kept for safety) ──
const createFlashcardDeck = async (..._args: any[]) => ({ deck: null, error: null });
const updateFlashcardDeck = async (..._args: any[]) => ({ deck: null, error: null });
const deleteFlashcardDeck = async (..._args: any[]) => ({ error: null });

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
        console.warn("[App Config] Failed to load config from backend:", error);
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
        // Tag user in Sentry and PostHog (UID only, no PII)
        Sentry.setUser({ id: user.uid, email: user.email || undefined, username: user.displayName || undefined });
        identifyUser(user.uid);
      } else {
        AsyncStorage.removeItem("cachedFirebaseUser");
        AsyncStorage.removeItem("quizforge_synced_uid"); // next login will re-sync from Neon
        Sentry.setUser(null);
        clearUser();
      }

      if (user) {
        // ── Determine if this is a genuine new login vs an app-restart / token refresh ──
        // loadedUidRef is a useRef — it resets to undefined on every cold open / R press.
        // That caused a full Neon fetch on every single app start, which is exactly what
        // resurrects deleted quizzes. Instead, persist the synced UID to AsyncStorage:
        //   • first login / account switch  → uid not in storage → full sync
        //   • every other open / reconnect  → uid already in storage → skip fetch
        const syncedUid = await AsyncStorage.getItem("quizforge_synced_uid");
        const isNewLogin = syncedUid !== user.uid;
        loadedUidRef.current = user.uid; // keep ref in sync for starred-questions effect

        if (!isNewLogin) {
          // Same user, already synced — just flush pending deletes silently.
          // Local state loaded from AsyncStorage is already correct.
          console.log("[NeonSync] Already synced for this user — skipping fetch, flushing pending deletes only");
          AsyncStorage.getItem("quizforge_pending_deletions").then(async (val) => {
            const pending: string[] = val ? JSON.parse(val) : [];
            const combined = Array.from(new Set([...pending, ...pendingDeleteIdsRef.current]));
            if (combined.length === 0) return;
            const remaining: string[] = [];
            for (const pid of combined) {
              try {
                const res = await deleteMobileQuiz(user.uid, pid);
                if (res.error) remaining.push(pid);
                else pendingDeleteIdsRef.current.delete(pid);
              } catch { remaining.push(pid); }
            }
            await AsyncStorage.setItem("quizforge_pending_deletions", JSON.stringify(remaining));
            pendingDeleteIdsRef.current = new Set(remaining);
          }).catch(() => {});
          return; // ← skip the full sync below
        }

        // ── Full sync — only runs on actual login / account switch ────────────
        setIsSyncingData(true);
        try {
          // Sync user profile to Neon FIRST to guarantee user exists
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

            // Flush any offline-queued deletions FIRST, before fetching.
            const pendingValPre = await AsyncStorage.getItem("quizforge_pending_deletions");
            const pendingIdsPre: string[] = pendingValPre ? JSON.parse(pendingValPre) : [];
            const allTombstoneIds = new Set([...pendingIdsPre, ...pendingDeleteIdsRef.current]);
            allTombstoneIds.forEach(id => pendingDeleteIdsRef.current.add(id));

            let remainingTombstones: string[] = [];
            if (allTombstoneIds.size > 0) {
              console.log(`[NeonSync] Flushing ${allTombstoneIds.size} pending deletion(s) before fetch…`);
              for (const pid of allTombstoneIds) {
                try {
                  const res = await deleteMobileQuiz(user.uid, pid);
                  if (res.error) {
                    console.warn("[NeonSync] pending delete failed:", res.error);
                    remainingTombstones.push(pid);
                  }
                } catch (err) {
                  remainingTombstones.push(pid);
                }
              }
            }

            // Fetch quizzes from Neon (deleted quizzes are now gone from the DB)
            const quizzesRes = await fetchMobileQuizzes(user.uid);
            if (quizzesRes.error) {
              console.warn("[NeonSync] fetch failed:", quizzesRes.error);
            }

            // Pre-filter Neon response using tombstones (belt-and-suspenders)
            if (!quizzesRes.error && quizzesRes.quizzes) {
              quizzesRes.quizzes = quizzesRes.quizzes.filter((q: any) => !allTombstoneIds.has(q.id));
            }

            if (!quizzesRes.error && quizzesRes.quizzes.length > 0) {
              const normalizedQuizzes = quizzesRes.quizzes.map((q) => {
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
                // Strip tombstoned quizzes from local (catches stale AsyncStorage data after reload)
                const cleanLocal = local.filter((l) =>
                  l.id !== "sample_quiz" &&
                  !allTombstoneIds.has(l.id) &&
                  !allTombstoneIds.has(l.neonId)
                );
                const updatedLocal = cleanLocal.map(l => {
                  const synced = normalizedQuizzes.find((n) => n.id === l.id || n.id === l.neonId);
                  return synced || l;
                });
                const newFromServer = normalizedQuizzes.filter(n =>
                  !cleanLocal.find(l => l.id === n.id || l.neonId === n.id) &&
                  !allTombstoneIds.has(n.id) &&
                  !allTombstoneIds.has(n.neonId)
                );
                const combined = [...updatedLocal, ...newFromServer].filter((q: any) => {
                  const qc = typeof q.questions === "number" ? q.questions : (q.questionsList?.length || 0);
                  const cc = q.flashcards?.length || 0;
                  return qc > 0 || cc > 0;
                });
                deduplicateUserQuizzes(combined, { currentUserId: user.uid }).then(({ deduplicatedQuizzes, removedQuizIds, neonDeletions, hasChanges }) => {
                  if (hasChanges) {
                    removedQuizIds.forEach((id) => pendingDeleteIdsRef.current.add(id));
                    setQuizzes(deduplicatedQuizzes);
                    AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify(deduplicatedQuizzes)).catch(() => {});
                    for (const d of neonDeletions) {
                      deleteMobileQuiz(user.uid, d.neonId).catch(() => {});
                    }
                  }
                }).catch(() => {});
                return combined;
              });

              // Backfill local-only quizzes to Neon
              const neonIds = new Set(normalizedQuizzes.map((q) => q.id));
              const unsynced = quizzesRef.current.filter((q) =>
                !q.isSample &&
                q.id !== "sample_quiz" &&
                !neonIds.has(q.id) &&
                !q.neonId &&
                !allTombstoneIds.has(q.id)
              );
              console.log(`[NeonSync] Neon has ${normalizedQuizzes.length} quizzes, ${unsynced.length} local unsynced`);
              for (const q of unsynced) {
                createMobileQuiz({
                  id: q.id,
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
              // Neon is empty — upload all local quizzes (skip tombstoned ones)
              console.log(`[NeonSync] Neon empty, uploading ${quizzesRef.current.length} local quizzes`);
              for (const q of quizzesRef.current) {
                if (q.neonId || q.isSample || q.id === "sample_quiz") continue;
                if (allTombstoneIds.has(q.id)) continue;
                createMobileQuiz({
                  id: q.id,
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

            // Persist only unresolved tombstones (after merge is complete)
            await AsyncStorage.setItem("quizforge_pending_deletions", JSON.stringify(remainingTombstones));
            pendingDeleteIdsRef.current = new Set(remainingTombstones);

            // Mark this UID as fully synced — future app opens will skip the Neon fetch
            // and load from AsyncStorage only. Cleared on logout / account switch.
            await AsyncStorage.setItem("quizforge_synced_uid", user.uid);

            // Fetch battle history from Neon and merge
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
                  const key = h.room_code || `${new Date(h.created_at).getTime()}_${h.quiz_title}`;
                  const existing = mergedMap.get(key);
                  mergedMap.set(key, {
                    date: new Date(h.created_at).getTime(),
                    roomCode: h.room_code,
                    quizTitle: h.quiz_title,
                    myScore: h.my_score,
                    opponentScore: h.opponent_score,
                    opponentName: h.opponent_name,
                    won: h.won,
                    myTime: h.my_time,
                    opponentTime: h.opponent_time,
                    questions: (h.questions && h.questions.length > 0) ? h.questions : existing?.questions,
                    answers: (h.answers && Object.keys(h.answers).length > 0) ? h.answers : existing?.answers
                  });
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
      let loadedHistory: any[] = [];
      if (histVal) {
        try { 
          loadedHistory = JSON.parse(histVal); 
          setBattleHistory(loadedHistory); 
        } catch {}
      }

      if (pendVal) {
        try {
          let pending = JSON.parse(pendVal) as {code: string, isHost: boolean, questions?: any[], answers?: Record<string, string[]>}[];
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

              const entry = {
                date: Date.now(),
                roomCode: pb.code,
                quizTitle: room.quizTitle || "",
                myScore,
                opponentScore: oppScore,
                opponentName: oppName,
                won: effectiveWin,
                myTime: myTime !== Infinity ? myTime : undefined,
                opponentTime: oppTime !== Infinity ? oppTime : undefined,
                questions: pb.questions || [],
                answers: pb.answers || {}
              };
              const filtered = loadedHistory.filter((p: any) => p.roomCode !== pb.code);
              loadedHistory = [...filtered, entry].slice(-50);
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
                  
                  const entry = {
                    date: Date.now(),
                    roomCode: pb.code,
                    quizTitle: data.quizTitle || "",
                    myScore,
                    opponentScore: oppScore,
                    opponentName: oppName,
                    won: effectiveWin,
                    myTime: myTime !== Infinity ? myTime : undefined,
                    opponentTime: oppTime !== Infinity ? oppTime : undefined,
                    questions: pb.questions || [],
                    answers: pb.answers || {}
                  };

                  setBattleHistory(prev => {
                    const filtered = prev.filter((p: any) => p.roomCode !== pb.code);
                    const next = [...filtered, entry].slice(-50);
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

  useEffect(() => {
    if (pendingSharedQuizId && isConnected) {
      // Guard: if we're already importing this exact ID, skip
      if (importingSharedQuizRef.current === pendingSharedQuizId) return;
      importingSharedQuizRef.current = pendingSharedQuizId;

      const id = pendingSharedQuizId;
      setPendingSharedQuizId(null);
      
      const fetchAndImport = async () => {
        try {
          setIsImporting(true);
          const { quiz, error } = await fetchSharedQuiz(id);
          if (error || !quiz) {
            throw new Error(error || t('share.quiz_deleted') || "This quiz was deleted or is no longer available.");
          }
          
          const parsed = parseQstText(quiz.sourceText);
          const questionsList = parsed?.questions && parsed.questions.length > 0 ? parsed.questions : [];
          const flashcards = parsed?.flashcards && parsed.flashcards.length > 0 ? parsed.flashcards : [];
          const qCount = questionsList.length || quiz.questionCount || 0;

          const newQuizId = "quiz_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
          const masterQuizId = (quiz as any).isMaster ? id : ((quiz as any).masterQuizId || (id.startsWith("uq_") ? id : null));

          let finalQuiz: any = {
            id: newQuizId,
            masterQuizId,
            neonId: null,
            title: quiz.title,
            category: quiz.category || "General",
            questions: qCount,
            questionsList,
            flashcards,
            sourceText: quiz.sourceText,
            createdAt: new Date().toISOString(),
            attempts: [],
            wrongQuestions: [],
            uniqueCorrectIds: []
          };

          // Check for existing identical quiz in user's library before creating duplicate
          const existingQuiz = await (async () => {
            const newFp = await computeQuizFingerprint(finalQuiz);
            if (!newFp) return null;
            for (const q of quizzesRef.current) {
              const curFp = await computeQuizFingerprint(q);
              if (curFp && curFp === newFp) return q;
            }
            return null;
          })();

          if (existingQuiz) {
            console.log("[SharedQuizImport] Found existing identical quiz in library — updating canonical:", existingQuiz.id);
            const merged = mergeQuizPersonalState(existingQuiz, [finalQuiz]);
            setQuizzes((prev) => {
              const updated = prev.map((q) => q.id === existingQuiz.id ? merged : q);
              AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify(updated)).catch(() => {});
              return updated;
            });
            trackQuizCreated({ source: "shared_link", questionCount: qCount });
            setActiveTab("insights");
            setViewingInsightsQuiz(merged);
            setViewingInsightsQuizFromTab("home");
            setCustomToast({
              message: `Opened course: ${quiz.title}`,
              icon: 'checkmark-circle-outline',
              color: '#38bdf8'
            });
            setTimeout(() => setCustomToast(null), 3500);
            return;
          }

          if (firebaseUser?.uid && neonUserReadyRef.current) {
            try {
              const { quiz: savedQuiz, error: saveErr } = await createMobileQuiz({
                id: newQuizId,
                userId: firebaseUser.uid,
                masterQuizId,
                title: quiz.title,
                category: quiz.category || "General",
                questionCount: qCount,
                sourceText: quiz.sourceText,
                attempts: [],
                wrongQuestions: [],
                uniqueCorrectIds: []
              });
              if (savedQuiz && !saveErr) {
                finalQuiz = { ...finalQuiz, neonId: savedQuiz.id };
              }
            } catch (saveError) {
              console.warn("[SharedQuizImport] Cloud sync warning:", saveError);
            }
          }
          
          setQuizzes((prev) => {
            const updated = [finalQuiz, ...prev.filter((q: any) => q.id !== finalQuiz.id && q.id !== newQuizId)];
            AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify(updated)).catch(() => {});
            return updated;
          });
          trackQuizCreated({ source: "shared_link", questionCount: qCount });
          setActiveTab("insights");
          setViewingInsightsQuiz(finalQuiz);
          setViewingInsightsQuizFromTab("home");
          setCustomToast({
            message: `Imported shared course: ${quiz.title}`,
            icon: 'download-outline',
            color: '#2dd4a7'
          });
          setTimeout(() => setCustomToast(null), 3500);
        } catch (err: any) {
          Alert.alert("Import Failed", err.message);
        } finally {
          setIsImporting(false);
          importingSharedQuizRef.current = null;
        }
      };
      
      fetchAndImport();
    }
  }, [pendingSharedQuizId, firebaseUser, isConnected]);

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
      console.warn("[PullRefresh] failed:", err);
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
          const isBattle = currentSession.isBattle;
          
          if (autoSlideEnabled || isBattle) {
            setTimeout(() => {
              if (nextIdx < currentSession.questions.length) {
                handleNavigateSession(nextIdx);
                quizFlatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
              } else {
                handleFinishSession();
              }
            }, isBattle ? 0 : 800);
          }

          return {
            ...currentSession,
            answers: newAnswers,
            submitted: newSubmitted
          };
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

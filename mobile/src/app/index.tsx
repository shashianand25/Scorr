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


  const handleStartQuiz = () => {
    if (!selectedQuiz) return;
    
    // Clear any previously paused session for this quiz so the newly configured preset and feedback settings apply
    setSavedSessions(prev => {
      if (!prev[selectedQuiz.id]) return prev;
      const next = { ...prev };
      delete next[selectedQuiz.id];
      return next;
    });

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
    trackQuizStarted({
      mode: selectionMode,
      questionCount: session.questions.length,
      shuffleAnswers: !!shuffleAnswers,
      showAnswerOnSubmit: !!showAnswerOnSubmit,
      hasTimeLimit: !!(quizTimeLimit || quizPerQuestionTimer),
    });
  };

  const saveAndExitQuizSession = (exitSession: boolean = true, sessionToSave: any = activeSessionRef.current || activeSession) => {
    if (!sessionToSave || !sessionToSave.isFinished) {
      if (sessionToSave && !sessionToSave.isFinished && sessionToSave.quizId) {
        setSavedSessions(prev => ({ ...prev, [sessionToSave.quizId]: sessionToSave }));
      }
      if (exitSession) {
        setActiveSession(null);
        setSelectedQuiz(null);
        if (sessionToSave?.quizId) {
          const sq = sessionToSave.quizId === "sample_quiz" ? sampleQuiz : quizzes.find((q: any) => q.id === sessionToSave.quizId);
          if (sq) {
            setViewingInsightsQuiz(sq);
            setActiveTab("insights");
          }
        }
      }
      return;
    }

    if (sessionToSave.attemptSaved) {
      if (exitSession) {
        setActiveSession(null);
        setSelectedQuiz(null);
        if (sessionToSave?.quizId) {
          const sq = sessionToSave.quizId === "sample_quiz" ? sampleQuiz : quizzes.find((q: any) => q.id === sessionToSave.quizId);
          if (sq) {
            setViewingInsightsQuiz(sq);
            setActiveTab("insights");
          }
        }
      }
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
        setSelectedQuiz(null);
        if (sessionToSave?.quizId) {
          const sq = sessionToSave.quizId === "sample_quiz" ? sampleQuiz : quizzes.find((q: any) => q.id === sessionToSave.quizId);
          if (sq) {
            setViewingInsightsQuiz(sq);
            setActiveTab("insights");
          }
        }
      } else {
        setActiveSession((prev: any) => prev ? { ...prev, attemptSaved: true } : prev);
      }
      return;
    }

    const attemptedCount = correctCount + wrongCount;
    const scorePct = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const durationSeconds = sessionToSave.startedAt
      ? Math.round((Date.now() - sessionToSave.startedAt) / 1000)
      : 0;
    if (!sessionToSave.isBattle) {
      trackQuizCompleted({
        questionCount: questions.length,
        correctCount,
        wrongCount,
        skippedCount,
        mode: sessionToSave.selectionMode || "all",
        durationSeconds,
        scorePct,
      });
    }
    const targetAttemptId = sessionToSave.targetAttemptId;
    const retryOfAttemptNum = sessionToSave.retryOfAttemptNum;
    // Always create a new attempt entry — never modify the original score
    const baseAttemptData = {
      id: String(Date.now()),
      score: scorePct, correct: correctCount, wrong: wrongCount, skipped: skippedCount,
      timestamp: Date.now(),
      wrongQuestionIds: wrongQsForQuiz.map(q => q.id),
      questionIds: sessionToSave.questions.map((q: any) => q.id),
      answers: sessionToSave.answers,
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
        setSelectedQuiz(null);
        setViewingInsightsQuiz(updatedSample);
        setActiveTab("insights");
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
      setSelectedQuiz(null);
      const updatedQ = updatedQuizzes.find((q: any) => q.id === sessionToSave.quizId);
      if (updatedQ) {
        setViewingInsightsQuiz(updatedQ);
        setActiveTab("insights");
      }
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
      shuffleAnswers: shuffleAnswers,
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
      setActiveTab(viewingInsightsQuizFromTab as any || "home");
      return;
    }

    const quizToDelete = quizzes.find(q => q.id === quizId);
    if (quizToDelete) {
      const neonId = quizToDelete.neonId ?? quizToDelete.id;
      // Tombstone both the local id and neonId so the sync filter
      // always finds a match regardless of which ID Neon returns.
      const idsToTombstone = Array.from(new Set([quizToDelete.id, neonId].filter(Boolean)));

      // ── Synchronously mark as deleted in memory ──────────────────────────
      // This is the critical guard: any Neon re-sync that fires while the app is
      // running (e.g. after internet reconnects and Firebase re-emits auth state)
      // will check pendingDeleteIdsRef before adding quizzes back to local state.
      idsToTombstone.forEach(id => pendingDeleteIdsRef.current.add(id));

      AsyncStorage.getItem("quizforge_pending_deletions").then(val => {
        const pending: string[] = val ? JSON.parse(val) : [];
        let changed = false;
        for (const tombId of idsToTombstone) {
          if (!pending.includes(tombId)) { pending.push(tombId); changed = true; }
        }
        if (changed) return AsyncStorage.setItem("quizforge_pending_deletions", JSON.stringify(pending));
      }).then(() => {
        // Fire the delete to Neon immediately if online (best-effort)
        if (firebaseUser && !String(neonId).startsWith("local_")) {
          return deleteMobileQuiz(firebaseUser.uid, neonId);
        }
      }).then((_res: any) => {
        // Whether the delete succeeded or failed, we intentionally keep the tombstone
        // in AsyncStorage. The sync pipeline is the ONLY place that clears tombstones —
        // it does so only after confirming the quiz is gone from Neon AND filtering it
        // out of local state. Clearing tombstones here (even on success) caused a bug
        // where pressing R would reload stale local data but find no tombstone to filter it.
      }).catch((err: any) => {
        console.warn("[NeonSync] quiz delete failed or offline — tombstone kept for next sync:", err);
      });
    }

    AsyncStorage.getItem(`quiz_file_${quizId}`).then(uri => {
      if (uri) {
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }
      AsyncStorage.removeItem(`quiz_file_${quizId}`).catch(() => {});
    }).catch(() => {});

    const updatedQuizzes = quizzes.filter((q) => q.id !== quizId);
    // Write immediately to AsyncStorage so any app restart loads the correct list.
    // Don't wait for the persistence useEffect — it fires after the render cycle and
    // a fast R-press could reload stale data before it runs.
    AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify(updatedQuizzes)).catch(() => {});
    setQuizzes(updatedQuizzes);
    setViewingInsightsQuiz(null);
    setActiveTab(viewingInsightsQuizFromTab as any || "home");
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
          <Text style={{ fontSize: 18, fontWeight: "700", color: isDark ? "#ffffff" : "#0d0f14" }}>{t('insight.bookmarked_questions') || "Bookmarked Questions"}</Text>
          {/* Use width: 36 to perfectly center the title against the 24px icon + 12px padding */}
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {bookmarkedQs.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, marginTop: 40 }}>
              <Ionicons name="bookmark-outline" size={64} color={isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"} style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 16, color: textSub, textAlign: "center" }}>{t('insight.no_bookmarks') || "No bookmarked questions yet."}</Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              <Pressable 
                onPress={() => playQuizDirectly({ ...quiz, questionsList: bookmarkedQs }, "all")}
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: isDark ? "#6366f1" : "#4f46e5", paddingVertical: 14, borderRadius: 12, marginBottom: 12 }, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>{t('insight.attempt_bookmarked') || "Attempt Bookmarked"}</Text>
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

  const renderInsightsView = () => <InsightsTabScreen p={p} />;

  const renderDeckInsightsTab = () => <DeckInsightsTab p={p} />;

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
  const saveBattleResult = (
    roomCode: string,
    myScore: number,
    opponentScore: number,
    opponentName: string,
    quizTitle: string,
    effectiveWin: boolean,
    myTime?: number,
    opponentTime?: number,
    questions?: any[],
    answers?: Record<string, string[]>
  ) => {
    const entry = {
      date: Date.now(),
      roomCode,
      quizTitle,
      myScore,
      opponentScore,
      opponentName,
      won: effectiveWin,
      myTime,
      opponentTime,
      questions: questions || [],
      answers: answers || {}
    };
    setBattleHistory(prev => {
      const filtered = roomCode ? prev.filter((p: any) => p.roomCode !== roomCode) : prev;
      const next = [...filtered, entry].slice(-50);
      AsyncStorage.setItem("battle_history", JSON.stringify(next));
      return next;
    });
    trackBattleCompleted({
      won: effectiveWin,
      myScore,
      opponentScore,
      questionCount: (questions || []).length,
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
        opponentTime,
        questions,
        answers
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

  const onViewReportCard = (attempt: any, quizId: string) => {
    const q = quizzes.find((qz: any) => qz.id === quizId) || (quizId === "sample_quiz" ? sampleQuiz : null);
    if (q) {
      setViewingReportCardData({ attempt, quiz: q });
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
              pending.push({
                code: roomCode,
                isHost: host,
                questions: currentSession.questions || [],
                answers: currentSession.answers || {}
              });
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
        questionsList: parsed.questions.map((q: any) => ({ ...q, answers: [...q.answers].sort(() => Math.random() - 0.5) })),
        attempts: [],
        wrongQuestions: [],
        uniqueCorrectIds: [],
      };
      setQuizzes((prev) => [newQuiz, ...prev.filter((q: any) => q.id !== newQuiz.id)]);
      trackQuizCreated({ source: "import", questionCount: newQuiz.questions });
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
          id: localId,
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
    ? (selectedQuiz.questionsList && selectedQuiz.questionsList.length > 0
        ? selectedQuiz.questionsList.filter((q: any) => !attemptedIds.has(q.id)).length
        : Math.max(0, totalQuestions - attemptedIds.size))
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
  const [aiGenConnectionLost, setAiGenConnectionLost] = useState(false);
  const [aiGenCharCount, setAiGenCharCount] = useState(0);
  const [pendingAiFile, setPendingAiFile] = useState<{ text: string; fileName: string } | null>(null);

  const [fcTitle, setFcTitle] = useState("");
  const [fcCategory, setFcCategory] = useState("");
  const [fcCards, setFcCards] = useState<{ front: string; back: string }[]>([{ front: "", back: "" }]);
  const [fcCurrentIdx, setFcCurrentIdx] = useState(0);
  const [studyCardIdx, setStudyCardIdx] = useState(0);
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
      
      const shareBase = appConfig?.appLinks?.shareBaseUrl || "https://scorrapp.com/share/quiz/";
      let targetId = quiz.masterQuizId || quiz.master_quiz_id || quiz.neonId;
      if (!targetId) {
        targetId = 'uq_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(4);
        quiz.masterQuizId = targetId;
        setQuizzes((prev: any[]) => prev.map((q: any) => q.id === quiz.id ? { ...q, masterQuizId: targetId } : q));
      }

      const shareUrl = `${shareBase}${targetId}`;
      const message = `Check out this quiz on Scorr: ${quiz.title}\n\nTap this link to open it in the app:\n${shareUrl}`;
      
      // ── Open native share sheet IMMEDIATELY without waiting for network ──
      Share.share({
        message,
        url: shareUrl,
        title: `Share ${quiz.title}`,
      }).catch((err) => console.warn("[Share] Sheet error:", err));

      trackShareLinkTapped({
        questionCount: quiz.questions || quiz.questionCount || 0,
        isAiGenerated: quiz.category === "AI Generated",
      });

      // ── Concurrently ensure server-side master quiz record exists in the background ──
      (async () => {
        try {
          const sourceText = quiz.sourceText || questionsToSourceText(quiz.title, quiz.category || "General", quiz.questionsList || [], quiz.flashcards || []);
          if (sourceText) {
            const contentHash = await computeContentHash(sourceText, i18n.language || "en");
            const { masterQuiz } = await saveMasterQuiz({
              id: targetId,
              contentHash,
              language: (i18n.language || "en").toLowerCase(),
              title: quiz.title,
              category: quiz.category || "General",
              questionCount: quiz.questionsList?.length ?? quiz.questions ?? 0,
              flashcardCount: quiz.flashcards?.length ?? 0,
              sourceText,
              userId: firebaseUser ? firebaseUser.uid : "guest_shared"
            });
            if (masterQuiz?.id && masterQuiz.id !== targetId) {
              quiz.masterQuizId = masterQuiz.id;
              setQuizzes((prev: any[]) => prev.map((q: any) => q.id === quiz.id ? { ...q, masterQuizId: masterQuiz.id } : q));
            }
            if (firebaseUser && neonUserReadyRef.current) {
              updateMobileQuiz({ userId: firebaseUser.uid, quizId: quiz.id, masterQuizId: masterQuiz?.id || targetId }).catch(() => {});
            }
          }
        } catch (syncErr) {
          console.warn("[ShareSync] Background master quiz sync warning:", syncErr);
        }
      })();
      
    } catch (err: any) {
      console.warn("Share error:", err);
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

    setQuizzes((prev) => [newQuiz, ...prev.filter((q: any) => q.id !== newQuiz.id)]);
    setNewTitle("");
    setNewCategory("");
    setNewQuestionsCount("");
    setCreationStep("setup");
    
    setShowQuizCreatedModal({ title: newQuiz.title, count: newQuiz.questions });
    trackQuizCreated({ source: "manual", questionCount: newQuiz.questions });
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
        id: localId,
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

  // handleGenerateWithAI — defined in src/handlers/aiGenerationHandler.ts, bound below
  const handleGenerateWithAI = aiGenerationHandler;



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

  const renderActiveSessionView = () => <ActiveSessionScreen p={p} />;

  const renderResultsView = () => <ResultsScreen p={p} />;

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
        // Don't show the card immediately — push it back at least 5 cards
        // so the user gets a break before seeing it again in the same session.
        const insertAt = Math.min(5, newQueue.length);
        newQueue.splice(insertAt, 0, cardId);
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
      
      // ── Emergency kill-switch: disableBattles flag ───────────────────
      if (appConfig?.featureFlags?.disableBattles) {
        Alert.alert(
          "Battles Temporarily Unavailable",
          "Battle Arena is currently disabled while we perform maintenance. Please try again shortly."
        );
        setBattleCreating(false);
        return;
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
    trackBattleStarted({
      questionCount: qsList.length,
      hasTimePerQuestion: tpq != null,
      isHost: isHostFlag,
    });
  };

  const renderBattleLobbyView = () => <BattleLobbyScreen p={p} />;

  const renderFlashcardsView = () => <FlashcardsScreen p={p} />;

  // Render Sub-Views based on activeTab
  const renderContent = (overrideTab?: string) => <MainContentScreen p={p} overrideTab={overrideTab} />;




  // ── Auth view: "landing" | "email" ──────────────────────────────
  const [authView, setAuthView] = useState<"landing" | "email">("landing");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [signupStep, setSignupStep] = useState<"details" | "otp">("details");
  const [otpCode, setOtpCode] = useState("");
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const authViewAnim = useRef(new Animated.Value(0)).current; // 0=landing, 1=email

  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpResendCountdown]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const switchAuthView = (view: "landing" | "email") => {
    const toValue = view === "email" ? 1 : 0;
    Animated.timing(authViewAnim, {
      toValue,
      duration: 260,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setAuthView(view));
    setAuthView(view);
  };

  const openAuthScreen = () => {
    setAuthView("landing");
    authViewAnim.setValue(0);
    setAuthError(null);
    setSignupStep("details");
    setOtpCode("");
    setShowAuthScreen(true);
  };

  // Auth handlers (handleSendSignupOtp, handleVerifyAndSignup, etc.) → src/handlers/authHandlers.ts
  // renderAuthScreen → src/screens/AuthScreen.tsx





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

      {/* Custom Toast */}
      {!!customToast && (
        <View style={{ position: "absolute", top: Platform.OS === "ios" ? 52 : 24, left: 20, right: 20, zIndex: 1000, backgroundColor: "#10142a", borderWidth: 1, borderColor: "rgba(139,143,240,0.2)", padding: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 12, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(45,212,167,0.15)", justifyContent: "center", alignItems: "center" }}>
            <Ionicons name={customToast.icon} size={18} color={customToast.color} />
          </View>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", flex: 1, lineHeight: 20 }}>{customToast.message}</Text>
        </View>
      )}

    <SafeAreaView style={[styles.rootContainer, !settingsDarkMode && styles.lightRootContainer]} edges={["top", "left", "right"]}>
      {activeSession ? (
        renderActiveSessionView()
      ) : (
        <>
          <View style={styles.screenContainer}>
            <Animated.View style={{ flex: 1, opacity: screenFadeAnim }}>
              {renderContent()}
            </Animated.View>
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
                <Ionicons
                  name={effectiveTab === "home" ? "home" : "home-outline"}
                  size={23}
                  color={effectiveTab === "home" ? "#FFFFFF" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"}
                />
                <Text style={[styles.tabLabel, { color: effectiveTab === "home" ? "#FFFFFF" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)", fontWeight: effectiveTab === "home" ? "800" : "500" }]}>{t('tabs.home')}</Text>
              </AnimatedPressable>


              {/* Create */}
              <AnimatedPressable
                onPress={() => setShowAddMenu(true)}
                style={styles.tabItem}
                scaleTo={0.88}
              >
                <FontAwesome6 name="plus" size={22} color={settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"} />
                <Text style={[styles.tabLabel, { color: settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)", fontWeight: "500" }]}>{t('tabs.create')}</Text>
              </AnimatedPressable>

              {/* Library */}
              <AnimatedPressable
                onPress={() => setActiveTab("library" as any)}
                style={styles.tabItem}
                scaleTo={0.88}
              >
                <Ionicons
                  name={effectiveTab === "library" ? "folder" : "folder-outline"}
                  size={23}
                  color={effectiveTab === "library" ? (settingsDarkMode ? "#FFFFFF" : "#000000") : (settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)")}
                />
                <Text style={[styles.tabLabel, { color: effectiveTab === "library" ? (settingsDarkMode ? "#FFFFFF" : "#000000") : (settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"), fontWeight: effectiveTab === "library" ? "800" : "500" }]}>{t('tabs.library')}</Text>
              </AnimatedPressable>

              {/* Profile */}
              <AnimatedPressable onPress={() => setActiveTab("menu")} style={styles.tabItem} scaleTo={0.88}>
                <Ionicons
                  name={effectiveTab === "menu" ? "person" : "person-outline"}
                  size={23}
                  color={effectiveTab === "menu" ? (settingsDarkMode ? "#FFFFFF" : "#000000") : (settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)")}
                />
                <Text style={[styles.tabLabel, { color: effectiveTab === "menu" ? (settingsDarkMode ? "#FFFFFF" : "#000000") : (settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"), fontWeight: effectiveTab === "menu" ? "800" : "500" }]}>{t('tabs.profile')}</Text>
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

      {/* ── Floating Bottom Pill Toast (Capsule) ── */}
      {!!bottomToast && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: Math.max(insets.bottom, 16) + 68,
            alignSelf: "center",
            zIndex: 9999,
            opacity: bottomToastOpacity,
            transform: [{ translateY: bottomToastTranslateY }],
            backgroundColor: settingsDarkMode ? "rgba(15, 23, 42, 0.94)" : "rgba(15, 23, 42, 0.90)",
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: settingsDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.18)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {!!bottomToast.icon && (
            <Ionicons name={bottomToast.icon} size={14} color={bottomToast.color || "#38bdf8"} />
          )}
          <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "600", letterSpacing: 0.2 }}>
            {bottomToast.message}
          </Text>
        </Animated.View>
      )}

    </SafeAreaView>

      {/* ── Report Card Modal ── */}
      <Modal visible={showWrongReview || !!viewingReportCardData} animationType="slide" transparent={true} statusBarTranslucent={true} onRequestClose={() => { setShowWrongReview(false); setViewingReportCardData(null); setSnapshotReviewData([]); }}>
        <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: Math.max(insets.top, 16) + 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#111827" }} numberOfLines={1}>
                {viewingReportCardData?.quiz?.title ? viewingReportCardData.quiz.title : "Review Answers"}
              </Text>
              {viewingReportCardData?.attempt?.score != null && (
                <Text style={{ fontSize: 13, color: settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                  Score: {viewingReportCardData.attempt.score} pts
                </Text>
              )}
            </View>
            <Pressable onPress={() => { setShowWrongReview(false); setViewingReportCardData(null); setSnapshotReviewData([]); }} style={{ padding: 8 }}>
              <Ionicons name="close" size={28} color={settingsDarkMode ? "#ffffff" : "#111827"} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: Math.max(insets.bottom, 16) + 40 }}>
            {(() => {
              // Live session review uses the snapshot captured at press time.
              // History report card uses reportCardQs from useMemo.
              const displayQs = viewingReportCardData ? reportCardQs : snapshotReviewData;
              return (
                <>
                  {displayQs.length === 0 && (
                    <Text style={{ textAlign: "center", color: settingsDarkMode ? "#9ca3af" : "#6b7280", marginTop: 40 }}>
                      No answer data available for this attempt.
                    </Text>
                  )}
                  {displayQs.map((q: any, idx: number) => (
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
                </>
              );
            })()}
          </ScrollView>
        </View>
      </Modal>

      {/* ── All Modals ── outside SafeAreaView so they never affect flex layout ── */}
      <AppModals p={{
        appConfig, showQuizActions, setShowQuizActions, renamingQuiz, setRenamingQuiz, renameTitle, setRenameTitle,
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
        handleOpenQuizOptions, handleShareQuiz, handleStartQuiz, handleFinishSession, handleHostBattle,
        handleImportQst, handleDeleteAttemptOnMobile, saveAndExitQuizSession, handleClearHistoryOnMobile,
        setActiveTab, setViewingInsightsQuiz, setViewingInsightsDeck, setViewingInsightsQuizFromTab, viewingInsightsQuizFromTab,
        selectionMode, setSelectionMode, randomCount, setRandomCount,
        rangeStart, setRangeStart, rangeEnd, setRangeEnd,
        shuffleQuestions, setShuffleQuestions, shuffleAnswers, setShuffleAnswers,
        showAnswerOnSubmit, setShowAnswerOnSubmit, autoSlideEnabled, setAutoSlideEnabled,
        quizTimeLimit, setQuizTimeLimit, quizPerQuestionTimer, setQuizPerQuestionTimer, timeLimitText, setTimeLimitText,
        showTimeLimitDropdown, setShowTimeLimitDropdown, triggerConfettiBurst,
        neonUserReadyRef, setCreationMode, setCreationStep, setFcTitle, setFcCards,
        setFcCurrentIdx, setCardType, setEditingDeckId, updateMobileQuiz, deleteMobileQuiz,
        sendFeedback, deleteAccount, deleteUserFromNeon, onViewReportCard, handleLogout: async () => {
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

      {/* ── Battle Fullscreen Countdown ── */}
      {battleCountdown !== null && <FullscreenBattleCountdown count={battleCountdown} isDark={settingsDarkMode} />}

      {/* ── AI Generation Screen ── */}
      {aiGenPhase === "generating" && (
        <AIGeneratingScreen 
          onCancel={handleCancelAiGeneration} 
          isDark={settingsDarkMode} 
          documentCharCount={aiGenCharCount} 
          generationTimeoutMs={appConfig?.aiConfig?.generationTimeoutMs ?? 60000} 
          connectionLost={aiGenConnectionLost} 
        />
      )}

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
              contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 24, gap: 10 }}
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
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 140, paddingTop: 4 }}
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
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        borderColor: isActive
                          ? "#6366f1"
                          : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"),
                        opacity: pressed ? 0.75 : 1,
                      }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color: isActive ? (isDark ? "#ffffff" : "#0d0f14") : muted }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Random count stepper */}
              {battleSelectionMode === "random" && (
                <View style={{ backgroundColor: "transparent",
                  borderRadius: 14, padding: 18, marginBottom: 24, borderWidth: 2, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
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
                <View style={{ backgroundColor: "transparent",
                  borderRadius: 14, padding: 18, marginBottom: 24, borderWidth: 2, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
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
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        borderColor: isActive
                          ? "#6366f1"
                          : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"),
                        opacity: pressed ? 0.7 : 1,
                      }]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: isActive ? (isDark ? "#ffffff" : "#0d0f14") : muted }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Gameplay toggles */}
              <Text style={{ fontSize: 11, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Gameplay</Text>
              <View style={{ backgroundColor: "transparent",
                borderRadius: 16, borderWidth: 2, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)", overflow: "hidden" }}>
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
              paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) + 16,
              gap: 10,
            }}>
              {/* Join code row removed as per user request */}
              {battleError ? <Text style={{ fontSize: 12, color: "#f87171", marginTop: -4, textAlign: "center" }}>{battleError}</Text> : null}

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
                contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 24, gap: 10 }}
                renderItem={({ item }) => {
                  const d = new Date(item.date);
                  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  const matchingQuiz = (quizzes || []).find((q: any) => q.title && item.quizTitle && q.title.trim().toLowerCase() === item.quizTitle.trim().toLowerCase()) || (item.quizTitle?.toLowerCase().includes("sample") ? sampleQuiz : null);
                  const questionsList = (item.questions && item.questions.length > 0) ? item.questions : (matchingQuiz?.questionsList || []);
                  const hasQuestions = questionsList && questionsList.length > 0;

                  return (
                    <Pressable
                      onPress={() => {
                        try {
                          if (hasQuestions) {
                            const attempt = {
                              score: item.myScore,
                              correct: questionsList.filter((q: any) => {
                                const selected = (item.answers || {})[q.id] || [];
                                const correctIds = (q.answers || []).filter((a: any) => a.isCorrect).map((a: any) => a.id);
                                return selected.length > 0 && selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
                              }).length,
                              date: item.date,
                              answers: item.answers || {},
                              questionIds: questionsList.map((q: any) => q.id),
                            };
                            const quiz = {
                              id: `battle_${item.roomCode || item.date}`,
                              title: `${item.quizTitle} (vs ${item.opponentName})`,
                              questionsList: questionsList,
                            };
                            setViewingReportCardData({ attempt, quiz });
                          } else {
                            Alert.alert(
                              "Report Card",
                              "Detailed answer breakdowns aren't available for battles completed before this update."
                            );
                          }
                        } catch (err: any) {
                          console.error("Failed to open battle report card:", err);
                          Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? err.message : "Couldn't load report card for this battle. Please try again.");
                        }
                      }}
                      style={({ pressed }) => [{
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                        borderRadius: 16, padding: 16,
                        borderWidth: 1, borderColor: item.won ? (isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)") : cardBorder,
                        flexDirection: "row", alignItems: "center", gap: 14,
                      }, pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] }]}
                    >
                      <Text style={{ fontSize: 28 }}>{item.won ? "🏆" : "💀"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: txt, marginBottom: 2 }} numberOfLines={1}>{item.quizTitle}</Text>
                        <Text style={{ fontSize: 12, color: muted }}>vs {item.opponentName} · {dateStr}</Text>
                        {hasQuestions && (
                          <Text style={{ fontSize: 11, color: isDark ? "#818cf8" : "#6366f1", fontWeight: "600", marginTop: 3 }}>
                            Tap to review answers →
                          </Text>
                        )}
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
                      {hasQuestions && (
                        <Ionicons name="chevron-forward" size={16} color={muted} style={{ marginLeft: 2 }} />
                      )}
                    </Pressable>
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
            transparent={true}
            statusBarTranslucent={true}
            onRequestClose={() => setStudyModeModalVisible(false)}
          >
            <KeyboardAvoidingView style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f4f4f8" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={{ flex: 1, paddingTop: Math.max(insets.top, 16) + 12 }}>


                  {/* Header */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 24 }}>
                    <Text style={{ fontSize: 24, fontWeight: "500", color: isDark ? "#ffffff" : "#0d0f14", fontFamily: "serif" }}>Study Mode</Text>
                <Pressable onPress={() => setStudyModeModalVisible(false)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6 })}>
                  <Feather name="x" size={24} color={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"} />
                </Pressable>
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 100 }}>
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
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 16, paddingTop: 16, backgroundColor: isDark ? "#0f172a" : "#f4f4f8" }}>
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

import { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { onAuth } from '../lib/firebase';
import { syncUserToNeon, deleteMobileQuiz, fetchMobileQuizzes, createMobileQuiz, fetchBattleHistory } from '../lib/api';
import { identifyUser, clearUser } from '../lib/analytics';
import type { User } from 'firebase/auth';

/**
 * useAuth — owns Firebase auth state, Neon sync on login/logout.
 * Extracted from HomeScreen god-file (lines ~571-868).
 *
 * @param deps - external state setters that the auth flow needs to update
 */
export function useAuth(deps: {
  setQuizzes: React.Dispatch<React.SetStateAction<any[]>>;
  quizzesRef: React.MutableRefObject<any[]>;
  pendingDeleteIdsRef: React.MutableRefObject<Set<string>>;
  setBattleHistory: React.Dispatch<React.SetStateAction<any[]>>;
  setBattlePopup: React.Dispatch<React.SetStateAction<any>>;
  triggerConfettiBurst: () => void;
  storageKey: (type: 'quizzes') => string;
  questionsToSourceText: (...args: any[]) => string;
  parseQstText: (text: string) => any;
  deduplicateUserQuizzes: (...args: any[]) => Promise<any>;
}) {
  const {
    setQuizzes, quizzesRef, pendingDeleteIdsRef,
    setBattleHistory, setBattlePopup, triggerConfettiBurst,
    storageKey, questionsToSourceText, parseQstText, deduplicateUserQuizzes,
  } = deps;

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [hasSeenLogin, setHasSeenLogin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const neonUserReadyRef = useRef<boolean>(false);
  const loadedUidRef = useRef<string | null | undefined>(undefined);

  // ── Firebase auth state listener — handles login, logout, account switch ──
  useEffect(() => {
    AsyncStorage.getItem('cachedFirebaseUser').then(val => {
      if (val) {
        try { setFirebaseUser(prev => prev || JSON.parse(val)); } catch {}
      }
    });

    const unsub = onAuth(async (user) => {
      setFirebaseUser(user);
      if (user) {
        AsyncStorage.setItem('cachedFirebaseUser', JSON.stringify({
          uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL,
        }));
        Sentry.setUser({ id: user.uid, email: user.email || undefined, username: user.displayName || undefined });
        identifyUser(user.uid);
      } else {
        AsyncStorage.removeItem('cachedFirebaseUser');
        AsyncStorage.removeItem('quizforge_synced_uid');
        Sentry.setUser(null);
        clearUser();
      }

      if (user) {
        const syncedUid = await AsyncStorage.getItem('quizforge_synced_uid');
        const isNewLogin = syncedUid !== user.uid;
        loadedUidRef.current = user.uid;

        if (!isNewLogin) {
          // Same user, already synced — just flush pending deletes silently.
          console.log('[NeonSync] Already synced for this user — skipping fetch, flushing pending deletes only');
          AsyncStorage.getItem('quizforge_pending_deletions').then(async (val) => {
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
            await AsyncStorage.setItem('quizforge_pending_deletions', JSON.stringify(remaining));
            pendingDeleteIdsRef.current = new Set(remaining);
          }).catch(() => {});
          return;
        }

        // ── Full sync — only runs on actual login / account switch ──
        setIsSyncingData(true);
        try {
          const { error: syncErr } = await syncUserToNeon({
            uid: user.uid, email: user.email,
            displayName: user.displayName, photoURL: user.photoURL,
          });

          if (syncErr) {
            console.warn('[NeonSync] user sync failed:', syncErr);
            neonUserReadyRef.current = false;
          } else {
            neonUserReadyRef.current = true;

            const pendingValPre = await AsyncStorage.getItem('quizforge_pending_deletions');
            const pendingIdsPre: string[] = pendingValPre ? JSON.parse(pendingValPre) : [];
            const allTombstoneIds = new Set([...pendingIdsPre, ...pendingDeleteIdsRef.current]);
            allTombstoneIds.forEach(id => pendingDeleteIdsRef.current.add(id));

            let remainingTombstones: string[] = [];
            if (allTombstoneIds.size > 0) {
              console.log(`[NeonSync] Flushing ${allTombstoneIds.size} pending deletion(s) before fetch…`);
              for (const pid of allTombstoneIds) {
                try {
                  const res = await deleteMobileQuiz(user.uid, pid);
                  if (res.error) { console.warn('[NeonSync] pending delete failed:', res.error); remainingTombstones.push(pid); }
                } catch (err) { remainingTombstones.push(pid); }
              }
            }

            const quizzesRes = await fetchMobileQuizzes(user.uid);
            if (quizzesRes.error) { console.warn('[NeonSync] fetch failed:', quizzesRes.error); }

            if (!quizzesRes.error && quizzesRes.quizzes) {
              quizzesRes.quizzes = quizzesRes.quizzes.filter((q: any) => !allTombstoneIds.has(q.id));
            }

            if (!quizzesRes.error && quizzesRes.quizzes.length > 0) {
              const normalizedQuizzes = quizzesRes.quizzes.map((q: any) => {
                const localCopy = quizzesRef.current.find((l: any) => l.id === q.id || l.neonId === q.id);
                return {
                  id: q.id, neonId: q.id, title: q.title, questions: q.questionCount,
                  category: q.category, time: 'Synced',
                  questionsList: (() => {
                    if (localCopy?.questionsList?.length > 0) return localCopy.questionsList;
                    try { const p = JSON.parse(q.sourceText); if (Array.isArray(p) && p.length > 0) return p; } catch {}
                    try { return parseQstText(q.sourceText).questions; } catch { return []; }
                  })(),
                  flashcards: (() => {
                    if (localCopy?.flashcards?.length > 0) return localCopy.flashcards;
                    try { return parseQstText(q.sourceText).flashcards || []; } catch { return []; }
                  })(),
                  attempts: (() => {
                    const dbA = q.attempts ?? []; const locA = localCopy?.attempts ?? [];
                    const m = new Map();
                    for (const a of dbA) m.set(a.id, a);
                    for (const a of locA) m.set(a.id, a);
                    return Array.from(m.values()).sort((a, b) => Number(b.id) - Number(a.id));
                  })(),
                  uniqueCorrectIds: Array.from(new Set([...(q.uniqueCorrectIds ?? []), ...(localCopy?.uniqueCorrectIds ?? [])])),
                  wrongQuestions: (() => {
                    const wm = new Map();
                    for (const w of (q.wrongQuestions ?? [])) wm.set(w.id || w, w);
                    for (const w of (localCopy?.wrongQuestions ?? [])) wm.set(w.id || w, w);
                    const combinedCorrect = new Set([...(q.uniqueCorrectIds ?? []), ...(localCopy?.uniqueCorrectIds ?? [])]);
                    return Array.from(wm.values()).filter((w: any) => !combinedCorrect.has(w.id || w));
                  })(),
                };
              });

              setQuizzes((local: any[]) => {
                const cleanLocal = local.filter((l) => l.id !== 'sample_quiz' && !allTombstoneIds.has(l.id) && !allTombstoneIds.has(l.neonId));
                const updatedLocal = cleanLocal.map(l => {
                  const synced = normalizedQuizzes.find((n: any) => n.id === l.id || n.id === l.neonId);
                  return synced || l;
                });
                const newFromServer = normalizedQuizzes.filter((n: any) =>
                  !cleanLocal.find((l: any) => l.id === n.id || l.neonId === n.id) &&
                  !allTombstoneIds.has(n.id) && !allTombstoneIds.has(n.neonId)
                );
                const combined = [...updatedLocal, ...newFromServer].filter((q: any) => {
                  const qc = typeof q.questions === 'number' ? q.questions : (q.questionsList?.length || 0);
                  return qc > 0 || (q.flashcards?.length || 0) > 0;
                });
                deduplicateUserQuizzes(combined, { currentUserId: user.uid }).then(({ deduplicatedQuizzes, removedQuizIds, neonDeletions, hasChanges }) => {
                  if (hasChanges) {
                    removedQuizIds.forEach((id: string) => pendingDeleteIdsRef.current.add(id));
                    setQuizzes(deduplicatedQuizzes);
                    AsyncStorage.setItem(storageKey('quizzes'), JSON.stringify(deduplicatedQuizzes)).catch(() => {});
                    for (const d of neonDeletions) { deleteMobileQuiz(user.uid, d.neonId).catch(() => {}); }
                  }
                }).catch(() => {});
                return combined;
              });

              // Backfill local-only quizzes to Neon
              const neonIds = new Set(normalizedQuizzes.map((q: any) => q.id));
              const unsynced = quizzesRef.current.filter((q: any) =>
                !q.isSample && q.id !== 'sample_quiz' && !neonIds.has(q.id) && !q.neonId && !allTombstoneIds.has(q.id)
              );
              console.log(`[NeonSync] Neon has ${normalizedQuizzes.length} quizzes, ${unsynced.length} local unsynced`);
              for (const q of unsynced) {
                createMobileQuiz({
                  id: q.id, userId: user.uid, title: q.title, category: q.category || 'General',
                  questionCount: q.questionsList?.length ?? q.questions ?? 0,
                  sourceText: questionsToSourceText(q.title, q.category || 'General', q.questionsList ?? [], q.flashcards ?? []),
                  attempts: q.attempts || [], wrongQuestions: q.wrongQuestions || [], uniqueCorrectIds: q.uniqueCorrectIds || [],
                }).then(({ quiz: saved }) => {
                  if (saved) {
                    setQuizzes((prev: any[]) => prev.map((pq) => pq.id === q.id ? { ...pq, neonId: saved.id } : pq));
                    console.log(`[NeonSync] Backfilled quiz: ${saved.id}`);
                  }
                }).catch((err) => console.warn('[NeonSync] backfill failed:', err));
              }
            } else if (!quizzesRes.error) {
              console.log(`[NeonSync] Neon empty, uploading ${quizzesRef.current.length} local quizzes`);
              for (const q of quizzesRef.current) {
                if (q.neonId || q.isSample || q.id === 'sample_quiz') continue;
                if (allTombstoneIds.has(q.id)) continue;
                createMobileQuiz({
                  id: q.id, userId: user.uid, title: q.title, category: q.category || 'General',
                  questionCount: q.questionsList?.length ?? q.questions ?? 0,
                  sourceText: questionsToSourceText(q.title, q.category || 'General', q.questionsList ?? [], q.flashcards ?? []),
                  attempts: q.attempts || [], wrongQuestions: q.wrongQuestions || [], uniqueCorrectIds: q.uniqueCorrectIds || [],
                }).then(({ quiz: saved, error: saveErr }) => {
                  if (saveErr) { console.warn('[NeonSync] upload failed:', saveErr); return; }
                  if (saved) {
                    setQuizzes((prev: any[]) => prev.map((pq) => pq.id === q.id ? { ...pq, neonId: saved.id } : pq));
                    console.log(`[NeonSync] Uploaded quiz to Neon: ${saved.id}`);
                  }
                }).catch((err) => console.warn('[NeonSync] upload error:', err));
              }
            }

            await AsyncStorage.setItem('quizforge_pending_deletions', JSON.stringify(remainingTombstones));
            pendingDeleteIdsRef.current = new Set(remainingTombstones);
            await AsyncStorage.setItem('quizforge_synced_uid', user.uid);

            // Fetch battle history
            const battleHistoryRes = await fetchBattleHistory(user.uid);
            if (!battleHistoryRes.error && battleHistoryRes.history.length > 0) {
              AsyncStorage.getItem('battle_history').then(val => {
                let localHistory: any[] = [];
                try { if (val) localHistory = JSON.parse(val); } catch {}
                const mergedMap = new Map();
                localHistory.forEach((h: any) => mergedMap.set(h.roomCode || `${h.date}_${h.quizTitle}`, h));
                battleHistoryRes.history.forEach((h: any) => {
                  const key = h.room_code || `${new Date(h.created_at).getTime()}_${h.quiz_title}`;
                  const existing = mergedMap.get(key);
                  mergedMap.set(key, {
                    date: new Date(h.created_at).getTime(), roomCode: h.room_code, quizTitle: h.quiz_title,
                    myScore: h.my_score, opponentScore: h.opponent_score, opponentName: h.opponent_name,
                    won: h.won, myTime: h.my_time, opponentTime: h.opponent_time,
                    questions: (h.questions && h.questions.length > 0) ? h.questions : existing?.questions,
                    answers: (h.answers && Object.keys(h.answers).length > 0) ? h.answers : existing?.answers,
                  });
                });
                const mergedArray = Array.from(mergedMap.values()).sort((a, b) => a.date - b.date).slice(-50);
                setBattleHistory(mergedArray);
                AsyncStorage.setItem('battle_history', JSON.stringify(mergedArray));
              });
            }
          }
        } catch (e) {
          console.warn('[NeonSync] sync pipeline failed:', e);
        } finally {
          setIsSyncingData(false);
        }
      } else {
        neonUserReadyRef.current = false;
      }
    });
    return unsub;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    firebaseUser, setFirebaseUser,
    isSyncingData, setIsSyncingData,
    showAuthScreen, setShowAuthScreen,
    authTab, setAuthTab,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authName, setAuthName,
    authError, setAuthError,
    showAuthPassword, setShowAuthPassword,
    signOutLoading, setSignOutLoading,
    authLoading, setAuthLoading,
    hasSeenLogin, setHasSeenLogin,
    showLoginModal, setShowLoginModal,
    deleteAccountLoading, setDeleteAccountLoading,
    showDeleteAccountConfirm, setShowDeleteAccountConfirm,
    showLogoutConfirm, setShowLogoutConfirm,
    // Refs
    neonUserReadyRef,
    loadedUidRef,
  };
}

import { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deduplicateUserQuizzes } from '../lib/quizDeduplication';
import { SAMPLE_QUIZ } from '../constants/sample-quiz';

/**
 * useQuizData — owns quiz list, flashcard decks, tombstone ref, and
 * the offline-first AsyncStorage pre-load.
 * Extracted from HomeScreen god-file (lines ~483-941).
 */
export function useQuizData() {
  // ── Unified global storage key ──
  const storageKey = (type: 'quizzes') => `quizforge_${type}_global`;

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [flashcardDecks, setFlashcardDecks] = useState<any[]>([]);
  const [flashcardFilter, setFlashcardFilter] = useState<'all' | 'due' | 'progress' | 'mastered'>('all');
  const [showFlashcardOptions, setShowFlashcardOptions] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [sampleDismissed, setSampleDismissed] = useState<boolean>(false);
  const [sampleQuiz, setSampleQuiz] = useState<any>(SAMPLE_QUIZ);
  const [savedSessions, setSavedSessions] = useState<Record<string, any>>({});
  const [starredQuestions, setStarredQuestions] = useState<Set<string>>(new Set());

  // In-memory tombstone set — updated synchronously on every delete so that Neon re-syncs
  // can never resurrect a quiz the user has already deleted.
  const pendingDeleteIdsRef = useRef<Set<string>>(new Set());
  const quizzesRef = useRef<any[]>([]);
  const loadedUidRef = useRef<string | null | undefined>(undefined);

  // Keep quizzesRef in sync
  useEffect(() => {
    quizzesRef.current = quizzes;
  }, [quizzes]);

  // ── Pre-load quizzes instantly before Firebase initializes (offline-first) ──
  useEffect(() => {
    (async () => {
      try {
        const [qRaw, sRaw, dRaw, pendRaw] = await Promise.all([
          AsyncStorage.getItem(storageKey('quizzes')),
          AsyncStorage.getItem('quizforge_starred_global'),
          AsyncStorage.getItem('quizforge_flashcard_decks'),
          AsyncStorage.getItem('quizforge_pending_deletions'),
        ]);

        const tombstoneIds: Record<string, true> = {};
        if (pendRaw) {
          try {
            const ids: string[] = JSON.parse(pendRaw);
            ids.forEach(id => { tombstoneIds[id] = true; pendingDeleteIdsRef.current.add(id); });
          } catch {}
        }

        if (qRaw) {
          const parsed = JSON.parse(qRaw).filter((q: any) => {
            if (tombstoneIds[q.id] || tombstoneIds[q.neonId]) return false;
            const qc = typeof q.questions === 'number' ? q.questions : (q.questionsList?.length || 0);
            return qc > 0 || (q.flashcards?.length || 0) > 0;
          });
          try {
            const { deduplicatedQuizzes, removedQuizIds, hasChanges } = await deduplicateUserQuizzes(parsed);
            if (hasChanges) {
              removedQuizIds.forEach(id => {
                tombstoneIds[id] = true;
                pendingDeleteIdsRef.current.add(id);
              });
              AsyncStorage.setItem(storageKey('quizzes'), JSON.stringify(deduplicatedQuizzes)).catch(() => {});
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Inject sample quiz on very first launch ──
  useEffect(() => {
    if (!dataLoaded) return;
    (async () => {
      try {
        const already = await AsyncStorage.getItem('quizforge_sample_injected');
        if (already) return;
        await AsyncStorage.setItem('quizforge_sample_injected', '1');
      } catch (e) {
        console.warn('[Sample] inject failed:', e);
      }
    })();
  }, [dataLoaded]);

  // ── Load sample quiz state ──
  useEffect(() => {
    AsyncStorage.getItem('quizforge_sample_dismissed').then(val => {
      if (val === '1') setSampleDismissed(true);
    });
    AsyncStorage.getItem('quizforge_sample_data').then(val => {
      if (val) { try { setSampleQuiz(JSON.parse(val)); } catch {} }
    });
  }, []);

  return {
    // Helpers
    storageKey,
    // State
    quizzes, setQuizzes,
    flashcardDecks, setFlashcardDecks,
    flashcardFilter, setFlashcardFilter,
    showFlashcardOptions, setShowFlashcardOptions,
    dataLoaded,
    sampleDismissed, setSampleDismissed,
    sampleQuiz, setSampleQuiz,
    savedSessions, setSavedSessions,
    starredQuestions, setStarredQuestions,
    // Refs
    quizzesRef,
    pendingDeleteIdsRef,
    loadedUidRef,
  };
}

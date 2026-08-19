import { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * useQuizSession — owns all active quiz session state, preferences, and refs.
 * Extracted from HomeScreen god-file (lines ~1154, 1203-1215, 1529-1582).
 */
export function useQuizSession() {
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [selectionMode, setSelectionMode] = useState<'all' | 'random' | 'range' | 'unanswered' | 'wrong'>('all');
  const [randomCount, setRandomCount] = useState<number>(5);
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(5);
  const [shuffleQuestions, setShuffleQuestionsRaw] = useState<boolean>(false);
  const [shuffleAnswers, setShuffleAnswersRaw] = useState<boolean>(true);
  const [showAnswerOnSubmit, setShowAnswerOnSubmitRaw] = useState<boolean>(true);
  const [autoSlideEnabled, setAutoSlideEnabledRaw] = useState(true);
  const [quizTimeLimit, setQuizTimeLimit] = useState<number | null>(null);
  const [quizPerQuestionTimer, setQuizPerQuestionTimer] = useState<number | null>(null);
  const [timeLimitText, setTimeLimitText] = useState('');
  const [showTimeLimitDropdown, setShowTimeLimitDropdown] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(0);
  const [battleQuestionTimeLeft, setBattleQuestionTimeLeft] = useState<number>(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [savedSessions, setSavedSessions] = useState<Record<string, any>>({});
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showQuizSettingsModal, setShowQuizSettingsModal] = useState(false);
  const [jumpPage, setJumpPage] = useState(0);
  const [selectedAttemptForModal, setSelectedAttemptForModal] = useState<any | null>(null);
  const [expandedAttemptsMap, setExpandedAttemptsMap] = useState<Record<string, boolean>>({});

  // Refs
  const activeSessionRef = useRef<any>(null);
  const handleTimerExpiredRef = useRef<() => void>(() => {});
  const quizFlatListRef = useRef<any>(null);
  const quizNumbersScrollRef = useRef<any>(null);

  // Keep activeSessionRef in sync
  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // ── Preference setters with AsyncStorage persistence ──
  const setShuffleQuestions = (val: boolean) => {
    setShuffleQuestionsRaw(val);
    AsyncStorage.setItem('pref_shuffleQuestions', val ? '1' : '0');
  };
  const setShuffleAnswers = (val: boolean) => {
    setShuffleAnswersRaw(val);
    AsyncStorage.setItem('pref_shuffleAnswers', val ? '1' : '0');
  };
  const setShowAnswerOnSubmit = (val: boolean) => {
    setShowAnswerOnSubmitRaw(val);
    AsyncStorage.setItem('pref_showAnswerOnSubmit', val ? '1' : '0');
  };
  const setAutoSlideEnabled = (val: boolean) => {
    setAutoSlideEnabledRaw(val);
    AsyncStorage.setItem('pref_autoSlideEnabled', val ? '1' : '0');
  };

  // ── Load saved preferences on first mount ──
  useEffect(() => {
    AsyncStorage.multiGet(['pref_shuffleQuestions', 'pref_shuffleAnswers', 'pref_showAnswerOnSubmit', 'pref_autoSlideEnabled']).then((pairs) => {
      pairs.forEach(([key, val]) => {
        if (key === 'pref_shuffleQuestions' && val !== null) setShuffleQuestionsRaw(val === '1');
        if (key === 'pref_shuffleAnswers' && val !== null) setShuffleAnswersRaw(val === '1');
        if (key === 'pref_showAnswerOnSubmit' && val !== null) setShowAnswerOnSubmitRaw(val === '1');
        if (key === 'pref_autoSlideEnabled' && val !== null) setAutoSlideEnabledRaw(val === '1');
      });
    });
  }, []);

  return {
    // State
    activeSession, setActiveSession,
    selectionMode, setSelectionMode,
    randomCount, setRandomCount,
    rangeStart, setRangeStart,
    rangeEnd, setRangeEnd,
    shuffleQuestions, setShuffleQuestions,
    shuffleAnswers, setShuffleAnswers,
    showAnswerOnSubmit, setShowAnswerOnSubmit,
    autoSlideEnabled, setAutoSlideEnabled,
    quizTimeLimit, setQuizTimeLimit,
    quizPerQuestionTimer, setQuizPerQuestionTimer,
    timeLimitText, setTimeLimitText,
    showTimeLimitDropdown, setShowTimeLimitDropdown,
    sessionTimeLeft, setSessionTimeLeft,
    battleQuestionTimeLeft, setBattleQuestionTimeLeft,
    showQuitConfirm, setShowQuitConfirm,
    savedSessions, setSavedSessions,
    showRestartConfirm, setShowRestartConfirm,
    showQuizSettingsModal, setShowQuizSettingsModal,
    jumpPage, setJumpPage,
    selectedAttemptForModal, setSelectedAttemptForModal,
    expandedAttemptsMap, setExpandedAttemptsMap,
    // Refs
    activeSessionRef,
    handleTimerExpiredRef,
    quizFlatListRef,
    quizNumbersScrollRef,
  };
}

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './battle.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type GamePhase =
  | 'lobby'
  | 'quiz-select'
  | 'waiting'
  | 'countdown'
  | 'battle'
  | 'question-result'
  | 'final-results';

interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
}

interface Player {
  name: string;
  avatar: string;
  score: number;
  streak: number;
  answered: boolean;
  selectedOption: number | null;
  isCorrect: boolean | null;
}

// ─── Sample questions ─────────────────────────────────────────────────────────

const DEMO_QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'What is the powerhouse of the cell?',
    options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'],
    correct: 1,
  },
  {
    id: 2,
    text: 'What does DNA stand for?',
    options: [
      'Deoxyribonucleic Acid',
      'Dynamic Nucleotide Array',
      'Digital Nucleic Arrangement',
      'Dual Nitrogen Atom',
    ],
    correct: 0,
  },
  {
    id: 3,
    text: 'How many planets are in our Solar System?',
    options: ['7', '8', '9', '10'],
    correct: 1,
  },
  {
    id: 4,
    text: 'What is the chemical formula for water?',
    options: ['H2O2', 'HO', 'H2O', 'H3O'],
    correct: 2,
  },
  {
    id: 5,
    text: 'Who wrote "Romeo and Juliet"?',
    options: ['Charles Dickens', 'Mark Twain', 'Jane Austen', 'William Shakespeare'],
    correct: 3,
  },
];

const SAMPLE_QUIZZES = [
  { id: 1, title: 'Biology Basics', questions: 5, category: 'Science', icon: '🧬' },
  { id: 2, title: 'World History', questions: 5, category: 'History', icon: '🏛️' },
  { id: 3, title: 'Space & Astronomy', questions: 5, category: 'Science', icon: '🚀' },
  { id: 4, title: 'Literature Classics', questions: 5, category: 'English', icon: '📚' },
];

const TIME_PER_QUESTION = 15; // seconds

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BattlePage() {
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [questions] = useState<Question[]>(DEMO_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [timerActive, setTimerActive] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const [you, setYou] = useState<Player>({
    name: 'You',
    avatar: '🦊',
    score: 0,
    streak: 0,
    answered: false,
    selectedOption: null,
    isCorrect: null,
  });

  const [opponent, setOpponent] = useState<Player>({
    name: 'Rival',
    avatar: '🐺',
    score: 0,
    streak: 0,
    answered: false,
    selectedOption: null,
    isCorrect: null,
  });

  const [showParticles, setShowParticles] = useState(false);
  const [questionResultTimeout, setQuestionResultTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const opponentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
      if (questionResultTimeout) clearTimeout(questionResultTimeout);
    };
  }, [questionResultTimeout]);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive) return;
    if (timeLeft <= 0) {
      setTimerActive(false);
      handleTimeUp();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive]);

  // ── Countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      startBattle();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countdown]);

  // ── Simulate opponent answering ───────────────────────────────────────────
  const simulateOpponentAnswer = useCallback(() => {
    const delay = 2000 + Math.random() * 6000; // 2–8 seconds
    opponentTimerRef.current = setTimeout(() => {
      const q = DEMO_QUESTIONS[currentQuestionIndex];
      const isOpponentCorrect = Math.random() > 0.4; // 60% chance correct
      const opponentChoice = isOpponentCorrect
        ? q.correct
        : [0, 1, 2, 3].filter((i) => i !== q.correct)[Math.floor(Math.random() * 3)];

      setOpponent((prev) => ({
        ...prev,
        answered: true,
        selectedOption: opponentChoice,
        isCorrect: isOpponentCorrect,
        score: isOpponentCorrect ? prev.score + 100 : prev.score,
        streak: isOpponentCorrect ? prev.streak + 1 : 0,
      }));
    }, delay);
  }, [currentQuestionIndex]);

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleHostQuiz() {
    setPhase('quiz-select');
    setIsHost(true);
  }

  function handleSelectQuiz(quizId: number) {
    setSelectedQuizId(quizId);
    const code = generateRoomCode();
    setRoomCode(code);
    setPhase('waiting');
    // Simulate opponent joining after 3 seconds
    setTimeout(() => {
      beginCountdown();
    }, 3000);
  }

  function handleJoinRoom() {
    if (joinCode.length < 4) return;
    setIsHost(false);
    setPhase('waiting');
    // Simulate quick join
    setTimeout(() => {
      beginCountdown();
    }, 1500);
  }

  function beginCountdown() {
    setCountdown(3);
    setPhase('countdown');
  }

  function startBattle() {
    setCurrentQuestionIndex(0);
    setTimeLeft(TIME_PER_QUESTION);
    setYou((p) => ({ ...p, score: 0, streak: 0, answered: false, selectedOption: null, isCorrect: null }));
    setOpponent((p) => ({ ...p, score: 0, streak: 0, answered: false, selectedOption: null, isCorrect: null }));
    setPhase('battle');
    setTimerActive(true);
    simulateOpponentAnswer();
  }

  function handleTimeUp() {
    // If you didn't answer, mark as no-answer
    setYou((prev) => {
      if (!prev.answered) {
        return { ...prev, answered: true, selectedOption: null, isCorrect: false };
      }
      return prev;
    });
    goToNextPhase();
  }

  function handleSelectOption(optionIndex: number) {
    if (you.answered) return; // Lock: can't change after answering

    const q = questions[currentQuestionIndex];
    const isCorrect = optionIndex === q.correct;
    const points = isCorrect ? Math.max(50, Math.round((timeLeft / TIME_PER_QUESTION) * 100)) : 0;

    setYou((prev) => ({
      ...prev,
      answered: true,
      selectedOption: optionIndex,
      isCorrect,
      score: prev.score + points,
      streak: isCorrect ? prev.streak + 1 : 0,
    }));

    if (isCorrect) setShowParticles(true);

    // Clear opponent timer if not yet answered, wait for both
    // Show result when both answered OR time is up
  }

  // Watch for both players having answered
  useEffect(() => {
    if (phase !== 'battle') return;
    if (you.answered && opponent.answered) {
      // Both answered — show brief result, then proceed
      setTimerActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);

      const t = setTimeout(() => {
        goToNextPhase();
      }, 2000);
      setQuestionResultTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [you.answered, opponent.answered, phase]);

  useEffect(() => {
    if (showParticles) {
      const t = setTimeout(() => setShowParticles(false), 1500);
      return () => clearTimeout(t);
    }
  }, [showParticles]);

  function goToNextPhase() {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      setPhase('final-results');
    } else {
      // Reset for next question
      setCurrentQuestionIndex(nextIndex);
      setTimeLeft(TIME_PER_QUESTION);
      setYou((p) => ({ ...p, answered: false, selectedOption: null, isCorrect: null }));
      setOpponent((p) => ({ ...p, answered: false, selectedOption: null, isCorrect: null }));
      setTimerActive(true);
      // Simulate opponent for next question
      opponentTimerRef.current = setTimeout(() => {
        const q = DEMO_QUESTIONS[nextIndex];
        const isOpponentCorrect = Math.random() > 0.4;
        const opponentChoice = isOpponentCorrect
          ? q.correct
          : [0, 1, 2, 3].filter((i) => i !== q.correct)[Math.floor(Math.random() * 3)];
        setOpponent((prev) => ({
          ...prev,
          answered: true,
          selectedOption: opponentChoice,
          isCorrect: isOpponentCorrect,
          score: isOpponentCorrect ? prev.score + 100 : prev.score,
          streak: isOpponentCorrect ? prev.streak + 1 : 0,
        }));
      }, 2000 + Math.random() * 6000);
    }
  }

  function resetToLobby() {
    setPhase('lobby');
    setRoomCode('');
    setJoinCode('');
    setSelectedQuizId(null);
    setCurrentQuestionIndex(0);
    setTimeLeft(TIME_PER_QUESTION);
    setTimerActive(false);
    setCountdown(3);
    setYou({ name: 'You', avatar: '🦊', score: 0, streak: 0, answered: false, selectedOption: null, isCorrect: null });
    setOpponent({ name: 'Rival', avatar: '🐺', score: 0, streak: 0, answered: false, selectedOption: null, isCorrect: null });
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const currentQuestion = questions[currentQuestionIndex];
  const timerPercent = (timeLeft / TIME_PER_QUESTION) * 100;
  const timerColor = timeLeft > 8 ? '#22c55e' : timeLeft > 4 ? '#f59e0b' : '#ef4444';

  const youWon = you.score > opponent.score;
  const tied = you.score === opponent.score;

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className={styles.page}>
        <div className={styles.bgOrbs} />
        <div className={styles.shell}>
          {/* Header */}
          <header className={styles.topBar}>
            <Link href="/" className={styles.backBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </Link>
            <div className={styles.topBarTitle}>
              <span className={styles.swordIcon}>⚔️</span>
              <span>Battle Arena</span>
            </div>
            <div className={styles.topBarRight} />
          </header>

          {/* Hero */}
          <div className={styles.hero}>
            <div className={styles.heroGlow} />
            <h1 className={styles.heroTitle}>
              Quiz<span className={styles.heroAccent}>Clash</span>
            </h1>
            <p className={styles.heroSub}>Challenge friends. Prove your knowledge.</p>
          </div>

          {/* Action Cards */}
          <div className={styles.cards}>
            {/* Host */}
            <button className={`${styles.card} ${styles.hostCard}`} onClick={handleHostQuiz}>
              <div className={styles.cardGlow} />
              <div className={styles.cardIconWrap}>
                <span className={styles.cardEmoji}>🏆</span>
              </div>
              <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>Host a Battle</h2>
                <p className={styles.cardDesc}>Pick your quiz and invite opponents</p>
              </div>
              <div className={styles.cardArrow}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </button>

            {/* Divider */}
            <div className={styles.divider}><span>or</span></div>

            {/* Join */}
            <div className={`${styles.card} ${styles.joinCard}`}>
              <div className={styles.cardGlow} />
              <div className={styles.cardIconWrap}>
                <span className={styles.cardEmoji}>🎯</span>
              </div>
              <div className={styles.cardBody}>
                <h2 className={styles.cardTitle}>Join a Battle</h2>
                <p className={styles.cardDesc}>Enter your opponent&apos;s room code</p>
              </div>
              <div className={styles.joinRow}>
                <input
                  className={styles.codeInput}
                  type="text"
                  placeholder="ENTER CODE"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <button
                  className={`${styles.joinBtn} ${joinCode.length >= 4 ? styles.joinBtnActive : ''}`}
                  onClick={handleJoinRoom}
                  disabled={joinCode.length < 4}
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>3</span>
              <span className={styles.statLabel}>Win Streak 🔥</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNum}>17</span>
              <span className={styles.statLabel}>Total Wins 🏅</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNum}>74%</span>
              <span className={styles.statLabel}>Win Rate ⚡</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz Select ───────────────────────────────────────────────────────────
  if (phase === 'quiz-select') {
    return (
      <div className={styles.page}>
        <div className={styles.bgOrbs} />
        <div className={styles.shell}>
          <header className={styles.topBar}>
            <button className={styles.backBtn} onClick={() => setPhase('lobby')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
            <div className={styles.topBarTitle}>
              <span>Select a Quiz</span>
            </div>
            <div className={styles.topBarRight} />
          </header>

          <p className={styles.selectHint}>Choose a quiz to battle with. Your opponent must answer the same questions.</p>

          <div className={styles.quizList}>
            {SAMPLE_QUIZZES.map((quiz) => (
              <button
                key={quiz.id}
                className={`${styles.quizRow} ${selectedQuizId === quiz.id ? styles.quizRowSelected : ''}`}
                onClick={() => handleSelectQuiz(quiz.id)}
              >
                <span className={styles.quizEmoji}>{quiz.icon}</span>
                <div className={styles.quizInfo}>
                  <span className={styles.quizName}>{quiz.title}</span>
                  <span className={styles.quizMeta}>{quiz.category} · {quiz.questions} questions</span>
                </div>
                <div className={styles.quizArrow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Waiting ────────────────────────────────────────────────────────────────
  if (phase === 'waiting') {
    return (
      <div className={styles.page}>
        <div className={styles.bgOrbs} />
        <div className={styles.shell}>
          <div className={styles.waitingWrap}>
            <div className={styles.waitingPulse} />
            <div className={styles.waitingAvatars}>
              <div className={styles.waitAvatar}>
                <span>🦊</span>
                <span className={styles.waitAvatarLabel}>You</span>
              </div>
              <div className={styles.vsText}>VS</div>
              <div className={`${styles.waitAvatar} ${styles.waitAvatarOpponent}`}>
                <span className={styles.dotPulse}>?</span>
                <span className={styles.waitAvatarLabel}>Waiting...</span>
              </div>
            </div>

            {isHost && (
              <div className={styles.roomCodeBox}>
                <p className={styles.roomCodeLabel}>Share this code</p>
                <div className={styles.roomCodeDisplay}>
                  {roomCode.split('').map((ch, i) => (
                    <span key={i} className={styles.roomCodeChar}>{ch}</span>
                  ))}
                </div>
                <p className={styles.roomCodeHint}>Waiting for opponent to join...</p>
              </div>
            )}

            {!isHost && (
              <div className={styles.roomCodeBox}>
                <p className={styles.roomCodeLabel}>Room joined!</p>
                <p className={styles.roomCodeHint}>Waiting for host to start...</p>
              </div>
            )}

            <div className={styles.loadingDots}>
              <span /><span /><span />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Countdown ─────────────────────────────────────────────────────────────
  if (phase === 'countdown') {
    return (
      <div className={styles.page}>
        <div className={styles.bgOrbs} />
        <div className={styles.countdownWrap}>
          <p className={styles.countdownLabel}>Battle starts in</p>
          <div className={styles.countdownNumber} key={countdown}>
            {countdown === 0 ? 'GO!' : countdown}
          </div>
          <div className={styles.countdownVs}>
            <div className={styles.cdPlayer}>
              <span className={styles.cdAvatar}>🦊</span>
              <span className={styles.cdName}>You</span>
            </div>
            <span className={styles.cdVs}>⚔️</span>
            <div className={styles.cdPlayer}>
              <span className={styles.cdAvatar}>🐺</span>
              <span className={styles.cdName}>Rival</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Battle ─────────────────────────────────────────────────────────────────
  if (phase === 'battle') {
    return (
      <div className={styles.page}>
        <div className={styles.bgOrbs} />
        {showParticles && (
          <div className={styles.particlesWrap}>
            {[...Array(20)].map((_, i) => (
              <span
                key={i}
                className={styles.particle}
                style={{
                  '--x': `${Math.random() * 200 - 100}px`,
                  '--y': `${-(Math.random() * 200 + 100)}px`,
                  '--rot': `${Math.random() * 720}deg`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.3}s`,
                  background: ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'][Math.floor(Math.random() * 5)],
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        <div className={styles.battleShell}>
          {/* Scoreboard */}
          <div className={styles.scoreboard}>
            <div className={styles.sbPlayer}>
              <span className={styles.sbAvatar}>🦊</span>
              <div>
                <span className={styles.sbName}>You</span>
                {you.streak > 1 && <span className={styles.streak}>🔥 ×{you.streak}</span>}
              </div>
              <span className={styles.sbScore}>{you.score}</span>
            </div>
            <div className={styles.sbMid}>
              <span className={styles.sbQNum}>Q{currentQuestionIndex + 1}/{questions.length}</span>
            </div>
            <div className={`${styles.sbPlayer} ${styles.sbPlayerRight}`}>
              <span className={styles.sbScore}>{opponent.score}</span>
              <div>
                <span className={styles.sbName}>Rival</span>
                {opponent.streak > 1 && <span className={styles.streak}>🔥 ×{opponent.streak}</span>}
              </div>
              <span className={styles.sbAvatar}>🐺</span>
            </div>
          </div>

          {/* Timer bar */}
          <div className={styles.timerBar}>
            <div
              className={styles.timerFill}
              style={{
                width: `${timerPercent}%`,
                background: timerColor,
                transition: 'width 1s linear, background 0.3s',
              }}
            />
          </div>
          <div className={styles.timerNum} style={{ color: timerColor }}>
            {timeLeft}s
          </div>

          {/* Status indicators */}
          <div className={styles.statusRow}>
            <div className={`${styles.statusBadge} ${you.answered ? styles.statusDone : styles.statusWaiting}`}>
              {you.answered ? '✓ Answered' : '⏳ Your turn'}
            </div>
            <div className={`${styles.statusBadge} ${opponent.answered ? styles.statusDone : styles.statusWaiting}`}>
              {opponent.answered ? '✓ Answered' : '⏳ Thinking...'}
            </div>
          </div>

          {/* Question */}
          <div className={styles.questionCard}>
            <p className={styles.questionText}>{currentQuestion.text}</p>
          </div>

          {/* Options */}
          <div className={styles.optionsGrid}>
            {currentQuestion.options.map((opt, idx) => {
              let optClass = styles.optionBtn;
              if (you.answered) {
                if (idx === currentQuestion.correct) {
                  optClass = `${styles.optionBtn} ${styles.optionCorrect}`;
                } else if (idx === you.selectedOption && !you.isCorrect) {
                  optClass = `${styles.optionBtn} ${styles.optionWrong}`;
                } else {
                  optClass = `${styles.optionBtn} ${styles.optionDimmed}`;
                }
              }
              return (
                <button
                  key={idx}
                  className={optClass}
                  onClick={() => handleSelectOption(idx)}
                  disabled={you.answered}
                >
                  <span className={styles.optionLabel}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className={styles.optionText}>{opt}</span>
                  {you.answered && idx === currentQuestion.correct && (
                    <span className={styles.optionMark}>✓</span>
                  )}
                  {you.answered && idx === you.selectedOption && !you.isCorrect && (
                    <span className={styles.optionMark}>✗</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Both answered message */}
          {you.answered && opponent.answered && (
            <div className={styles.bothAnswered}>
              Both answered — loading next question...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Final Results ──────────────────────────────────────────────────────────
  if (phase === 'final-results') {
    return (
      <div className={styles.page}>
        <div className={styles.bgOrbs} />

        {youWon && (
          <div className={styles.confettiWrap}>
            {[...Array(40)].map((_, i) => (
              <span
                key={i}
                className={styles.confetti}
                style={{
                  '--x': `${Math.random() * 200 - 100}px`,
                  '--delay': `${Math.random() * 1.5}s`,
                  '--duration': `${1.5 + Math.random() * 2}s`,
                  left: `${Math.random() * 100}%`,
                  background: ['#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#06b6d4'][Math.floor(Math.random() * 6)],
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        <div className={styles.resultsShell}>
          {/* Outcome banner */}
          <div className={`${styles.outcomeBanner} ${youWon ? styles.winBanner : tied ? styles.tieBanner : styles.loseBanner}`}>
            <div className={styles.outcomeTrophy}>
              {youWon ? '🏆' : tied ? '🤝' : '💀'}
            </div>
            <h1 className={styles.outcomeTitle}>
              {youWon ? 'Victory!' : tied ? 'Draw!' : 'Defeated!'}
            </h1>
            <p className={styles.outcomeSub}>
              {youWon ? 'You dominated the quiz!' : tied ? "It's a tie — rematch?" : 'Better luck next time!'}
            </p>
          </div>

          {/* Score comparison */}
          <div className={styles.scoreComparison}>
            <div className={`${styles.playerResult} ${youWon ? styles.winnerResult : ''}`}>
              <span className={styles.resAvatar}>🦊</span>
              <span className={styles.resName}>You</span>
              <span className={styles.resScore}>{you.score}</span>
              <span className={styles.resLabel}>pts</span>
              {youWon && <span className={styles.winnerBadge}>Winner</span>}
            </div>
            <div className={styles.resVs}>VS</div>
            <div className={`${styles.playerResult} ${!youWon && !tied ? styles.winnerResult : ''}`}>
              <span className={styles.resAvatar}>🐺</span>
              <span className={styles.resName}>Rival</span>
              <span className={styles.resScore}>{opponent.score}</span>
              <span className={styles.resLabel}>pts</span>
              {!youWon && !tied && <span className={styles.winnerBadge}>Winner</span>}
            </div>
          </div>

          {/* Stats breakdown */}
          <div className={styles.breakdown}>
            <div className={styles.breakdownItem}>
              <span className={styles.biLabel}>Questions</span>
              <span className={styles.biValue}>{questions.length}</span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.biLabel}>Your Best Streak</span>
              <span className={styles.biValue}>{you.streak} 🔥</span>
            </div>
            <div className={styles.breakdownItem}>
              <span className={styles.biLabel}>Accuracy</span>
              <span className={styles.biValue}>{Math.round((you.score / (questions.length * 100)) * 100)}%</span>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.resultActions}>
            <button className={styles.rematchBtn} onClick={() => {
              setPhase('countdown');
              setCountdown(3);
              setYou((p) => ({ ...p, score: 0, streak: 0, answered: false, selectedOption: null, isCorrect: null }));
              setOpponent((p) => ({ ...p, score: 0, streak: 0, answered: false, selectedOption: null, isCorrect: null }));
              setCurrentQuestionIndex(0);
              setTimeLeft(TIME_PER_QUESTION);
            }}>
              ⚔️ Rematch
            </button>
            <button className={styles.homeBtn} onClick={resetToLobby}>
              🏠 Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

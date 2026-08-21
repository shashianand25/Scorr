"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/components/ui/ToastPill";
import { useTranslation } from "@/lib/i18n";
import {
  fetchQuizzes,
  saveQuizHistory,
  updateQuiz,
  Question,
  WrongQuestion,
  Attempt,
} from "@/lib/api";
import { getLocalItem, setLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import { renderFormattedText } from "@/lib/qstParser";
import type { QuizRecord } from "@/lib/quizDeduplication";

type Phase = "options" | "playing" | "results";

import { calculateGrade } from "@/lib/grading";
import { QuizLobbyPhase } from "@/components/quiz/player/QuizLobbyPhase";
import { QuizPlayingPhase } from "@/components/quiz/player/QuizPlayingPhase";
import { QuizResultsPhase } from "@/components/quiz/player/QuizResultsPhase";


export default function QuizPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [quiz, setQuiz] = useState<QuizRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("options");

  // Options & Modes
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [wrongOnly, setWrongOnly] = useState(false);
  const [timedMode, setTimedMode] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30); // 30s per question
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(10);

  // Playing State
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [wrongList, setWrongList] = useState<WrongQuestion[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [starredQuestionIds, setStarredQuestionIds] = useState<Set<string>>(new Set());
  const [shakeCard, setShakeCard] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Directory & Search State
  const [qQuery, setQQuery] = useState("");
  const [expandedQId, setExpandedQId] = useState<string | null>(null);

  // Load Quiz from LocalStorage or Neon
  useEffect(() => {
    const localQuizzes = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
    const found = localQuizzes.find((q) => q.id === id || q.neonId === id) || (id === "sample_quiz_welcome" ? SAMPLE_QUIZ : null);

    if (found) {
      setQuiz(found);
      const totalQ = found.questionsList?.length || 0;
      setRangeStart(1);
      setRangeEnd(totalQ > 0 ? totalQ : 10);
      setLoading(false);
    } else if (user?.uid) {
      fetchQuizzes(user.uid).then(({ quizzes }) => {
        const cloudFound = quizzes.find((q) => q.id === id || (q as any).neonId === id) as any;
        if (cloudFound) {
          setQuiz(cloudFound);
          const totalQ = cloudFound.questionsList?.length || 0;
          setRangeStart(1);
          setRangeEnd(totalQ > 0 ? totalQ : 10);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [id, user?.uid]);

  // Load Starred Questions from storage
  useEffect(() => {
    const starred = getLocalItem<string[]>("starred_questions", []);
    setStarredQuestionIds(new Set(starred));
  }, []);

  // Timed Mode Interval
  useEffect(() => {
    if (phase !== "playing" || !timedMode || isAnswered) return;

    if (timeLeft <= 0) {
      // Auto-submit unanswered
      handleAnswer("__timeout__");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, timedMode, timeLeft, isAnswered]);

  // Keyboard navigation
  useEffect(() => {
    if (phase !== "playing") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentQ = activeQuestions[currentIndex];
      if (!currentQ || !currentQ.answers) return;

      if (!isAnswered) {
        // Options: 1-4 or A-D
        let pickedIndex = -1;
        if (e.key === "1" || e.key.toLowerCase() === "a") pickedIndex = 0;
        if (e.key === "2" || e.key.toLowerCase() === "b") pickedIndex = 1;
        if (e.key === "3" || e.key.toLowerCase() === "c") pickedIndex = 2;
        if (e.key === "4" || e.key.toLowerCase() === "d") pickedIndex = 3;

        if (pickedIndex >= 0 && currentQ.answers[pickedIndex]) {
          const ans = currentQ.answers[pickedIndex];
          handleAnswer(ans.id || `a_${pickedIndex}`);
        }
      } else {
        // Space or Enter advances to next
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNextQuestion();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, isAnswered, activeQuestions, currentIndex]);

  // ── Start Quiz ─────────────────────────────────────────────────────────
  const startQuiz = (onlyWrong: boolean = false) => {
    if (!quiz || !quiz.questionsList) return;

    let pool = [...quiz.questionsList];

    if (onlyWrong) {
      const wrongIds = new Set((quiz.wrongQuestions || []).map((w: any) => w.id || w.question));
      pool = pool.filter((q) => wrongIds.has(q.id || q.question || q.prompt));
      if (pool.length === 0) pool = [...quiz.questionsList];
    } else {
      // Apply range filter
      const start = Math.max(1, rangeStart) - 1;
      const end = Math.min(pool.length, rangeEnd);
      pool = pool.slice(start, end);
    }

    if (shuffleQuestions) {
      pool = pool.sort(() => Math.random() - 0.5);
    }

    // Shuffle options inside each question
    pool = pool.map((q) => ({
      ...q,
      answers: [...(q.answers || [])].sort(() => Math.random() - 0.5),
    }));

    setActiveQuestions(pool);
    setCurrentIndex(0);
    setSelectedAnswerId(null);
    setIsAnswered(false);
    setWrongList([]);
    setCorrectCount(0);
    setTimeLeft(timerSeconds);
    setStartTime(Date.now());
    setPhase("playing");
  };

  // ── Handle Answer Selection ────────────────────────────────────────────
  const handleAnswer = (ansId: string) => {
    if (isAnswered) return;

    const currentQ = activeQuestions[currentIndex];
    if (!currentQ) return;

    const isTimeout = ansId === "__timeout__";
    const correctAns = (currentQ.answers || []).find((a) => a.isCorrect);
    const isCorrect = !isTimeout && (correctAns?.id === ansId || (correctAns && (currentQ.answers || []).findIndex(a => a.id === ansId) === (currentQ.answers || []).findIndex(a => a.isCorrect)));

    setSelectedAnswerId(ansId);
    setIsAnswered(true);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 500);

      const wrongEntry: WrongQuestion = {
        id: currentQ.id || `w_${currentIndex}`,
        question: currentQ.question || currentQ.prompt || "",
        prompt: currentQ.prompt || currentQ.question || "",
        selectedTexts: isTimeout ? ["Timed out"] : [(currentQ.answers || []).find((a) => a.id === ansId)?.text || ""],
        correctTexts: [correctAns?.text || ""],
        explanation: currentQ.explanation,
        answers: currentQ.answers,
      };

      setWrongList((prev) => [...prev, wrongEntry]);
    }
  };

  // ── Next Question / Finish ─────────────────────────────────────────────
  const handleNextQuestion = () => {
    if (currentIndex + 1 < activeQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswerId(null);
      setIsAnswered(false);
      setTimeLeft(timerSeconds);
    } else {
      finishQuiz();
    }
  };

  // ── Finish Quiz & Save Results ─────────────────────────────────────────
  const finishQuiz = () => {
    if (!quiz) return;

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    setElapsedSeconds(elapsed);

    const total = activeQuestions.length;
    const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const newAttempt: Attempt = {
      id: Date.now(),
      date: Date.now(),
      timestamp: Date.now(),
      score: scorePct,
      correct: correctCount,
      total,
      durationSec: elapsed,
    };

    const updatedAttempts = [newAttempt, ...(quiz.attempts || [])];
    const updatedWrong = [...wrongList];

    const updatedQuiz: QuizRecord = {
      ...quiz,
      attempts: updatedAttempts,
      wrongQuestions: updatedWrong,
      updatedAt: Date.now(),
    };

    setQuiz(updatedQuiz);

    // Save locally
    const localQuizzes = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
    const updatedLocal = localQuizzes.map((q) => (q.id === quiz.id ? updatedQuiz : q));
    setLocalItem("quizzes", updatedLocal);

    // Save to Neon cloud
    if (user?.uid) {
      saveQuizHistory({
        userId: user.uid,
        quizTitle: quiz.title,
        totalQuestions: total,
        correct: correctCount,
        wrong: wrongList.length,
        score: scorePct,
        durationSec: elapsed,
        wrongQuestions: wrongList,
      }).catch(() => {});

      updateQuiz({
        userId: user.uid,
        quizId: quiz.id,
        attempts: updatedAttempts as Attempt[],
        wrongQuestions: updatedWrong,
      }).catch(() => {});
    }

    setPhase("results");
  };

  // ── Star Toggle ────────────────────────────────────────────────────────
  const toggleStarQuestion = (qId: string) => {
    const next = new Set(starredQuestionIds);
    if (next.has(qId)) {
      next.delete(qId);
      showToast("Question removed from bookmarks", { icon: "☆" });
    } else {
      next.add(qId);
      showToast("Question bookmarked ⭐", { icon: "⭐", color: "#f59e0b" });
    }
    setStarredQuestionIds(next);
    setLocalItem("starred_questions", Array.from(next));
  };

  if (loading) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", color: "#9ca3af" }}>
        <h2>Quiz not found</h2>
        <Link href="/library" style={{ color: "#6366f1", marginTop: 12, display: "inline-block" }}>
          ← Back to Library
        </Link>
      </div>
    );
  }

  const currentQ = activeQuestions[currentIndex];
  const progressPct = activeQuestions.length > 0 ? ((currentIndex + 1) / activeQuestions.length) * 100 : 0;
  const gradeInfo = calculateGrade(
    activeQuestions.length > 0 ? Math.round((correctCount / activeQuestions.length) * 100) : 0
  );

  return (
    <div style={{ padding: "36px 20px 80px", maxWidth: 840, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>


      {/* ── PHASE 1: OPTIONS / LOBBY ── */}
      {phase === "options" && (
        <QuizLobbyPhase
          p={{
            quiz,
            t,
            shuffleQuestions,
            setShuffleQuestions,
            timedMode,
            setTimedMode,
            rangeStart,
            setRangeStart,
            rangeEnd,
            setRangeEnd,
            startQuiz,
          }}
        />
      )}

      {/* ── PHASE 2: IN-QUIZ RUNNER ── */}
      {phase === "playing" && currentQ && (
        <QuizPlayingPhase
          p={{
            currentQ,
            currentIndex,
            activeQuestions,
            isAnswered,
            timedMode,
            timeLeft,
            toggleStarQuestion,
            starredQuestionIds,
            progressPct,
            shakeCard,
            selectedAnswerId,
            handleAnswer,
            handleNextQuestion,
            renderFormattedText,
            t,
          }}
        />
      )}

      {/* ── PHASE 3: RESULTS SCREEN ── */}
      {phase === "results" && (
        <QuizResultsPhase
          p={{
            gradeInfo,
            correctCount,
            activeQuestions,
            wrongList,
            elapsedSeconds,
            startQuiz,
            setPhase,
            renderFormattedText,
            t,
          }}
        />
      )}

    </div>
  );
}

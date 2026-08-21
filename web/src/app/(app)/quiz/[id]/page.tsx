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
        <div>
          {/* Header Back */}
          <Link
            href="/library"
            style={{
              color: "#9ca3af",
              textDecoration: "none",
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 20,
            }}
          >
            ← {t("common.back") || "Back"} to Library
          </Link>

          {/* Quiz Card Banner */}
          <div
            style={{
              background: "linear-gradient(135deg, #111827 0%, #161c30 100%)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 24,
              padding: "36px 32px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
              marginBottom: 28,
            }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: 100, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", marginBottom: 16 }}>
              <span>📚</span>
              <span>{quiz.category || "General"}</span>
            </div>

            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.6px", margin: "0 0 12px 0" }}>
              {quiz.title}
            </h1>

            <div style={{ display: "flex", gap: 16, color: "#9ca3af", fontSize: 14, flexWrap: "wrap" }}>
              <span>❓ {quiz.questionsList?.length || quiz.questions || 0} Questions</span>
              <span>🃏 {quiz.flashcards?.length || 0} Flashcards</span>
              <span>📈 {quiz.attempts?.length || 0} Attempts</span>
            </div>
          </div>

          {/* Practice Modes Config */}
          <div
            style={{
              background: "#0d111e",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 20,
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: "0 0 4px 0" }}>
              Study Configuration
            </h3>

            {/* Shuffle Toggle */}
            <div
              onClick={() => setShuffleQuestions(!shuffleQuestions)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ color: "#ffffff", fontWeight: 600, fontSize: 14 }}>🔀 Shuffle Questions</div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>Randomize question order each attempt</div>
              </div>
              <input type="checkbox" checked={shuffleQuestions} onChange={() => {}} style={{ accentColor: "#6366f1", width: 18, height: 18 }} />
            </div>

            {/* Timed Mode Toggle */}
            <div
              onClick={() => setTimedMode(!timedMode)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ color: "#ffffff", fontWeight: 600, fontSize: 14 }}>⏱️ Timed Mode</div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>30 seconds countdown per question</div>
              </div>
              <input type="checkbox" checked={timedMode} onChange={() => {}} style={{ accentColor: "#6366f1", width: 18, height: 18 }} />
            </div>

            {/* Question Range Selection */}
            <div style={{ padding: "12px 16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: 12 }}>
              <div style={{ color: "#ffffff", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                🔢 Question Range
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: "#9ca3af" }}>From</span>
                <input
                  type="number"
                  min={1}
                  max={quiz.questionsList?.length || 1}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(parseInt(e.target.value) || 1)}
                  style={{ width: 60, background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", textAlign: "center" }}
                />
                <span style={{ fontSize: 13, color: "#9ca3af" }}>To</span>
                <input
                  type="number"
                  min={rangeStart}
                  max={quiz.questionsList?.length || 1}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(parseInt(e.target.value) || (quiz.questionsList?.length || 1))}
                  style={{ width: 60, background: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 8, padding: "6px 8px", color: "#fff", textAlign: "center" }}
                />
                <span style={{ fontSize: 12, color: "#6b7280" }}>(of {quiz.questionsList?.length || 0} total)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={() => startQuiz(false)}
              style={{
                flex: 2,
                minWidth: 200,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                border: "none",
                borderRadius: 16,
                padding: "16px 28px",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
              }}
            >
              🚀 Start Practice Quiz
            </button>

            {quiz.wrongQuestions && quiz.wrongQuestions.length > 0 && (
              <button
                onClick={() => startQuiz(true)}
                style={{
                  flex: 1,
                  minWidth: 180,
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 16,
                  padding: "16px 20px",
                  color: "#f87171",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ⚠️ Wrong Only ({quiz.wrongQuestions.length})
              </button>
            )}

            {quiz.flashcards && quiz.flashcards.length > 0 && (
              <Link
                href={`/flashcards/${quiz.id}`}
                style={{
                  flex: 1,
                  minWidth: 160,
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 16,
                  padding: "16px 20px",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>🃏 Flashcards</span>
              </Link>
            )}
          </div>

          {/* ── SCORE TRENDS BAR CHART ── */}
          {quiz.attempts && quiz.attempts.length > 1 && (
            <div
              style={{
                marginTop: 28,
                background: "#0d111d",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 20,
                padding: "20px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
                📈 Score Trends & Attempt History
              </div>
              <div style={{ display: "flex", height: 110, alignItems: "flex-end", justifyContent: "space-between", padding: "0 10px", gap: 10 }}>
                {[...quiz.attempts].reverse().map((att: any, i: number) => (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ height: 80, width: "100%", maxWidth: 24, background: "rgba(255, 255, 255, 0.04)", borderRadius: 6, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
                      <div
                        style={{
                          height: `${att.score}%`,
                          width: "100%",
                          borderRadius: 6,
                          background: att.score >= 75 ? "#34d399" : att.score >= 50 ? "#6366f1" : "#f59e0b",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{att.score}%</span>
                    <span style={{ fontSize: 9, color: "#6b7280" }}>#{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── QUIZ DIRECTORY & STUDY GUIDE ── */}
          {quiz.questionsList && quiz.questionsList.length > 0 && (
            <div
              style={{
                marginTop: 28,
                background: "#0d111d",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 20,
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
                  📚 Quiz Directory & Study Guide
                </div>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  {quiz.questionsList.length} Questions
                </span>
              </div>

              {/* Search Questions Input */}
              <div style={{ marginBottom: 14 }}>
                <input
                  type="text"
                  placeholder="🔍 Search questions or keywords..."
                  value={qQuery}
                  onChange={(e) => setQQuery(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 12,
                    padding: "10px 14px",
                    color: "#ffffff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Question List Accordion */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto", paddingRight: 4 }}>
                {quiz.questionsList
                  .filter((q) =>
                    (q.prompt || q.question || "").toLowerCase().includes(qQuery.toLowerCase()) ||
                    (q.answers || []).some((a: any) => (a.text || "").toLowerCase().includes(qQuery.toLowerCase()))
                  )
                  .map((q, i) => {
                    const isExpanded = expandedQId === (q.id || String(i));
                    return (
                      <div
                        key={q.id || i}
                        style={{
                          borderRadius: 12,
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          background: "rgba(255, 255, 255, 0.02)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          onClick={() => setExpandedQId(isExpanded ? null : (q.id || String(i)))}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            padding: "12px 14px",
                            cursor: "pointer",
                            gap: 10,
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", marginTop: 2 }}>Q{i + 1}</span>
                          <span style={{ flex: 1, fontSize: 13, color: "#e5e7eb", lineHeight: 1.4 }}>
                            {q.prompt || q.question}
                          </span>
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>{isExpanded ? "▲" : "▼"}</span>
                        </div>

                        {isExpanded && (
                          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", flexDirection: "column", gap: 6, background: "rgba(0, 0, 0, 0.2)" }}>
                            {(q.answers || []).map((ans: any, aIdx: number) => (
                              <div
                                key={aIdx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "8px 10px",
                                  borderRadius: 8,
                                  background: ans.isCorrect ? "rgba(52, 211, 153, 0.1)" : "transparent",
                                  border: `1px solid ${ans.isCorrect ? "rgba(52, 211, 153, 0.3)" : "transparent"}`,
                                }}
                              >
                                <span
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 4,
                                    background: ans.isCorrect ? "#34d399" : "rgba(255, 255, 255, 0.08)",
                                    color: ans.isCorrect ? "#000000" : "#9ca3af",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {ans.isCorrect ? "✓" : ["A", "B", "C", "D", "E"][aIdx] || `${aIdx + 1}`}
                                </span>
                                <span style={{ fontSize: 12, color: ans.isCorrect ? "#34d399" : "#d1d5db" }}>
                                  {ans.text}
                                </span>
                              </div>
                            ))}
                            {q.explanation && (
                              <div style={{ marginTop: 6, fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
                                💡 {q.explanation}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PHASE 2: IN-QUIZ RUNNER ── */}
      {phase === "playing" && currentQ && (
        <div>
          {/* Top Progress & Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>
              Question {currentIndex + 1} of {activeQuestions.length}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {timedMode && (
                <div
                  style={{
                    background: timeLeft <= 5 ? "rgba(239, 68, 68, 0.2)" : "rgba(99, 102, 241, 0.15)",
                    border: `1px solid ${timeLeft <= 5 ? "#ef4444" : "#6366f1"}40`,
                    borderRadius: 99,
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: timeLeft <= 5 ? "#f87171" : "#a5b4fc",
                  }}
                >
                  ⏱️ {timeLeft}s
                </div>
              )}

              <button
                onClick={() => toggleStarQuestion(currentQ.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                {starredQuestionIds.has(currentQ.id) ? "⭐" : "☆"}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ height: 5, background: "rgba(255, 255, 255, 0.08)", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #6366f1, #34d399)", transition: "width 0.3s ease" }} />
          </div>

          {/* Question Card */}
          <div
            style={{
              background: "#0d111d",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 20,
              padding: "24px 20px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
              animation: shakeCard ? "shake 0.4s ease" : "none",
              marginBottom: 20,
              boxSizing: "border-box",
            }}
          >
            <h2 style={{ fontSize: "clamp(16px, 4.5vw, 20px)", fontWeight: 700, color: "#ffffff", lineHeight: 1.5, margin: "0 0 20px 0" }}>
              {renderFormattedText(currentQ.question || currentQ.prompt || "")}
            </h2>

            {/* Answer Choices */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(currentQ.answers || []).map((ans, aIdx) => {
                const isSelected = selectedAnswerId === ans.id;
                const isCorrect = ans.isCorrect;
                const letter = ["A", "B", "C", "D", "E"][aIdx] || `${aIdx + 1}`;

                let cardBg = "rgba(255, 255, 255, 0.03)";
                let borderColor = "rgba(255, 255, 255, 0.08)";
                let badgeBg = "rgba(255, 255, 255, 0.08)";
                let badgeColor = "#9ca3af";

                if (isAnswered) {
                  if (isCorrect) {
                    cardBg = "rgba(16, 185, 129, 0.15)";
                    borderColor = "#10b981";
                    badgeBg = "#10b981";
                    badgeColor = "#ffffff";
                  } else if (isSelected && !isCorrect) {
                    cardBg = "rgba(239, 68, 68, 0.15)";
                    borderColor = "#ef4444";
                    badgeBg = "#ef4444";
                    badgeColor = "#ffffff";
                  }
                }

                return (
                  <button
                    key={ans.id || aIdx}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleAnswer(ans.id || `a_${aIdx}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "16px 18px",
                      borderRadius: 16,
                      background: cardBg,
                      border: `1px solid ${borderColor}`,
                      cursor: isAnswered ? "default" : "pointer",
                      textAlign: "left",
                      color: "#ffffff",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isAnswered) {
                        e.currentTarget.style.borderColor = "#6366f1";
                        e.currentTarget.style.background = "rgba(99, 102, 241, 0.08)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAnswered) {
                        e.currentTarget.style.borderColor = borderColor;
                        e.currentTarget.style.background = cardBg;
                      }
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: badgeBg,
                        color: badgeColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {isAnswered && isCorrect ? "✓" : isAnswered && isSelected ? "✕" : letter}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4, flex: 1 }}>
                      {ans.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation Section */}
            {isAnswered && currentQ.explanation && (
              <div
                style={{
                  marginTop: 24,
                  padding: "18px 20px",
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  borderRadius: 16,
                }}
              >
                <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                  💡 Explanation
                </div>
                <div style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.5 }}>
                  {renderFormattedText(currentQ.explanation)}
                </div>
              </div>
            )}
          </div>

          {/* Next / Submit Button */}
          {isAnswered && (
            <button
              onClick={handleNextQuestion}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                border: "none",
                borderRadius: 16,
                padding: "16px 28px",
                color: "#ffffff",
                fontSize: 16,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
              }}
            >
              {currentIndex + 1 < activeQuestions.length ? "Next Question →" : "View Results 🎉"}
            </button>
          )}
        </div>
      )}

      {/* ── PHASE 3: RESULTS SCREEN ── */}
      {phase === "results" && (
        <div style={{ textAlign: "center" }}>
          {/* Circular Score & Grade */}
          <div
            style={{
              background: "#0d111d",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 28,
              padding: "44px 32px",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${gradeInfo.color}25, transparent 70%)`,
                border: `3px solid ${gradeInfo.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
                fontWeight: 900,
                color: gradeInfo.color,
                margin: "0 auto 20px",
                boxShadow: `0 8px 32px ${gradeInfo.color}40`,
              }}
            >
              {gradeInfo.letter}
            </div>

            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0" }}>
              {Math.round((correctCount / activeQuestions.length) * 100)}% Accuracy
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 15, margin: "0 0 28px 0" }}>
              {gradeInfo.label}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 14, padding: "14px 10px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399" }}>{correctCount}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>Correct</div>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 14, padding: "14px 10px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>{wrongList.length}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>Wrong</div>
              </div>
              <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 14, padding: "14px 10px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#60a5fa" }}>{elapsedSeconds}s</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>Time Spent</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 40 }}>
            <button
              onClick={() => startQuiz(false)}
              style={{
                flex: 1,
                minWidth: 160,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                border: "none",
                borderRadius: 16,
                padding: "16px",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🔄 Retake Quiz
            </button>

            {wrongList.length > 0 && (
              <button
                onClick={() => startQuiz(true)}
                style={{
                  flex: 1,
                  minWidth: 180,
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 16,
                  padding: "16px",
                  color: "#f87171",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ⚠️ Practice Wrong Only ({wrongList.length})
              </button>
            )}

            <button
              onClick={() => setPhase("options")}
              style={{
                flex: 1,
                minWidth: 140,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 16,
                padding: "16px",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              📚 Quiz Options
            </button>
          </div>

          {/* Detailed Question Review List */}
          {wrongList.length > 0 && (
            <div style={{ textAlign: "left" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 16 }}>
                Questions to Review
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {wrongList.map((w, idx) => (
                  <div
                    key={w.id || idx}
                    style={{
                      background: "#0d111d",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: 18,
                      padding: "20px",
                    }}
                  >
                    <div style={{ color: "#ffffff", fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
                      {renderFormattedText(w.question || w.prompt || "")}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                      <div style={{ color: "#ef4444" }}>
                        <strong>Your answer:</strong> {w.selectedTexts?.join(", ") || "None"}
                      </div>
                      <div style={{ color: "#34d399" }}>
                        <strong>Correct answer:</strong> {w.correctTexts?.join(", ")}
                      </div>
                    </div>
                    {w.explanation && (
                      <div style={{ marginTop: 10, fontSize: 13, color: "#9ca3af", background: "rgba(255, 255, 255, 0.02)", padding: "10px 12px", borderRadius: 10 }}>
                        {renderFormattedText(w.explanation)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

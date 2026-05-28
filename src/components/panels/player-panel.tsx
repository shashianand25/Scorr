"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Flag, CheckCircle, XCircle, LayoutGrid, X } from "lucide-react";
import { MarkdownRenderer } from "../markdown-renderer";
import type { QuizConfig, QuizSession } from "../quiz-types";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

interface PlayerPanelProps {
  session: QuizSession;
  currentIndex: number;
  config: QuizConfig;
  onAnswer: (questionId: string, answerId: string) => void;
  onFlag: (questionId: string) => void;
  onNavigate: (index: number) => void;
  onFinish: () => void;
}

function useTimer(duration: number | null, questionIndex: number) {
  const [timeLeft, setTimeLeft] = useState<number | null>(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (duration === null) { setTimeLeft(null); return; }

    setTimeLeft(duration);
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [questionIndex, duration]);

  return timeLeft;
}

export function PlayerPanel({
  session,
  currentIndex,
  config,
  onAnswer,
  onFlag,
  onNavigate,
  onFinish,
}: PlayerPanelProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [direction, setDirection] = useState(1);
  const timeLeft = useTimer(config.timePerQuestion, currentIndex);

  const question = session.questions[currentIndex];
  const selectedIds = session.answers.get(question.id) ?? [];
  const isFlagged = session.flagged.has(question.id);
  const isAnswered = selectedIds.length > 0;
  const showResult = config.showAnswerOnSubmit && isAnswered;

  const totalQuestions = session.questions.length;
  const answeredCount = session.answers.size;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  function navigate(idx: number) {
    setDirection(idx > currentIndex ? 1 : -1);
    onNavigate(idx);
  }

  function handleAnswer(answerId: string) {
    if (showResult) return; // locked after reveal
    onAnswer(question.id, answerId);
  }

  const timerPct = config.timePerQuestion && timeLeft !== null
    ? (timeLeft / config.timePerQuestion) * 100
    : 100;
  const timerUrgent = timeLeft !== null && timeLeft <= 10;

  // Finish confirmation
  const unanswered = totalQuestions - answeredCount;

  function handleFinish() {
    if (unanswered > 0) {
      const ok = window.confirm(
        `${unanswered} question${unanswered > 1 ? "s" : ""} unanswered. Finish anyway?`
      );
      if (!ok) return;
    }
    onFinish();
  }

  return (
    <div className="flex min-h-[calc(100vh-140px)] flex-col">
      {/* ── TOP BAR ── */}
      <div
        className="sticky top-[73px] z-30 px-0 pb-3"
        style={{ background: "#07090e" }}
      >
        {/* Quiz title + meta */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="truncate text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {session.questions.length > 0 ? "Quiz" : ""}
            </span>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Q {currentIndex + 1} / {totalQuestions}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Timer */}
            {timeLeft !== null && (
              <div
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-sm font-bold tabular-nums"
                style={{
                  background: timerUrgent ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.05)",
                  border: timerUrgent ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  color: timerUrgent ? "#ef4444" : "var(--text-secondary)",
                }}
              >
                {String(Math.floor((timeLeft ?? 0) / 60)).padStart(2, "0")}:
                {String((timeLeft ?? 0) % 60).padStart(2, "0")}
              </div>
            )}
            {/* Finish button */}
            <motion.button
              onClick={handleFinish}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl px-4 py-1.5 text-sm font-semibold"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#ef4444",
              }}
            >
              Finish
            </motion.button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 items-center">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,0.07)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, var(--accent-primary), #7dd3fc)",
                boxShadow: "0 0 8px rgba(0,229,160,0.4)",
              }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
          {/* Timer bar */}
          {timeLeft !== null && (
            <div
              className="h-1.5 w-20 overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: timerUrgent ? "#ef4444" : "#3b82f6",
                  boxShadow: timerUrgent ? "0 0 8px rgba(239,68,68,0.4)" : "none",
                }}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── QUESTION + ANSWERS ── */}
      <div className="flex flex-1 flex-col">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="flex flex-1 flex-col"
          >
            {/* Question card */}
            <div
              className="mb-6 overflow-hidden rounded-2xl p-6 md:p-8"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold"
                  style={{ background: "var(--accent-primary)", color: "#07090e" }}
                >
                  {currentIndex + 1}
                </span>
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {question.type === "multiple_choice"
                    ? "Select all that apply"
                    : question.type === "true_false"
                    ? "True or False"
                    : "Choose one answer"}
                </span>
              </div>
              <div className="prose-lite text-base leading-relaxed">
                <MarkdownRenderer value={question.prompt} />
              </div>
              {question.imageUrl && (
                <img
                  src={question.imageUrl}
                  alt=""
                  className="mt-4 max-h-60 w-full rounded-xl object-cover"
                />
              )}
            </div>

            {/* Answer options */}
            <div className="grid gap-3 sm:grid-cols-2">
              {question.answers.map((answer, i) => {
                const isSelected = selectedIds.includes(answer.id);
                const correct = showResult && answer.isCorrect;
                const wrong = showResult && isSelected && !answer.isCorrect;

                return (
                  <motion.button
                    key={answer.id}
                    onClick={() => handleAnswer(answer.id)}
                    whileHover={!showResult ? { scale: 1.015, y: -2 } : {}}
                    whileTap={!showResult ? { scale: 0.985 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="group relative min-h-[72px] overflow-hidden rounded-2xl p-4 text-left"
                    style={{
                      background: correct
                        ? "rgba(0, 229, 160, 0.1)"
                        : wrong
                        ? "rgba(239, 68, 68, 0.1)"
                        : isSelected
                        ? "rgba(0, 229, 160, 0.07)"
                        : "rgba(255,255,255,0.03)",
                      border: correct
                        ? "1.5px solid rgba(0, 229, 160, 0.45)"
                        : wrong
                        ? "1.5px solid rgba(239, 68, 68, 0.4)"
                        : isSelected
                        ? "1.5px solid rgba(0, 229, 160, 0.3)"
                        : "1.5px solid rgba(255,255,255,0.07)",
                      boxShadow:
                        isSelected && !showResult
                          ? "0 0 20px rgba(0,229,160,0.08)"
                          : correct
                          ? "0 0 20px rgba(0,229,160,0.12)"
                          : "none",
                      cursor: showResult ? "default" : "pointer",
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold"
                        style={{
                          background: correct
                            ? "rgba(0, 229, 160, 0.2)"
                            : wrong
                            ? "rgba(239, 68, 68, 0.2)"
                            : isSelected
                            ? "rgba(0, 229, 160, 0.15)"
                            : "rgba(255,255,255,0.06)",
                          color: correct
                            ? "var(--accent-primary)"
                            : wrong
                            ? "#ef4444"
                            : isSelected
                            ? "var(--accent-primary)"
                            : "var(--text-tertiary)",
                        }}
                      >
                        {correct ? (
                          <CheckCircle className="size-3.5" />
                        ) : wrong ? (
                          <XCircle className="size-3.5" />
                        ) : (
                          LETTERS[i]
                        )}
                      </span>
                      <span
                        className="text-sm leading-relaxed"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {answer.text}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── BOTTOM NAV ── */}
      <div className="sticky bottom-20 mt-6 flex items-center gap-2 md:bottom-8">
        {/* Flag */}
        <motion.button
          onClick={() => onFlag(question.id)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium"
          style={{
            background: isFlagged ? "rgba(245, 158, 11, 0.1)" : "rgba(255,255,255,0.05)",
            border: isFlagged ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.08)",
            color: isFlagged ? "#f59e0b" : "var(--text-secondary)",
          }}
        >
          <Flag className="size-3.5" />
          <span className="hidden sm:block">{isFlagged ? "Flagged" : "Flag"}</span>
        </motion.button>

        <div className="flex flex-1 items-center justify-center gap-2">
          {/* Previous */}
          <motion.button
            onClick={() => navigate(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-30"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-secondary)",
            }}
          >
            <ChevronLeft className="size-4" />
            Prev
          </motion.button>

          {/* Next / Done */}
          <motion.button
            onClick={() =>
              currentIndex < totalQuestions - 1
                ? navigate(currentIndex + 1)
                : handleFinish()
            }
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold"
            style={{
              background:
                currentIndex === totalQuestions - 1
                  ? "var(--accent-primary)"
                  : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color:
                currentIndex === totalQuestions - 1
                  ? "#07090e"
                  : "var(--text-primary)",
              boxShadow:
                currentIndex === totalQuestions - 1
                  ? "0 0 20px rgba(0,229,160,0.2)"
                  : "none",
            }}
          >
            {currentIndex === totalQuestions - 1 ? "Finish Quiz" : "Next"}
            <ChevronRight className="size-4" />
          </motion.button>
        </div>

        {/* Question palette toggle */}
        <motion.button
          onClick={() => setPaletteOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--text-secondary)",
          }}
        >
          <LayoutGrid className="size-4" />
          <span className="hidden sm:block">{answeredCount}/{totalQuestions}</span>
        </motion.button>
      </div>

      {/* ── QUESTION PALETTE ── */}
      <AnimatePresence>
        {paletteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
              onClick={() => setPaletteOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="fixed inset-x-4 bottom-4 top-auto z-50 mx-auto max-w-lg overflow-hidden rounded-3xl md:inset-x-auto md:left-1/2 md:w-[480px] md:-translate-x-1/2"
              style={{
                background: "rgba(10, 14, 22, 0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  All Questions
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-[var(--accent-primary)]" />
                      Answered
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="size-2 rounded-full bg-[#f59e0b]" />
                      Flagged
                    </span>
                  </div>
                  <button
                    onClick={() => setPaletteOpen(false)}
                    className="rounded-lg p-1 transition-colors hover:bg-white/5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto quiz-scrollbar p-4">
                <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
                  {session.questions.map((q, idx) => {
                    const answered = session.answers.has(q.id);
                    const flagged = session.flagged.has(q.id);
                    const isCurrent = idx === currentIndex;

                    return (
                      <motion.button
                        key={q.id}
                        onClick={() => { navigate(idx); setPaletteOpen(false); }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="aspect-square rounded-xl text-xs font-bold"
                        style={{
                          background: isCurrent
                            ? "var(--accent-primary)"
                            : flagged
                            ? "rgba(245,158,11,0.15)"
                            : answered
                            ? "rgba(0,229,160,0.12)"
                            : "rgba(255,255,255,0.05)",
                          border: isCurrent
                            ? "none"
                            : flagged
                            ? "1px solid rgba(245,158,11,0.3)"
                            : answered
                            ? "1px solid rgba(0,229,160,0.25)"
                            : "1px solid rgba(255,255,255,0.08)",
                          color: isCurrent
                            ? "#07090e"
                            : flagged
                            ? "#f59e0b"
                            : answered
                            ? "var(--accent-primary)"
                            : "var(--text-tertiary)",
                          boxShadow: isCurrent ? "0 0 12px rgba(0,229,160,0.3)" : "none",
                        }}
                      >
                        {idx + 1}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
              <div
                className="px-5 py-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {answeredCount} answered · {totalQuestions - answeredCount} remaining ·{" "}
                  {session.flagged.size} flagged
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

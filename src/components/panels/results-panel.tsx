"use client";

import { motion } from "framer-motion";
import { CheckCircle, XCircle, Minus, RotateCcw, Trophy, Home, ChevronRight } from "lucide-react";
import type { QuizSession } from "../quiz-types";

interface ResultsPanelProps {
  session: QuizSession;
  quizTitle: string;
  onRetryAll: () => void;
  onRetryWrong: () => void;
  onNewQuiz: () => void;
}

function computeScore(session: QuizSession) {
  const correct: string[] = [];
  const wrong: string[] = [];
  const skipped: string[] = [];

  for (const q of session.questions) {
    const selectedIds = session.answers.get(q.id) ?? [];
    if (selectedIds.length === 0) {
      skipped.push(q.id);
      continue;
    }
    const correctIds = q.answers.filter((a) => a.isCorrect).map((a) => a.id);
    const isCorrect =
      selectedIds.length === correctIds.length &&
      selectedIds.every((id) => correctIds.includes(id));
    if (isCorrect) correct.push(q.id);
    else wrong.push(q.id);
  }

  return { correct, wrong, skipped };
}

function formatTime(ms: number) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function ResultsPanel({
  session,
  quizTitle,
  onRetryAll,
  onRetryWrong,
  onNewQuiz,
}: ResultsPanelProps) {
  const { correct, wrong, skipped } = computeScore(session);
  const total = session.questions.length;
  const score = total > 0 ? Math.round((correct.length / total) * 100) : 0;
  const duration = session.endTime ? session.endTime - session.startTime : 0;

  const grade = score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Fair" : "Needs work";
  const gradeColor =
    score >= 90
      ? "var(--accent-primary)"
      : score >= 75
      ? "#3b82f6"
      : score >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="mx-auto max-w-xl pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="space-y-5"
      >
        {/* Score card */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 text-center"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: `1px solid ${gradeColor}28`,
            boxShadow: `0 0 50px ${gradeColor}10`,
          }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${gradeColor}50, transparent)`,
            }}
          />

          <div className="mb-4">
            <Trophy className="mx-auto size-10 mb-2" style={{ color: gradeColor }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {quizTitle}
            </p>
          </div>

          {/* Big score */}
          <div className="mb-2">
            <motion.span
              className="text-7xl font-black tabular-nums"
              style={{ color: gradeColor, letterSpacing: "-0.04em" }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
            >
              {score}
            </motion.span>
            <span className="text-3xl font-bold" style={{ color: "var(--text-secondary)" }}>
              %
            </span>
          </div>
          <p className="text-lg font-semibold" style={{ color: gradeColor }}>
            {grade}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
            {correct.length} / {total} correct{duration > 0 ? ` · ${formatTime(duration)}` : ""}
          </p>
        </div>

        {/* Breakdown */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {[
            {
              icon: CheckCircle,
              label: "Correct",
              count: correct.length,
              color: "var(--accent-primary)",
              bg: "rgba(0,229,160,0.08)",
            },
            {
              icon: XCircle,
              label: "Wrong",
              count: wrong.length,
              color: "#ef4444",
              bg: "rgba(239,68,68,0.08)",
            },
            {
              icon: Minus,
              label: "Skipped",
              count: skipped.length,
              color: "var(--text-tertiary)",
              bg: "rgba(255,255,255,0.04)",
            },
          ].map(({ icon: Icon, label, count, color, bg }, i, arr) => (
            <div
              key={label}
              className="flex items-center justify-between px-5 py-4"
              style={{
                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid size-8 place-items-center rounded-xl"
                  style={{ background: bg }}
                >
                  <Icon className="size-4" style={{ color }} />
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="h-1.5 w-24 overflow-hidden rounded-full"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: total > 0 ? `${(count / total) * 100}%` : "0%" }}
                    transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                  />
                </div>
                <span
                  className="w-8 text-right text-sm font-bold"
                  style={{ color, fontFamily: "var(--font-mono)" }}
                >
                  {count}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid gap-3">
          {wrong.length > 0 && (
            <motion.button
              onClick={onRetryWrong}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-between rounded-2xl px-5 py-4"
              style={{
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid size-9 place-items-center rounded-xl"
                  style={{ background: "rgba(239,68,68,0.12)" }}
                >
                  <RotateCcw className="size-4" style={{ color: "#ef4444" }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Retry wrong answers
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {wrong.length} question{wrong.length !== 1 ? "s" : ""} to retry
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4" style={{ color: "var(--text-tertiary)" }} />
            </motion.button>
          )}

          <motion.button
            onClick={onRetryAll}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-between rounded-2xl px-5 py-4"
            style={{
              background: "rgba(0,229,160,0.06)",
              border: "1px solid rgba(0,229,160,0.18)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="grid size-9 place-items-center rounded-xl"
                style={{ background: "rgba(0,229,160,0.12)" }}
              >
                <RotateCcw className="size-4" style={{ color: "var(--accent-primary)" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Retry all questions
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Start again with same settings
                </p>
              </div>
            </div>
            <ChevronRight className="size-4" style={{ color: "var(--text-tertiary)" }} />
          </motion.button>

          <motion.button
            onClick={onNewQuiz}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-between rounded-2xl px-5 py-4"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="grid size-9 place-items-center rounded-xl"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <Home className="size-4" style={{ color: "var(--text-secondary)" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Upload new quiz
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Start with a different file
                </p>
              </div>
            </div>
            <ChevronRight className="size-4" style={{ color: "var(--text-tertiary)" }} />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

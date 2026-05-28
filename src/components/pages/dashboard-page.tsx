"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  Trophy,
  Target,
  ChevronRight,
  Plus,
  Zap,
} from "lucide-react";
import type { SavedQuiz } from "@/components/quiz-types";

interface DashboardPageProps {
  library: SavedQuiz[];
  stats: { totalQuizzes: number; totalQuestions: number; totalAttempts: number; bestScore: number };
  onPlay: (quizId: string) => void;
  onViewAll: () => void;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function DashboardPage({ library, stats, onPlay, onViewAll }: DashboardPageProps) {
  const allAttempts = library.flatMap(q => q.attempts.map(a => ({ ...a, quizTitle: q.title, quizId: q.id })));
  allAttempts.sort((a, b) => b.timestamp - a.timestamp);
  const recentAttempts = allAttempts.slice(0, 6);

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div>
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
        >
          Dashboard
        </h1>
        <p className="mt-1 text-base" style={{ color: "var(--text-secondary)" }}>
          {library.length > 0
            ? `You have ${stats.totalQuizzes} quiz${stats.totalQuizzes !== 1 ? "zes" : ""} saved`
            : "Upload your first quiz to get started"}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: BookOpen, label: "Quizzes", value: stats.totalQuizzes, color: "var(--accent-primary)" },
          { icon: Target, label: "Questions", value: stats.totalQuestions, color: "#3b82f6" },
          { icon: Zap, label: "Attempts", value: stats.totalAttempts, color: "#a855f7" },
          {
            icon: Trophy,
            label: "Best Score",
            value: stats.bestScore > 0 ? `${stats.bestScore}%` : "—",
            color: "#f59e0b",
          },
        ].map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="mb-3 grid size-9 place-items-center rounded-xl"
              style={{ background: `${color}15`, border: `1px solid ${color}25` }}
            >
              <Icon className="size-4" style={{ color }} />
            </div>
            <p
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}
            >
              {value}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
              {label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      {allAttempts.length > 0 ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Recent Activity
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentAttempts.map((attempt, i) => (
              <motion.div
                key={attempt.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="group flex flex-col rounded-2xl p-5 transition-all"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Card header */}
                <div className="mb-4 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-base font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {attempt.quizTitle}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      <Clock className="size-3" />
                      {timeAgo(attempt.timestamp)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-xl px-2 py-1 text-xs font-bold"
                    style={{
                      background:
                        attempt.score >= 75
                          ? "rgba(0,229,160,0.1)"
                          : "rgba(245,158,11,0.1)",
                      color: attempt.score >= 75 ? "var(--accent-primary)" : "#f59e0b",
                    }}
                  >
                    {attempt.score}%
                  </span>
                </div>

                {/* Attempt info */}
                <div className="mb-4 flex items-center gap-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>{attempt.correct}</span> correct
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>{attempt.wrong}</span> wrong
                  </div>
                </div>

                {/* Play button */}
                <button
                  onClick={() => onPlay(attempt.quizId)}
                  className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all hover:opacity-90"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--text-primary)",
                  }}
                >
                  Play Quiz Again
                  <ChevronRight className="size-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center rounded-3xl py-20 text-center"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "2px dashed rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="mb-5 grid size-16 place-items-center rounded-2xl"
            style={{ background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.15)" }}
          >
            <Trophy className="size-7" style={{ color: "var(--accent-primary)" }} />
          </div>
          <p className="mb-1 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            No activity yet
          </p>
          <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            Head over to My Quizzes to start playing
          </p>
          <button
            onClick={onViewAll}
            className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold"
            style={{ background: "var(--accent-primary)", color: "#07090e" }}
          >
            <BookOpen className="size-4" />
            Go to My Quizzes
          </button>
        </motion.div>
      )}
    </div>
  );
}

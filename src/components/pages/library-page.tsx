"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trash2, ChevronRight, Clock, BookOpen, Plus, X, Eye, FileDown, Copy, CheckCircle, XCircle } from "lucide-react";
import type { SavedQuiz } from "@/components/quiz-types";
import { parseQst, normalizeQstJson } from "@/lib/qst/parser";
import { exportQst } from "@/lib/qst/exporters";
import { toast } from "sonner";

interface LibraryPageProps {
  library: SavedQuiz[];
  onPlay: (quizId: string, options?: { mode: "wrong" }) => void;
  onDelete: (quizId: string) => void;
  onDeleteAttempt: (quizId: string, attemptId: string) => void;
  onAddQuiz: () => void;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function downloadText(fileName: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LibraryPage({ library, onPlay, onDelete, onDeleteAttempt, onAddQuiz }: LibraryPageProps) {
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [reviewQuizId, setReviewQuizId] = useState<string | null>(null);
  const reviewQuiz = reviewQuizId ? library.find((quiz) => quiz.id === reviewQuizId) : null;

  const filtered = library.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase()) ||
    (q.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
          >
            My Quizzes
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {library.length} quiz{library.length !== 1 ? "zes" : ""} saved
          </p>
        </div>
        <button
          onClick={onAddQuiz}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{ background: "var(--accent-primary)", color: "#07090e" }}
        >
          <Plus className="size-4" />
          Add Quiz
        </button>
      </div>

      {/* Search */}
      {library.length > 0 && (
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="text"
            placeholder="Search quizzes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-primary)",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {/* Quiz grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map((quiz, i) => {
              const best = quiz.attempts.length > 0
                ? Math.max(...quiz.attempts.map((a) => a.score))
                : null;
              const last = quiz.attempts[0]?.timestamp;
              const isDeleting = deleteConfirm === quiz.id;

              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex flex-col rounded-2xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: isDeleting
                      ? "1px solid rgba(239,68,68,0.3)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {/* Title + score */}
                  <div className="mb-3 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-base font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {quiz.title}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {quiz.fileName}
                      </p>
                    </div>
                    {best !== null && (
                      <span
                        className="shrink-0 rounded-xl px-2 py-1 text-xs font-bold"
                        style={{
                          background: best >= 75 ? "rgba(0,229,160,0.1)" : "rgba(245,158,11,0.1)",
                          color: best >= 75 ? "var(--accent-primary)" : "#f59e0b",
                        }}
                      >
                        {best}%
                      </span>
                    )}
                  </div>

                  {/* Meta tags */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span
                      className="rounded-lg px-2 py-0.5 text-xs"
                      style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}
                    >
                      {quiz.questionCount} questions
                    </span>
                    {quiz.category && (
                      <span
                        className="rounded-lg px-2 py-0.5 text-xs"
                        style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
                      >
                        {quiz.category}
                      </span>
                    )}
                    <span
                      className="rounded-lg px-2 py-0.5 text-xs"
                      style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-tertiary)" }}
                    >
                      {quiz.attempts.length} attempt{quiz.attempts.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Last played */}
                  {last && (
                    <p className="mb-4 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      <Clock className="size-3" />
                      Last played {timeAgo(last)}
                    </p>
                  )}

                  {/* Attempt history (last 5 bars) */}
                  {quiz.attempts.length > 0 && (
                    <div className="mb-4 flex items-end gap-1 h-8">
                      {quiz.attempts.slice(0, 8).reverse().map((a) => (
                        <div
                          key={a.id}
                          className="flex-1 rounded-sm"
                          style={{
                            height: `${Math.max(20, a.score)}%`,
                            background: a.score >= 75 ? "var(--accent-primary)" : "rgba(245,158,11,0.6)",
                            opacity: 0.7,
                          }}
                          title={`${a.score}%`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Delete confirmation */}
                  {isDeleting ? (
                    <div className="mt-auto flex gap-2">
                      <button
                        onClick={() => onDelete(quiz.id)}
                        className="flex-1 rounded-xl py-2.5 text-sm font-semibold"
                        style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
                      >
                        Confirm delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-xl px-3 py-2.5 text-sm"
                        style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="mt-auto flex gap-2">
                      <button
                        onClick={() => onPlay(quiz.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold"
                        style={{ background: "var(--accent-primary)", color: "#07090e" }}
                      >
                        Play <ChevronRight className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setReviewQuizId(quiz.id)}
                        className="rounded-xl px-3 py-2.5"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-secondary)",
                        }}
                        title="Review answers"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(quiz.id)}
                        className="rounded-xl px-3 py-2.5"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-tertiary)",
                        }}
                        title="Delete quiz"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : library.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl py-20 text-center"
          style={{ background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(255,255,255,0.08)" }}>
          <BookOpen className="mb-4 size-10" style={{ color: "var(--text-tertiary)" }} />
          <p className="mb-1 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>No quizzes saved</p>
          <p className="mb-6 text-sm" style={{ color: "var(--text-secondary)" }}>Add your first quiz file to get started</p>
          <button onClick={onAddQuiz} className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
            style={{ background: "var(--accent-primary)", color: "#07090e" }}>
            <Plus className="size-4" /> Add Quiz
          </button>
        </div>
      ) : (
        <p className="py-8 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
          No quizzes match &quot;{search}&quot;
        </p>
      )}

      <AnimatePresence>
        {reviewQuiz && (
          <QuizReviewDialog
            quiz={reviewQuiz}
            onClose={() => setReviewQuizId(null)}
            onPlay={(opts) => {
              setReviewQuizId(null);
              onPlay(reviewQuiz.id, opts);
            }}
            onDeleteAttempt={(attemptId) => onDeleteAttempt(reviewQuiz.id, attemptId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function QuizReviewDialog({ 
  quiz, 
  onClose, 
  onPlay,
  onDeleteAttempt 
}: { 
  quiz: SavedQuiz; 
  onClose: () => void; 
  onPlay: (opts?: { mode: "wrong" }) => void;
  onDeleteAttempt: (attemptId: string) => void;
}) {
  const parsed = parseQst(quiz.source);
  const normalized = normalizeQstJson(parsed.data);
  const [selectedAttemptIdx, setSelectedAttemptIdx] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // If the selected index gets out of bounds (e.g. after delete), fix it.
  const attempt = quiz.attempts[selectedAttemptIdx] || quiz.attempts[0];
  const missed = attempt?.review?.filter((r) => 
    r.correctAnswers && 
    (r.selectedAnswers.length !== r.correctAnswers.length || !r.selectedAnswers.every((ans) => r.correctAnswers.includes(ans)))
  ) ?? [];

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        className="flex max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-3xl"
        style={{ background: "rgba(12,16,24,0.96)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Sidebar: Attempt History */}
        <div className="w-64 flex-shrink-0 flex flex-col border-r bg-black/20" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Attempt History</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 quiz-scrollbar">
            {quiz.attempts.length === 0 ? (
              <p className="p-3 text-sm text-zinc-500 text-center mt-4">No attempts yet.</p>
            ) : (
              quiz.attempts.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedAttemptIdx(i);
                    setShowDetails(false);
                  }}
                  className="w-full rounded-xl p-3 text-left transition-colors flex flex-col relative group"
                  style={{
                    background: attempt?.id === a.id ? "rgba(0, 229, 160, 0.1)" : "transparent",
                    border: attempt?.id === a.id ? "1px solid rgba(0, 229, 160, 0.2)" : "1px solid transparent",
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-semibold text-sm" style={{ color: attempt?.id === a.id ? "var(--accent-primary)" : "var(--text-primary)" }}>
                      Score: {a.score}%
                    </span>
                    <span className="text-xs text-zinc-500 group-hover:hidden">
                      {new Date(a.timestamp).toLocaleDateString()}
                    </span>
                    <div 
                      className="hidden group-hover:flex items-center justify-center -m-1 p-1 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/40"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Are you sure you want to delete this attempt?")) {
                          onDeleteAttempt(a.id);
                        }
                      }}
                    >
                      <Trash2 className="size-3" />
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    {a.correct} / {a.questionCount} correct
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content: Review Details */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div>
              <h2 className="text-xl font-bold truncate" style={{ color: "var(--text-primary)" }}>
                {quiz.title}
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {quiz.questionCount} questions
              </p>
            </div>
            <button onClick={onClose} className="rounded-xl p-2" style={{ color: "var(--text-tertiary)", background: "rgba(255,255,255,0.05)" }}>
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 quiz-scrollbar">
            {/* Actions */}
            <div className="mb-6 flex flex-wrap gap-2">
              <button 
                onClick={() => onPlay({ mode: "wrong" })} 
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold" 
                style={{ background: "var(--accent-primary)", color: "#07090e" }}
                disabled={!attempt || missed.length === 0}
              >
                Re-attempt wrong ones <ChevronRight className="size-4" />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(normalized, null, 2));
                  toast.success("Quiz JSON copied");
                }}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
              >
                <Copy className="size-4" />
                Copy JSON
              </button>
              <button
                onClick={() => downloadText(`${quiz.title}.qst`, exportQst(parsed.data))}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
              >
                <FileDown className="size-4" />
                Export QST
              </button>
            </div>

            {!attempt ? (
              <div className="py-20 text-center">
                <p className="text-zinc-500">Select an attempt to view its dashboard.</p>
              </div>
            ) : (
              <>
                <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {[
                    ["Score", `${attempt.score}%`],
                    ["Correct", attempt.correct.toString()],
                    ["Wrong", attempt.wrong.toString()],
                    ["Skipped", attempt.skipped.toString()],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</p>
                      <p className="mt-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
                    </div>
                  ))}
                </div>

                {!showDetails ? (
                  <div className="flex justify-center py-6">
                    <button
                      onClick={() => setShowDetails(true)}
                      className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
                      style={{ border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-secondary)" }}
                    >
                      View detailed answers & key
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-5 lg:grid-cols-2">
                    <section className="rounded-2xl p-4" style={{ background: "rgba(239,68,68,0.045)", border: "1px solid rgba(239,68,68,0.18)" }}>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-semibold" style={{ color: "var(--text-primary)" }}>
                          <XCircle className="size-4" style={{ color: "#ef4444" }} />
                          Wrong in this attempt
                        </h3>
                      </div>
                      {missed.length > 0 ? (
                        <div className="space-y-3">
                          {missed.map((item, index: number) => (
                            <div key={`${item.questionId}-${index}`} className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.18)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{index + 1}. {item.prompt}</p>
                              <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>Selected: {item.selectedAnswers?.length ? item.selectedAnswers.join(", ") : "No answer"}</p>
                              <p className="mt-1 text-xs" style={{ color: "var(--accent-primary)" }}>Correct: {item.correctAnswers?.join(", ") ?? "Unknown"}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          No wrong answers to review in this attempt.
                        </p>
                      )}
                    </section>

                    <section className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-semibold" style={{ color: "var(--text-primary)" }}>
                          <CheckCircle className="size-4" style={{ color: "var(--accent-primary)" }} />
                          Answer key
                        </h3>
                        <button 
                          onClick={() => setShowDetails(false)}
                          className="text-xs hover:underline"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          Hide details
                        </button>
                      </div>
                      <div className="quiz-scrollbar max-h-[480px] space-y-3 overflow-auto pr-1">
                        {parsed.data.questions.map((question, index) => {
                          const correct = question.answers.filter((answer) => answer.isCorrect);
                          const wrong = question.answers.filter((answer) => !answer.isCorrect);
                          return (
                            <div key={question.id} className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.16)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{index + 1}. {question.prompt}</p>
                              <p className="mt-2 text-xs" style={{ color: "var(--accent-primary)" }}>Correct: {correct.map((answer) => answer.text).join(", ")}</p>
                              <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>Wrong options: {wrong.length ? wrong.map((answer) => answer.text).join(", ") : "None"}</p>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

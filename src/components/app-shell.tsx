"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Plus, LayoutDashboard, BookOpen, ChevronRight, Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { parseQst } from "@/lib/qst/parser";
import type { QstParseResult } from "@/lib/qst/types";
import { toast } from "sonner";

import { AmbientBackground } from "./ui/ambient-bg";
import { useQuizLibrary } from "@/hooks/use-quiz-library";
import { DashboardPage } from "./pages/dashboard-page";
import { LibraryPage } from "./pages/library-page";
import { QuizPlayPage } from "./pages/quiz-play-page";

import { UserMenu } from "./auth/user-menu";

// ─── Page state ───────────────────────────────────────────────
type Page =
  | { id: "dashboard" }
  | { id: "library" }
  | { id: "add" }
  | { id: "quiz"; quizId: string; initialMode?: "all" | "random" | "range" | "unanswered" | "wrong" };

// ─── Header ───────────────────────────────────────────────────
function Header({
  page,
  onNavigate,
  quizTitle,
}: {
  page: Page;
  onNavigate: (p: Page) => void;
  quizTitle?: string;
}) {
  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: "rgba(7, 9, 14, 0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-5 py-0">
        {/* Logo */}
        <button
          onClick={() => onNavigate({ id: "dashboard" })}
          className="mr-4 flex items-center gap-2.5 py-4 transition-opacity hover:opacity-80"
        >
          <div
            className="grid size-7 place-items-center rounded-lg"
            style={{
              background: "linear-gradient(135deg, var(--accent-primary), #7dd3fc)",
              boxShadow: "0 0 14px rgba(0,229,160,0.25)",
            }}
          >
            <Brain className="size-4" style={{ color: "#07090e" }} />
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            QuizForge
          </span>
        </button>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          <NavLink
            active={page.id === "dashboard"}
            onClick={() => onNavigate({ id: "dashboard" })}
            icon={<LayoutDashboard className="size-4" />}
            label="Dashboard"
          />
          <NavLink
            active={page.id === "library"}
            onClick={() => onNavigate({ id: "library" })}
            icon={<BookOpen className="size-4" />}
            label="My Quizzes"
          />
          {page.id === "quiz" && quizTitle && (
            <>
              <span className="px-1" style={{ color: "var(--text-tertiary)" }}>
                <ChevronRight className="size-3.5" />
              </span>
              <span
                className="max-w-[160px] truncate py-4 text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {quizTitle}
              </span>
            </>
          )}
          {page.id === "add" && (
            <>
              <span className="px-1" style={{ color: "var(--text-tertiary)" }}>
                <ChevronRight className="size-3.5" />
              </span>
              <span className="py-4 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Add Quiz
              </span>
            </>
          )}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <UserMenu />
          {/* Add Quiz button */}
          <button
            onClick={() => onNavigate({ id: "add" })}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-90"
            style={{
              background: page.id === "add" ? "var(--accent-primary)" : "rgba(0,229,160,0.12)",
              color: page.id === "add" ? "#07090e" : "var(--accent-primary)",
              border: "1px solid rgba(0,229,160,0.25)",
            }}
          >
            <Plus className="size-4" />
            Add Quiz
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-1.5 px-3 py-4 text-sm font-medium transition-colors"
      style={{ color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}
    >
      {icon}
      {label}
      {active && (
        <motion.div
          layoutId="nav-underline"
          className="absolute inset-x-3 bottom-0 h-0.5 rounded-full"
          style={{ background: "var(--accent-primary)" }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
    </button>
  );
}

// ─── Add Quiz Page ────────────────────────────────────────────
function AddQuizPage({
  onSaved,
  onCancel,
  onAdd,
}: {
  onSaved: (quizId: string) => void;
  onCancel: () => void;
  onAdd: (parsed: QstParseResult, fileName: string, source: string) => string;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [pending, setPending] = useState<{ parsed: QstParseResult; fileName: string; source: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function processFile(file: File) {
    const validExt = /\.(txt|qst)$/i.test(file.name) || file.type === "text/plain";
    if (!validExt) { toast.error("Please upload a .qst or .txt file"); return; }
    if (file.size > 10_000_000) { toast.error("File too large — max 10 MB"); return; }
    setIsLoading(true);
    try {
      const source = await file.text();
      const parsed = parseQst(source);
      setPending({ parsed, fileName: file.name, source });
    } catch {
      toast.error("Could not read file");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSave() {
    if (!pending) return;
    const id = onAdd(pending.parsed, pending.fileName, pending.source);
    toast.success(`"${pending.parsed.data.metadata.title ?? pending.fileName}" saved to library`);
    onSaved(id);
  }

  const q = pending?.parsed.data.questions.length ?? 0;
  const issueCount = (pending?.parsed.issues ?? []).filter(i => i.severity === "error").length;

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
          Add Quiz
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Upload a .qst or .txt file to save it to your library
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!pending ? (
          <motion.label
            key="dropzone"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-3xl px-8 py-16 text-center transition-all"
            style={{
              background: isDragging ? "rgba(0,229,160,0.06)" : "rgba(255,255,255,0.025)",
              border: isDragging ? "2px dashed rgba(0,229,160,0.5)" : "2px dashed rgba(255,255,255,0.12)",
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
          >
            <input type="file" accept=".txt,.qst,text/plain" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) processFile(f); }} className="sr-only" />
            <div
              className="mb-5 grid size-16 place-items-center rounded-2xl"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {isLoading ? (
                <div className="size-6 animate-spin rounded-full border-2" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
              ) : (
                <Upload className="size-7" style={{ color: isDragging ? "var(--accent-primary)" : "var(--text-secondary)" }} />
              )}
            </div>
            <p className="mb-1 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              {isDragging ? "Drop file here" : "Drop your quiz file here"}
            </p>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>.qst or .txt · up to 10 MB</p>
            <div className="mt-6 rounded-xl px-5 py-2.5 text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--text-primary)" }}>
              Browse files
            </div>
          </motion.label>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-4"
          >
            {/* File preview */}
            <div
              className="relative overflow-hidden rounded-2xl p-5"
              style={{ background: "rgba(0,229,160,0.05)", border: "1px solid rgba(0,229,160,0.2)" }}
            >
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl"
                  style={{ background: "rgba(0,229,160,0.12)", border: "1px solid rgba(0,229,160,0.25)" }}>
                  <FileText className="size-5" style={{ color: "var(--accent-primary)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    {pending.parsed.data.metadata.title ?? pending.fileName.replace(/\.[^.]+$/, "")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{pending.fileName}</p>
                </div>
                <button onClick={() => setPending(null)} style={{ color: "var(--text-tertiary)" }}>
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                  style={{ background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.15)" }}>
                  <CheckCircle className="size-3.5" style={{ color: "var(--accent-primary)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--accent-primary)" }}>
                    {q} question{q !== 1 ? "s" : ""}
                  </span>
                </div>
                {pending.parsed.data.metadata.category && (
                  <div className="rounded-xl px-3 py-1.5"
                    style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    <span className="text-sm" style={{ color: "#3b82f6" }}>{pending.parsed.data.metadata.category}</span>
                  </div>
                )}
                {issueCount > 0 && (
                  <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5"
                    style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <AlertCircle className="size-3.5" style={{ color: "#f59e0b" }} />
                    <span className="text-sm" style={{ color: "#f59e0b" }}>{issueCount} question{issueCount !== 1 ? "s" : ""} skipped</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={q === 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold disabled:opacity-40"
              style={{ background: "var(--accent-primary)", color: "#07090e", boxShadow: "0 0 24px rgba(0,229,160,0.2)" }}
            >
              Save to My Quizzes
            </button>

            <button
              onClick={onCancel}
              className="w-full rounded-2xl py-3 text-sm font-medium"
              style={{ color: "var(--text-secondary)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────
export function AppShell({ initialQst: _ }: { initialQst: string }) {
  const [page, setPage] = useState<Page>({ id: "dashboard" });
  const { library, ready, stats, addQuiz, recordAttempt, deleteQuiz, deleteAttempt, getQuiz } = useQuizLibrary();

  function navigate(p: Page) {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Get quiz title for breadcrumb
  const activeQuiz = page.id === "quiz" ? library.find((q) => q.id === page.quizId) : undefined;

  function handleAddQuiz(parsed: QstParseResult, fileName: string, source: string): string {
    const quiz = addQuiz(parsed, fileName, source);
    return quiz.id;
  }

  return (
    <div className="relative min-h-screen" style={{ background: "#07090e" }}>
      <AmbientBackground />

      {/* Subtle grid */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          zIndex: 1,
        }}
        aria-hidden
      />

      {/* Header */}
      <div className="relative z-40">
        <Header page={page} onNavigate={navigate} quizTitle={activeQuiz?.title} />
      </div>

      {/* Page content */}
      <main className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-6">
        {!ready ? (
          <div className="flex items-center justify-center py-32">
            <div className="size-8 animate-spin rounded-full border-2"
              style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {page.id === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <DashboardPage
                  library={library}
                  stats={stats}
                  onPlay={(id) => navigate({ id: "quiz", quizId: id })}
                  onViewAll={() => navigate({ id: "library" })}
                />
              </motion.div>
            )}

            {page.id === "library" && (
              <motion.div key="library" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <LibraryPage
                  library={library}
                  onPlay={(id, options) => navigate({ id: "quiz", quizId: id, initialMode: options?.mode })}
                  onDelete={deleteQuiz}
                  onDeleteAttempt={deleteAttempt}
                  onAddQuiz={() => navigate({ id: "add" })}
                />
              </motion.div>
            )}

            {page.id === "add" && (
              <motion.div key="add" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                <AddQuizPage
                  onAdd={handleAddQuiz}
                  onSaved={(id) => navigate({ id: "quiz", quizId: id })}
                  onCancel={() => navigate({ id: "library" })}
                />
              </motion.div>
            )}

            {page.id === "quiz" && (() => {
              const data = getQuiz(page.quizId);
              if (!data) return (
                <motion.div key="quiz-notfound" className="py-20 text-center">
                  <p style={{ color: "var(--text-secondary)" }}>Quiz not found.</p>
                  <button onClick={() => navigate({ id: "library" })} className="mt-4 text-sm" style={{ color: "var(--accent-primary)" }}>
                    Back to My Quizzes
                  </button>
                </motion.div>
              );
              return (
                <motion.div key={`quiz-${page.quizId}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
                  <QuizPlayPage
                    quiz={library.find((q) => q.id === page.quizId)!}
                    initialMode={page.initialMode}
                    onRecordAttempt={recordAttempt}
                    onBack={() => navigate({ id: "library" })}
                  />
                </motion.div>
              );
            })()}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

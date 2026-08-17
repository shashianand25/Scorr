"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/components/ui/ToastPill";
import { useTranslation } from "@/lib/i18n";
import { fetchQuizzes, deleteQuiz } from "@/lib/api";
import { getLocalItem, setLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import { deduplicateUserQuizzes, QuizRecord } from "@/lib/quizDeduplication";
import { isCardDue } from "@/lib/sm2";

function getTimeGroup(timestamp: number | string | undefined): "This week" | "Last week" | "Older" {
  if (!timestamp) return "Older";
  const t = typeof timestamp === "number" ? timestamp : new Date(timestamp).getTime();
  if (isNaN(t)) return "Older";

  const diffMs = Date.now() - t;
  const days = diffMs / (1000 * 60 * 60 * 24);

  if (days <= 7) return "This week";
  if (days <= 14) return "Last week";
  return "Older";
}

export default function LibraryPage() {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [quizzes, setQuizzes] = useState<QuizRecord[]>(() =>
    getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ])
  );
  const [activeTab, setActiveTab] = useState<"quizzes" | "flashcards">("quizzes");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeMenuQuiz, setActiveMenuQuiz] = useState<QuizRecord | null>(null);

  // Load and deduplicate library in background
  useEffect(() => {
    async function loadLibrary() {
      const local = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
      let allQuizzes = [...local];

      if (user?.uid) {
        try {
          const { quizzes: cloudQuizzes } = await fetchQuizzes(user.uid);
          const mergedMap = new Map<string, QuizRecord>();
          for (const l of local) mergedMap.set(l.id, l);
          for (const cq of cloudQuizzes || []) {
            const existing = mergedMap.get(cq.id) || mergedMap.get((cq as any).neonId);
            if (existing) {
              mergedMap.set(cq.id, {
                ...existing,
                ...cq,
                questionsList: cq.questionsList?.length ? cq.questionsList : existing.questionsList,
                flashcards: cq.flashcards?.length ? cq.flashcards : existing.flashcards,
                sourceText: cq.sourceText || existing.sourceText,
              } as any);
            } else {
              mergedMap.set(cq.id, cq as any);
            }
          }
          allQuizzes = Array.from(mergedMap.values());
        } catch (e) {
          console.warn("[Library] Cloud fetch warning:", e);
        }
      }

      setQuizzes(allQuizzes);
      setLocalItem("quizzes", allQuizzes);
    }

    loadLibrary();
  }, [user?.uid]);

  // ── Share Quiz ─────────────────────────────────────────────────────────
  const handleShareQuiz = (quiz: QuizRecord) => {
    const shareUrl = `https://scorrapp.com/share/quiz/${quiz.neonId || quiz.id}`;
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(shareUrl);
      showToast("Link copied to clipboard!", { icon: "🔗", color: "#38bdf8" });
    }
    setActiveMenuQuiz(null);
  };

  // ── Delete Quiz ────────────────────────────────────────────────────────
  const handleDeleteQuiz = async (quiz: QuizRecord) => {
    const updated = quizzes.filter((q) => q.id !== quiz.id && q.neonId !== quiz.id);
    setQuizzes(updated);
    setLocalItem("quizzes", updated);
    setActiveMenuQuiz(null);

    if (user?.uid && (quiz.neonId || !quiz.id.startsWith("ai_"))) {
      await deleteQuiz(user.uid, quiz.neonId || quiz.id).catch(() => {});
    }

    showToast("Quiz removed from library", { icon: "🗑️" });
  };

  const filteredItems = useMemo(() => {
    return quizzes.filter((q) => {
      const matchesSearch =
        (q.title || "").toLowerCase().includes(search.toLowerCase()) ||
        (q.category || "").toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (activeTab === "flashcards") {
        return Array.isArray(q.flashcards) && q.flashcards.length > 0;
      }
      return true;
    });
  }, [quizzes, search, activeTab]);

  // Group into chronological sections
  const groupedSections = useMemo(() => {
    const groups: { [key in "This week" | "Last week" | "Older"]?: QuizRecord[] } = {
      "This week": [],
      "Last week": [],
      "Older": [],
    };

    for (const item of filteredItems) {
      const groupKey = getTimeGroup(item.createdAt || item.updatedAt);
      groups[groupKey]?.push(item);
    }

    return Object.entries(groups).filter(([, items]) => items && items.length > 0) as Array<
      ["This week" | "Last week" | "Older", QuizRecord[]]
    >;
  }, [filteredItems]);

  return (
    <div style={{ padding: "36px 24px 80px", maxWidth: 960, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.6px", margin: "0 0 6px 0" }}>
            📚 {t("tabs.library") || "Library"}
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>
            All your AI-generated quizzes, sets, and flashcards in one place
          </p>
        </div>

        <Link
          href="/quiz/create"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none",
            borderRadius: 14,
            padding: "12px 22px",
            color: "#ffffff",
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>+</span>
          <span>Create New</span>
        </Link>
      </div>

      {/* Tabs & Search Row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <input
            type="text"
            placeholder={t("home.search_library_placeholder") || "Search your quizzes & decks..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              background: "#0d111d",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 14,
              padding: "12px 18px",
              color: "#ffffff",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Tab Pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "#0d111d",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 14,
            padding: 4,
          }}
        >
          <button
            onClick={() => setActiveTab("quizzes")}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              background: activeTab === "quizzes" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: activeTab === "quizzes" ? "#ffffff" : "#9ca3af",
              fontWeight: activeTab === "quizzes" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Quizzes ({quizzes.length})
          </button>
          <button
            onClick={() => setActiveTab("flashcards")}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: "none",
              background: activeTab === "flashcards" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: activeTab === "flashcards" ? "#ffffff" : "#9ca3af",
              fontWeight: activeTab === "flashcards" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Flashcards ({quizzes.filter((q) => Array.isArray(q.flashcards) && q.flashcards.length > 0).length})
          </button>
        </div>
      </div>

      {loading && filteredItems.length === 0 ? (
        <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="animate-spin" style={{ width: 36, height: 36, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%" }} />
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            background: "#0d111d",
            border: "1px dashed rgba(255, 255, 255, 0.1)",
            borderRadius: 24,
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>📚</div>
          <h3 style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, margin: "0 0 8px 0" }}>
            {search ? "No matches found" : "Your library is empty"}
          </h3>
          <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 24px 0" }}>
            {search ? "Try adjusting your search query." : "Generate your first quiz from notes or documents."}
          </p>
          <Link
            href="/quiz/create"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              borderRadius: 14,
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            + Generate Quiz
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {groupedSections.map(([sectionTitle, sectionItems]) => (
            <div key={sectionTitle}>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  margin: "0 0 14px 4px",
                }}
              >
                {sectionTitle}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sectionItems.map((q) => {
                  const qCount = q.questionsList?.length || q.questions || 0;
                  const fCount = q.flashcards?.length || 0;
                  const dueCount = (q.flashcards || []).filter((c: any) => isCardDue(c)).length;

                  return (
                    <div
                      key={q.id}
                      style={{
                        background: "#0d111d",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 18,
                        padding: "18px 22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                        e.currentTarget.style.background = "#111728";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                        e.currentTarget.style.background = "#0d111d";
                      }}
                    >
                      <Link
                        href={activeTab === "flashcards" ? `/flashcards/${q.id}` : `/quiz/${q.id}`}
                        style={{ flex: 1, minWidth: 0, textDecoration: "none" }}
                      >
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#ffffff",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginBottom: 6,
                          }}
                        >
                          {q.title}
                        </div>

                        {/* Metadata row: single line ellipsis */}
                        <div
                          style={{
                            fontSize: 13,
                            color: "#9ca3af",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span>{qCount} questions</span>
                          <span>•</span>
                          <span>{fCount} Flashcards</span>
                          {dueCount > 0 && (
                            <>
                              <span>•</span>
                              <span style={{ color: "#fbbf24", fontWeight: 600 }}>{dueCount} Due</span>
                            </>
                          )}
                        </div>
                      </Link>

                      {/* Settings / Options Button */}
                      <button
                        onClick={() => setActiveMenuQuiz(q)}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: "rgba(255, 255, 255, 0.04)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          color: "#9ca3af",
                          fontSize: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        ⚙️
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Actions Modal */}
      {activeMenuQuiz && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setActiveMenuQuiz(null)}
        >
          <div
            style={{
              background: "#0f1423",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 24,
              padding: "28px",
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: "0 0 6px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeMenuQuiz.title}
            </h3>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 20px 0" }}>
              Choose an action for this quiz
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link
                href={`/quiz/${activeMenuQuiz.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  background: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  borderRadius: 14,
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                <span>🚀</span>
                <span>Practice Quiz</span>
              </Link>

              {activeMenuQuiz.flashcards && activeMenuQuiz.flashcards.length > 0 && (
                <Link
                  href={`/flashcards/${activeMenuQuiz.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 14,
                    color: "#ffffff",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  <span>🃏</span>
                  <span>Study Flashcards</span>
                </Link>
              )}

              <button
                onClick={() => handleShareQuiz(activeMenuQuiz)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>🔗</span>
                <span>Copy Share Link</span>
              </button>

              <button
                onClick={() => handleDeleteQuiz(activeMenuQuiz)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: 14,
                  color: "#f87171",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  textAlign: "left",
                  marginTop: 6,
                }}
              >
                <span>🗑️</span>
                <span>Delete from Library</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

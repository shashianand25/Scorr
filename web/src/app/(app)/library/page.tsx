"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { fetchQuizzes, deleteQuiz } from "@/lib/api";
import type { Quiz } from "@/lib/api";

const spin = `@keyframes spin { to { transform: rotate(360deg); } }`;
const fadeIn = `@keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`;

function Spinner() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <style>{spin}</style>
      <div style={{ width: 44, height: 44, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ color: "#9ca3af", fontSize: 14 }}>Loading library…</span>
    </div>
  );
}

function ProgressBar({ pct, color = "#6366f1" }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 5, background: "#1f2937", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
    </div>
  );
}

export default function LibraryPage() {
  const { user } = useAuthStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "inprogress" | "completed">("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Quiz | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    fetchQuizzes(user.uid).then(({ quizzes: q }) => {
      setQuizzes(q ?? []);
      setLoading(false);
    });
  }, [user?.uid]);

  const quizStatus = (q: Quiz) => {
    if (!q.attempts?.length) return "notstarted";
    const lastScore = q.attempts[q.attempts.length - 1].score;
    if (lastScore >= 80) return "completed";
    return "inprogress";
  };

  const filtered = useMemo(() => {
    let list = quizzes;
    if (search.trim()) list = list.filter(q => q.title.toLowerCase().includes(search.toLowerCase()));
    if (filter === "inprogress") list = list.filter(q => quizStatus(q) === "inprogress");
    if (filter === "completed") list = list.filter(q => quizStatus(q) === "completed");
    return list;
  }, [quizzes, search, filter]);

  const handleDelete = async (quiz: Quiz) => {
    if (!user?.uid) return;
    setDeleting(quiz.id);
    await deleteQuiz(user.uid, quiz.id);
    setQuizzes(prev => prev.filter(q => q.id !== quiz.id));
    setDeleting(null);
    setConfirmDelete(null);
  };

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <style>{spin}{fadeIn}</style>

      <div style={{ marginBottom: 32, animation: "fadeIn 0.4s ease" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px" }}>My Library</h1>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>All your quizzes in one place</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#4b5563", fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search quizzes…"
            style={{ width: "100%", padding: "11px 14px 11px 42px", background: "#0f1420", border: "1px solid #1f2937", borderRadius: 12, color: "#e5e7eb", fontSize: 14, outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: "#0f1420", border: "1px solid #1f2937", borderRadius: 12, padding: 4 }}>
          {(["all", "inprogress", "completed"] as const).map(tab => (
            <button key={tab} onClick={() => setFilter(tab)} style={{ padding: "7px 16px", borderRadius: 9, border: "none", cursor: "pointer", background: filter === tab ? "#6366f1" : "transparent", color: filter === tab ? "#fff" : "#9ca3af", fontSize: 13, fontWeight: 600, transition: "all 0.15s", fontFamily: "'Inter', sans-serif" }}>
              {tab === "all" ? "All" : tab === "inprogress" ? "In Progress" : "Completed"}
            </button>
          ))}
        </div>
        <Link href="/quiz/create" style={{ padding: "10px 20px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 12, color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>+ New Quiz</Link>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ animation: "fadeIn 0.5s ease" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <p style={{ color: "#9ca3af", fontSize: 15 }}>
                {search ? `No quizzes matching "${search}"` : "No quizzes in this category yet."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {filtered.map(q => {
                const total = q.questionsList?.length || 0;
                const correct = q.uniqueCorrectIds?.length || 0;
                const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                const attempts = q.attempts?.length || 0;
                const bestScore = attempts > 0 ? Math.max(...q.attempts.map(a => a.score)) : 0;
                const status = quizStatus(q);
                const statusColor = status === "completed" ? "#10b981" : status === "inprogress" ? "#f59e0b" : "#6b7280";
                const statusLabel = status === "completed" ? "Completed" : status === "inprogress" ? "In Progress" : "Not Started";

                return (
                  <div key={q.id} style={{ background: "#0f1420", border: "1px solid #1f2937", borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 12, transition: "border-color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "#374151")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f2937")}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e5e7eb", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{q.title}</h3>
                        {q.category && (
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, background: "#6366f115", color: "#a5b4fc", fontSize: 11, fontWeight: 600 }}>{q.category}</span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, background: `${statusColor}20`, color: statusColor, flexShrink: 0 }}>{statusLabel}</span>
                    </div>

                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{total}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Questions</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{attempts}</div>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>Attempts</div>
                      </div>
                      {attempts > 0 && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: bestScore >= 80 ? "#10b981" : bestScore >= 50 ? "#f59e0b" : "#e5e7eb" }}>{bestScore}%</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>Best</div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>Mastery</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: pct >= 80 ? "#10b981" : "#9ca3af" }}>{pct}%</span>
                      </div>
                      <ProgressBar pct={pct} color={pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#6366f1"} />
                    </div>

                    {q.flashcards?.length > 0 && (
                      <div style={{ fontSize: 12, color: "#6b7280" }}>🃏 {q.flashcards.length} flashcards</div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <Link href={`/quiz/${q.id}`} style={{ flex: 1, padding: "8px", borderRadius: 10, textAlign: "center", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>▶ Play</Link>
                      {q.flashcards?.length > 0 && (
                        <Link href={`/flashcards/${q.id}`} style={{ flex: 1, padding: "8px", borderRadius: 10, textAlign: "center", background: "#1f2937", color: "#a5b4fc", fontWeight: 600, fontSize: 13, textDecoration: "none" }}>🃏 Cards</Link>
                      )}
                      <button
                        onClick={() => setConfirmDelete(q)}
                        style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #374151", background: "transparent", color: "#6b7280", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, transition: "all 0.15s" }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "#7f1d1d30"; el.style.color = "#f87171"; el.style.borderColor = "#7f1d1d"; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = "transparent"; el.style.color = "#6b7280"; el.style.borderColor = "#374151"; }}
                      >🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, backdropFilter: "blur(4px)" }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 20, padding: 36, maxWidth: 400, width: "90%", textAlign: "center" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>Delete Quiz?</h3>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 24px" }}>"{confirmDelete.title}" will be permanently deleted. This cannot be undone.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #374151", background: "transparent", color: "#9ca3af", cursor: "pointer", fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting === confirmDelete.id} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: "'Inter', sans-serif", opacity: deleting === confirmDelete.id ? 0.6 : 1 }}>
                {deleting === confirmDelete.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

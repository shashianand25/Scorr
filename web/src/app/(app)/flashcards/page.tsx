"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { fetchQuizzes } from "@/lib/api";
import type { Quiz } from "@/lib/api";

const spin = `@keyframes spin { to { transform: rotate(360deg); } }`;
const fadeIn = `@keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`;

function Spinner() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <style>{spin}</style>
      <div style={{ width: 44, height: 44, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ color: "#9ca3af", fontSize: 14 }}>Loading flashcards…</span>
    </div>
  );
}

export default function FlashcardsIndexPage() {
  const { user } = useAuthStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    fetchQuizzes(user.uid).then(({ quizzes: q }) => {
      setQuizzes((q ?? []).filter(quiz => quiz.flashcards?.length > 0));
      setLoading(false);
    });
  }, [user?.uid]);

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <style>{spin}{fadeIn}</style>

      <div style={{ marginBottom: 36, animation: "fadeIn 0.4s ease" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px" }}>🃏 Flashcards</h1>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Flip through cards to reinforce your knowledge</p>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ animation: "fadeIn 0.5s ease" }}>
          {quizzes.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", background: "#0f1420", border: "1px dashed #1f2937", borderRadius: 20 }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🃏</div>
              <h3 style={{ color: "#e5e7eb", fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>No flashcard decks yet</h3>
              <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 24px" }}>Create a quiz with flashcards enabled to start studying.</p>
              <Link href="/quiz/create" style={{ display: "inline-block", padding: "12px 28px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 12, color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
                Create Quiz with Flashcards
              </Link>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {quizzes.map((q, i) => (
                <Link key={q.id} href={`/flashcards/${q.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#0f1420", border: "1px solid #1f2937", borderRadius: 20, padding: 24, cursor: "pointer", transition: "all 0.25s", position: "relative", overflow: "hidden", animation: `fadeIn 0.5s ease ${i * 60}ms both` }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#6366f1"; el.style.transform = "translateY(-4px)"; el.style.boxShadow = "0 12px 36px rgba(99,102,241,0.2)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#1f2937"; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}
                  >
                    {/* Stacked cards decoration */}
                    <div style={{ position: "absolute", top: -10, right: -10, width: 70, height: 45, background: "#1f2937", borderRadius: 10, transform: "rotate(8deg)" }} />
                    <div style={{ position: "absolute", top: -5, right: -5, width: 70, height: 45, background: "#374151", borderRadius: 10, transform: "rotate(4deg)" }} />

                    <div style={{ position: "relative", zIndex: 1 }}>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: "linear-gradient(135deg,#6366f125,#8b5cf620)", border: "1px solid #6366f130", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 16 }}>🃏</div>

                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e5e7eb", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>{q.title}</h3>

                      {q.category && (
                        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 99, background: "#6366f115", color: "#a5b4fc", fontSize: 11, fontWeight: 600, marginBottom: 14 }}>{q.category}</span>
                      )}

                      <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{q.flashcards.length}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>Cards</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{q.questionsList?.length || 0}</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>Questions</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 18, padding: "10px 14px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 12, textAlign: "center", color: "#fff", fontWeight: 600, fontSize: 13 }}>
                        Study Now →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

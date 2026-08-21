"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { fetchQuizzes } from "@/lib/api";
import { getLocalItem, setLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import { isCardDue } from "@/lib/sm2";
import { useTranslation } from "@/lib/i18n";
import type { QuizRecord } from "@/lib/quizDeduplication";

export default function FlashcardsIndexPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const local = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
    const withCards = local.filter((q) => Array.isArray(q.flashcards) && q.flashcards.length > 0);

    if (user?.uid) {
      fetchQuizzes(user.uid).then(({ quizzes: cloudQuizzes }) => {
        const combined = [...withCards];
        for (const cq of cloudQuizzes || []) {
          if (cq.flashcards && cq.flashcards.length > 0 && !combined.some((l) => l.id === cq.id)) {
            combined.push(cq as any);
          }
        }
        setQuizzes(combined);
        setLoading(false);
      });
    } else {
      setQuizzes(withCards);
      setLoading(false);
    }
  }, [user?.uid]);

  const filteredQuizzes = quizzes.filter((q) =>
    (q.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (q.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "36px 24px 80px", maxWidth: 1100, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.6px", margin: "0 0 6px 0" }}>
            🃏 {t("flashcards.title") || "Flashcards"}
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>
            Master terms and definitions with SuperMemo-2 spaced repetition
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
          <span>✨</span>
          <span>Generate Deck</span>
        </Link>
      </div>

      {/* Search Filter */}
      {quizzes.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <input
            type="text"
            placeholder="Search flashcard decks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 400,
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
      )}

      {loading ? (
        <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 24px",
            background: "#0d111d",
            border: "1px dashed rgba(255, 255, 255, 0.1)",
            borderRadius: 24,
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>🃏</div>
          <h3 style={{ color: "#ffffff", fontSize: 18, fontWeight: 700, margin: "0 0 8px 0" }}>
            No flashcard decks found
          </h3>
          <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 24px 0" }}>
            Generate a quiz with flashcards enabled to start your spaced repetition review.
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
            Create Flashcards
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {filteredQuizzes.map((q) => {
            const dueCount = (q.flashcards || []).filter((c: any) => isCardDue(c)).length;

            return (
              <Link key={q.id} href={`/flashcards/${q.id}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: "#0d111d",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 20,
                    padding: "24px",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "180px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 16px 40px rgba(0, 0, 0, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span
                        style={{
                          background: "rgba(99, 102, 241, 0.15)",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                          borderRadius: 99,
                          padding: "2px 10px",
                          color: "#a5b4fc",
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {q.category || "General"}
                      </span>

                      {dueCount > 0 ? (
                        <span
                          style={{
                            background: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            borderRadius: 99,
                            padding: "2px 10px",
                            color: "#fbbf24",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          ⚡ {dueCount} due
                        </span>
                      ) : (
                        <span style={{ color: "#34d399", fontSize: 11, fontWeight: 700 }}>
                          ✓ Caught up
                        </span>
                      )}
                    </div>

                    <h3
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: "#ffffff",
                        margin: "0 0 8px 0",
                        lineHeight: 1.4,
                      }}
                    >
                      {q.title}
                    </h3>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, paddingTop: 14, borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <span style={{ fontSize: 13, color: "#9ca3af" }}>
                      🃏 {q.flashcards?.length || 0} cards
                    </span>

                    <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>
                      Study Now →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

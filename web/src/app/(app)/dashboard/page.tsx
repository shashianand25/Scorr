"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { fetchQuizzes } from "@/lib/api";
import { getLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import { isCardDue } from "@/lib/sm2";
import { useTranslation } from "@/lib/i18n";
import type { QuizRecord } from "@/lib/quizDeduplication";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const local = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);

    if (user?.uid) {
      fetchQuizzes(user.uid).then(({ quizzes: cloudQuizzes }) => {
        const combined = [...local];
        for (const cq of cloudQuizzes || []) {
          if (!combined.some((l) => l.id === cq.id || l.neonId === cq.id)) {
            combined.push(cq as any);
          }
        }
        setQuizzes(combined);
        setLoading(false);
      });
    } else {
      setQuizzes(local);
      setLoading(false);
    }
  }, [user?.uid]);

  const firstName = user?.displayName?.split(" ")[0] || (user?.email ? user.email.split("@")[0] : "Learner");
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Recent quiz for "Continue Learning"
  const continueQuiz = quizzes[0] || SAMPLE_QUIZ;
  const continueTotalQ = continueQuiz?.questionsList?.length || continueQuiz?.questions || 0;
  const continueAttempts = continueQuiz?.attempts || [];
  const latestScore = continueAttempts.length > 0 ? continueAttempts[0].score : null;
  const totalCardsDue = quizzes.flatMap((q) => q.flashcards || []).filter((c) => isCardDue(c)).length;

  return (
    <div style={{ padding: "36px 24px 80px", maxWidth: 1040, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      {/* Welcome Header */}
      <header style={{ marginBottom: 36, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
            }}
          >
            👋
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.6px", margin: 0 }}>
              {greeting}, {firstName}!
            </h1>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "4px 0 0" }}>
              {t("home.subtitle") || "Ready to test your knowledge today?"}
            </p>
          </div>
        </div>

        <Link
          href="/quiz/create"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none",
            borderRadius: 14,
            padding: "12px 24px",
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
          <span>Generate Quiz</span>
        </Link>
      </header>

      {/* ── CONTINUE LEARNING HERO CARD ── */}
      {continueQuiz && (
        <div
          style={{
            background: "linear-gradient(135deg, #111827 0%, #161c30 100%)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            borderRadius: 24,
            padding: "28px 32px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
            marginBottom: 32,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ⚡ Continue Learning
            </span>
            {latestScore !== null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>
                Last Score: {latestScore}%
              </span>
            )}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", margin: "0 0 10px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {continueQuiz.title}
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#9ca3af", fontSize: 13, marginBottom: 20 }}>
            <span>❓ {continueTotalQ} Questions</span>
            <span>🃏 {continueQuiz.flashcards?.length || 0} Flashcards</span>
            <span>📈 {continueAttempts.length} Attempts</span>
          </div>

          {/* Slim progress bar (6px) */}
          <div style={{ height: 6, background: "rgba(255, 255, 255, 0.08)", borderRadius: 99, overflow: "hidden", marginBottom: 24 }}>
            <div
              style={{
                height: "100%",
                width: `${latestScore !== null ? latestScore : 20}%`,
                background: "linear-gradient(90deg, #6366f1, #34d399)",
                borderRadius: 99,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href={`/quiz/${continueQuiz.id}`}
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                border: "none",
                borderRadius: 12,
                padding: "12px 24px",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>🚀</span>
              <span>Start Quiz</span>
            </Link>

            {continueQuiz.flashcards && continueQuiz.flashcards.length > 0 && (
              <Link
                href={`/flashcards/${continueQuiz.id}`}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  padding: "12px 20px",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>🃏</span>
                <span>Review Flashcards</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── ACTION BANNERS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 36 }}>
        {/* Multiplayer Battle Arena Banner */}
        <Link href="/battle" style={{ textDecoration: "none" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #181124 0%, #0d111d 100%)",
              border: "1px solid rgba(244, 63, 94, 0.25)",
              borderRadius: 20,
              padding: "24px",
              height: "100%",
              boxSizing: "border-box",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#f43f5e";
              e.currentTarget.style.transform = "translateY(-3px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(244, 63, 94, 0.25)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(244, 63, 94, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                ⚔️
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Battle Arena
              </h3>
            </div>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 16px 0", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Challenge friends to real-time 1v1 quiz battles.
            </p>
            <span style={{ color: "#f43f5e", fontSize: 13, fontWeight: 700 }}>
              Enter Arena →
            </span>
          </div>
        </Link>

        {/* Spaced Repetition Flashcards Banner */}
        <Link href="/flashcards" style={{ textDecoration: "none" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #0d1824 0%, #0d111d 100%)",
              border: "1px solid rgba(52, 211, 153, 0.25)",
              borderRadius: 20,
              padding: "24px",
              height: "100%",
              boxSizing: "border-box",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#34d399";
              e.currentTarget.style.transform = "translateY(-3px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.25)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(52, 211, 153, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                🃏
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Spaced Repetition
              </h3>
            </div>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 16px 0", lineHeight: 1.4 }}>
              {totalCardsDue > 0 ? `⚡ ${totalCardsDue} cards due for review today.` : "All cards caught up for today."}
            </p>
            <span style={{ color: "#34d399", fontSize: 13, fontWeight: 700 }}>
              Review Cards →
            </span>
          </div>
        </Link>
      </div>

      {/* ── RECENT QUIZZES SECTION ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#ffffff", margin: 0 }}>
            Recent Study Sets
          </h3>
          <Link href="/library" style={{ color: "#6366f1", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            View All ({quizzes.length}) →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {quizzes.slice(0, 4).map((q) => (
            <Link key={q.id} href={`/quiz/${q.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#0d111d",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 18,
                  padding: "20px",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ color: "#a5b4fc", fontSize: 11, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                  {q.category || "General"}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", margin: "0 0 10px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.title}
                </h4>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>
                  {q.questionsList?.length || q.questions || 0} questions • {q.flashcards?.length || 0} flashcards
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { fetchQuizzes } from "@/lib/api";
import { getLocalItem, setLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import { isCardDue } from "@/lib/sm2";
import { useTranslation } from "@/lib/i18n";
import type { QuizRecord } from "@/lib/quizDeduplication";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [quizzes, setQuizzes] = useState<QuizRecord[]>(() =>
    getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ])
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const local = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);

    if (user?.uid) {
      fetchQuizzes(user.uid).then(({ quizzes: cloudQuizzes }) => {
        const mergedMap = new Map<string, QuizRecord>();
        for (const l of local) {
          mergedMap.set(l.id, l);
        }
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
        const combined = Array.from(mergedMap.values());
        setQuizzes(combined);
        setLocalItem("quizzes", combined);
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
    <div
      style={{
        padding: "24px 16px 80px",
        maxWidth: 1040,
        margin: "0 auto",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <style>{`
        @media (min-width: 768px) {
          .dash-container { padding: 36px 24px 80px !important; }
        }
      `}</style>

      {/* Welcome Header */}
      <header
        style={{
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
              flexShrink: 0,
            }}
          >
            👋
          </div>
          <div>
            <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.6px", margin: 0 }}>
              {greeting}, {firstName}!
            </h1>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "3px 0 0" }}>
              {t("home.subtitle") || "Ready to test your knowledge today?"}
            </p>
          </div>
        </div>

        <Link
          href="/quiz/create"
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none",
            borderRadius: 12,
            padding: "10px 20px",
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
            borderRadius: 20,
            padding: "22px 20px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
            marginBottom: 24,
            position: "relative",
            overflow: "hidden",
            boxSizing: "border-box",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ⚡ Continue Learning
            </span>
            {latestScore !== null && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>
                Last Score: {latestScore}%
              </span>
            )}
          </div>

          <h2 style={{ fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 800, color: "#ffffff", margin: "0 0 8px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {continueQuiz.title}
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#9ca3af", fontSize: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <span>❓ {continueTotalQ} Questions</span>
            <span>🃏 {continueQuiz.flashcards?.length || 0} Flashcards</span>
            <span>📈 {continueAttempts.length} Attempts</span>
          </div>

          {/* Slim progress bar (6px) */}
          <div style={{ height: 5, background: "rgba(255, 255, 255, 0.08)", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
            <div
              style={{
                height: "100%",
                width: `${latestScore !== null ? latestScore : 20}%`,
                background: "linear-gradient(90deg, #6366f1, #34d399)",
                borderRadius: 99,
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={`/quiz/${continueQuiz.id}`}
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                border: "none",
                borderRadius: 12,
                padding: "11px 20px",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                flex: "1 1 auto",
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
                  padding: "11px 18px",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  flex: "1 1 auto",
                }}
              >
                <span>🃏</span>
                <span>Review Cards</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── ACTION BANNERS ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 28 }}>
        {/* Multiplayer Battle Arena Banner */}
        <Link href="/battle" style={{ textDecoration: "none" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #181124 0%, #0d111d 100%)",
              border: "1px solid rgba(244, 63, 94, 0.25)",
              borderRadius: 18,
              padding: "20px",
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(244, 63, 94, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                ⚔️
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Battle Arena
              </h3>
            </div>
            <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 12px 0", lineHeight: 1.4 }}>
              Challenge friends to real-time 1v1 quiz battles.
            </p>
            <span style={{ color: "#f43f5e", fontSize: 12, fontWeight: 700 }}>
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
              borderRadius: 18,
              padding: "20px",
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(52, 211, 153, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                🃏
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                Spaced Repetition
              </h3>
            </div>
            <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 12px 0", lineHeight: 1.4 }}>
              {totalCardsDue > 0 ? `⚡ ${totalCardsDue} cards due for review today.` : "All cards caught up for today."}
            </p>
            <span style={{ color: "#34d399", fontSize: 12, fontWeight: 700 }}>
              Review Cards →
            </span>
          </div>
        </Link>
      </div>

      {/* ── RECENT QUIZZES SECTION ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", margin: 0 }}>
            Recent Study Sets
          </h3>
          <Link href="/library" style={{ color: "#6366f1", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
            View All ({quizzes.length}) →
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {quizzes.slice(0, 4).map((q) => (
            <Link key={q.id} href={`/quiz/${q.id}`} style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#0d111d",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 16,
                  padding: "16px",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ color: "#a5b4fc", fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
                  {q.category || "General"}
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", margin: "0 0 8px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.title}
                </h4>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>
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

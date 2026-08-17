"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/components/ui/ToastPill";
import { useTranslation } from "@/lib/i18n";
import { fetchQuizzes, Flashcard } from "@/lib/api";
import { getLocalItem, setLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import { calculateSM2, isCardDue, SM2Rating } from "@/lib/sm2";
import type { QuizRecord } from "@/lib/quizDeduplication";

export default function FlashcardsStudyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [quiz, setQuiz] = useState<QuizRecord | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFinished, setShowFinished] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Load cards from LocalStorage or Neon
  useEffect(() => {
    const localQuizzes = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
    const found = localQuizzes.find((q) => q.id === id || q.neonId === id) || (id === "sample_quiz_welcome" ? SAMPLE_QUIZ : null);

    if (found && Array.isArray(found.flashcards) && found.flashcards.length > 0) {
      setQuiz(found);
      setCards(found.flashcards);
      setLoading(false);
    } else if (user?.uid) {
      fetchQuizzes(user.uid).then(({ quizzes }) => {
        const cloudFound = quizzes.find((q) => q.id === id || (q as any).neonId === id) as any;
        if (cloudFound && Array.isArray(cloudFound.flashcards) && cloudFound.flashcards.length > 0) {
          setQuiz(cloudFound);
          setCards(cloudFound.flashcards);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [id, user?.uid]);

  // Keyboard Shortcuts: Space to flip, 1-4 for SM-2 ratings, Left/Right arrows
  useEffect(() => {
    if (showFinished || cards.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === "1") handleRateCard(1);
        if (e.key === "2") handleRateCard(2);
        if (e.key === "3") handleRateCard(3);
        if (e.key === "4") handleRateCard(4);
      } else {
        if (e.key === "ArrowLeft") handlePrev();
        if (e.key === "ArrowRight") handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, showFinished, cards, currentIndex]);

  const handleNext = () => {
    if (currentIndex + 1 < cards.length) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // ── SuperMemo-2 Spaced Repetition Rating Handler ───────────────────────
  const handleRateCard = (rating: SM2Rating) => {
    const currentCard = cards[currentIndex];
    if (!currentCard || !quiz) return;

    const nextSM2 = calculateSM2(rating, {
      sm2_interval: currentCard.sm2_interval,
      sm2_repetition: currentCard.sm2_repetition,
      sm2_easeFactor: currentCard.sm2_easeFactor,
      sm2_nextReviewDate: currentCard.sm2_nextReviewDate,
    });

    const updatedCard: Flashcard = {
      ...currentCard,
      ...nextSM2,
    };

    const updatedCards = [...cards];
    updatedCards[currentIndex] = updatedCard;
    setCards(updatedCards);
    setReviewedCount((prev) => prev + 1);

    // Save state to local quiz
    const updatedQuiz: QuizRecord = {
      ...quiz,
      flashcards: updatedCards,
      updatedAt: Date.now(),
    };
    setQuiz(updatedQuiz);

    const localQuizzes = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
    const updatedLocal = localQuizzes.map((q) => (q.id === quiz.id ? updatedQuiz : q));
    setLocalItem("quizzes", updatedLocal);

    if (currentIndex + 1 < cards.length) {
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowFinished(true);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (!quiz || cards.length === 0) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", color: "#9ca3af" }}>
        <h2>No Flashcards Available</h2>
        <p style={{ fontSize: 14, margin: "8px 0 20px" }}>This deck does not contain flashcards yet.</p>
        <Link href="/library" style={{ color: "#6366f1", fontWeight: 600 }}>
          ← Back to Library
        </Link>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPct = ((currentIndex + 1) / cards.length) * 100;

  return (
    <div style={{ padding: "36px 20px 80px", maxWidth: 720, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .flashcard-wrapper {
          perspective: 1000px;
        }
        .flashcard-inner {
          position: relative;
          width: 100%;
          min-height: 380px;
          text-align: center;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          transform-style: preserve-3d;
          cursor: pointer;
        }
        .flashcard-inner.flipped {
          transform: rotateY(180deg);
        }
        .flashcard-front, .flashcard-back {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          padding: 40px 32px;
          box-sizing: border-box;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
        }
        .flashcard-front {
          background: linear-gradient(135deg, #111827 0%, #161c30 100%);
          border: 1px solid rgba(99, 102, 241, 0.25);
        }
        .flashcard-back {
          background: linear-gradient(135deg, #131b2e 0%, #0d1222 100%);
          border: 1px solid rgba(52, 211, 153, 0.3);
          transform: rotateY(180deg);
        }
      `}</style>

      {/* Header Back */}
      <Link
        href="/library"
        style={{
          color: "#9ca3af",
          textDecoration: "none",
          fontSize: 14,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
        }}
      >
        ← {t("common.back") || "Back"} to Library
      </Link>

      {!showFinished ? (
        <div>
          {/* Deck Header & Progress */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase" }}>
                {quiz.title}
              </span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af" }}>
              {currentIndex + 1} / {cards.length}
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ height: 6, background: "rgba(255, 255, 255, 0.08)", borderRadius: 99, overflow: "hidden", marginBottom: 28 }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #6366f1, #34d399)", transition: "width 0.3s ease" }} />
          </div>

          {/* 3D Flashcard */}
          <div className="flashcard-wrapper" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`flashcard-inner ${isFlipped ? "flipped" : ""}`}>
              {/* FRONT */}
              <div className="flashcard-front">
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                  TERM / QUESTION
                </span>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: "#ffffff", lineHeight: 1.5, margin: 0 }}>
                  {currentCard.front}
                </h3>
                <span style={{ fontSize: 13, color: "#6b7280", marginTop: 24 }}>
                  (Click or press Space to flip ↺)
                </span>
              </div>

              {/* BACK */}
              <div className="flashcard-back">
                <span style={{ fontSize: 12, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
                  DEFINITION / ANSWER
                </span>
                <p style={{ fontSize: 20, fontWeight: 600, color: "#ffffff", lineHeight: 1.6, margin: 0 }}>
                  {currentCard.back}
                </p>
                <span style={{ fontSize: 13, color: "#6b7280", marginTop: 24 }}>
                  (Rate retention below or press 1-4)
                </span>
              </div>
            </div>
          </div>

          {/* Controls / SM2 Ratings */}
          {isFlipped ? (
            <div style={{ marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", textAlign: "center" }}>
                How well did you know this?
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRateCard(1); }}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: 14,
                    padding: "14px 8px",
                    color: "#f87171",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  <div>Again (1)</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>1 day</div>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleRateCard(2); }}
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: 14,
                    padding: "14px 8px",
                    color: "#fbbf24",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  <div>Hard (2)</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>3 days</div>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleRateCard(3); }}
                  style={{
                    background: "rgba(96, 165, 250, 0.15)",
                    border: "1px solid rgba(96, 165, 250, 0.3)",
                    borderRadius: 14,
                    padding: "14px 8px",
                    color: "#60a5fa",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  <div>Good (3)</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>6 days</div>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleRateCard(4); }}
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: 14,
                    padding: "14px 8px",
                    color: "#34d399",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  <div>Easy (4)</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>Auto-grow</div>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  padding: "12px 20px",
                  color: currentIndex === 0 ? "#4b5563" : "#ffffff",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                ← Previous
              </button>

              <button
                onClick={() => setIsFlipped(true)}
                style={{
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 28px",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Flip Card ↺
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === cards.length - 1}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  padding: "12px 20px",
                  color: currentIndex === cards.length - 1 ? "#4b5563" : "#ffffff",
                  cursor: currentIndex === cards.length - 1 ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Completed Screen */
        <div
          style={{
            background: "#0d111d",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 28,
            padding: "48px 32px",
            textAlign: "center",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", margin: "0 0 8px 0" }}>
            Deck Completed!
          </h2>
          <p style={{ color: "#9ca3af", fontSize: 15, margin: "0 0 32px 0" }}>
            You reviewed all {cards.length} flashcards in this session. Spaced repetition schedules have been updated.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsFlipped(false);
                setShowFinished(false);
              }}
              style={{
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                border: "none",
                borderRadius: 14,
                padding: "14px 28px",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🔄 Study Again
            </button>

            <Link
              href="/library"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 14,
                padding: "14px 24px",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              📚 Back to Library
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

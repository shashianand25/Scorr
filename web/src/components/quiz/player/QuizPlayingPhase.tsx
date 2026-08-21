"use client";
import React from "react";

/** QuizPlayingPhase — active quiz question runner. */
export function QuizPlayingPhase({ p }: { p: any }) {
  const {
    currentQ,
    currentIndex = 0,
    activeQuestions = [],
    selectedAnswers,
    isAnswered,
    isCorrect,
    timedMode,
    timeLeft = 30,
    handleAnswerSelect,
    handleSubmit,
    handleNext,
    t = (k: string) => k,
    toggleStarQuestion = () => {},
    starredQuestionIds = new Set(),
    progressPct = 0,
    shakeCard = false,
    selectedAnswerId = null,
    handleAnswer = () => {},
    handleNextQuestion = () => {},
    renderFormattedText = (txt: string) => txt,
  } = p;

  if (!currentQ) return null;

  return (
    <div>
      {/* Top Progress & Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>
          Question {currentIndex + 1} of {activeQuestions.length}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {timedMode && (
            <div
              style={{
                background: timeLeft <= 5 ? "rgba(239, 68, 68, 0.2)" : "rgba(99, 102, 241, 0.15)",
                border: `1px solid ${timeLeft <= 5 ? "#ef4444" : "#6366f1"}40`,
                borderRadius: 99,
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: timeLeft <= 5 ? "#f87171" : "#a5b4fc",
              }}
            >
              ⏱️ {timeLeft}s
            </div>
          )}

          <button
            onClick={() => toggleStarQuestion(currentQ.id)}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            {starredQuestionIds.has(currentQ.id) ? "⭐" : "☆"}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: 5, background: "rgba(255, 255, 255, 0.08)", borderRadius: 99, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #6366f1, #34d399)", transition: "width 0.3s ease" }} />
      </div>

      {/* Question Card */}
      <div
        style={{
          background: "#0d111d",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 20,
          padding: "24px 20px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          animation: shakeCard ? "shake 0.4s ease" : "none",
          marginBottom: 20,
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ fontSize: "clamp(16px, 4.5vw, 20px)", fontWeight: 700, color: "#ffffff", lineHeight: 1.5, margin: "0 0 20px 0" }}>
          {renderFormattedText(currentQ.question || currentQ.prompt || "")}
        </h2>

        {/* Answer Choices */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(currentQ.answers || []).map((ans: any, aIdx: number) => {
            const isSelected = selectedAnswerId === ans.id;
            const isAnsCorrect = ans.isCorrect;
            const letter = ["A", "B", "C", "D", "E"][aIdx] || `${aIdx + 1}`;

            let cardBg = "rgba(255, 255, 255, 0.03)";
            let borderColor = "rgba(255, 255, 255, 0.08)";
            let badgeBg = "rgba(255, 255, 255, 0.08)";
            let badgeColor = "#9ca3af";

            if (isAnswered) {
              if (isAnsCorrect) {
                cardBg = "rgba(16, 185, 129, 0.15)";
                borderColor = "#10b981";
                badgeBg = "#10b981";
                badgeColor = "#ffffff";
              } else if (isSelected && !isAnsCorrect) {
                cardBg = "rgba(239, 68, 68, 0.15)";
                borderColor = "#ef4444";
                badgeBg = "#ef4444";
                badgeColor = "#ffffff";
              }
            }

            return (
              <button
                key={ans.id || aIdx}
                type="button"
                disabled={isAnswered}
                onClick={() => handleAnswer(ans.id || `a_${aIdx}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 18px",
                  borderRadius: 16,
                  background: cardBg,
                  border: `1px solid ${borderColor}`,
                  cursor: isAnswered ? "default" : "pointer",
                  textAlign: "left",
                  color: "#ffffff",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isAnswered) {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.background = "rgba(99, 102, 241, 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAnswered) {
                    e.currentTarget.style.borderColor = borderColor;
                    e.currentTarget.style.background = cardBg;
                  }
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: badgeBg,
                    color: badgeColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {isAnswered && isAnsCorrect ? "✓" : isAnswered && isSelected ? "✕" : letter}
                </div>
                <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4, flex: 1 }}>
                  {ans.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Explanation Section */}
        {isAnswered && currentQ.explanation && (
          <div
            style={{
              marginTop: 24,
              padding: "18px 20px",
              background: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: 16,
            }}
          >
            <div style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              💡 Explanation
            </div>
            <div style={{ color: "#d1d5db", fontSize: 14, lineHeight: 1.5 }}>
              {renderFormattedText(currentQ.explanation)}
            </div>
          </div>
        )}
      </div>

      {/* Next / Submit Button */}
      {isAnswered && (
        <button
          onClick={handleNextQuestion}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none",
            borderRadius: 16,
            padding: "16px 28px",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
          }}
        >
          {currentIndex + 1 < activeQuestions.length ? "Next Question →" : "View Results 🎉"}
        </button>
      )}
    </div>
  );
}

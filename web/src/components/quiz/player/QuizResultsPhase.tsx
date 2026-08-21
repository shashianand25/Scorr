"use client";
import React from "react";

/** QuizResultsPhase — post-quiz results and grade display. */
export function QuizResultsPhase({ p }: { p: any }) {
  const {
    gradeInfo = { color: "#6366f1", letter: "A", label: "Great Job!" },
    correctCount = 0,
    activeQuestions = [],
    wrongList = [],
    elapsedSeconds = 0,
    startQuiz = () => {},
    setPhase = () => {},
    renderFormattedText = (txt: string) => txt,
  } = p;

  const total = activeQuestions.length || 1;
  const pct = Math.round((correctCount / total) * 100);

  return (
    <div style={{ textAlign: "center" }}>
      {/* Circular Score & Grade */}
      <div
        style={{
          background: "#0d111d",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 28,
          padding: "44px 32px",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${gradeInfo.color}25, transparent 70%)`,
            border: `3px solid ${gradeInfo.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 44,
            fontWeight: 900,
            color: gradeInfo.color,
            margin: "0 auto 20px",
            boxShadow: `0 8px 32px ${gradeInfo.color}40`,
          }}
        >
          {gradeInfo.letter}
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0" }}>
          {pct}% Accuracy
        </h2>
        <p style={{ color: "#9ca3af", fontSize: 15, margin: "0 0 28px 0" }}>
          {gradeInfo.label}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 14, padding: "14px 10px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#34d399" }}>{correctCount}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Correct</div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 14, padding: "14px 10px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>{wrongList.length}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Wrong</div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 14, padding: "14px 10px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#60a5fa" }}>{elapsedSeconds}s</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Time Spent</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 40 }}>
        <button
          onClick={() => startQuiz(false)}
          style={{
            flex: 1,
            minWidth: 160,
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none",
            borderRadius: 16,
            padding: "16px",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          🔄 Retake Quiz
        </button>

        {wrongList.length > 0 && (
          <button
            onClick={() => startQuiz(true)}
            style={{
              flex: 1,
              minWidth: 180,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 16,
              padding: "16px",
              color: "#f87171",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ⚠️ Practice Wrong Only ({wrongList.length})
          </button>
        )}

        <button
          onClick={() => setPhase("options")}
          style={{
            flex: 1,
            minWidth: 140,
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 16,
            padding: "16px",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          📚 Quiz Options
        </button>
      </div>

      {/* Detailed Question Review List */}
      {wrongList.length > 0 && (
        <div style={{ textAlign: "left" }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 16 }}>
            Questions to Review
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {wrongList.map((w: any, idx: number) => (
              <div
                key={w.id || idx}
                style={{
                  background: "#0d111d",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: 18,
                  padding: "20px",
                }}
              >
                <div style={{ color: "#ffffff", fontWeight: 600, fontSize: 15, marginBottom: 12 }}>
                  {renderFormattedText(w.question || w.prompt || "")}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                  <div style={{ color: "#ef4444" }}>
                    <strong>Your answer:</strong> {w.selectedTexts?.join(", ") || "None"}
                  </div>
                  <div style={{ color: "#34d399" }}>
                    <strong>Correct answer:</strong> {w.correctTexts?.join(", ")}
                  </div>
                </div>
                {w.explanation && (
                  <div style={{ marginTop: 10, fontSize: 13, color: "#9ca3af", background: "rgba(255, 255, 255, 0.02)", padding: "10px 12px", borderRadius: 10 }}>
                    {renderFormattedText(w.explanation)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

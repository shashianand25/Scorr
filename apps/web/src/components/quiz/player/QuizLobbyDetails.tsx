"use client";
import React from "react";
import Link from "next/link";

/** QuizLobbyDetails — score trends chart and quiz directory/study guide sections. */
export function QuizLobbyDetails(s: { [key: string]: any }) {
  const {
    quiz,
    qQuery = "",
    setQQuery = () => {},
    expandedQId = null,
    setExpandedQId = () => {},
  } = s;

  if (!quiz) return null;

  return (
    <>
      {/* ── SCORE TRENDS BAR CHART ── */}
      {quiz.attempts && quiz.attempts.length > 1 && (
        <div
          style={{
            marginTop: 28,
            background: "#0d111d",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 20,
            padding: "20px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#a5b4fc",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 14,
            }}
          >
            📈 Score Trends & Attempt History
          </div>
          <div
            style={{
              display: "flex",
              height: 110,
              alignItems: "flex-end",
              justifyContent: "space-between",
              padding: "0 10px",
              gap: 10,
            }}
          >
            {[...quiz.attempts].reverse().map((att: any, i: number) => (
              <div
                key={i}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
              >
                <div
                  style={{
                    height: 80,
                    width: "100%",
                    maxWidth: 24,
                    background: "rgba(255, 255, 255, 0.04)",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "flex-end",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: `${att.score}%`,
                      width: "100%",
                      borderRadius: 6,
                      background: att.score >= 75 ? "#34d399" : att.score >= 50 ? "#6366f1" : "#f59e0b",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{att.score}%</span>
                <span style={{ fontSize: 9, color: "#6b7280" }}>#{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── QUIZ DIRECTORY & STUDY GUIDE ── */}
      {quiz.questionsList && quiz.questionsList.length > 0 && (
        <div
          style={{
            marginTop: 28,
            background: "#0d111d",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 20,
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>
              📚 Quiz Directory & Study Guide
            </div>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {quiz.questionsList.length} Questions
            </span>
          </div>

          {/* Search Questions Input */}
          <div style={{ marginBottom: 14 }}>
            <input
              type="text"
              placeholder="🔍 Search questions or keywords..."
              value={qQuery}
              onChange={(e) => setQQuery(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "10px 14px",
                color: "#ffffff",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Question List Accordion */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 360,
              overflowY: "auto",
              paddingRight: 4,
            }}
          >
            {quiz.questionsList
              .filter(
                (q: any) =>
                  (q.prompt || q.question || "").toLowerCase().includes(qQuery.toLowerCase()) ||
                  (q.answers || []).some((a: any) => (a.text || "").toLowerCase().includes(qQuery.toLowerCase()))
              )
              .map((q: any, i: number) => {
                const isExpanded = expandedQId === (q.id || String(i));
                return (
                  <div
                    key={q.id || i}
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      background: "rgba(255, 255, 255, 0.02)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      onClick={() => setExpandedQId(isExpanded ? null : q.id || String(i))}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        padding: "12px 14px",
                        cursor: "pointer",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", marginTop: 2 }}>
                        Q{i + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: "#e5e7eb", lineHeight: 1.4 }}>
                        {q.prompt || q.question}
                      </span>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>{isExpanded ? "▲" : "▼"}</span>
                    </div>

                    {isExpanded && (
                      <div
                        style={{
                          padding: "12px 14px",
                          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          background: "rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        {(q.answers || []).map((ans: any, aIdx: number) => (
                          <div
                            key={aIdx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 10px",
                              borderRadius: 8,
                              background: ans.isCorrect ? "rgba(52, 211, 153, 0.1)" : "transparent",
                              border: `1px solid ${ans.isCorrect ? "rgba(52, 211, 153, 0.3)" : "transparent"}`,
                            }}
                          >
                            <span
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 4,
                                background: ans.isCorrect ? "#34d399" : "rgba(255, 255, 255, 0.08)",
                                color: ans.isCorrect ? "#000000" : "#9ca3af",
                                fontSize: 10,
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {ans.isCorrect ? "✓" : ["A", "B", "C", "D", "E"][aIdx] || `${aIdx + 1}`}
                            </span>
                            <span
                              style={{ fontSize: 12, color: ans.isCorrect ? "#34d399" : "#d1d5db" }}
                            >
                              {ans.text}
                            </span>
                          </div>
                        ))}
                        {q.explanation && (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 11,
                              color: "#9ca3af",
                              fontStyle: "italic",
                            }}
                          >
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </>
  );
}

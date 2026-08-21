"use client";
import React from "react";
import Link from "next/link";
import type { QuizRecord } from "@/lib/quizDeduplication";

/** QuizActionMenu — action overlay for a selected quiz (practice, share, delete). */
export function QuizActionMenu({
  activeMenuQuiz,
  onClose,
  onShare,
  onDelete,
}: {
  activeMenuQuiz: QuizRecord;
  onClose: () => void;
  onShare: (q: QuizRecord) => void;
  onDelete: (q: QuizRecord) => void;
}) {
  return (
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
          onClick={() => onClose()}
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
                onClick={() => onShare(activeMenuQuiz)}
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
                onClick={() => onDelete(activeMenuQuiz)}
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
  );
}

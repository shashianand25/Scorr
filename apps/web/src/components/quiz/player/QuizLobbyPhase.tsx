"use client";
import React, { useState } from "react";
import Link from "next/link";
import { QuizLobbyDetails } from './QuizLobbyDetails';

/** QuizLobbyPhase — quiz options/lobby screen before quiz begins. */
export function QuizLobbyPhase({ p }: { p: any }) {
  const {
    quiz,
    t = (k: string) => k,
    shuffleQuestions,
    setShuffleQuestions,
    timedMode,
    setTimedMode,
    rangeStart,
    setRangeStart,
    rangeEnd,
    setRangeEnd,
    startQuiz,
  } = p;

  const [qQuery, setQQuery] = useState("");
  const [expandedQId, setExpandedQId] = useState<string | null>(null);

  if (!quiz) return null;

  return (
    <div>
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

      {/* Quiz Card Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #111827 0%, #161c30 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 24,
          padding: "36px 32px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
          marginBottom: 28,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: 100,
            padding: "4px 14px",
            fontSize: 12,
            fontWeight: 700,
            color: "#a5b4fc",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          <span>📚</span>
          <span>{quiz.category || "General"}</span>
        </div>

        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.6px",
            margin: "0 0 12px 0",
          }}
        >
          {quiz.title}
        </h1>

        <div style={{ display: "flex", gap: 16, color: "#9ca3af", fontSize: 14, flexWrap: "wrap" }}>
          <span>❓ {quiz.questionsList?.length || quiz.questions || 0} Questions</span>
          <span>🃏 {quiz.flashcards?.length || 0} Flashcards</span>
          <span>📈 {quiz.attempts?.length || 0} Attempts</span>
        </div>
      </div>

      {/* Practice Modes Config */}
      <div
        style={{
          background: "#0d111e",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 20,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: "0 0 4px 0" }}>
          Study Configuration
        </h3>

        {/* Shuffle Toggle */}
        <div
          onClick={() => setShuffleQuestions(!shuffleQuestions)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          <div>
            <div style={{ color: "#ffffff", fontWeight: 600, fontSize: 14 }}>🔀 Shuffle Questions</div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>Randomize question order each attempt</div>
          </div>
          <input
            type="checkbox"
            checked={shuffleQuestions}
            onChange={() => {}}
            style={{ accentColor: "#6366f1", width: 18, height: 18 }}
          />
        </div>

        {/* Timed Mode Toggle */}
        <div
          onClick={() => setTimedMode(!timedMode)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: "rgba(255, 255, 255, 0.02)",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          <div>
            <div style={{ color: "#ffffff", fontWeight: 600, fontSize: 14 }}>⏱️ Timed Mode</div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>30 seconds countdown per question</div>
          </div>
          <input
            type="checkbox"
            checked={timedMode}
            onChange={() => {}}
            style={{ accentColor: "#6366f1", width: 18, height: 18 }}
          />
        </div>

        {/* Question Range Selection */}
        <div style={{ padding: "12px 16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: 12 }}>
          <div style={{ color: "#ffffff", fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
            🔢 Question Range
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>From</span>
            <input
              type="number"
              min={1}
              max={quiz.questionsList?.length || 1}
              value={rangeStart}
              onChange={(e) => setRangeStart(parseInt(e.target.value) || 1)}
              style={{
                width: 60,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 8,
                padding: "6px 8px",
                color: "#fff",
                textAlign: "center",
              }}
            />
            <span style={{ fontSize: 13, color: "#9ca3af" }}>To</span>
            <input
              type="number"
              min={rangeStart}
              max={quiz.questionsList?.length || 1}
              value={rangeEnd}
              onChange={(e) => setRangeEnd(parseInt(e.target.value) || (quiz.questionsList?.length || 1))}
              style={{
                width: 60,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 8,
                padding: "6px 8px",
                color: "#fff",
                textAlign: "center",
              }}
            />
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              (of {quiz.questionsList?.length || 0} total)
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <button
          onClick={() => startQuiz(false)}
          style={{
            flex: 2,
            minWidth: 200,
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
          🚀 Start Practice Quiz
        </button>

        {quiz.wrongQuestions && quiz.wrongQuestions.length > 0 && (
          <button
            onClick={() => startQuiz(true)}
            style={{
              flex: 1,
              minWidth: 180,
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 16,
              padding: "16px 20px",
              color: "#f87171",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ⚠️ Wrong Only ({quiz.wrongQuestions.length})
          </button>
        )}

        {quiz.flashcards && quiz.flashcards.length > 0 && (
          <Link
            href={`/flashcards/${quiz.id}`}
            style={{
              flex: 1,
              minWidth: 160,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 16,
              padding: "16px 20px",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>🃏 Flashcards</span>
          </Link>
        )}
      </div>


      {/* Score Trends + Directory ── extracted to QuizLobbyDetails */}
      <QuizLobbyDetails quiz={quiz} qQuery={qQuery} setQQuery={setQQuery} expandedQId={expandedQId} setExpandedQId={setExpandedQId} />
    </div>
  );
}

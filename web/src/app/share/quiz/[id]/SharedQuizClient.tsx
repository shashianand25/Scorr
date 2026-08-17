"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { parseQstText } from "@/lib/qstParser";
import { getLocalItem, setLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import { computeQuizFingerprint } from "@/lib/quizFingerprint";
import { mergeQuizPersonalState, QuizRecord } from "@/lib/quizDeduplication";

interface SharedQuizClientProps {
  id: string;
  title: string;
  questionCount: number;
  rawQuiz?: any;
}

export default function SharedQuizClient({
  id,
  title,
  questionCount,
  rawQuiz,
}: SharedQuizClientProps) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);

  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.radium230sorganization.quizforge";
  const appStoreUrl = "https://apps.apple.com/app/scorr/id6746505023";
  const deepLinkUrl = `scorr://share/quiz/${id}`;

  const handleStudyOnWeb = async () => {
    setImporting(true);

    try {
      let parsedQuestions = rawQuiz?.questionsList || [];
      let parsedFlashcards = rawQuiz?.flashcards || [];

      if (parsedQuestions.length === 0 && rawQuiz?.sourceText) {
        const parsed = parseQstText(rawQuiz.sourceText);
        parsedQuestions = parsed.questions;
        parsedFlashcards = parsed.flashcards;
      }

      const importedQuiz: QuizRecord = {
        id: `shared_${id}`,
        neonId: id,
        masterQuizId: rawQuiz?.master_quiz_id || rawQuiz?.masterQuizId || id,
        title: title || "Shared Quiz",
        category: rawQuiz?.category || "Shared",
        questions: parsedQuestions.length || questionCount,
        questionsList: parsedQuestions,
        flashcards: parsedFlashcards,
        sourceText: rawQuiz?.sourceText || "",
        attempts: [],
        wrongQuestions: [],
        uniqueCorrectIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // De-duplicate against user's local library
      const localQuizzes = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
      let existingQuiz = localQuizzes.find(
        (q) => q.neonId === id || q.id === id || (q.masterQuizId && q.masterQuizId === importedQuiz.masterQuizId)
      );

      if (!existingQuiz) {
        const newFp = await computeQuizFingerprint(importedQuiz);
        if (newFp) {
          for (const q of localQuizzes) {
            const curFp = await computeQuizFingerprint(q);
            if (curFp && curFp === newFp) {
              existingQuiz = q;
              break;
            }
          }
        }
      }

      let quizToOpen = importedQuiz.id;

      if (existingQuiz) {
        const merged = mergeQuizPersonalState(existingQuiz, [importedQuiz]);
        quizToOpen = existingQuiz.id;
        const updated = localQuizzes.map((q) => (q.id === existingQuiz.id ? merged : q));
        setLocalItem("quizzes", updated);
      } else {
        setLocalItem("quizzes", [importedQuiz, ...localQuizzes.filter((q) => q.id !== importedQuiz.id)]);
      }

      router.push(`/quiz/${quizToOpen}`);
    } catch (err) {
      console.error("Failed to import shared quiz:", err);
      router.push(`/quiz/sample_quiz_welcome`);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#09090f",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        position: "relative",
        overflow: "hidden",
        color: "#ffffff",
      }}
    >
      {/* Background Orbs */}
      <div
        style={{
          position: "fixed",
          top: "-20%",
          left: "-15%",
          width: "55vw",
          height: "55vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.25), transparent 70%)",
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-20%",
          right: "-15%",
          width: "55vw",
          height: "55vw",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52, 211, 153, 0.15), transparent 70%)",
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "28px",
          padding: "44px 32px 36px",
          maxWidth: "420px",
          width: "100%",
          textAlign: "center",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 32px 80px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* App Icon */}
        <div
          style={{
            width: "72px",
            height: "72px",
            margin: "0 auto 24px",
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "36px" }}>⚡</span>
        </div>

        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            borderRadius: "100px",
            padding: "5px 14px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#a5b4fc",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399" }} />
          Shared Study Set
        </div>

        <h1
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.3,
            marginBottom: "8px",
          }}
        >
          Study{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #818cf8, #34d399)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {title}
          </span>
        </h1>

        {questionCount > 0 && (
          <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.5)", marginBottom: "28px" }}>
            {questionCount} questions • Ready to practice
          </p>
        )}

        {/* Primary Action: Study on Web */}
        <button
          onClick={handleStudyOnWeb}
          disabled={importing}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            width: "100%",
            padding: "16px 24px",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: 700,
            border: "none",
            borderRadius: "16px",
            cursor: importing ? "not-allowed" : "pointer",
            boxShadow: "0 8px 32px rgba(99, 102, 241, 0.4)",
            marginBottom: "12px",
            transition: "all 0.15s ease",
          }}
        >
          <span>⚡</span>
          <span>{importing ? "Loading Quiz..." : "Study This Quiz on Web"}</span>
        </button>

        {/* Open in Mobile App */}
        <a
          href={deepLinkUrl}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            width: "100%",
            padding: "12px 20px",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
            boxSizing: "border-box",
            marginBottom: "20px",
          }}
        >
          <span>📱</span>
          <span>Open in Mobile App</span>
        </a>

        {/* Store Links */}
        <div style={{ display: "flex", gap: "10px" }}>
          <a
            href={playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83 1-.83 1.5-.5l15 8.5-15 8.5c-.5.33-1.5.33-1.5-.5z"/></svg>
            Google Play
          </a>
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.17 1.28-2.15 3.8.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.78M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            App Store
          </a>
        </div>
      </div>
    </div>
  );
}

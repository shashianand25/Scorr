import React from "react";
import SharedQuizClient from "./SharedQuizClient";
import { logger } from "@/lib/logger";

export default async function SharedQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let quizData: any = null;

  try {
    const res = await fetch(`https://api.scorrapp.com/api/share/quiz/${id}`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      quizData = data.quiz || null;
    }
  } catch (err) {
    logger.error("Share", "Failed to fetch shared quiz info", err, { id });
  }

  const quizTitle = quizData?.title || "Shared Quiz";
  const questionCount = quizData?.questions || quizData?.questionsList?.length || 0;

  return (
    <SharedQuizClient
      id={id}
      title={quizTitle}
      questionCount={questionCount}
      rawQuiz={quizData}
    />
  );
}

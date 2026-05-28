"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseQst } from "@/lib/qst/parser";
import type { QstParseResult } from "@/lib/qst/types";
import type { QuizConfig, QuizSession, DisplayQuestion, SessionHistory, SavedQuiz, QuizAttempt } from "@/components/quiz-types";
import { DEFAULT_CONFIG } from "@/components/quiz-types";
import { SetupPanel } from "@/components/panels/setup-panel";
import { PlayerPanel } from "@/components/panels/player-panel";
import { ResultsPanel } from "@/components/panels/results-panel";

interface QuizPlayPageProps {
  quiz: SavedQuiz;
  onRecordAttempt: (quizId: string, attempt: Omit<QuizAttempt, "id">) => void;
  onBack: () => void;
  initialMode?: "all" | "random" | "range" | "unanswered" | "wrong";
}

function buildSession(parsed: QstParseResult, config: QuizConfig, history: SessionHistory): QuizSession {
  const all = parsed.data.questions;
  let pool = all.map((q, i) => ({ ...q, originalIndex: i }));

  switch (config.selectionMode) {
    case "random":
      if (config.shuffleQuestions) pool = [...pool].sort(() => Math.random() - 0.5);
      pool = pool.slice(0, Math.min(config.randomCount, pool.length));
      break;
    case "range":
      pool = pool.slice(Math.max(0, config.rangeStart - 1), Math.min(pool.length, config.rangeEnd));
      if (config.shuffleQuestions) pool = [...pool].sort(() => Math.random() - 0.5);
      break;
    case "unanswered":
      pool = pool.filter((q) => !history.answered.has(q.id));
      if (config.shuffleQuestions) pool = [...pool].sort(() => Math.random() - 0.5);
      break;
    case "wrong":
      pool = pool.filter((q) => history.wrong.has(q.id));
      if (config.shuffleQuestions) pool = [...pool].sort(() => Math.random() - 0.5);
      break;
    default:
      if (config.shuffleQuestions) pool = [...pool].sort(() => Math.random() - 0.5);
  }

  const questions: DisplayQuestion[] = pool.map((q) => {
    let answers = q.answers.map((a) => ({ id: a.id, text: a.text, isCorrect: a.isCorrect, line: a.line }));
    if (config.shuffleAnswers && q.type !== "true_false") {
      answers = [...answers].sort(() => Math.random() - 0.5);
    }
    return { id: q.id, prompt: q.prompt, line: q.line, type: q.type, answers, imageUrl: q.imageUrl, originalIndex: q.originalIndex };
  });

  return { questions, answers: new Map(), flagged: new Set(), timedOut: new Set(), startTime: Date.now() };
}

function computeResults(session: QuizSession) {
  const correct: string[] = [], wrong: string[] = [], skipped: string[] = [];
  for (const q of session.questions) {
    const sel = session.answers.get(q.id) ?? [];
    if (sel.length === 0) { skipped.push(q.id); continue; }
    const correctIds = q.answers.filter((a) => a.isCorrect).map((a) => a.id);
    const ok = sel.length === correctIds.length && sel.every((id) => correctIds.includes(id));
    if (ok) correct.push(q.id); else wrong.push(q.id);
  }
  return { correct, wrong, skipped };
}

function buildReview(session: QuizSession, wrongIds: string[]) {
  const wrongSet = new Set(wrongIds);
  return session.questions
    .filter((question) => wrongSet.has(question.id))
    .map((question) => {
      const selectedIds = new Set(session.answers.get(question.id) ?? []);
      return {
        questionId: question.id,
        prompt: question.prompt,
        selectedAnswers: question.answers.filter((answer) => selectedIds.has(answer.id)).map((answer) => answer.text),
        correctAnswers: question.answers.filter((answer) => answer.isCorrect).map((answer) => answer.text),
      };
    });
}

type Phase = "setup" | "playing" | "results";

export function QuizPlayPage({ quiz, onRecordAttempt, onBack, initialMode }: QuizPlayPageProps) {
  const parsed = parseQst(quiz.source);
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<QuizConfig>({
    ...DEFAULT_CONFIG,
    selectionMode: initialMode ?? DEFAULT_CONFIG.selectionMode,
    rangeEnd: parsed.data.questions.length,
    randomCount: Math.min(DEFAULT_CONFIG.randomCount, parsed.data.questions.length),
  });
  const [session, setSession] = useState<QuizSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<SessionHistory>(() => {
    const latest = quiz.attempts[0];
    const wrong = new Set<string>();
    const answered = new Set<string>();
    if (latest && latest.review) {
      // reconstruct history from the latest attempt
      latest.review.forEach((item) => answered.add(item.questionId));
      if (latest.wrongQuestionIds) {
        latest.wrongQuestionIds.forEach((id: string) => wrong.add(id));
      }
    }
    return { answered, wrong };
  });

  function startQuiz() {
    const sess = buildSession(parsed, config, history);
    setSession(sess);
    setCurrentIndex(0);
    setPhase("playing");
  }

  function handleAnswer(questionId: string, answerId: string) {
    if (!session) return;
    const q = session.questions.find((q) => q.id === questionId);
    if (!q) return;
    setSession((prev) => {
      if (!prev) return prev;
      const next = new Map(prev.answers);
      if (q.type === "multiple_choice") {
        const cur = next.get(questionId) ?? [];
        next.set(questionId, cur.includes(answerId) ? cur.filter((id) => id !== answerId) : [...cur, answerId]);
      } else {
        const cur = next.get(questionId) ?? [];
        if (cur[0] === answerId) next.delete(questionId); else next.set(questionId, [answerId]);
      }
      return { ...prev, answers: next };
    });
  }

  function handleFlag(questionId: string) {
    setSession((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.flagged);
      if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
      return { ...prev, flagged: next };
    });
  }

  function handleFinish() {
    if (!session) return;
    const finished = { ...session, endTime: Date.now() };
    setSession(finished);
    const { correct, wrong, skipped } = computeResults(finished);
    const score = session.questions.length > 0 ? Math.round((correct.length / session.questions.length) * 100) : 0;
    onRecordAttempt(quiz.id, {
      timestamp: Date.now(),
      score,
      correct: correct.length,
      wrong: wrong.length,
      skipped: skipped.length,
      duration: finished.endTime! - finished.startTime,
      questionCount: session.questions.length,
      wrongQuestionIds: wrong,
      review: buildReview(finished, wrong),
    });
    // Update history
    setHistory((prev) => {
      const answered = new Set(prev.answered);
      const wrongSet = new Set<string>();
      finished.questions.forEach((q) => answered.add(q.id));
      wrong.forEach((id) => wrongSet.add(id));
      return { answered, wrong: wrongSet };
    });
    setPhase("results");
  }

  function retryAll() {
    startQuiz();
  }

  function retryWrong() {
    const wrongConfig: QuizConfig = { ...config, selectionMode: "wrong" };
    const sess = buildSession(parsed, wrongConfig, history);
    setSession(sess);
    setCurrentIndex(0);
    setPhase("playing");
  }

  return (
    <AnimatePresence mode="wait">
      {phase === "setup" && (
        <motion.div key="setup" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
          <SetupPanel
            parsed={parsed}
            fileName={quiz.fileName}
            config={config}
            setConfig={setConfig}
            history={history}
            onStart={startQuiz}
            onBack={onBack}
          />
        </motion.div>
      )}

      {phase === "playing" && session && (
        <motion.div key="playing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
          <PlayerPanel
            session={session}
            currentIndex={currentIndex}
            config={config}
            onAnswer={handleAnswer}
            onFlag={handleFlag}
            onNavigate={setCurrentIndex}
            onFinish={handleFinish}
          />
        </motion.div>
      )}

      {phase === "results" && session && (
        <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
          <ResultsPanel
            session={session}
            quizTitle={quiz.title}
            onRetryAll={retryAll}
            onRetryWrong={retryWrong}
            onNewQuiz={onBack}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

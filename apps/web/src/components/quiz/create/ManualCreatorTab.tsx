"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/components/ui/ToastPill";
import { createQuiz } from "@/lib/api";
import { getLocalItem, setLocalItem } from "@/lib/storage";
import type { QuizRecord } from "@/lib/quizDeduplication";
import { ManualSetupStep } from "./ManualSetupStep";
import { ManualDraftStep } from "./ManualDraftStep";

export interface ManualTabProps {
  user?: any;
  router?: any;
  showToast?: (msg: string, opts?: any) => void;
  t?: (k: string) => string;
}

export function ManualCreatorTab({
  user: propUser,
  router: propRouter,
  showToast: propShowToast,
  t = (k: string) => k,
}: ManualTabProps) {
  const routerHook = useRouter();
  const authStore = useAuthStore();
  const toastHook = useToast();

  const user = propUser || authStore.user;
  const router = propRouter || routerHook;
  const showToast = propShowToast || toastHook.showToast;

  const [manualStep, setManualStep] = useState<"setup" | "draft">("setup");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCategory, setManualCategory] = useState("General");
  const [manualCount, setManualCount] = useState("5");
  const [manualLanguage, setManualLanguage] = useState("English");
  const [draftQuestions, setDraftQuestions] = useState<any[]>([]);
  const [draftIndex, setDraftIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleProceedToDrafting = () => {
    if (!manualTitle.trim()) {
      showToast("Please enter a quiz title", { icon: "⚠️", color: "#ef4444" });
      return;
    }
    const count = parseInt(manualCount, 10) || 5;
    const initialQuestions = Array.from({ length: count }, (_, i) => ({
      id: `q-${i + 1}`,
      prompt: "",
      explanation: "",
      answers: [
        { id: `opt-1`, text: "", isCorrect: true },
        { id: `opt-2`, text: "", isCorrect: false },
        { id: `opt-3`, text: "", isCorrect: false },
        { id: `opt-4`, text: "", isCorrect: false },
      ],
    }));
    setDraftQuestions(initialQuestions);
    setDraftIndex(0);
    setManualStep("draft");
  };

  const updateDraftPrompt = (text: string) => {
    const updated = [...draftQuestions];
    updated[draftIndex].prompt = text;
    setDraftQuestions(updated);
  };

  const updateDraftExplanation = (text: string) => {
    const updated = [...draftQuestions];
    updated[draftIndex].explanation = text;
    setDraftQuestions(updated);
  };

  const updateDraftOptionText = (optIdx: number, text: string) => {
    const updated = [...draftQuestions];
    updated[draftIndex].answers[optIdx].text = text;
    setDraftQuestions(updated);
  };

  const selectDraftOptionCorrect = (optIdx: number) => {
    const updated = [...draftQuestions];
    updated[draftIndex].answers = updated[draftIndex].answers.map((a: any, i: number) => ({
      ...a,
      isCorrect: i === optIdx,
    }));
    setDraftQuestions(updated);
  };

  const deleteDraftOption = (optIdx: number) => {
    const updated = [...draftQuestions];
    if (updated[draftIndex].answers.length > 2) {
      updated[draftIndex].answers.splice(optIdx, 1);
      setDraftQuestions(updated);
    }
  };

  const addDraftOption = () => {
    const updated = [...draftQuestions];
    if (updated[draftIndex].answers.length < 6) {
      updated[draftIndex].answers.push({
        id: `opt-${updated[draftIndex].answers.length + 1}`,
        text: "",
        isCorrect: false,
      });
      setDraftQuestions(updated);
    }
  };

  const handleNextDraftQuestion = () => {
    if (draftIndex < draftQuestions.length - 1) {
      setDraftIndex(draftIndex + 1);
    }
  };

  const handlePrevDraftQuestion = () => {
    if (draftIndex > 0) {
      setDraftIndex(draftIndex - 1);
    }
  };

  const handleSaveDraftedQuiz = async () => {
    for (let i = 0; i < draftQuestions.length; i++) {
      const q = draftQuestions[i];
      if (!q.prompt.trim()) {
        showToast(`Question ${i + 1} needs a prompt`, { icon: "⚠️", color: "#ef4444" });
        setDraftIndex(i);
        return;
      }
      const filledOptions = q.answers.filter((a: any) => a.text.trim());
      if (filledOptions.length < 2) {
        showToast(`Question ${i + 1} needs at least 2 options`, { icon: "⚠️", color: "#ef4444" });
        setDraftIndex(i);
        return;
      }
      if (!q.answers.some((a: any) => a.isCorrect)) {
        showToast(`Question ${i + 1} needs 1 correct answer marked`, { icon: "⚠️", color: "#ef4444" });
        setDraftIndex(i);
        return;
      }
    }

    setIsSaving(true);
    const newQuizId = `quiz_${Date.now()}`;
    const newQuiz: QuizRecord = {
      id: newQuizId,
      title: manualTitle.trim(),
      category: manualCategory,
      questions: draftQuestions.length,
      questionsList: draftQuestions.map((q, i) => ({
        id: `q_${i + 1}`,
        prompt: q.prompt.trim(),
        explanation: q.explanation.trim(),
        answers: q.answers.filter((a: any) => a.text.trim()).map((a: any, aIdx: number) => ({
          id: `a_${aIdx + 1}`,
          text: a.text.trim(),
          isCorrect: a.isCorrect,
        })),
        type: "single_choice",
      })),
      createdAt: Date.now(),
      userId: user?.uid || "guest",
      attempts: [],
      starredQuestionIds: [],
    } as any;

    const existing = getLocalItem<QuizRecord[]>("quizzes", []);
    setLocalItem("quizzes", [newQuiz, ...existing]);

    if (user?.uid) {
      try {
        await createQuiz({
          userId: user.uid,
          title: newQuiz.title,
          category: newQuiz.category || "General",
          questionCount: newQuiz.questions || draftQuestions.length,
          questionsList: newQuiz.questionsList as any,
        });
      } catch {}
    }

    setIsSaving(false);
    showToast("Quiz created successfully! 🎉", { icon: "🎉", color: "#10b981" });
    router.push(`/quiz/${newQuizId}`);
  };

  return (
    <div>
      {manualStep === "setup" ? (
        <ManualSetupStep
          manualTitle={manualTitle}
          setManualTitle={setManualTitle}
          manualCount={manualCount}
          setManualCount={setManualCount}
          manualLanguage={manualLanguage}
          setManualLanguage={setManualLanguage}
          handleProceedToDrafting={handleProceedToDrafting}
          t={t}
        />
      ) : (
        <ManualDraftStep
          draftIndex={draftIndex}
          draftQuestions={draftQuestions}
          setManualStep={setManualStep}
          updateDraftPrompt={updateDraftPrompt}
          selectDraftOptionCorrect={selectDraftOptionCorrect}
          updateDraftOptionText={updateDraftOptionText}
          deleteDraftOption={deleteDraftOption}
          addDraftOption={addDraftOption}
          updateDraftExplanation={updateDraftExplanation}
          handlePrevDraftQuestion={handlePrevDraftQuestion}
          handleNextDraftQuestion={handleNextDraftQuestion}
          handleSaveDraftedQuiz={handleSaveDraftedQuiz}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

"use client";
/**
 * useManualQuiz — state and handlers for manual quiz creation.
 * Extracted from web/src/app/(app)/quiz/create/page.tsx to reduce file size.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastPill";
import { createQuiz } from "@/lib/api";
import { questionsToSourceText, parseQstText } from "@/lib/qstParser";
import { getLocalItem, setLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import type { QuizRecord } from "@/lib/quizDeduplication";

export interface DraftQuestion {
  id: string;
  prompt: string;
  answers: Array<{ id: string; text: string; isCorrect: boolean }>;
}

export function useManualQuiz(user: { uid?: string } | null, setErrorMsg: (m: string | null) => void) {
  const router = useRouter();
  const { showToast } = useToast();

  const [manualStep, setManualStep] = useState<"setup" | "drafting">("setup");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCount, setManualCount] = useState("5");
  const [manualLanguage, setManualLanguage] = useState("English");
  const [draftIndex, setDraftIndex] = useState(0);
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);

  const handleProceedToDrafting = () => {
    if (!manualTitle.trim()) { setErrorMsg("Please enter a quiz title."); return; }
    const count = parseInt(manualCount) || 5;
    if (count <= 0 || count > 50) { setErrorMsg("Please enter a question count between 1 and 50."); return; }
    setErrorMsg(null);
    const initialDrafts: DraftQuestion[] = Array.from({ length: count }, (_, i) => ({
      id: `manual_q_${Date.now()}_${i + 1}`,
      prompt: "",
      answers: [
        { id: `a_${i}_0`, text: "", isCorrect: true },
        { id: `a_${i}_1`, text: "", isCorrect: false },
        { id: `a_${i}_2`, text: "", isCorrect: false },
        { id: `a_${i}_3`, text: "", isCorrect: false },
      ],
    }));
    setDraftQuestions(initialDrafts);
    setDraftIndex(0);
    setManualStep("drafting");
  };

  const updateDraftPrompt = (text: string) => {
    const updated = [...draftQuestions];
    updated[draftIndex].prompt = text;
    setDraftQuestions(updated);
  };

  const updateDraftOptionText = (optIdx: number, text: string) => {
    const updated = [...draftQuestions];
    updated[draftIndex].answers[optIdx].text = text;
    setDraftQuestions(updated);
  };

  const selectDraftOptionCorrect = (optIdx: number) => {
    const updated = [...draftQuestions];
    updated[draftIndex].answers = updated[draftIndex].answers.map((a, i) => ({ ...a, isCorrect: i === optIdx }));
    setDraftQuestions(updated);
  };

  const addDraftOption = () => {
    const updated = [...draftQuestions];
    const curAnswers = updated[draftIndex].answers;
    if (curAnswers.length >= 6) return;
    updated[draftIndex].answers.push({ id: `a_${draftIndex}_${curAnswers.length}`, text: "", isCorrect: false });
    setDraftQuestions(updated);
  };

  const deleteDraftOption = (optIdx: number) => {
    const updated = [...draftQuestions];
    const curAnswers = updated[draftIndex].answers;
    if (curAnswers.length <= 2) return;
    const wasCorrect = curAnswers[optIdx].isCorrect;
    updated[draftIndex].answers.splice(optIdx, 1);
    if (wasCorrect && updated[draftIndex].answers.length > 0) updated[draftIndex].answers[0].isCorrect = true;
    setDraftQuestions(updated);
  };

  const handleNextDraftQuestion = () => {
    const cur = draftQuestions[draftIndex];
    if (!cur.prompt.trim()) { setErrorMsg("Please enter a question prompt."); return; }
    const filledOpts = cur.answers.filter((a) => a.text.trim());
    if (filledOpts.length < 2) { setErrorMsg("Please enter at least 2 non-empty options."); return; }
    if (!filledOpts.some((a) => a.isCorrect)) { setErrorMsg("Please select a correct answer amongst non-empty options."); return; }
    setErrorMsg(null);
    if (draftIndex < draftQuestions.length - 1) setDraftIndex(draftIndex + 1);
  };

  const handleSaveDraftedQuiz = async () => {
    const cur = draftQuestions[draftIndex];
    if (!cur.prompt.trim()) { setErrorMsg("Please enter a question prompt."); return; }
    const filledOpts = cur.answers.filter((a) => a.text.trim());
    if (filledOpts.length < 2) { setErrorMsg("Please enter at least 2 non-empty options."); return; }
    setErrorMsg(null);

    const formattedQuestions = draftQuestions.map((q, i) => ({
      id: `q_${Date.now()}_${i + 1}`,
      question: q.prompt, prompt: q.prompt, explanation: "",
      answers: q.answers.filter((a) => a.text.trim()).map((a, ai) => ({ id: `a_${i}_${ai}`, text: a.text, isCorrect: a.isCorrect })),
    }));

    const sourceText = questionsToSourceText(manualTitle, "Custom", formattedQuestions, []);
    const localId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newQuiz: QuizRecord = {
      id: localId, title: manualTitle.trim() || "Custom Quiz", category: "Custom",
      questions: formattedQuestions.length, questionsList: formattedQuestions,
      flashcards: [], sourceText, attempts: [], wrongQuestions: [], uniqueCorrectIds: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    };

    const localQuizzes = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
    setLocalItem("quizzes", [newQuiz, ...localQuizzes.filter((q) => q.id !== localId)]);
    if (user?.uid) createQuiz({ id: localId, userId: user.uid, title: newQuiz.title, category: "Custom", questionCount: formattedQuestions.length, sourceText, questionsList: formattedQuestions, flashcards: [] }).catch(() => {});
    showToast("✍️ Custom quiz created successfully!", { icon: "✍️", color: "#10b981" });
    router.push(`/quiz/${localId}`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseQstText(text);
      if (!parsed.questions || parsed.questions.length === 0) { setErrorMsg("No questions could be parsed from this file."); return; }
      const quizTitle = parsed.title || file.name.replace(/\.[^.]+$/, "") || "Imported Quiz";
      const localId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newQuiz: QuizRecord = {
        id: localId, title: quizTitle, category: parsed.category || "Imported",
        questions: parsed.questions.length, questionsList: parsed.questions,
        flashcards: parsed.flashcards || [], sourceText: text, attempts: [],
        wrongQuestions: [], uniqueCorrectIds: [], createdAt: Date.now(), updatedAt: Date.now(),
      };
      const localQuizzes = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
      setLocalItem("quizzes", [newQuiz, ...localQuizzes.filter((q) => q.id !== localId)]);
      if (user?.uid) createQuiz({ id: localId, userId: user.uid, title: newQuiz.title, category: "Imported", questionCount: parsed.questions.length, sourceText: text, questionsList: parsed.questions, flashcards: parsed.flashcards }).catch(() => {});
      showToast("📁 Quiz imported successfully!", { icon: "📁", color: "#34d399" });
      router.push(`/quiz/${localId}`);
    } catch {
      setErrorMsg("Failed to import file. Make sure it is a valid .qst or text format.");
    }
  };

  return {
    manualStep, setManualStep, manualTitle, setManualTitle, manualCount, setManualCount,
    manualLanguage, setManualLanguage, draftIndex, setDraftIndex, draftQuestions, setDraftQuestions,
    handleProceedToDrafting, updateDraftPrompt, updateDraftOptionText, selectDraftOptionCorrect,
    addDraftOption, deleteDraftOption, handleNextDraftQuestion, handleSaveDraftedQuiz, handleImportFile,
  };
}

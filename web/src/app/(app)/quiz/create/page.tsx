"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/components/ui/ToastPill";
import { useTranslation, SupportedLanguage } from "@/lib/i18n";
import {
  fetchAppConfig,
  checkMasterQuizCache,
  saveMasterQuiz,
  createQuiz,
  recordAiGeneration,
  checkAiDailyLimit,
  AppConfig,
} from "@/lib/api";
import { computeContentHash } from "@/lib/contentHash";
import { parseQstText, questionsToSourceText } from "@/lib/qstParser";
import { getLocalItem, setLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import { QuizRecord } from "@/lib/quizDeduplication";
import AIGenerationModal from "@/components/ai/AIGenerationModal";
import { useManualQuiz } from "@/hooks/useManualQuiz";
import { CreateHeader } from "@/components/quiz/create/CreateHeader";
import { AIGeneratorTab } from "@/components/quiz/create/AIGeneratorTab";
import { ManualCreatorTab } from "@/components/quiz/create/ManualCreatorTab";
import { ImportFileTab } from "@/components/quiz/create/ImportFileTab";

export type CreateTab = "ai" | "manual" | "import";


export default function CreateQuizPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { showToast } = useToast();
  const { t, language } = useTranslation();

  const [activeTab, setActiveTab] = useState<CreateTab>("ai");

  // ── AI Generation State ────────────────────────────────────────────────
  const [sourceText, setSourceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [useCustomCount, setUseCustomCount] = useState(false);
  const [customCount, setCustomCount] = useState("10");
  const [includeFlashcards, setIncludeFlashcards] = useState(true);
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(language || "en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);


  // ── Manual Creation State + Handlers (useManualQuiz hook) ──────────────
  const {
    manualStep, setManualStep, manualTitle, setManualTitle, manualCount, setManualCount,
    manualLanguage, setManualLanguage, draftIndex, setDraftIndex, draftQuestions, setDraftQuestions,
    handleProceedToDrafting, updateDraftPrompt, updateDraftOptionText, selectDraftOptionCorrect,
    addDraftOption, deleteDraftOption, handleNextDraftQuestion, handleSaveDraftedQuiz, handleImportFile,
  } = useManualQuiz(user, setErrorMsg);

  useEffect(() => {
    fetchAppConfig().then(({ config }) => {
      if (config) setAppConfig(config);
    });
  }, []);

  const effectiveCount = useCustomCount ? parseInt(customCount) || 10 : questionCount;

  // ── Handle AI File Selection ───────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg(null);

    const fileName = file.name.replace(/\.[^.]+$/, "");
    if (!title) setTitle(fileName);

    const isText = file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md");

    if (isText) {
      const text = await file.text();
      setSourceText(text);
      setCharCount(text.length);
      setFileBase64(null);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        setFileBase64(b64);
        setSourceText(`[Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)]`);
        setCharCount(file.size);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Cancel AI Generation Handler ───────────────────────────────────────
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    showToast(t("generation.generation_cancelled") || "Generation cancelled", {
      icon: "✕",
      color: "#ef4444",
    });
  };

  // ── AI Generation Execution ────────────────────────────────────────────
  const handleGenerate = async () => {
    const textContent = sourceText.trim();
    if (!textContent && !selectedFile) {
      setErrorMsg("Please enter text or upload a document/image.");
      return;
    }

    setErrorMsg(null);

    if (user?.uid) {
      const { allowed, error: limitErr } = await checkAiDailyLimit(user.uid);
      if (!allowed) {
        setErrorMsg(limitErr || "Daily AI generation limit reached (5/day). Try again tomorrow!");
        return;
      }
    }

    const computedHash = await computeContentHash(textContent || (selectedFile?.name || "doc"));

    try {
      const { hit, masterQuiz } = await checkMasterQuizCache(computedHash, activeLang);
      if (hit && masterQuiz && masterQuiz.sourceText) {
        const parsed = parseQstText(masterQuiz.sourceText);
        if (parsed.questions.length > 0) {
          const localId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const cachedQuiz: QuizRecord = {
            id: localId,
            masterQuizId: masterQuiz.id,
            master_quiz_id: masterQuiz.id,
            title: masterQuiz.title || title || "Instant Quiz",
            category: masterQuiz.category || category,
            questions: parsed.questions.length,
            questionsList: parsed.questions,
            flashcards: parsed.flashcards || [],
            sourceText: masterQuiz.sourceText,
            attempts: [],
            wrongQuestions: [],
            uniqueCorrectIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const localQuizzes = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
          setLocalItem("quizzes", [cachedQuiz, ...localQuizzes.filter((q) => q.id !== localId)]);

          if (user?.uid) {
            createQuiz({
              id: localId,
              userId: user.uid,
              masterQuizId: masterQuiz.id,
              title: cachedQuiz.title,
              category: cachedQuiz.category || "General",
              questionCount: cachedQuiz.questions || 10,
              sourceText: masterQuiz.sourceText,
              questionsList: parsed.questions,
              flashcards: parsed.flashcards,
            }).catch(() => {});
          }

          showToast("⚡ Instant load · No AI used", {
            icon: "⚡",
            color: "#34d399",
          });

          router.push(`/quiz/${localId}`);
          return;
        }
      }
    } catch (cacheErr) {
      console.warn("[MasterQuizCache] Cache check skipped:", cacheErr);
    }

    setIsGenerating(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const config = appConfig || (await fetchAppConfig()).config;
      if (!config?.aiConfig?.geminiKey || !config?.aiConfig?.modelUrl) {
        throw new Error("AI service temporarily unavailable. Please try again later.");
      }

      const { geminiKey, modelUrl, promptTemplate } = config.aiConfig;

      let effectivePrompt = (promptTemplate || "")
        .replace("{sourceText}", fileBase64 ? "" : textContent.slice(0, 30000))
        .replace("{questionCount}", String(effectiveCount))
        .replace("{includeFlashcards}", String(includeFlashcards))
        .replace("{language}", activeLang);

      if (!promptTemplate?.includes("{language}")) {
        effectivePrompt += `\nImportant: Generate all questions, options, explanations, and flashcards in "${activeLang}" language.`;
      }

      const parts: any[] = [];
      if (fileBase64) {
        const mime = selectedFile?.type || (selectedFile?.name?.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
        const base64Data = fileBase64.includes(",") ? fileBase64.split(",")[1] : fileBase64;
        parts.push({
          inlineData: {
            mimeType: mime,
            data: base64Data,
          },
        });
      }
      parts.push({
        text: effectivePrompt,
      });

      const requestBody: any = {
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      };

      const geminiRes = await fetch(modelUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!geminiRes.ok) {
        throw new Error(`Gemini API error (Status ${geminiRes.status})`);
      }

      const geminiData = await geminiRes.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

      if (abortController.signal.aborted) return;

      let parsedQuestions: any[] = [];
      let parsedFlashcards: any[] = [];

      try {
        const clean = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const json = JSON.parse(clean);
        parsedQuestions = json.questions || [];
        parsedFlashcards = json.flashcards || [];
      } catch {
        const qstFallback = parseQstText(rawText);
        parsedQuestions = qstFallback.questions;
        parsedFlashcards = qstFallback.flashcards;
      }

      if (parsedQuestions.length === 0 && parsedFlashcards.length === 0) {
        throw new Error("AI generated no questions. Please provide more detailed notes.");
      }

      const formattedQuestions = parsedQuestions.map((q: any, i: number) => ({
        id: `q_${Date.now()}_${i + 1}`,
        question: q.question || q.prompt || "",
        prompt: q.question || q.prompt || "",
        explanation: q.explanation || "",
        answers: Array.isArray(q.answers)
          ? q.answers.map((a: any, ai: number) => ({
              id: `a_${i}_${ai}`,
              text: typeof a === "string" ? a : a.text || "",
              isCorrect: typeof a === "object" ? a.isCorrect === true : ai === 0,
            }))
          : [],
      }));

      const formattedFlashcards = parsedFlashcards.map((f: any, i: number) => ({
        id: `f_${Date.now()}_${i + 1}`,
        front: f.front || f.term || "",
        back: f.back || f.definition || "",
      }));

      const quizTitle = title.trim() || selectedFile?.name.replace(/\.[^.]+$/, "") || "Generated Quiz";
      const masterSourceText = questionsToSourceText(quizTitle, category, formattedQuestions, formattedFlashcards);

      let masterQuizId: string | null = null;
      try {
        const masterRes = await saveMasterQuiz({
          contentHash: computedHash,
          language: activeLang,
          title: quizTitle,
          category,
          questionCount: formattedQuestions.length,
          flashcardCount: formattedFlashcards.length,
          sourceText: masterSourceText,
          userId: user?.uid,
        });
        if (masterRes.masterQuiz?.id) {
          masterQuizId = masterRes.masterQuiz.id;
        }
      } catch (e) {
        console.warn("[MasterCache] Save failed:", e);
      }

      const localId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newQuiz: QuizRecord = {
        id: localId,
        masterQuizId: masterQuizId || undefined,
        master_quiz_id: masterQuizId || undefined,
        title: quizTitle,
        category,
        questions: formattedQuestions.length,
        questionsList: formattedQuestions,
        flashcards: formattedFlashcards,
        sourceText: masterSourceText,
        attempts: [],
        wrongQuestions: [],
        uniqueCorrectIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const localQuizzes = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
      setLocalItem("quizzes", [newQuiz, ...localQuizzes.filter((q) => q.id !== localId)]);

      if (user?.uid) {
        createQuiz({
          id: localId,
          userId: user.uid,
          masterQuizId,
          title: quizTitle,
          category,
          questionCount: formattedQuestions.length,
          sourceText: masterSourceText,
          questionsList: formattedQuestions,
          flashcards: formattedFlashcards,
        }).catch(() => {});

        recordAiGeneration(user.uid).catch(() => {});
      }

      setIsGenerating(false);
      showToast("✨ Quiz generated successfully!", {
        icon: "✨",
        color: "#10b981",
      });

      setTimeout(() => {
        router.push(`/quiz/${localId}`);
      }, 300);
    } catch (err: any) {
      if (abortControllerRef.current?.signal.aborted) return;
      setIsGenerating(false);
      setErrorMsg(err?.message || "Failed to generate quiz. Please try again.");
    }
  };



  return (
    <div
      style={{
        padding: "20px 16px 80px",
        maxWidth: 860,
        margin: "0 auto",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <AIGenerationModal
        isOpen={isGenerating}
        documentCharCount={charCount}
        onCancel={handleCancelGeneration}
      />


      {/* Header + Mode Tabs ── extracted to CreateHeader */}
      <CreateHeader activeTab={activeTab} setActiveTab={setActiveTab} setErrorMsg={setErrorMsg} t={t as any} />


      {errorMsg && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 14,
            padding: "14px 18px",
            color: "#f87171",
            fontSize: 13,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}


      {/* ── TAB 1: AI GENERATOR ─────────────────── (extracted to AIGeneratorTab) ── */}
      {activeTab === "ai" && <AIGeneratorTab
        sourceText={sourceText} setSourceText={setSourceText}
        selectedFile={selectedFile} setSelectedFile={setSelectedFile}
        fileBase64={fileBase64} setFileBase64={setFileBase64}
        title={title} setTitle={setTitle}
        category={category} setCategory={setCategory}
        questionCount={questionCount} setQuestionCount={setQuestionCount}
        useCustomCount={useCustomCount} setUseCustomCount={setUseCustomCount}
        customCount={customCount} setCustomCount={setCustomCount}
        includeFlashcards={includeFlashcards} setIncludeFlashcards={setIncludeFlashcards}
        activeLang={activeLang} setActiveLang={setActiveLang}
        isGenerating={isGenerating}
        charCount={charCount}
        errorMsg={errorMsg}
        appConfig={appConfig}
        handleGenerate={handleGenerate}
        handleFileChange={handleFileChange}
        t={t}
      />}



      {/* ── TAB 2: MANUAL CREATOR ────────────── (extracted to ManualCreatorTab) ── */}
      {activeTab === "manual" && (
        <ManualCreatorTab
          manualStep={manualStep}
          manualQuestions={manualQuestions}
          setManualQuestions={setManualQuestions}
          manualTitle={manualTitle}
          setManualTitle={setManualTitle}
          manualCategory={manualCategory}
          setManualCategory={setManualCategory}
          manualStep2={manualStep2}
          setManualStep={setManualStep}
          setManualStep2={setManualStep2}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          user={user}
          router={router}
          showToast={showToast}
          t={t}
        />
      )}

      {/* ── TAB 3: IMPORT FILE ──────────────────── (extracted to ImportFileTab) ── */}
      {activeTab === "import" && (
        <ImportFileTab
          onImport={handleImportFile}
          t={t}
        />
      )}
    </div>
  );
}

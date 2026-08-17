"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/components/ui/ToastPill";
import { useTranslation } from "@/lib/i18n";
import AIGenerationModal from "@/components/ai/AIGenerationModal";
import {
  fetchAppConfig,
  checkMasterQuizCache,
  saveMasterQuiz,
  createQuiz,
  checkAiDailyLimit,
  recordAiGeneration,
  Quiz,
} from "@/lib/api";
import { computeContentHash } from "@/lib/contentHash";
import { parseQstText, questionsToSourceText } from "@/lib/qstParser";
import { getLocalItem, setLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import { computeQuizFingerprint } from "@/lib/quizFingerprint";
import { mergeQuizPersonalState, QuizRecord } from "@/lib/quizDeduplication";

const QUESTION_PRESETS = [10, 20, 30, 50];

export default function CreateQuizPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { showToast } = useToast();
  const { t, language } = useTranslation();

  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [customCount, setCustomCount] = useState("");
  const [useCustomCount, setUseCustomCount] = useState(false);
  const [includeFlashcards, setIncludeFlashcards] = useState(true);
  const [category, setCategory] = useState("General");
  const [activeLang, setActiveLang] = useState(language || "en");

  // Loading and Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveCount = useCustomCount ? parseInt(customCount) || 10 : questionCount;

  // ── Handle File Selection ──────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg(null);

    const fileName = file.name.replace(/\.[^.]+$/, "");
    if (!title) setTitle(fileName);

    const isImage = file.type.startsWith("image/");
    const isText = file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md");

    if (isText) {
      const text = await file.text();
      setSourceText(text);
      setCharCount(text.length);
      setFileBase64(null);
    } else if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        setFileBase64(b64);
        setSourceText(`[Visual Document: ${file.name}]`);
        setCharCount(file.size);
      };
      reader.readAsDataURL(file);
    } else {
      // PDF, DOCX, PPT
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        // Basic UTF-8 text extraction fallback
        try {
          const decoder = new TextDecoder("utf-8");
          const extracted = decoder.decode(arrayBuffer);
          const cleanText = extracted.replace(/[^\x20-\x7E\n\r\t\u00A0-\uFFFF]/g, " ");
          if (cleanText.trim().length > 100) {
            setSourceText(cleanText);
            setCharCount(cleanText.length);
          } else {
            // Visual/binary document fallback
            setFileBase64(reader.result as string);
            setSourceText(`[Document: ${file.name}]`);
            setCharCount(file.size);
          }
        } catch {
          setSourceText(`[Document: ${file.name}]`);
          setCharCount(file.size);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // ── Cancel Generation Handler ─────────────────────────────────────────
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
    setIsGenerating(true);
    setCharCount(textContent.length || selectedFile?.size || 0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // 1. Compute deterministic content hash for cache check
      const computedHash = await computeContentHash(textContent, activeLang);
      console.log(`[AI Generation] Content Hash: ${computedHash}`);

      // 2. Check Master Quiz Cache
      const { hit, masterQuiz } = await checkMasterQuizCache(computedHash, activeLang);

      if (abortController.signal.aborted) return;

      if (hit && masterQuiz && masterQuiz.sourceText) {
        console.log(`[AI Generation] ⚡ Cache HIT for master quiz: ${masterQuiz.id}`);
        const parsed = parseQstText(masterQuiz.sourceText);

        if (parsed && (parsed.questions.length > 0 || parsed.flashcards.length > 0)) {
          const localId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const quizTitle = title.trim() || masterQuiz.title || "Generated Quiz";

          const newQuizRecord: QuizRecord = {
            id: localId,
            masterQuizId: masterQuiz.id,
            master_quiz_id: masterQuiz.id,
            title: quizTitle,
            category: masterQuiz.category || category || "AI Generated",
            questions: parsed.questions.length,
            questionsList: parsed.questions,
            flashcards: parsed.flashcards,
            sourceText: masterQuiz.sourceText,
            attempts: [],
            wrongQuestions: [],
            uniqueCorrectIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          // Check if already in user library
          const localQuizzes = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
          let existingQuiz = localQuizzes.find(
            (q) => q.masterQuizId === masterQuiz.id || q.master_quiz_id === masterQuiz.id
          );

          if (!existingQuiz) {
            const newFp = await computeQuizFingerprint(newQuizRecord);
            for (const q of localQuizzes) {
              const curFp = await computeQuizFingerprint(q);
              if (curFp && curFp === newFp) {
                existingQuiz = q;
                break;
              }
            }
          }

          let quizToOpenId = localId;

          if (existingQuiz) {
            const merged = mergeQuizPersonalState(existingQuiz, [newQuizRecord]);
            quizToOpenId = existingQuiz.id;
            const updated = localQuizzes.map((q) => (q.id === existingQuiz.id ? merged : q));
            setLocalItem("quizzes", updated);
          } else {
            setLocalItem("quizzes", [newQuizRecord, ...localQuizzes.filter((q) => q.id !== localId)]);
            if (user?.uid) {
              createQuiz({
                id: localId,
                userId: user.uid,
                masterQuizId: masterQuiz.id,
                title: quizTitle,
                category: category || "AI Generated",
                questionCount: parsed.questions.length,
                sourceText: masterQuiz.sourceText,
                questionsList: parsed.questions,
                flashcards: parsed.flashcards,
              }).catch(() => {});
            }
          }

          setIsGenerating(false);
          showToast(t("generation.instant_load") || "⚡ Instant load · No AI used", {
            icon: "flash",
            color: "#38bdf8",
            durationMs: 3000,
          });

          setTimeout(() => {
            router.push(`/quiz/${quizToOpenId}`);
          }, 300);
          return;
        }
      }

      // 3. Cache Miss: Fetch App Configuration
      const { config, error: cfgErr } = await fetchAppConfig();
      if (cfgErr || !config) throw new Error(cfgErr ?? "Failed to load AI config");

      if (abortController.signal.aborted) return;

      // 4. Check Daily Limit
      if (user?.uid) {
        const { allowed } = await checkAiDailyLimit(user.uid);
        if (!allowed) {
          throw new Error("You have reached your daily AI generation limit. Please try again tomorrow.");
        }
      }

      const { geminiKey, modelUrl, promptTemplate } = config.aiConfig;

      // 5. Build AI Prompt
      const effectivePrompt = (promptTemplate || "")
        .replace("{sourceText}", textContent.slice(0, 30000))
        .replace("{questionCount}", String(effectiveCount))
        .replace("{includeFlashcards}", String(includeFlashcards))
        .replace("{language}", activeLang);

      const requestBody: any = {
        contents: [
          {
            parts: [{ text: effectivePrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      };

      // Call Gemini API
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

      // Format questions
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

      // Format flashcards
      const formattedFlashcards = parsedFlashcards.map((f: any, i: number) => ({
        id: `f_${Date.now()}_${i + 1}`,
        front: f.front || f.term || "",
        back: f.back || f.definition || "",
      }));

      const quizTitle = title.trim() || selectedFile?.name.replace(/\.[^.]+$/, "") || "Generated Quiz";
      const masterSourceText = questionsToSourceText(quizTitle, category, formattedQuestions, formattedFlashcards);

      // 6. Save Master Quiz Cache asynchronously
      saveMasterQuiz({
        contentHash: computedHash,
        language: activeLang,
        title: quizTitle,
        category,
        questionCount: formattedQuestions.length,
        flashcardCount: formattedFlashcards.length,
        sourceText: masterSourceText,
        userId: user?.uid,
      }).catch((e) => console.warn("[MasterCache] Save failed:", e));

      // 7. Save to User Library
      const localId = `ai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const newQuiz: QuizRecord = {
        id: localId,
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
        padding: "36px 24px 80px",
        maxWidth: 860,
        margin: "0 auto",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <AIGenerationModal
        isOpen={isGenerating}
        documentCharCount={charCount}
        onCancel={handleCancelGeneration}
      />

      <header style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(135deg, #6366f1, #34d399)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
            }}
          >
            ✨
          </div>
          <div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "-0.6px",
              }}
            >
              {t("create_menu.ai_generate") || "Generate Quiz & Flashcards"}
            </h1>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "4px 0 0" }}>
              Upload any PDF, document, slides, or paste your notes to start.
            </p>
          </div>
        </div>
      </header>

      {errorMsg && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 14,
            padding: "14px 18px",
            color: "#f87171",
            fontSize: 14,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Container */}
      <div
        style={{
          background: "#0f1423",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 24,
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Title Input */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#a5b4fc",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            Quiz Title
          </label>
          <input
            type="text"
            placeholder="e.g. Cellular Biology & Metabolism"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 14,
              padding: "14px 18px",
              color: "#ffffff",
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Upload Zone */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "#a5b4fc",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            Document or Notes
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.pptx,.ppt,image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed rgba(99, 102, 241, 0.35)",
              borderRadius: 18,
              padding: "28px 20px",
              textAlign: "center",
              cursor: "pointer",
              background: selectedFile ? "rgba(99, 102, 241, 0.08)" : "rgba(255, 255, 255, 0.02)",
              transition: "all 0.2s ease",
              marginBottom: 16,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#6366f1";
              e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.35)";
              e.currentTarget.style.background = selectedFile
                ? "rgba(99, 102, 241, 0.08)"
                : "rgba(255, 255, 255, 0.02)";
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {selectedFile ? "📄" : "📁"}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
              {selectedFile ? selectedFile.name : "Click or drag document to upload"}
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              {selectedFile
                ? `Ready • ${(selectedFile.size / 1024).toFixed(1)} KB`
                : "Supports PDF, DOCX, TXT, PPTX & Images"}
            </div>
          </div>

          <div style={{ textAlign: "center", margin: "10px 0", color: "#6b7280", fontSize: 13 }}>
            — {t("common.or") || "or paste your text directly"} —
          </div>

          <textarea
            rows={6}
            placeholder="Paste your study notes, articles, or lecture transcripts here..."
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              setCharCount(e.target.value.length);
            }}
            style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 14,
              padding: "14px 18px",
              color: "#ffffff",
              fontSize: 14,
              lineHeight: 1.6,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Options Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {/* Question Count */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#a5b4fc",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              Number of Questions
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {QUESTION_PRESETS.map((cnt) => {
                const active = !useCustomCount && questionCount === cnt;
                return (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setUseCustomCount(false);
                      setQuestionCount(cnt);
                    }}
                    style={{
                      flex: 1,
                      minWidth: 48,
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: active ? "1px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.1)",
                      background: active ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      color: active ? "#ffffff" : "#9ca3af",
                      fontWeight: active ? 700 : 500,
                      fontSize: 14,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {cnt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language Selector */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#a5b4fc",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}
            >
              Generation Language
            </label>
            <select
              value={activeLang}
              onChange={(e) => setActiveLang(e.target.value as any)}
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 14,
                padding: "12px 16px",
                color: "#ffffff",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="en" style={{ background: "#111827" }}>English</option>
              <option value="ru" style={{ background: "#111827" }}>Русский (Russian)</option>
              <option value="kk" style={{ background: "#111827" }}>Қазақша (Kazakh)</option>
              <option value="es" style={{ background: "#111827" }}>Español (Spanish)</option>
              <option value="fr" style={{ background: "#111827" }}>Français (French)</option>
              <option value="hi" style={{ background: "#111827" }}>हिन्दी (Hindi)</option>
            </select>
          </div>
        </div>

        {/* Flashcards Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 16,
            cursor: "pointer",
          }}
          onClick={() => setIncludeFlashcards(!includeFlashcards)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>🃏</span>
            <div>
              <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 15 }}>
                Include Memory Flashcards
              </div>
              <div style={{ color: "#9ca3af", fontSize: 13 }}>
                Generate key terms with SuperMemo-2 spaced repetition
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={includeFlashcards}
            onChange={(e) => setIncludeFlashcards(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: "#6366f1", cursor: "pointer" }}
          />
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            border: "none",
            borderRadius: 16,
            padding: "18px 28px",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 800,
            cursor: isGenerating ? "not-allowed" : "pointer",
            boxShadow: "0 12px 32px rgba(99, 102, 241, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginTop: 8,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (!isGenerating) e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <span>⚡</span>
          <span>Generate Quiz & Flashcards</span>
        </button>
      </div>
    </div>
  );
}

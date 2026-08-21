import { parseQstText } from "@/lib/qstParser";

export interface GenerateQuizParams {
  aiConfig: {
    geminiKey: string;
    modelUrl: string;
    promptTemplate?: string;
  };
  textContent: string;
  fileBase64: string | null;
  selectedFile?: { name: string; type?: string } | null;
  effectiveCount: number;
  includeFlashcards: boolean;
  activeLang: string;
  signal?: AbortSignal;
}

export interface FormattedGeneratedQuiz {
  questions: Array<{
    id: string;
    question: string;
    prompt: string;
    explanation: string;
    answers: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
  }>;
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
  }>;
}

/**
 * Builds the effective prompt string with template variables.
 */
export function buildGenerationPrompt(
  promptTemplate: string | undefined,
  sourceText: string,
  questionCount: number,
  includeFlashcards: boolean,
  language: string
): string {
  let effectivePrompt = (promptTemplate || "")
    .replace("{sourceText}", sourceText.slice(0, 30000))
    .replace("{questionCount}", String(questionCount))
    .replace("{includeFlashcards}", String(includeFlashcards))
    .replace("{language}", language);

  if (!promptTemplate?.includes("{language}")) {
    effectivePrompt += `\nImportant: Generate all questions, options, explanations, and flashcards in "${language}" language.`;
  }

  return effectivePrompt;
}

/**
 * Parses raw AI output text into formatted questions and flashcards.
 */
export function parseAIResponse(rawText: string): {
  parsedQuestions: any[];
  parsedFlashcards: any[];
} {
  try {
    const clean = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const json = JSON.parse(clean);
    return {
      parsedQuestions: Array.isArray(json.questions) ? json.questions : [],
      parsedFlashcards: Array.isArray(json.flashcards) ? json.flashcards : [],
    };
  } catch {
    const qstFallback = parseQstText(rawText);
    return {
      parsedQuestions: qstFallback.questions || [],
      parsedFlashcards: qstFallback.flashcards || [],
    };
  }
}

/**
 * Decoupled Gemini AI generation service.
 * Handles payload assembly, fetch execution, and response normalization.
 */
export async function generateQuizWithGemini(
  params: GenerateQuizParams
): Promise<FormattedGeneratedQuiz> {
  const {
    aiConfig,
    textContent,
    fileBase64,
    selectedFile,
    effectiveCount,
    includeFlashcards,
    activeLang,
    signal,
  } = params;

  if (!aiConfig?.geminiKey || !aiConfig?.modelUrl) {
    throw new Error("AI service temporarily unavailable. Please try again later.");
  }

  const effectivePrompt = buildGenerationPrompt(
    aiConfig.promptTemplate,
    fileBase64 ? "" : textContent,
    effectiveCount,
    includeFlashcards,
    activeLang
  );

  const parts: any[] = [];
  if (fileBase64) {
    const mime =
      selectedFile?.type ||
      (selectedFile?.name?.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const base64Data = fileBase64.includes(",")
      ? fileBase64.split(",")[1]
      : fileBase64;
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

  const requestBody = {
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

  const geminiRes = await fetch(aiConfig.modelUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": aiConfig.geminiKey,
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!geminiRes.ok) {
    throw new Error(`Gemini API error (Status ${geminiRes.status})`);
  }

  const geminiData = await geminiRes.json();
  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  const { parsedQuestions, parsedFlashcards } = parseAIResponse(rawText);

  if (parsedQuestions.length === 0 && parsedFlashcards.length === 0) {
    throw new Error("AI generated no questions. Please provide more detailed notes.");
  }

  const timestamp = Date.now();
  const formattedQuestions = parsedQuestions.map((q: any, i: number) => ({
    id: `q_${timestamp}_${i + 1}`,
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
    id: `f_${timestamp}_${i + 1}`,
    front: f.front || f.term || "",
    back: f.back || f.definition || "",
  }));

  return {
    questions: formattedQuestions,
    flashcards: formattedFlashcards,
  };
}

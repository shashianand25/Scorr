import React from "react";

export interface ParsedQuestionAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface ParsedQuestion {
  id: string;
  prompt: string;
  question?: string;
  answers: ParsedQuestionAnswer[];
  type?: "single_choice" | "multiple_choice";
  imageUrl?: string;
  explanation?: string;
}

export interface ParsedFlashcard {
  id: string;
  front: string;
  back: string;
}

export interface ParsedQuizResult {
  title: string;
  category: string;
  questions: ParsedQuestion[];
  flashcards: ParsedFlashcard[];
}

export function parseQstText(text: string): ParsedQuizResult {
  if (!text || typeof text !== "string") {
    return { title: "", category: "General", questions: [], flashcards: [] };
  }

  const lines = text.split(/\r?\n/);
  let title = "";
  let category = "General";
  const questions: ParsedQuestion[] = [];
  const flashcards: ParsedFlashcard[] = [];

  let currentQuestion: any = null;
  let currentFlashcard: any = null;
  let currentSection: "NONE" | "FLASHCARDS" | "MCQS" = "NONE";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let nextSection: "NONE" | "FLASHCARDS" | "MCQS" = currentSection;

    if (trimmed.startsWith("===") && trimmed.endsWith("===")) {
      const sec = trimmed.replace(/=/g, "").trim().toUpperCase();
      if (sec === "FLASHCARDS") {
        nextSection = "FLASHCARDS";
      } else if (sec === "MCQS") {
        nextSection = "MCQS";
      }
    } else if (trimmed.startsWith("@")) {
      const parts = trimmed.substring(1).split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const val = parts.slice(1).join(":").trim();
        if (key === "title") title = val;
        if (key === "category") category = val;
      }
      continue;
    } else {
      if (trimmed.startsWith("=")) {
        nextSection = "FLASHCARDS";
      } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        nextSection = "MCQS";
      } else if (trimmed.startsWith("#")) {
        nextSection = "FLASHCARDS";
      } else if (trimmed.startsWith("?")) {
        nextSection = "MCQS";
      } else if (trimmed.startsWith("+")) {
        nextSection = "MCQS";
      }
    }

    if (nextSection !== currentSection) {
      if (currentSection === "FLASHCARDS" && currentFlashcard) {
        flashcards.push(currentFlashcard);
        currentFlashcard = null;
      } else if (currentSection === "MCQS" && currentQuestion) {
        questions.push(currentQuestion);
        currentQuestion = null;
      }
      currentSection = nextSection;
    }

    if (trimmed.startsWith("===") && trimmed.endsWith("===")) {
      continue;
    }

    if (currentSection === "FLASHCARDS") {
      if (trimmed.startsWith("#") || trimmed.startsWith("?")) {
        if (currentFlashcard) flashcards.push(currentFlashcard);
        currentFlashcard = {
          id: `f-${flashcards.length + 1}`,
          front: trimmed.substring(1).trim(),
          back: "",
        };
      } else if ((trimmed.startsWith("=") || trimmed.startsWith("+")) && currentFlashcard) {
        currentFlashcard.back += (currentFlashcard.back ? " " : "") + trimmed.substring(1).trim();
      } else if (currentFlashcard) {
        if (currentFlashcard.back) {
          currentFlashcard.back += " " + trimmed;
        } else {
          currentFlashcard.front += " " + trimmed;
        }
      }
    } else if (currentSection === "MCQS") {
      if (trimmed.startsWith("?") || trimmed.startsWith("#")) {
        if (currentQuestion) questions.push(currentQuestion);
        currentQuestion = {
          id: `q-${questions.length + 1}`,
          prompt: trimmed.substring(1).trim(),
          question: trimmed.substring(1).trim(),
          answers: [],
          type: "single_choice",
        };
      } else if (trimmed.startsWith("[Image:") && trimmed.endsWith("]")) {
        const url = trimmed.substring(7, trimmed.length - 1).trim();
        if (currentQuestion) currentQuestion.imageUrl = url;
      } else if (currentQuestion) {
        if (trimmed.startsWith("+")) {
          currentQuestion.answers.push({
            id: `a-${currentQuestion.id}-${currentQuestion.answers.length + 1}`,
            text: trimmed.substring(1).trim(),
            isCorrect: true,
          });
        } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          currentQuestion.answers.push({
            id: `a-${currentQuestion.id}-${currentQuestion.answers.length + 1}`,
            text: trimmed.substring(1).trim(),
            isCorrect: false,
          });
        } else {
          if (currentQuestion.answers.length > 0) {
            currentQuestion.answers[currentQuestion.answers.length - 1].text += ` ${trimmed}`;
          } else {
            currentQuestion.prompt += ` ${trimmed}`;
            currentQuestion.question = currentQuestion.prompt;
          }
        }
      }
    }
  }

  if (currentQuestion) questions.push(currentQuestion);
  if (currentFlashcard) flashcards.push(currentFlashcard);

  for (const q of questions) {
    const correctCount = q.answers.filter((a) => a.isCorrect).length;
    q.type = correctCount > 1 ? "multiple_choice" : "single_choice";
    if (!q.question) q.question = q.prompt;
  }

  return { title, category, questions, flashcards };
}

export function questionsToSourceText(
  title: string,
  category: string,
  qs: any[],
  flashcards?: any[]
): string {
  let header = `@title: ${title}\n@category: ${category}\n\n`;
  let body = "";

  if (flashcards && flashcards.length > 0) {
    body += "===FLASHCARDS===\n\n";
    body += flashcards.map((f: any) => `# ${f.front}\n= ${f.back}`).join("\n\n");
    body += "\n\n";
  }

  if (Array.isArray(qs) && qs.length > 0) {
    body += "===MCQS===\n\n";
    body += qs
      .map((q: any) => {
        const text = q.prompt || q.question || "";
        if (Array.isArray(q.answers)) {
          const opts = q.answers.map((a: any) => `${a.isCorrect ? "+" : "-"} ${a.text}`).join("\n");
          return `? ${text}\n${opts}`;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }

  return header + body;
}

export function renderFormattedText(text: string): React.ReactNode {
  if (!text) return null;

  const inlineRegex = /(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|<span style="color:#ef4444">.*?<\/span>|\$\$.*?\$\$|---)/g;

  const renderInline = (segment: string, keyPrefix: string) =>
    segment.split(inlineRegex).map((part, i) => {
      if (!part) return null;
      const key = `${keyPrefix}-${i}`;
      if (part === "---") return <span key={key} className="opacity-25 block my-2">──────────</span>;
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={key} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      if (part.startsWith("$$") && part.endsWith("$$"))
        return <code key={key} className="font-mono text-purple-400 italic bg-purple-950/40 px-1 py-0.5 rounded">{part.slice(2, -2)}</code>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={key} className="italic">{part.slice(1, -1)}</em>;
      if (part.startsWith("<u>") && part.endsWith("</u>"))
        return <span key={key} className="underline">{part.slice(3, -4)}</span>;
      if (part.startsWith('<span style="color:#ef4444">') && part.endsWith("</span>"))
        return <span key={key} className="text-red-500 font-semibold">{part.slice(28, -7)}</span>;
      return <span key={key}>{part}</span>;
    });

  const lines = text.split("\n");
  if (lines.length === 1) {
    return <span className="leading-relaxed">{renderInline(text, "l0")}</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, idx) => (
        <span key={idx} className="leading-relaxed">
          {renderInline(line.trim() || " ", `l${idx}`)}
        </span>
      ))}
    </div>
  );
}

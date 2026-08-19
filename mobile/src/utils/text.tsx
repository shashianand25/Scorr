import React from "react";
import { Text, Platform } from "react-native";

// Serialize questionsList and flashcards → compact QST text
export const questionsToSourceText = (title: string, category: string, qs: any[], flashcards?: any[]): string => {
  let header = `@title: ${title}\n@category: ${category}\n\n`;
  let body = "";

  if (flashcards && flashcards.length > 0) {
    body += "===FLASHCARDS===\n\n";
    body += flashcards.map((f: any) => `# ${f.front}\n= ${f.back}`).join('\n\n');
    body += "\n\n";
  }

  if (Array.isArray(qs) && qs.length > 0) {
    body += "===MCQS===\n\n";
    body += qs.map((q: any) => {
      if (q.prompt && Array.isArray(q.answers)) {
        const opts = q.answers.map((a: any) => `${a.isCorrect ? '+' : '-'} ${a.text}`).join('\n');
        return `? ${q.prompt}\n${opts}`;
      }
      if (q.question && q.options) {
        const opts = Object.entries(q.options).map(([k, v]) =>
          `${k === q.answer ? '+' : '-'} ${v}`
        ).join('\n');
        return `? ${q.question}\n${opts}`;
      }
      return '';
    }).filter(Boolean).join('\n\n');
  }
  
  return header + body;
};

export const renderFormattedText = (text: string, baseStyle?: any) => {
  if (!text) return null;

  // Inline markdown regex (no newlines captured here)
  const inlineRegex = /(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|<span style="color:#ef4444">.*?<\/span>|<span style="font-size:20px">.*?<\/span>|\$\$.*?\$\$|---)/g;

  const renderInline = (segment: string, keyPrefix: string) =>
    segment.split(inlineRegex).map((part, i) => {
      if (!part) return null;
      const key = `${keyPrefix}-${i}`;
      if (part === '---') return React.createElement(Text, { key, style: { opacity: 0.2 } }, '──────────');
      if (part.startsWith('**') && part.endsWith('**')) return React.createElement(Text, { key, style: { fontWeight: 'bold' } }, part.slice(2, -2));
      if (part.startsWith('$$') && part.endsWith('$$')) return React.createElement(Text, { key, style: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontStyle: 'italic', color: '#a855f7' } }, part.slice(2, -2));
      if (part.startsWith('*') && part.endsWith('*')) return React.createElement(Text, { key, style: { fontStyle: 'italic' } }, part.slice(1, -1));
      if (part.startsWith('<u>') && part.endsWith('</u>')) return React.createElement(Text, { key, style: { textDecorationLine: 'underline' } }, part.slice(3, -4));
      if (part.startsWith('<span style="color:#ef4444">') && part.endsWith('</span>')) return React.createElement(Text, { key, style: { color: '#ef4444' } }, part.slice(28, -7));
      if (part.startsWith('<span style="font-size:20px">') && part.endsWith('</span>')) return React.createElement(Text, { key, style: { fontSize: (baseStyle?.fontSize || 16) + 6 } }, part.slice(29, -7));
      return React.createElement(Text, { key }, part);
    });

  // Split on newlines → render each line as its own Text block so spacing is consistent
  const lines = text.split('\n');
  if (lines.length === 1) {
    // Single line — keep the original inline wrapper
    return React.createElement(Text, { style: baseStyle }, renderInline(text, 'l0'));
  }

  // Multi-line — wrap in a View so each line is its own block (no inline spacing weirdness)
  return React.createElement(
    (require('react-native').View as any),
    { style: { gap: 4 } },
    lines.map((line, idx) =>
      React.createElement(
        Text,
        { key: idx, style: [baseStyle, idx > 0 && { marginTop: 2 }] },
        renderInline(line.trim() || ' ', `l${idx}`)
      )
    )
  );
};


export function parseQstText(text: string): { title: string; category: string; questions: any[]; flashcards: any[] } {
  const lines = text.split(/\r?\n/);
  let title = "";
  let category = "General";
  const questions: any[] = [];
  const flashcards: any[] = [];
  
  let currentQuestion: any = null;
  let currentFlashcard: any = null;
  let currentSection: "NONE" | "FLASHCARDS" | "MCQS" = "NONE";

  for (let line of lines) {
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
      // Dynamic section transitions based on line symbols
      if (trimmed.startsWith("=")) {
        nextSection = "FLASHCARDS";
      } else if (trimmed.startsWith("-")) {
        nextSection = "MCQS";
      } else if (trimmed.startsWith("#")) {
        // Standard: # starts flashcard
        nextSection = "FLASHCARDS";
      } else if (trimmed.startsWith("?")) {
        // Standard: ? starts MCQ
        nextSection = "MCQS";
      } else if (trimmed.startsWith("+")) {
        // Option starting with + starts MCQ
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
          answers: [],
          type: "single_choice",
        };
      } else if (trimmed.startsWith("[Image:") && trimmed.endsWith("]")) {
        const url = trimmed.substring(7, trimmed.length - 1).trim();
        if (currentQuestion) currentQuestion.imageUrl = url;
      } else if (currentQuestion) {
        if (trimmed.startsWith("+")) {
          currentQuestion.answers.push({ id: `a-${currentQuestion.id}-${currentQuestion.answers.length + 1}`, text: trimmed.substring(1).trim(), isCorrect: true });
        } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
          currentQuestion.answers.push({ id: `a-${currentQuestion.id}-${currentQuestion.answers.length + 1}`, text: trimmed.substring(1).trim(), isCorrect: false });
        } else {
          if (currentQuestion.answers.length > 0) {
            currentQuestion.answers[currentQuestion.answers.length - 1].text += ` ${trimmed}`;
          } else {
            currentQuestion.prompt += ` ${trimmed}`;
          }
        }
      }
    }
  }

  if (currentQuestion) questions.push(currentQuestion);
  if (currentFlashcard) flashcards.push(currentFlashcard);

  for (let q of questions) {
    const correctCount = q.answers.filter((a: any) => a.isCorrect).length;
    q.type = correctCount > 1 ? "multiple_choice" : "single_choice";
    if (q.answers && q.answers.length > 1) {
      q.answers = [...q.answers].sort(() => Math.random() - 0.5);
    }
  }

  return { title, category, questions, flashcards };
}

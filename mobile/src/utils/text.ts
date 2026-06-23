import React from "react";
import { Text, Platform } from "react-native";

// Serialize questionsList → compact QST text (? prompt \n + correct \n - wrong)
export const questionsToSourceText = (title: string, category: string, qs: any[]): string => {
  if (!Array.isArray(qs) || qs.length === 0) return '';
  const header = `@title: ${title}\n@category: ${category}\n\n`;
  const body = qs.map((q: any) => {
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
  return header + body;
};

export const renderFormattedText = (text: string, baseStyle?: any) => {
  if (!text) return null;
  const regex = /(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>|<span style="color:#ef4444">.*?<\/span>|<span style="font-size:20px">.*?<\/span>|\$\$.*?\$\$|---)/g;
  const parts = text.split(regex);
  return (
    React.createElement(Text, { style: baseStyle },
      parts.map((part, i) => {
        if (!part) return null;
        if (part === "---") return React.createElement(Text, { key: i, style: { opacity: 0.2 } }, "\n──────────\n");
        if (part.startsWith("**") && part.endsWith("**")) return React.createElement(Text, { key: i, style: { fontWeight: "bold" } }, part.slice(2, -2));
        if (part.startsWith("$$") && part.endsWith("$$")) return React.createElement(Text, { key: i, style: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontStyle: "italic", color: "#a855f7" } }, part.slice(2, -2));
        if (part.startsWith("*") && part.endsWith("*")) return React.createElement(Text, { key: i, style: { fontStyle: "italic" } }, part.slice(1, -1));
        if (part.startsWith("<u>") && part.endsWith("</u>")) return React.createElement(Text, { key: i, style: { textDecorationLine: "underline" } }, part.slice(3, -4));
        if (part.startsWith('<span style="color:#ef4444">') && part.endsWith('</span>')) return React.createElement(Text, { key: i, style: { color: "#ef4444" } }, part.slice(28, -7));
        if (part.startsWith('<span style="font-size:20px">') && part.endsWith('</span>')) return React.createElement(Text, { key: i, style: { fontSize: (baseStyle?.fontSize || 16) + 6 } }, part.slice(29, -7));
        return React.createElement(Text, { key: i }, part);
      })
    )
  );
};

export function parseQstText(text: string): { title: string; category: string; questions: any[] } {
  const lines = text.split(/\r?\n/);
  let title = "";
  let category = "General";
  const questions: any[] = [];
  let currentQuestion: any = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("@")) {
      const parts = trimmed.substring(1).split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim().toLowerCase();
        const val = parts.slice(1).join(":").trim();
        if (key === "title") title = val;
        if (key === "category") category = val;
      }
      continue;
    }

    if (trimmed.startsWith("?")) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = {
        id: `q-${questions.length + 1}`,
        prompt: trimmed.substring(1).trim(),
        answers: [],
        type: "single_choice",
      };
      continue;
    }

    if (trimmed.startsWith("[Image:") && trimmed.endsWith("]")) {
      const url = trimmed.substring(7, trimmed.length - 1).trim();
      if (currentQuestion) currentQuestion.imageUrl = url;
      continue;
    }

    if (currentQuestion) {
      if (trimmed.startsWith("+")) {
        currentQuestion.answers.push({ id: `a-${currentQuestion.id}-${currentQuestion.answers.length + 1}`, text: trimmed.substring(1).trim(), isCorrect: true });
      } else if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        currentQuestion.answers.push({ id: `a-${currentQuestion.id}-${currentQuestion.answers.length + 1}`, text: trimmed.substring(1).trim(), isCorrect: false });
      }
    }
  }

  if (currentQuestion) questions.push(currentQuestion);

  for (let q of questions) {
    const correctCount = q.answers.filter((a: any) => a.isCorrect).length;
    q.type = correctCount > 1 ? "multiple_choice" : "single_choice";
  }

  return { title, category, questions };
}

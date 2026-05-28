import type { QstDocument } from "./types";

export function exportQst(document: QstDocument) {
  const metadata = Object.entries(document.metadata)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `@${toSnake(key)}: ${Array.isArray(value) ? value.join(", ") : String(value)}`);

  const questions = document.questions.map((question) => {
    const answers = question.answers.map((answer) => `${answer.isCorrect ? "+" : "-"} ${escapeQst(answer.text)}`);
    return [`? ${escapeQst(question.prompt)}`, ...answers].join("\n");
  });

  return [...metadata, "", ...questions].join("\n\n").trim();
}

export function exportMarkdown(document: QstDocument) {
  const title = document.metadata.title ? `# ${document.metadata.title}\n\n` : "";
  const questions = document.questions
    .map((question, index) => {
      const answers = question.answers
        .map((answer) => `- [${answer.isCorrect ? "x" : " "}] ${answer.text}`)
        .join("\n");
      return `## ${index + 1}. ${question.prompt}\n\n${answers}`;
    })
    .join("\n\n");
  return `${title}${questions}`;
}

export function exportJson(document: QstDocument) {
  return JSON.stringify(document, null, 2);
}

function escapeQst(value: string) {
  return value.replace(/^([?+\-*#@])/gmu, "\\$1");
}

function toSnake(value: string) {
  return value.replace(/[A-Z]/gu, (match) => `_${match.toLowerCase()}`);
}

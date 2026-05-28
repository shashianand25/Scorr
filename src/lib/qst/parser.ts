import { createHash } from "crypto";
import { z } from "zod";
import type { QstAnswer, QstDocument, QstIssue, QstMetadata, QstParseResult, QstQuestion } from "./types";

const metadataPattern = /^@(?<key>[A-Za-z][\w.-]*)\s*:\s*(?<value>.*)$/u;
const questionPattern = /^\?\s*(?<text>.*)$/u;
const correctPattern = /^\+\s*(?<text>.*)$/u;
const wrongPattern = /^[-*]\s*(?<text>.*)$/u;
const commentPattern = /^\s*#/u;
const imagePattern = /!\[[^\]]*\]\((?<url>https?:\/\/[^\s)]+)\)|(?<plain>https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|svg))(?:\s|$)/iu;

const metadataSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  timeLimit: z.number().int().positive().optional(),
  shuffle: z.boolean().optional(),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]).optional(),
  negativeMarking: z.number().min(0).optional(),
  visibility: z.enum(["public", "private", "unlisted"]).optional(),
});

const metadataKeyMap: Record<string, keyof QstMetadata> = {
  title: "title",
  description: "description",
  category: "category",
  tags: "tags",
  tag: "tags",
  time_limit: "timeLimit",
  timeLimit: "timeLimit",
  shuffle: "shuffle",
  difficulty: "difficulty",
  negative_marking: "negativeMarking",
  visibility: "visibility",
};

export function parseQst(input: string): QstParseResult {
  const normalized = input.replace(/^\uFEFF/u, "").replace(/\r\n?/gu, "\n");
  const lines = normalized.split("\n");
  const metadata: QstMetadata = {};
  const questions: QstQuestion[] = [];
  const issues: QstIssue[] = [];
  let current: QstQuestion | undefined;

  const pushIssue = (issue: QstIssue) => issues.push(issue);

  const finalize = (question: QstQuestion | undefined) => {
    if (!question) return;
    normalizeLegacyStarMarkers(question);
    const prompt = question.prompt.trim();
    if (!prompt) {
      pushIssue({
        code: "EMPTY_QUESTION",
        line: question.line,
        message: "Question prompt cannot be empty.",
        severity: "error",
      });
    }
    if (question.answers.length === 0 && question.type !== "fill_blank") {
      pushIssue({
        code: "QUESTION_WITHOUT_ANSWERS",
        line: question.line,
        message: "Question must include at least one answer.",
        severity: "error",
      });
    }
    if (question.answers.length > 0 && !question.answers.some((answer) => answer.isCorrect)) {
      pushIssue({
        code: "QUESTION_WITHOUT_CORRECT_ANSWER",
        line: question.line,
        message: "Question must include at least one correct answer marked with '+'.",
        severity: "error",
      });
    }
    const seen = new Map<string, QstAnswer>();
    for (const answer of question.answers) {
      const normalizedAnswer = normalizeAnswer(answer.text);
      const duplicate = seen.get(normalizedAnswer);
      if (duplicate) {
        pushIssue({
          code: "DUPLICATE_ANSWER",
          line: answer.line,
          message: `Duplicate answer "${answer.text}" also appears on line ${duplicate.line}.`,
          severity: "error",
        });
      } else {
        seen.set(normalizedAnswer, answer);
      }
    }
    question.type = inferType(question);
    question.imageUrl = extractImageUrl(question.prompt);
    questions.push({ ...question, prompt });
  };

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || commentPattern.test(trimmed)) return;

    const metadataMatch = trimmed.match(metadataPattern);
    if (metadataMatch?.groups) {
      if (current) {
        pushIssue({
          code: "INVALID_METADATA",
          line: lineNumber,
          message: "Metadata must appear before questions.",
          severity: "warning",
        });
      }
      assignMetadata(metadata, metadataMatch.groups.key, metadataMatch.groups.value, lineNumber, pushIssue);
      return;
    }

    const questionMatch = trimmed.match(questionPattern);
    if (questionMatch?.groups) {
      finalize(current);
      current = {
        id: stableId(`q:${lineNumber}:${questionMatch.groups.text}`),
        prompt: unescapeQst(questionMatch.groups.text),
        line: lineNumber,
        type: "single_choice",
        answers: [],
        tags: [],
      };
      return;
    }

    const correctMatch = trimmed.match(correctPattern);
    const wrongMatch = trimmed.match(wrongPattern);
    if (correctMatch?.groups || wrongMatch?.groups) {
      if (!current) {
        pushIssue({
          code: "ANSWER_WITHOUT_QUESTION",
          line: lineNumber,
          message: "Answer appeared before any question.",
          severity: "error",
        });
        return;
      }
      const groups = correctMatch?.groups ?? wrongMatch?.groups;
      const text = unescapeQst(groups?.text ?? "");
      current.answers.push({
        id: stableId(`a:${current.line}:${lineNumber}:${text}`),
        text,
        isCorrect: Boolean(correctMatch),
        line: lineNumber,
        marker: correctMatch ? "+" : trimmed.startsWith("*") ? "*" : "-",
      });
      return;
    }

    if (current) {
      current.prompt = `${current.prompt}\n${unescapeQst(rawLine.trimEnd())}`;
      return;
    }

    pushIssue({
      code: "UNKNOWN_LINE",
      line: lineNumber,
      message: `Unrecognized QST syntax: ${trimmed}`,
      severity: "warning",
    });
  });

  finalize(current);

  const checked = metadataSchema.safeParse(metadata);
  if (!checked.success) {
    for (const issue of checked.error.issues) {
      pushIssue({
        code: "INVALID_METADATA",
        line: 1,
        message: `Invalid metadata "${issue.path.join(".")}": ${issue.message}`,
        severity: "error",
      });
    }
  }

  const data: QstDocument = { metadata, questions };
  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    data,
    issues,
  };
}

export function normalizeQstJson(document: QstDocument) {
  return {
    metadata: document.metadata,
    questions: document.questions.map((question, questionIndex) => ({
      order: questionIndex,
      type: question.type,
      prompt: question.prompt,
      imageUrl: question.imageUrl,
      explanation: question.explanation,
      tags: question.tags,
      difficulty: question.difficulty ?? document.metadata.difficulty ?? "medium",
      timeLimit: question.timeLimit ?? document.metadata.timeLimit,
      answers: question.answers.map((answer, answerIndex) => ({
        order: answerIndex,
        text: answer.text,
        isCorrect: answer.isCorrect,
      })),
    })),
  };
}

function assignMetadata(
  metadata: QstMetadata,
  rawKey: string,
  rawValue: string,
  line: number,
  pushIssue: (issue: QstIssue) => void,
) {
  const key = metadataKeyMap[rawKey] ?? metadataKeyMap[rawKey.toLowerCase()];
  if (!key) {
    pushIssue({
      code: "UNKNOWN_METADATA",
      line,
      message: `Unknown metadata key "${rawKey}" preserved as custom metadata.`,
      severity: "warning",
    });
    metadata[rawKey] = rawValue;
    return;
  }
  metadata[key] = coerceMetadataValue(key, rawValue);
}

function coerceMetadataValue(key: keyof QstMetadata, value: string) {
  const trimmed = unescapeQst(value.trim());
  if (key === "tags") return trimmed.split(",").map((tag) => tag.trim()).filter(Boolean);
  if (key === "timeLimit" || key === "negativeMarking") return Number(trimmed);
  if (key === "shuffle") return /^(true|yes|1)$/iu.test(trimmed);
  if (key === "difficulty" || key === "visibility") return trimmed.toLowerCase();
  return trimmed;
}

function inferType(question: QstQuestion): QstQuestion["type"] {
  if (/\{\{blank\}\}|_{3,}|\[\s*blank\s*\]/iu.test(question.prompt)) return "fill_blank";
  const correctCount = question.answers.filter((answer) => answer.isCorrect).length;
  const normalizedAnswers = question.answers.map((answer) => normalizeAnswer(answer.text));
  if (normalizedAnswers.length === 2 && normalizedAnswers.includes("true") && normalizedAnswers.includes("false")) {
    return "true_false";
  }
  return correctCount > 1 ? "multiple_choice" : "single_choice";
}

function normalizeLegacyStarMarkers(question: QstQuestion) {
  const hasPlus = question.answers.some((answer) => answer.marker === "+");
  const hasDash = question.answers.some((answer) => answer.marker === "-");
  const hasStar = question.answers.some((answer) => answer.marker === "*");
  if (!hasPlus && hasDash && hasStar) {
    question.answers = question.answers.map((answer) => (answer.marker === "*" ? { ...answer, isCorrect: true } : answer));
  }
}

function normalizeAnswer(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase();
}

function extractImageUrl(text: string) {
  const match = text.match(imagePattern);
  return match?.groups?.url ?? match?.groups?.plain;
}

function unescapeQst(value: string) {
  return value.replace(/\\([?+\-*#@:\\])/gu, "$1").replace(/\\n/gu, "\n").trim();
}

function stableId(seed: string) {
  return createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

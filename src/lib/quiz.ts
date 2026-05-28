import { nanoid } from "nanoid";
import { prisma } from "./prisma";
import { normalizeQstJson, parseQst } from "./qst/parser";
import type { QstDocument } from "./qst/types";
import { sanitizeText } from "./security";
import { slugify } from "./slug";

const typeMap = {
  single_choice: "SINGLE_CHOICE",
  multiple_choice: "MULTIPLE_CHOICE",
  true_false: "TRUE_FALSE",
  fill_blank: "FILL_BLANK",
} as const;

const difficultyMap = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
  expert: "EXPERT",
} as const;

export async function importQstQuiz(source: string, authorId: string, publish = false) {
  const parsed = parseQst(sanitizeText(source));
  if (!parsed.ok) return { parsed, quiz: null };

  const normalized = normalizeQstJson(parsed.data);
  const title = parsed.data.metadata.title ?? "Untitled Quiz";
  const slug = `${slugify(title) || "quiz"}-${nanoid(6)}`;

  const quiz = await prisma.quiz.create({
    data: {
      title,
      slug,
      description: parsed.data.metadata.description,
      category: parsed.data.metadata.category,
      tags: parsed.data.metadata.tags ?? [],
      timeLimitSec: parsed.data.metadata.timeLimit,
      negativeMarking: Number(parsed.data.metadata.negativeMarking ?? 0),
      shuffleAnswers: Boolean(parsed.data.metadata.shuffle ?? true),
      visibility: publish ? "PUBLIC" : "PRIVATE",
      sourceText: source,
      authorId,
      publishedAt: publish ? new Date() : undefined,
      questions: {
        create: normalized.questions.map((question) => ({
          order: question.order,
          type: typeMap[question.type],
          prompt: question.prompt,
          imageUrl: question.imageUrl,
          explanation: question.explanation,
          tags: question.tags,
          difficulty: difficultyMap[question.difficulty],
          timeLimitSec: question.timeLimit,
          answers: {
            create: question.answers.map((answer) => ({
              order: answer.order,
              text: answer.text,
              isCorrect: answer.isCorrect,
            })),
          },
        })),
      },
    },
    include: { questions: { include: { answers: true }, orderBy: { order: "asc" } } },
  });

  await prisma.analyticsEvent.create({
    data: { type: "quiz.imported", quizId: quiz.id, userId: authorId, metadata: { questions: quiz.questions.length } },
  });

  return { parsed, quiz };
}

export function scoreResponses(
  questions: Array<{ id: string; points: number; negativePoints: number; answers: Array<{ id: string; isCorrect: boolean }> }>,
  responses: Array<{ questionId: string; answerIds: string[] }>,
) {
  let score = 0;
  let maxScore = 0;
  let correct = 0;
  const responseByQuestion = new Map(responses.map((response) => [response.questionId, response]));

  for (const question of questions) {
    maxScore += question.points;
    const correctIds = new Set(question.answers.filter((answer) => answer.isCorrect).map((answer) => answer.id));
    const selectedIds = new Set(responseByQuestion.get(question.id)?.answerIds ?? []);
    const isCorrect = correctIds.size === selectedIds.size && [...correctIds].every((id) => selectedIds.has(id));
    if (isCorrect) {
      score += question.points;
      correct += 1;
    } else if (selectedIds.size) {
      score -= question.negativePoints;
    }
  }

  return {
    score: Math.max(0, score),
    maxScore,
    accuracy: questions.length ? correct / questions.length : 0,
  };
}

export function documentFromQuiz(quiz: {
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  timeLimitSec: number | null;
  shuffleAnswers: boolean;
  negativeMarking: number;
  questions: Array<{
    id: string;
    order: number;
    type: string;
    prompt: string;
    imageUrl: string | null;
    explanation: string | null;
    tags: string[];
    difficulty: string;
    timeLimitSec: number | null;
    answers: Array<{ id: string; order: number; text: string; isCorrect: boolean }>;
  }>;
}): QstDocument {
  return {
    metadata: {
      title: quiz.title,
      description: quiz.description ?? undefined,
      category: quiz.category ?? undefined,
      tags: quiz.tags,
      timeLimit: quiz.timeLimitSec ?? undefined,
      shuffle: quiz.shuffleAnswers,
      negativeMarking: quiz.negativeMarking,
    },
    questions: quiz.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      line: question.order + 1,
      type: question.type.toLowerCase() as QstDocument["questions"][number]["type"],
      imageUrl: question.imageUrl ?? undefined,
      explanation: question.explanation ?? undefined,
      tags: question.tags,
      difficulty: question.difficulty.toLowerCase() as QstDocument["metadata"]["difficulty"],
      timeLimit: question.timeLimitSec ?? undefined,
      answers: question.answers.map((answer) => ({
        id: answer.id,
        text: answer.text,
        isCorrect: answer.isCorrect,
        line: answer.order + 1,
      })),
    })),
  };
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { importQstQuiz } from "@/lib/quiz";
import { enforceCsrf, rateLimit } from "@/lib/security";
import { importQstSchema } from "@/lib/validators";

type AttemptReviewJson = {
  questionCount?: number;
  correct?: number;
  wrong?: number;
  skipped?: number;
  wrongQuestionIds?: string[];
  items?: unknown[];
};

function attemptReview(value: unknown): AttemptReviewJson {
  return value && typeof value === "object" ? value as AttemptReviewJson : {};
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to sync quizzes." }, { status: 401 });

  const quizzes = await prisma.quiz.findMany({
    where: { authorId: session.user.id },
    include: {
      questions: { select: { id: true } },
      attempts: { orderBy: { createdAt: "desc" }, take: 50 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    quizzes: quizzes.map((quiz) => ({
      id: quiz.id,
      remoteId: quiz.id,
      slug: quiz.slug,
      title: quiz.title,
      fileName: `${quiz.title}.qst`,
      source: quiz.sourceText ?? "",
      questionCount: quiz.questions.length,
      category: quiz.category ?? undefined,
      savedAt: quiz.createdAt.getTime(),
      syncedAt: quiz.updatedAt.getTime(),
      attempts: quiz.attempts.map((attempt) => {
        const reviewData = attemptReview(attempt.review);
        const questionCount = reviewData.questionCount ?? 0;
        return {
          id: attempt.id,
          timestamp: attempt.createdAt.getTime(),
          score: Math.round(attempt.score),
          correct: reviewData.correct ?? Math.round((attempt.accuracy ?? 0) * questionCount),
          wrong: reviewData.wrong ?? 0,
          skipped: reviewData.skipped ?? 0,
          duration: (attempt.durationSec ?? 0) * 1000,
          questionCount,
          wrongQuestionIds: reviewData.wrongQuestionIds ?? [],
          review: reviewData.items ?? [],
        };
      }),
    })),
  });
}

export async function POST(request: NextRequest) {
  const csrf = enforceCsrf(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "me-quiz-create");
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to sync quizzes." }, { status: 401 });

  const body = importQstSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Invalid quiz payload", issues: body.error.issues }, { status: 400 });

  const { parsed, quiz } = await importQstQuiz(body.data.source, session.user.id, body.data.publish);
  if (!parsed.ok || !quiz) return NextResponse.json({ error: "QST validation failed", parsed }, { status: 422 });

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      remoteId: quiz.id,
      slug: quiz.slug,
      title: quiz.title,
      fileName: `${quiz.title}.qst`,
      source: quiz.sourceText ?? body.data.source,
      questionCount: quiz.questions.length,
      category: quiz.category ?? undefined,
      savedAt: quiz.createdAt.getTime(),
      syncedAt: Date.now(),
      attempts: [],
    },
  }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enforceCsrf, rateLimit } from "@/lib/security";
import { z } from "zod";

const attemptSchema = z.object({
  timestamp: z.number(),
  score: z.number().min(0).max(100),
  correct: z.number().int().nonnegative(),
  wrong: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  duration: z.number().int().nonnegative(),
  questionCount: z.number().int().nonnegative(),
  wrongQuestionIds: z.array(z.string()).default([]),
  review: z.array(z.object({
    questionId: z.string(),
    prompt: z.string(),
    selectedAnswers: z.array(z.string()),
    correctAnswers: z.array(z.string()),
    explanation: z.string().optional(),
  })).default([]),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = enforceCsrf(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "me-attempt-create");
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to sync attempts." }, { status: 401 });

  const { id } = await params;
  const body = attemptSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Invalid attempt payload", issues: body.error.issues }, { status: 400 });

  const quiz = await prisma.quiz.findFirst({ where: { id, authorId: session.user.id }, select: { id: true } });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const attempt = await prisma.attempt.create({
    data: {
      quizId: quiz.id,
      userId: session.user.id,
      status: "GRADED",
      score: body.data.score,
      maxScore: 100,
      accuracy: body.data.questionCount > 0 ? body.data.correct / body.data.questionCount : 0,
      durationSec: Math.round(body.data.duration / 1000),
      submittedAt: new Date(body.data.timestamp),
      review: {
        questionCount: body.data.questionCount,
        correct: body.data.correct,
        wrong: body.data.wrong,
        skipped: body.data.skipped,
        wrongQuestionIds: body.data.wrongQuestionIds,
        items: body.data.review,
      },
    },
  });

  return NextResponse.json({ attempt });
}

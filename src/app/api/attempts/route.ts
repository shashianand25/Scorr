import { NextRequest, NextResponse } from "next/server";
import { currentUserOrGuest } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { scoreResponses } from "@/lib/quiz";
import { enforceCsrf, rateLimit, sanitizeText } from "@/lib/security";
import { submitAttemptSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const csrf = enforceCsrf(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "attempt-submit");
  if (limited) return limited;

  const body = submitAttemptSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Invalid attempt payload", issues: body.error.issues }, { status: 400 });

  const user = await currentUserOrGuest();
  const quiz = await prisma.quiz.findUnique({
    where: { id: body.data.quizId },
    include: { questions: { include: { answers: true } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const scored = scoreResponses(quiz.questions, body.data.responses);
  const attempt = await prisma.attempt.create({
    data: {
      quizId: quiz.id,
      userId: user.email === "guest@quizforge.local" ? undefined : user.id,
      guestName: body.data.guestName ? sanitizeText(body.data.guestName) : undefined,
      status: "GRADED",
      score: scored.score,
      maxScore: scored.maxScore,
      accuracy: scored.accuracy,
      submittedAt: new Date(),
      responses: {
        create: body.data.responses.map((response) => ({
          questionId: response.questionId,
          answerIds: response.answerIds,
          freeText: response.freeText ? sanitizeText(response.freeText) : undefined,
          durationMs: response.durationMs,
        })),
      },
    },
  });

  await prisma.leaderboardEntry.create({
    data: {
      quizId: quiz.id,
      userId: user.email === "guest@quizforge.local" ? undefined : user.id,
      displayName: body.data.guestName ?? user.name ?? "Guest",
      score: scored.score,
      accuracy: scored.accuracy,
    },
  });

  return NextResponse.json({ attempt, score: scored });
}

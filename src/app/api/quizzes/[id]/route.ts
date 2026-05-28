import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, "quiz-detail");
  if (limited) return limited;
  const { id } = await params;

  const quiz = await prisma.quiz.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      author: { select: { id: true, name: true, image: true, level: true } },
      questions: { include: { answers: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
      _count: { select: { attempts: true, rooms: true, savedBy: true } },
    },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  await prisma.analyticsEvent.create({ data: { type: "quiz.viewed", quizId: quiz.id, metadata: { slug: quiz.slug } } });
  return NextResponse.json({ quiz });
}

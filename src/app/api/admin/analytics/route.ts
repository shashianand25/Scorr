import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!["ADMIN", "MODERATOR"].includes(session?.user?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, quizzes, attempts, reports, popularQuizzes, events] = await Promise.all([
    prisma.user.count(),
    prisma.quiz.count(),
    prisma.attempt.count(),
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.quiz.findMany({
      take: 8,
      include: { _count: { select: { attempts: true, rooms: true } } },
      orderBy: { attempts: { _count: "desc" } },
    }),
    prisma.analyticsEvent.groupBy({ by: ["type"], _count: true, orderBy: { _count: { type: "desc" } }, take: 10 }),
  ]);

  return NextResponse.json({ users, quizzes, attempts, reports, popularQuizzes, events });
}

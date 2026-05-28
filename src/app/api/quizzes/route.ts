import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, "quiz-list");
  if (limited) return limited;

  const search = request.nextUrl.searchParams.get("q") ?? "";
  const cursor = request.nextUrl.searchParams.get("cursor");
  const take = Math.min(Number(request.nextUrl.searchParams.get("take") ?? 20), 50);

  const quizzes = await prisma.quiz.findMany({
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    where: {
      visibility: "PUBLIC",
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { category: { contains: search, mode: "insensitive" } },
              { tags: { has: search.toLowerCase() } },
            ],
          }
        : {}),
    },
    include: {
      author: { select: { name: true, image: true } },
      _count: { select: { questions: true, attempts: true, rooms: true } },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  const nextCursor = quizzes.length > take ? quizzes.pop()?.id : null;
  return NextResponse.json({ quizzes, nextCursor });
}

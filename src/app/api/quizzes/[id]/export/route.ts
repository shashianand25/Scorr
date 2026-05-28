import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportJson, exportMarkdown, exportQst } from "@/lib/qst/exporters";
import { documentFromQuiz } from "@/lib/quiz";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "qst";
  const quiz = await prisma.quiz.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: { questions: { include: { answers: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } } },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const document = documentFromQuiz(quiz);
  const body = format === "json" ? exportJson(document) : format === "md" ? exportMarkdown(document) : exportQst(document);
  const contentType = format === "json" ? "application/json" : "text/plain; charset=utf-8";
  return new NextResponse(body, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${quiz.slug}.${format === "md" ? "md" : format}"`,
    },
  });
}

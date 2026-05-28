import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { enforceCsrf, rateLimit } from "@/lib/security";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = enforceCsrf(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "me-quiz-delete");
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to delete synced quizzes." }, { status: 401 });

  const { id } = await params;
  await prisma.quiz.deleteMany({ where: { id, authorId: session.user.id } });
  return NextResponse.json({ ok: true });
}

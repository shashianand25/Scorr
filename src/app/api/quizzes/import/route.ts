import { NextRequest, NextResponse } from "next/server";
import { currentUserOrGuest } from "@/lib/current-user";
import { importQstQuiz } from "@/lib/quiz";
import { enforceCsrf, rateLimit } from "@/lib/security";
import { importQstSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const csrf = enforceCsrf(request);
    if (csrf) return csrf;
    const limited = await rateLimit(request, "quiz-import");
    if (limited) return limited;

    const body = importQstSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid import payload", issues: body.error.issues }, { status: 400 });
    }

    const user = await currentUserOrGuest();
    const { parsed, quiz } = await importQstQuiz(body.data.source, user.id, body.data.publish);
    if (!parsed.ok || !quiz) {
      return NextResponse.json({ error: "QST validation failed", parsed }, { status: 422 });
    }

    return NextResponse.json({ quiz, parsed }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected import failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

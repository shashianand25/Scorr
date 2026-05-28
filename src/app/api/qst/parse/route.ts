import { NextRequest, NextResponse } from "next/server";
import { parseQst, normalizeQstJson } from "@/lib/qst/parser";
import { enforceCsrf, rateLimit, sanitizeText } from "@/lib/security";
import { importQstSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const csrf = enforceCsrf(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "qst-parse");
  if (limited) return limited;

  const body = importQstSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Invalid parser payload", issues: body.error.issues }, { status: 400 });
  }

  const parsed = parseQst(sanitizeText(body.data.source));
  return NextResponse.json({ ...parsed, normalized: normalizeQstJson(parsed.data) }, { status: parsed.ok ? 200 : 422 });
}

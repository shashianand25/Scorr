import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { enforceCsrf, rateLimit, sanitizeText } from "@/lib/security";

const registerSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const csrf = enforceCsrf(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "auth-register");
  if (limited) return limited;

  const body = registerSchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "Use a valid email and a password with at least 8 characters." }, { status: 400 });
  }

  const email = body.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: body.data.name ? sanitizeText(body.data.name) : email.split("@")[0],
      passwordHash: await hash(body.data.password, 12),
    },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}

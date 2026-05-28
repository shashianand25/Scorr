import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { currentUserOrGuest } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { enforceCsrf, rateLimit } from "@/lib/security";
import { createRoomSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const csrf = enforceCsrf(request);
  if (csrf) return csrf;
  const limited = await rateLimit(request, "room-create");
  if (limited) return limited;

  const body = createRoomSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Invalid room payload", issues: body.error.issues }, { status: 400 });

  const host = await currentUserOrGuest();
  const code = nanoid(6).toUpperCase();
  const room = await prisma.room.create({
    data: {
      code,
      quizId: body.data.quizId,
      hostId: host.id,
      spectatorEnabled: body.data.spectatorEnabled,
      antiCheatEnabled: body.data.antiCheatEnabled,
    },
  });

  try {
    await redis.hset(`room:${code}`, {
      status: room.status,
      currentQuestion: String(room.currentQuestion),
      quizId: room.quizId,
      hostId: host.id,
    });
    await redis.expire(`room:${code}`, 60 * 60 * 12);
  } catch {}

  return NextResponse.json({ room }, { status: 201 });
}

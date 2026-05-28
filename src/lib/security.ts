import { NextRequest, NextResponse } from "next/server";
import { redis } from "./redis";

const csrfUnsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function sanitizeText(value: string) {
  return value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/giu, "").replace(/\son\w+="[^"]*"/giu, "").trim();
}

export async function rateLimit(request: NextRequest, key: string) {
  const windowSec = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60);
  const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const redisKey = `rate:${key}:${ip}`;
  try {
    const count = await redis.incr(redisKey);
    if (count === 1) await redis.expire(redisKey, windowSec);
    if (count > max) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch {
    return null;
  }
  return null;
}

export function enforceCsrf(request: NextRequest) {
  if (!csrfUnsafeMethods.has(request.method)) return null;
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return null;
  try {
    if (new URL(origin).host !== host) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  return null;
}

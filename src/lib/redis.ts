import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
  });

redis.on("error", () => {
  // Redis is optional in local UI previews; route handlers degrade to DB-only behavior.
});

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

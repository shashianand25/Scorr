import { z } from "zod";

export const importQstSchema = z.object({
  source: z.string().min(1).max(250_000),
  publish: z.boolean().default(false),
});

export const createRoomSchema = z.object({
  quizId: z.string().min(1),
  spectatorEnabled: z.boolean().default(true),
  antiCheatEnabled: z.boolean().default(true),
});

export const submitAttemptSchema = z.object({
  quizId: z.string().min(1),
  guestName: z.string().min(1).max(80).optional(),
  responses: z.array(
    z.object({
      questionId: z.string().min(1),
      answerIds: z.array(z.string()).default([]),
      freeText: z.string().max(5000).optional(),
      durationMs: z.number().int().nonnegative().optional(),
    }),
  ),
});

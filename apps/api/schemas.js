/**
 * Boundary Input Validation Schemas for Scorr Backend API.
 * Uses Zod to validate and sanitize incoming client request payloads.
 */
const { z } = require('zod');

const feedbackSchema = z.object({
  userId: z.string().optional().nullable(),
  userEmail: z.string().email('Invalid contact email format').optional().nullable().or(z.literal('')),
  message: z.string().min(1, 'Feedback message is required').max(5000, 'Feedback message too long'),
});

const masterQuizCacheSchema = z.object({
  contentHash: z.string().min(1, 'contentHash required'),
  lang: z.string().optional(),
});

const saveMasterQuizSchema = z.object({
  id: z.string().min(1, 'Master Quiz ID is required'),
  title: z.string().min(1, 'Quiz title cannot be empty'),
  category: z.string().optional().default('General'),
  questionCount: z.number().int().nonnegative(),
  flashcardCount: z.number().int().nonnegative().optional().default(0),
  sourceText: z.string().min(1, 'Source text cannot be empty'),
  contentHash: z.string().min(1, 'Content hash is required'),
  language: z.string().optional().default('en'),
});

const quizHistorySchema = z.object({
  eventId: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  quizTitle: z.string().min(1, 'Quiz title is required'),
  totalQuestions: z.number().int().positive('Total questions must be positive'),
  correct: z.number().int().nonnegative('Correct count must be non-negative'),
  wrong: z.number().int().nonnegative('Wrong count must be non-negative'),
  score: z.number().nonnegative('Score must be non-negative'),
  durationSec: z.number().nonnegative().optional().default(0),
  wrongQuestions: z.array(z.any()).optional().default([]),
});

const battleRoomCodeSchema = z.object({
  roomCode: z.string().regex(/^[A-Z0-9]{6}$/, 'Battle room code must be 6 alphanumeric characters'),
});

const userSyncSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email address').optional().nullable(),
  name: z.string().optional().nullable(),
});

module.exports = {
  feedbackSchema,
  masterQuizCacheSchema,
  saveMasterQuizSchema,
  quizHistorySchema,
  battleRoomCodeSchema,
  userSyncSchema,
};

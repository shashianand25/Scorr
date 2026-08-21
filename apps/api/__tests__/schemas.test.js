const test = require('node:test');
const assert = require('node:assert');
const {
  feedbackSchema,
  masterQuizCacheSchema,
  saveMasterQuizSchema,
  quizHistorySchema,
  battleRoomCodeSchema,
  userSyncSchema,
} = require('../schemas');

test('Zod Boundary Validation Schemas Suite', async (t) => {
  await t.test('feedbackSchema: validates valid feedback payloads', () => {
    const valid = {
      userId: 'user_123',
      userEmail: 'student@example.com',
      message: 'Great flashcard practice questions!',
    };
    const result = feedbackSchema.safeParse(valid);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.message, valid.message);
  });

  await t.test('feedbackSchema: rejects empty message or malformed email', () => {
    const emptyMsg = { message: '' };
    const badEmail = { message: 'Hello', userEmail: 'invalid-email-address' };

    assert.strictEqual(feedbackSchema.safeParse(emptyMsg).success, false);
    assert.strictEqual(feedbackSchema.safeParse(badEmail).success, false);
  });

  await t.test('masterQuizCacheSchema: validates contentHash', () => {
    assert.strictEqual(masterQuizCacheSchema.safeParse({ contentHash: 'abc12345' }).success, true);
    assert.strictEqual(masterQuizCacheSchema.safeParse({}).success, false);
  });

  await t.test('saveMasterQuizSchema: validates required master quiz fields', () => {
    const validQuiz = {
      id: 'mq_101',
      title: 'Thermodynamics',
      category: 'Physics',
      questionCount: 10,
      flashcardCount: 5,
      sourceText: 'Thermodynamics is the branch of physics...',
      contentHash: 'hash_1234567890abcdef',
      language: 'en',
    };
    const result = saveMasterQuizSchema.safeParse(validQuiz);
    assert.strictEqual(result.success, true);

    const invalidQuiz = {
      id: '',
      title: 'Missing other fields',
    };
    assert.strictEqual(saveMasterQuizSchema.safeParse(invalidQuiz).success, false);
  });

  await t.test('quizHistorySchema: validates study session history payloads', () => {
    const validHistory = {
      userId: 'usr_456',
      quizTitle: 'Organic Chemistry',
      totalQuestions: 15,
      correct: 12,
      wrong: 3,
      score: 80,
      durationSec: 120,
    };
    assert.strictEqual(quizHistorySchema.safeParse(validHistory).success, true);

    const invalidHistory = {
      userId: '',
      totalQuestions: -5, // Negative count
    };
    assert.strictEqual(quizHistorySchema.safeParse(invalidHistory).success, false);
  });

  await t.test('battleRoomCodeSchema: validates 6-character room codes', () => {
    assert.strictEqual(battleRoomCodeSchema.safeParse({ roomCode: 'ABC123' }).success, true);
    assert.strictEqual(battleRoomCodeSchema.safeParse({ roomCode: 'abc' }).success, false);
    assert.strictEqual(battleRoomCodeSchema.safeParse({ roomCode: 'TOOLONG123' }).success, false);
  });

  await t.test('userSyncSchema: validates user authentication sync payload', () => {
    assert.strictEqual(userSyncSchema.safeParse({ id: 'u_1', email: 'test@user.com' }).success, true);
    assert.strictEqual(userSyncSchema.safeParse({ id: '', email: 'not-an-email' }).success, false);
  });
});

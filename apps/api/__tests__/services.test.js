const test = require('node:test');
const assert = require('node:assert');
const { MockDatabasePool, MockResendClient } = require('./mocks/services.mock');
const { feedbackSchema, masterQuizCacheSchema } = require('../schemas');

test('Isolated Backend Service & Mock Suite', async (t) => {
  await t.test('Feedback Submission Flow with Mocked DB and Resend Sink', async () => {
    const mockPool = new MockDatabasePool();
    const mockResend = new MockResendClient();

    const payload = {
      userId: 'user_mock_123',
      userEmail: 'scholar@example.com',
      message: 'The flashcard interval calculation is very accurate!',
    };

    // Step 1: Validate payload via schema
    const parseResult = feedbackSchema.safeParse(payload);
    assert.strictEqual(parseResult.success, true);

    // Step 2: Simulate DB persistence
    const dbResult = await mockPool.query(
      'INSERT INTO user_feedback (id, user_id, user_email, message) VALUES ($1, $2, $3, $4)',
      ['fb_101', parseResult.data.userId, parseResult.data.userEmail, parseResult.data.message]
    );
    assert.strictEqual(dbResult.rowCount, 1);
    assert.strictEqual(mockPool.queries.length, 1);

    // Step 3: Simulate email dispatch via Mock Resend
    const emailResult = await mockResend.emails.send({
      from: 'support@scorrapp.com',
      to: 'admin@scorrapp.com',
      subject: `Feedback from ${parseResult.data.userEmail}`,
      text: parseResult.data.message,
    });

    assert.strictEqual(emailResult.error, null);
    assert.strictEqual(mockResend.sentEmails.length, 1);
    assert.strictEqual(mockResend.sentEmails[0].to, 'admin@scorrapp.com');
  });

  await t.test('Master Quiz Cache Check Flow with Mocked DB', async () => {
    const cachedQuiz = {
      id: 'mq_cached_42',
      title: 'Neural Networks 101',
      category: 'AI',
      question_count: 10,
      flashcard_count: 5,
      source_text: 'Deep learning is...',
      language: 'en',
    };

    const mockPool = new MockDatabasePool({
      hash_target_123: cachedQuiz,
    });

    // Valid cache check request
    const validCheck = { contentHash: 'hash_target_123' };
    assert.strictEqual(masterQuizCacheSchema.safeParse(validCheck).success, true);

    // Query mock DB
    const hitResult = await mockPool.query(
      'SELECT id, title, category, question_count FROM master_quizzes WHERE content_hash = $1',
      [validCheck.contentHash]
    );
    assert.strictEqual(hitResult.rowCount, 1);
    assert.strictEqual(hitResult.rows[0].title, 'Neural Networks 101');

    // Query non-existent hash (cache miss)
    const missResult = await mockPool.query(
      'SELECT id, title, category, question_count FROM master_quizzes WHERE content_hash = $1',
      ['hash_nonexistent']
    );
    assert.strictEqual(missResult.rowCount, 0);
  });
});

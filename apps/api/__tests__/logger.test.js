const test = require('node:test');
const assert = require('node:assert');
const logger = require('../utils/logger');

test('Backend Structured JSON Logger Suite', async (t) => {
  await t.test('logger.info emits valid structured JSON format', () => {
    const entry = logger.info('Router', 'Master quiz request handled', { quizId: 'q_123', status: 200 });

    assert.strictEqual(entry.level, 'info');
    assert.strictEqual(entry.tag, 'Router');
    assert.strictEqual(entry.message, 'Master quiz request handled');
    assert.strictEqual(entry.context.quizId, 'q_123');
    assert.strictEqual(typeof entry.timestamp, 'string');
    assert.ok(!isNaN(Date.parse(entry.timestamp)));
  });

  await t.test('logger.warn emits structured warning with metadata', () => {
    const entry = logger.warn('Database', 'Connection pool near capacity', { activeConnections: 18 });

    assert.strictEqual(entry.level, 'warn');
    assert.strictEqual(entry.tag, 'Database');
    assert.strictEqual(entry.context.activeConnections, 18);
  });

  await t.test('logger.error captures Error stack traces and context', () => {
    const testError = new Error('Database query timed out');
    const entry = logger.error('Postgres', 'Query execution failed', testError, {
      query: 'SELECT * FROM master_quizzes',
    });

    assert.strictEqual(entry.level, 'error');
    assert.strictEqual(entry.tag, 'Postgres');
    assert.strictEqual(entry.message, 'Query execution failed');
    assert.strictEqual(entry.context.message, 'Database query timed out');
    assert.strictEqual(typeof entry.context.stack, 'string');
    assert.strictEqual(entry.context.query, 'SELECT * FROM master_quizzes');
  });

  await t.test('logger.error falls back safely when Sentry is absent', () => {
    delete process.env.SENTRY_DSN;
    const entry = logger.error('Auth', 'Invalid token provided', 'Unauthorized');
    assert.strictEqual(entry.level, 'error');
    assert.strictEqual(entry.context.error, 'Unauthorized');
  });

  await t.test('logger.error dispatches to Sentry captureException when SENTRY_DSN is configured', () => {
    process.env.SENTRY_DSN = 'https://fake@o0.ingest.sentry.io/0';
    let Sentry = null;
    try {
      Sentry = require('@sentry/node');
    } catch {
      // Sentry package absent
    }

    let captured = null;
    if (Sentry) {
      const originalCapture = Sentry.captureException;
      Sentry.captureException = (err, extra) => {
        captured = { err, extra };
      };
      try {
        const entry = logger.error('Sync', 'User sync failed', new Error('Sync timeout'), { userId: 'u_999' });
        assert.strictEqual(entry.level, 'error');
        assert.strictEqual(entry.tag, 'Sync');
        assert.ok(captured);
        assert.strictEqual(captured.extra.tags.tag, 'Sync');
      } finally {
        Sentry.captureException = originalCapture;
      }
    } else {
      global.__sentryCaptureException = (err, extra) => {
        captured = { err, extra };
      };
      try {
        const entry = logger.error('Sync', 'User sync failed', new Error('Sync timeout'), { userId: 'u_999' });
        assert.strictEqual(entry.level, 'error');
        assert.strictEqual(entry.tag, 'Sync');
        assert.ok(captured);
        assert.strictEqual(captured.extra.tags.tag, 'Sync');
      } finally {
        delete global.__sentryCaptureException;
      }
    }

    delete process.env.SENTRY_DSN;
  });
});

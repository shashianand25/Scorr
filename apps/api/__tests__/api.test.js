const test = require('node:test');
const assert = require('node:assert');

test('Backend API Validation Suite', async (t) => {
  await t.test('Validates feedback submission payloads', () => {
    function validateFeedback(body) {
      if (!body || typeof body.feedback !== 'string' || !body.feedback.trim()) {
        return { valid: false, error: 'Feedback message is required' };
      }
      return { valid: true };
    }

    assert.strictEqual(validateFeedback({ feedback: 'Loving the app!' }).valid, true);
    assert.strictEqual(validateFeedback({ feedback: '   ' }).valid, false);
    assert.strictEqual(validateFeedback({}).valid, false);
  });

  await t.test('Validates battle room code format', () => {
    function isValidRoomCode(code) {
      return typeof code === 'string' && /^[A-Z0-9]{6}$/.test(code.trim().toUpperCase());
    }

    assert.strictEqual(isValidRoomCode('BAT123'), true);
    assert.strictEqual(isValidRoomCode('123'), false);
    assert.strictEqual(isValidRoomCode(null), false);
  });
});

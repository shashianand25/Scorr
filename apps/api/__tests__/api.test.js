const test = require('node:test');
const assert = require('node:assert');
const {
  isValidEmail,
  isValidBattleRoomCode,
  sanitizeText,
  validateFeedbackPayload,
} = require('../utils/validation');

test('Backend API Validation Suite', async (t) => {
  await t.test('Validates feedback submission payloads', () => {
    assert.strictEqual(
      validateFeedbackPayload({ message: 'Loving the app!', email: 'test@scorrapp.com' }).valid,
      true
    );
    assert.strictEqual(validateFeedbackPayload({ message: '   ' }).valid, false);
    assert.strictEqual(validateFeedbackPayload({ message: 'Hello', email: 'invalid-email' }).valid, false);
    assert.strictEqual(validateFeedbackPayload(null).valid, false);
  });

  await t.test('Validates battle room code format', () => {
    assert.strictEqual(isValidBattleRoomCode('BAT123'), true);
    assert.strictEqual(isValidBattleRoomCode('123'), false);
    assert.strictEqual(isValidBattleRoomCode(null), false);
  });

  await t.test('Validates email formatting helper', () => {
    assert.strictEqual(isValidEmail('student@university.edu'), true);
    assert.strictEqual(isValidEmail('plainaddress'), false);
    assert.strictEqual(isValidEmail(null), false);
  });

  await t.test('Sanitizes text and removes null characters', () => {
    assert.strictEqual(sanitizeText('Hello\0World'), 'HelloWorld');
    assert.strictEqual(sanitizeText(null), '');
  });
});

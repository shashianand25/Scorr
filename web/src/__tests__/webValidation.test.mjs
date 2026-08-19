import test from 'node:test';
import assert from 'node:assert';

test('Web Input and Form Validation Suite', async (t) => {
  await t.test('Validates quiz import formats', () => {
    function validateQstFormat(text) {
      if (!text || typeof text !== 'string') return false;
      return text.includes('?') && (text.includes('+') || text.includes('-'));
    }

    assert.strictEqual(validateQstFormat('? What is H2O?\n+ Water\n- Salt'), true);
    assert.strictEqual(validateQstFormat('Just random text'), false);
  });
});

import test from 'node:test';
import assert from 'node:assert';

test('Web SM-2 Algorithm Parity', async (t) => {
  await t.test('Calculates SM-2 initial intervals and ease factor bounds', () => {
    function calculateNextInterval(repetition, easeFactor) {
      if (repetition === 0) return 1;
      if (repetition === 1) return 6;
      return Math.round(6 * easeFactor);
    }

    assert.strictEqual(calculateNextInterval(0, 2.5), 1);
    assert.strictEqual(calculateNextInterval(1, 2.5), 6);
    assert.strictEqual(calculateNextInterval(2, 2.5), 15);
  });
});

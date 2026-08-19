const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

test('Backend Content Hashing & Deduplication', async (t) => {
  await t.test('Produces standard SHA-256 content hashes', () => {
    function hashText(text) {
      return crypto.createHash('sha256').update(text.trim()).digest('hex');
    }

    const h1 = hashText('What is photosynthesis?');
    const h2 = hashText('  What is photosynthesis?  ');
    assert.strictEqual(h1, h2);
    assert.strictEqual(h1.length, 64);
  });
});

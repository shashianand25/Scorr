const test = require('node:test');
const assert = require('node:assert');

test('Text Sanitization Suite', async (t) => {
  await t.test('Sanitizes extracted document text and removes null bytes', () => {
    function sanitizeExtractedText(raw) {
      if (!raw) return '';
      return raw.replace(/\0/g, '').replace(/\r\n/g, '\n').trim();
    }

    const dirty = 'Hello\0World\r\nSecond line  ';
    const clean = sanitizeExtractedText(dirty);
    assert.strictEqual(clean, 'HelloWorld\nSecond line');
  });
});

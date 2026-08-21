const test = require('node:test');
const assert = require('node:assert');

test('Backend Health Check Suite', async (t) => {
  await t.test('GET /api/health payload structure assertion', () => {
    const healthPayload = {
      status: 'ok',
      service: 'scorr-backend-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    assert.strictEqual(healthPayload.status, 'ok');
    assert.strictEqual(healthPayload.service, 'scorr-backend-api');
    assert.strictEqual(typeof healthPayload.uptime, 'number');
    assert.ok(healthPayload.uptime >= 0);
    assert.strictEqual(typeof healthPayload.timestamp, 'string');
    assert.ok(!isNaN(Date.parse(healthPayload.timestamp)));
  });
});

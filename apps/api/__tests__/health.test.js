const test = require('node:test');
const assert = require('node:assert');
const app = require('../api/index');

test('Backend Health Check Suite', async (t) => {
  let server;
  let baseUrl;

  t.before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  t.after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test('GET /health returns 200 and valid status with db check', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.service, 'scorr-backend-api');
    assert.ok(typeof body.db === 'string');
    assert.strictEqual(typeof body.uptime, 'number');
    assert.ok(body.uptime >= 0);
    assert.strictEqual(typeof body.timestamp, 'string');
    assert.ok(!isNaN(Date.parse(body.timestamp)));
  });

  await t.test('GET /api/health alias returns 200 and identical health payload', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.service, 'scorr-backend-api');
    assert.ok(typeof body.db === 'string');
    assert.strictEqual(typeof body.uptime, 'number');
  });
});


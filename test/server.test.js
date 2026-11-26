const assert = require('node:assert/strict');
const { once } = require('node:events');
const { after, before, test } = require('node:test');
const app = require('../server/index');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
}));

test('normalizes a bare domain and suggests a clean filename', async () => {
  const response = await fetch(`${baseUrl}/api/validate-url`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: '  www.example.com/shop  ' }),
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.valid, true);
  assert.equal(result.normalizedUrl, 'https://www.example.com/shop');
  assert.equal(result.wasAutoPrefixed, true);
  assert.equal(result.suggestedFilename, 'qr-example-com');
});

test('returns a helpful validation error for an empty destination', async () => {
  const response = await fetch(`${baseUrl}/api/validate-url`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: '  ' }),
  });
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.valid, false);
  assert.match(result.error, /enter a website link/i);
});

test('rejects invalid URLs and non-web protocols', async () => {
  for (const url of ['not a domain', 'javascript:alert(1)']) {
    const response = await fetch(`${baseUrl}/api/validate-url`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const result = await response.json();

    assert.equal(response.status, 400);
    assert.equal(result.valid, false);
    assert.match(result.error, /valid website link/i);
  }
});

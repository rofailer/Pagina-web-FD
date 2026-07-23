'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const loginRateLimit = require('../scripts/middlewares/loginRateLimit');

test('login limiter blocks repeated failures without revealing account existence', () => {
  const request = {
    body: { usuario: 'rate-limit-test-user' },
    socket: { remoteAddress: '192.0.2.10' }
  };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    let passed = false;
    loginRateLimit(request, {}, () => { passed = true; });
    assert.equal(passed, true);
    request.loginRateLimit.recordFailure();
  }

  const headers = {};
  const response = {
    statusCode: 200,
    setHeader(name, value) { headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };

  let passed = false;
  loginRateLimit(request, response, () => { passed = true; });

  assert.equal(passed, false);
  assert.equal(response.statusCode, 429);
  assert.ok(Number(headers['Retry-After']) > 0);
  assert.match(response.body.error, /credenciales/i);
});

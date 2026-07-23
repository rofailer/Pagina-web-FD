'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { afterEach, describe, test } = require('node:test');
const express = require('express');
const {
  configureAppSecurity,
  parseOriginList
} = require('../scripts/middlewares/security');

const openServers = new Set();

afterEach(async () => {
  await Promise.all(
    [...openServers].map(
      (server) => new Promise((resolve) => server.close(resolve))
    )
  );
  openServers.clear();
});

async function startServer(options = {}) {
  const app = express();
  configureAppSecurity(app, options);
  app.use(express.json());
  app.all('/api/echo', (req, res) => res.json({ success: true, method: req.method }));
  app.get('/', (req, res) => res.send('ok'));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  openServers.add(server);

  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

function rawRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, options, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          status: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });
    request.on('error', reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

describe('security middleware', () => {
  test('removes the Express banner and adds compatible development headers', async () => {
    const baseUrl = await startServer({
      headers: { environment: 'development' },
      cors: { environment: 'development' }
    });

    const response = await fetch(`${baseUrl}/`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-powered-by'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('strict-transport-security'), null);
    assert.match(response.headers.get('content-security-policy'), /script-src 'self' 'unsafe-inline'/);
    assert.doesNotMatch(response.headers.get('content-security-policy'), /upgrade-insecure-requests/);
  });

  test('uses HSTS and HTTPS upgrades only in production', async () => {
    const baseUrl = await startServer({
      headers: { environment: 'production' },
      cors: { environment: 'production' }
    });

    const response = await fetch(`${baseUrl}/`);

    assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000');
    assert.match(response.headers.get('content-security-policy'), /upgrade-insecure-requests/);
  });

  test('allows configured origins and validates preflight headers', async () => {
    const baseUrl = await startServer({
      headers: { environment: 'production' },
      cors: {
        environment: 'production',
        origins: 'https://app.example.com'
      }
    });

    const response = await fetch(`${baseUrl}/api/echo`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app.example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type'
      }
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://app.example.com');
    assert.match(response.headers.get('access-control-allow-methods'), /POST/);
    assert.equal(response.headers.get('access-control-allow-headers'), 'Authorization, Content-Type');
    assert.match(response.headers.get('vary'), /Origin/i);
  });

  test('reads the production allowlist from CORS_ORIGINS', async () => {
    const previousOrigins = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = 'https://portal.example.com';

    try {
      const baseUrl = await startServer({
        headers: { environment: 'production' },
        cors: { environment: 'production' }
      });
      const response = await fetch(`${baseUrl}/api/echo`, {
        headers: { Origin: 'https://portal.example.com' }
      });

      assert.equal(response.status, 200);
      assert.equal(
        response.headers.get('access-control-allow-origin'),
        'https://portal.example.com'
      );
    } finally {
      if (previousOrigins === undefined) {
        delete process.env.CORS_ORIGINS;
      } else {
        process.env.CORS_ORIGINS = previousOrigins;
      }
    }
  });

  test('rejects unknown origins but permits localhost during development', async () => {
    const productionUrl = await startServer({
      headers: { environment: 'production' },
      cors: { environment: 'production' }
    });
    const denied = await fetch(`${productionUrl}/api/echo`, {
      headers: { Origin: 'https://evil.example' }
    });

    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).code, 'CORS_ORIGIN_DENIED');

    const developmentUrl = await startServer({
      headers: { environment: 'development' },
      cors: { environment: 'development' }
    });
    const allowed = await fetch(`${developmentUrl}/api/echo`, {
      headers: { Origin: 'http://localhost:5173' }
    });

    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');

    const allowedIpv6 = await fetch(`${developmentUrl}/api/echo`, {
      headers: { Origin: 'http://[::1]:5173' }
    });
    assert.equal(allowedIpv6.status, 200);
  });

  test('adds no-store to APIs, blocks unexpected methods and limits JSON bodies', async () => {
    const baseUrl = await startServer({
      headers: { environment: 'development' },
      cors: { environment: 'development' },
      requestSize: { maxBytes: 16 }
    });

    const getResponse = await fetch(`${baseUrl}/api/echo`);
    assert.match(getResponse.headers.get('cache-control'), /no-store/);

    const methodResponse = await rawRequest(`${baseUrl}/api/echo`, { method: 'PROPFIND' });
    assert.equal(methodResponse.status, 405);
    assert.equal(JSON.parse(methodResponse.body).code, 'METHOD_NOT_ALLOWED');

    const body = JSON.stringify({ value: 'this body is too long' });
    const sizeResponse = await rawRequest(`${baseUrl}/api/echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      body
    });
    assert.equal(sizeResponse.status, 413);
    assert.equal(JSON.parse(sizeResponse.body).code, 'REQUEST_TOO_LARGE');
  });

  test('fails fast when CORS_ORIGINS contains a path or unsupported protocol', () => {
    assert.throws(() => parseOriginList('https://example.com/api'), /solo acepta origenes/);
    assert.throws(() => parseOriginList('file:\/\/local'), /Protocolo CORS no permitido/);
  });
});

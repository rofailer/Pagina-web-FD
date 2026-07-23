'use strict';

const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

process.env.JWT_SECRET ||= 'test-only-secret-with-at-least-32-bytes';
process.env.DB_HOST ||= 'localhost';
process.env.DB_USER ||= 'test';
process.env.DB_PASSWORD ||= 'test';
process.env.DB_NAME ||= 'test';
process.env.DB_PORT ||= '3306';

const profileRoutes = require('../scripts/routes/profile.routes');
const authRoutes = require('../scripts/routes/auth.routes');

describe('profile photo signature validation', () => {
    test('recognizes supported binary image signatures', () => {
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
        const gif = Buffer.from('GIF89a', 'ascii');
        const webp = Buffer.concat([
            Buffer.from('RIFF', 'ascii'),
            Buffer.alloc(4),
            Buffer.from('WEBP', 'ascii')
        ]);

        assert.equal(profileRoutes.detectImageMime(png), 'image/png');
        assert.equal(profileRoutes.detectImageMime(jpeg), 'image/jpeg');
        assert.equal(profileRoutes.detectImageMime(gif), 'image/gif');
        assert.equal(profileRoutes.detectImageMime(webp), 'image/webp');
    });

    test('rejects empty, textual and spoofed content', () => {
        assert.equal(profileRoutes.detectImageMime(Buffer.alloc(0)), null);
        assert.equal(profileRoutes.detectImageMime(Buffer.from('<svg></svg>')), null);
        assert.equal(profileRoutes.detectImageMime(Buffer.from('not really a png')), null);
        assert.equal(profileRoutes.detectImageMime('not-a-buffer'), null);
    });
});

describe('effective presence status', () => {
    test('keeps a selected state while heartbeat is recent', () => {
        const now = Date.parse('2026-07-22T12:00:00.000Z');
        const recent = new Date(now - 30_000);

        assert.equal(profileRoutes.effectivePresenceStatus('en_linea', recent, now), 'en_linea');
        assert.equal(profileRoutes.effectivePresenceStatus('ausente', recent, now), 'ausente');
        assert.equal(profileRoutes.effectivePresenceStatus('ocupado', recent, now), 'ocupado');
    });

    test('reports disconnected when explicitly selected or heartbeat is stale', () => {
        const now = Date.parse('2026-07-22T12:00:00.000Z');
        const boundary = new Date(now - profileRoutes.PRESENCE_TIMEOUT_MS);
        const stale = new Date(now - profileRoutes.PRESENCE_TIMEOUT_MS - 1);

        assert.equal(profileRoutes.effectivePresenceStatus('en_linea', boundary, now), 'en_linea');
        assert.equal(profileRoutes.effectivePresenceStatus('en_linea', stale, now), 'desconectado');
        assert.equal(profileRoutes.effectivePresenceStatus('desconectado', new Date(now), now), 'desconectado');
        assert.equal(profileRoutes.effectivePresenceStatus('en_linea', null, now), 'desconectado');
        assert.equal(profileRoutes.effectivePresenceStatus('invalido', new Date(now), now), 'desconectado');
    });

    test('auth and profile routes share the same timeout semantics', () => {
        const now = Date.parse('2026-07-22T12:00:00.000Z');
        const lastSeen = new Date(now - 45_000);
        assert.equal(
            authRoutes.effectivePresenceStatus('ocupado', lastSeen, now),
            profileRoutes.effectivePresenceStatus('ocupado', lastSeen, now)
        );
        assert.equal(authRoutes.PRESENCE_TIMEOUT_MS, profileRoutes.PRESENCE_TIMEOUT_MS);
    });
});

describe('photo cache version', () => {
    test('serializes valid dates and rejects missing or invalid values', () => {
        const date = new Date('2026-07-22T12:00:00.000Z');
        assert.equal(profileRoutes.photoVersion(date), String(date.getTime()));
        assert.equal(profileRoutes.photoVersion(null), null);
        assert.equal(profileRoutes.photoVersion('invalid-date'), null);
    });
});

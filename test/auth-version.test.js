'use strict';

const assert = require('node:assert/strict');
const { describe, test } = require('node:test');

process.env.JWT_SECRET ||= 'test-only-secret-with-at-least-32-bytes';
process.env.DB_HOST ||= 'localhost';
process.env.DB_USER ||= 'test';
process.env.DB_PASSWORD ||= 'test';
process.env.DB_NAME ||= 'test';
process.env.DB_PORT ||= '3306';
const authenticate = require('../scripts/middlewares/authenticate');

describe('authentication state', () => {
    test('accepts only tokens bound to the current password hash', () => {
        const user = { id: 7, password: '$2b$12$current-password-hash' };
        const authVersion = authenticate.createAuthVersion(user.id, user.password);

        assert.equal(authenticate.tokenMatchesCurrentUser({ authVersion }, user), true);
        assert.equal(authenticate.tokenMatchesCurrentUser({}, user), false);
        assert.equal(authenticate.tokenMatchesCurrentUser({ authVersion: 'invalid' }, user), false);
    });

    test('uses only the current force-password-change column', () => {
        assert.equal(authenticate.mustChangePassword({ force_password_change: 1 }), true);
        assert.equal(authenticate.mustChangePassword({ force_password_change: 0 }), false);
        assert.equal(authenticate.mustChangePassword({}), false);
    });
});

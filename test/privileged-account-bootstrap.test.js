'use strict';

const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const {
    INITIAL_PASSWORD_PATTERN,
    SEED_PASSWORD_MARKER,
    generateInitialPassword,
    initializePrivilegedAccounts
} = require('../scripts/utils/privilegedAccountBootstrap');

describe('privileged account bootstrap', () => {
    test('generates strong temporary passwords', () => {
        for (let index = 0; index < 20; index += 1) {
            assert.match(generateInitialPassword(), INITIAL_PASSWORD_PATTERN);
        }
    });

    test('initializes only untouched admin and owner seed accounts', async () => {
        const updates = [];
        const database = {
            async query(sql, params) {
                if (sql.includes('SELECT id, usuario, rol, password')) {
                    return [[
                        { id: 1, usuario: 'admin', rol: 'admin', password: SEED_PASSWORD_MARKER },
                        { id: 2, usuario: 'owner', rol: 'owner', password: '$2b$12$already-initialized' }
                    ]];
                }
                updates.push(params);
                return [{ affectedRows: 1 }];
            }
        };

        const initialized = await initializePrivilegedAccounts({
            database,
            environment: { INITIAL_ADMIN_PASSWORD: 'AdminTemporal#2026' },
            hashPassword: async password => `hash:${password}`,
            logger: { info() {}, warn() {} }
        });

        assert.equal(initialized.length, 1);
        assert.equal(initialized[0].usuario, 'admin');
        assert.equal(initialized[0].generated, false);
        assert.deepEqual(updates[0], ['hash:AdminTemporal#2026', 1, SEED_PASSWORD_MARKER]);
    });

    test('uses a compare-and-set update to avoid rotating initialized accounts', async () => {
        const database = {
            async query(sql) {
                if (sql.includes('SELECT id, usuario, rol, password')) {
                    return [[{ id: 2, usuario: 'owner', rol: 'owner', password: SEED_PASSWORD_MARKER }]];
                }
                return [{ affectedRows: 0 }];
            }
        };

        const initialized = await initializePrivilegedAccounts({
            database,
            environment: {},
            hashPassword: async () => 'hash',
            logger: { info() {}, warn() {} }
        });

        assert.deepEqual(initialized, []);
    });

    test('validates all configured credentials before updating either account', async () => {
        let updateCount = 0;
        const database = {
            async query(sql) {
                if (sql.includes('SELECT id, usuario, rol, password')) {
                    return [[
                        { id: 1, usuario: 'admin', rol: 'admin', password: SEED_PASSWORD_MARKER },
                        { id: 2, usuario: 'owner', rol: 'owner', password: SEED_PASSWORD_MARKER }
                    ]];
                }
                updateCount += 1;
                return [{ affectedRows: 1 }];
            }
        };

        await assert.rejects(
            initializePrivilegedAccounts({
                database,
                environment: {
                    INITIAL_ADMIN_PASSWORD: 'AdminTemporal#2026',
                    INITIAL_OWNER_PASSWORD: 'insegura'
                },
                logger: { info() {}, warn() {} }
            }),
            error => error.code === 'INVALID_INITIAL_PASSWORD'
        );
        assert.equal(updateCount, 0);
    });
});

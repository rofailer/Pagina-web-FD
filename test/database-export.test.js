'use strict';

const assert = require('node:assert/strict');
const { describe, test } = require('node:test');
const {
    generateDatabaseExport,
    portableCreateView,
    quoteIdentifier,
    sanitizeExportName
} = require('../scripts/utils/databaseExport');

describe('read-only database export', () => {
    test('sanitizes names and rejects invalid SQL identifiers', () => {
        assert.equal(sanitizeExportName('firmas\r\nmaliciosas".sql'), 'firmas-maliciosas-.sql');
        assert.equal(quoteIdentifier('user_keys'), '`user_keys`');
        assert.throws(() => quoteIdentifier('users; DROP TABLE users'));
    });

    test('removes view definers for portable exports', () => {
        const statement = 'CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v` AS select 1 AS `n`';
        assert.equal(portableCreateView(statement).includes('DEFINER=`root`@`localhost`'), false);
    });

    test('exports structure and data without destructive statements', async () => {
        let rowRead = false;
        const connection = {
            escape(value) {
                if (value === null) return 'NULL';
                return `'${String(value).replaceAll("'", "''")}'`;
            },
            async query(sql) {
                if (sql.includes('information_schema.TABLES')) {
                    return [[{ name: 'users', type: 'BASE TABLE' }]];
                }
                if (sql.startsWith('SHOW CREATE TABLE')) {
                    return [[{ 'Create Table': 'CREATE TABLE `users` (`id` int, `name` varchar(20))' }]];
                }
                if (sql.startsWith('SELECT * FROM')) {
                    if (rowRead) return [[], [{ name: 'id' }, { name: 'name' }]];
                    rowRead = true;
                    return [[{ id: 1, name: "O'Hara" }], [{ name: 'id' }, { name: 'name' }]];
                }
                throw new Error(`Consulta inesperada: ${sql}`);
            }
        };

        let output = '';
        for await (const chunk of generateDatabaseExport(connection, {
            databaseName: 'firmas_digitales',
            generatedAt: new Date('2026-01-01T00:00:00.000Z')
        })) {
            output += chunk;
        }

        assert.match(output, /CREATE TABLE `users`/);
        assert.match(output, /INSERT INTO `users` \(`id`, `name`\) VALUES/);
        assert.match(output, /O''Hara/);
        assert.doesNotMatch(output, /DROP\s+(?:DATABASE|TABLE)/i);
    });
});

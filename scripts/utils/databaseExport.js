'use strict';

const IDENTIFIER_PATTERN = /^[A-Za-z0-9_]+$/;

function quoteIdentifier(identifier) {
    if (!IDENTIFIER_PATTERN.test(identifier)) {
        throw new Error('Identificador de base de datos inválido');
    }
    return `\`${identifier}\``;
}

function sanitizeExportName(value) {
    const sanitized = String(value || 'database')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
    return sanitized || 'database';
}

function portableCreateView(statement) {
    return String(statement || '').replace(/DEFINER=`[^`]+`@`[^`]+`\s+/i, '');
}

async function* generateDatabaseExport(connection, options = {}) {
    const batchSize = Math.min(Math.max(Number(options.batchSize) || 250, 1), 1000);
    const generatedAt = options.generatedAt || new Date();
    const databaseName = sanitizeExportName(
        options.databaseName || process.env.DB_NAME || 'database'
    );

    const [objects] = await connection.query(
        `SELECT TABLE_NAME AS name, TABLE_TYPE AS type
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
         ORDER BY TABLE_TYPE, TABLE_NAME`
    );

    const tables = objects.filter(item => item.type === 'BASE TABLE');
    const views = objects.filter(item => item.type === 'VIEW');

    yield `-- Copia de ${databaseName}\n`;
    yield `-- Generada: ${generatedAt.toISOString()}\n`;
    yield '-- Importar únicamente en una base de datos vacía.\n\n';
    yield 'SET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS = 0;\n\n';

    for (const table of tables) {
        const tableName = quoteIdentifier(table.name);
        const [createRows] = await connection.query(`SHOW CREATE TABLE ${tableName}`);
        const createStatement = createRows[0]?.['Create Table'];
        if (!createStatement) continue;

        yield `-- Estructura de ${tableName}\n${createStatement};\n\n`;

        let offset = 0;
        while (true) {
            const [rows, fields] = await connection.query(
                `SELECT * FROM ${tableName} LIMIT ? OFFSET ?`,
                [batchSize, offset]
            );
            if (rows.length === 0) break;

            const columns = fields.map(field => quoteIdentifier(field.name));
            const values = rows.map(row => `(${fields
                .map(field => connection.escape(row[field.name]))
                .join(', ')})`);

            yield `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES\n${values.join(',\n')};\n\n`;
            offset += rows.length;
            if (rows.length < batchSize) break;
        }
    }

    yield 'SET FOREIGN_KEY_CHECKS = 1;\n\n';

    for (const view of views) {
        const viewName = quoteIdentifier(view.name);
        const [createRows] = await connection.query(`SHOW CREATE VIEW ${viewName}`);
        const createStatement = portableCreateView(createRows[0]?.['Create View']);
        if (createStatement) {
            yield `-- Vista ${viewName}\n${createStatement};\n\n`;
        }
    }
}

module.exports = {
    generateDatabaseExport,
    portableCreateView,
    quoteIdentifier,
    sanitizeExportName
};

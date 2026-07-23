const pool = require('../db/pool');

const REQUIRED_CONTACT_COLUMNS = Object.freeze({
    contact_email: "VARCHAR(254) DEFAULT ''",
    contact_phone: "VARCHAR(32) DEFAULT ''"
});

let schemaReadyPromise = null;

async function ensureVisualContactColumns() {
    if (schemaReadyPromise) return schemaReadyPromise;

    schemaReadyPromise = (async () => {
        const [rows] = await pool.execute(
            `SELECT COLUMN_NAME
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'visual_config'`
        );
        const existingColumns = new Set(rows.map((row) => row.COLUMN_NAME));

        for (const [columnName, definition] of Object.entries(REQUIRED_CONTACT_COLUMNS)) {
            if (existingColumns.has(columnName)) continue;
            await pool.execute(
                `ALTER TABLE visual_config ADD COLUMN ${columnName} ${definition}`
            );
        }
    })();

    try {
        await schemaReadyPromise;
    } catch (error) {
        schemaReadyPromise = null;
        throw error;
    }
}

module.exports = { ensureVisualContactColumns };

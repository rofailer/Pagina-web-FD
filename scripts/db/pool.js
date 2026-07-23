/**
 * Configuración y exportación del pool de conexiones MySQL
 * Usar: const pool = require('./db/pool');
 */

const mysql = require('mysql2/promise');

// Validar variables de entorno críticas
const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
requiredEnv.forEach((env) => {
    if (!process.env[env]) {
        console.warn(`[db/pool.js] Advertencia: Falta la variable de entorno ${env}. Se usará el valor por defecto si existe.`);
    }
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'firmas_digitales_v2',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;

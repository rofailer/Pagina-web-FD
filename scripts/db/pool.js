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
    database: process.env.DB_NAME || 'firmas_digitales',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3307,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Probar conexión al iniciar (opcional, útil en desarrollo)
(async () => {
    try {
        const conn = await pool.getConnection();
        console.log('✅ Conexión a la base de datos establecida correctamente');
        conn.release();
    } catch (err) {
        console.error('❌ Error de conexión a la base de datos:', err.message);
        // Puedes decidir si quieres terminar el proceso aquí:
        // process.exit(1);
    }
})();

module.exports = pool;
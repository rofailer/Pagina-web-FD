/**
 * Configuración y exportación del pool de conexiones MySQL.
 * En producción no se permiten credenciales implícitas, vacías o de ejemplo.
 */

'use strict';

const mysql = require('mysql2/promise');
const { isPlaceholderSecret } = require('../middlewares/security');

const REQUIRED_DATABASE_ENV = Object.freeze([
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DB_PORT'
]);
const VALID_SSL_MODES = new Set(['disabled', 'required', 'verify-ca', 'verify-identity']);

function parseBoundedInteger(value, fallback, minimum, maximum, variableName) {
    const candidate = value === undefined || value === '' ? fallback : Number(value);
    if (!Number.isSafeInteger(candidate) || candidate < minimum || candidate > maximum) {
        const error = new Error(
            `${variableName} debe ser un entero entre ${minimum} y ${maximum}`
        );
        error.code = 'INVALID_DATABASE_CONFIGURATION';
        throw error;
    }
    return candidate;
}

function decodeCertificate(environment) {
    if (environment.DB_SSL_CA_BASE64) {
        try {
            return Buffer.from(environment.DB_SSL_CA_BASE64, 'base64').toString('utf8');
        } catch {
            const error = new Error('DB_SSL_CA_BASE64 no contiene un certificado valido');
            error.code = 'INVALID_DATABASE_CONFIGURATION';
            throw error;
        }
    }
    return environment.DB_SSL_CA
        ? String(environment.DB_SSL_CA).replace(/\\n/g, '\n')
        : undefined;
}

function buildTlsConfiguration(environment, isProduction) {
    const mode = String(
        environment.DB_SSL_MODE || (isProduction ? 'required' : 'disabled')
    ).toLowerCase();

    if (!VALID_SSL_MODES.has(mode)) {
        const error = new Error(
            `DB_SSL_MODE debe ser uno de: ${[...VALID_SSL_MODES].join(', ')}`
        );
        error.code = 'INVALID_DATABASE_CONFIGURATION';
        throw error;
    }
    if (isProduction && mode === 'disabled') {
        const error = new Error('DB_SSL_MODE no puede ser disabled en produccion');
        error.code = 'INSECURE_DATABASE_TLS';
        throw error;
    }
    if (mode === 'disabled') return undefined;

    const ca = decodeCertificate(environment);
    return {
        rejectUnauthorized: mode === 'verify-ca' || mode === 'verify-identity',
        ...(ca ? { ca } : {})
    };
}

function validateProductionDatabaseConfig(environment) {
    const missing = REQUIRED_DATABASE_ENV.filter((name) =>
        environment[name] === undefined || String(environment[name]).trim().length === 0
    );
    if (missing.length > 0) {
        const error = new Error(
            `Faltan variables de base de datos obligatorias: ${missing.join(', ')}`
        );
        error.code = 'MISSING_DATABASE_CONFIGURATION';
        throw error;
    }

    if (String(environment.DB_USER).trim().toLowerCase() === 'root') {
        const error = new Error(
            'DB_USER no puede ser root en produccion; usa una cuenta de minimo privilegio'
        );
        error.code = 'UNSAFE_DATABASE_USER';
        throw error;
    }

    for (const variableName of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
        if (isPlaceholderSecret(environment[variableName])) {
            const error = new Error(`${variableName} no puede conservar un valor de ejemplo`);
            error.code = 'PLACEHOLDER_DATABASE_CONFIGURATION';
            throw error;
        }
    }
}

function buildPoolConfig(environment = process.env) {
    const isProduction = String(environment.NODE_ENV || 'development').toLowerCase() === 'production';
    if (isProduction) {
        validateProductionDatabaseConfig(environment);
    }

    const config = {
        host: environment.DB_HOST || 'localhost',
        user: environment.DB_USER || 'root',
        password: environment.DB_PASSWORD || '',
        database: environment.DB_NAME || 'firmas_digitales_v2',
        port: parseBoundedInteger(environment.DB_PORT, 3306, 1, 65535, 'DB_PORT'),
        waitForConnections: true,
        connectionLimit: parseBoundedInteger(
            environment.DB_CONNECTION_LIMIT,
            10,
            1,
            100,
            'DB_CONNECTION_LIMIT'
        ),
        maxIdle: parseBoundedInteger(
            environment.DB_MAX_IDLE,
            10,
            1,
            100,
            'DB_MAX_IDLE'
        ),
        idleTimeout: parseBoundedInteger(
            environment.DB_IDLE_TIMEOUT_MS,
            60_000,
            1_000,
            600_000,
            'DB_IDLE_TIMEOUT_MS'
        ),
        queueLimit: parseBoundedInteger(
            environment.DB_QUEUE_LIMIT,
            20,
            1,
            1_000,
            'DB_QUEUE_LIMIT'
        ),
        connectTimeout: parseBoundedInteger(
            environment.DB_CONNECT_TIMEOUT_MS,
            10_000,
            1_000,
            60_000,
            'DB_CONNECT_TIMEOUT_MS'
        ),
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    };
    const ssl = buildTlsConfiguration(environment, isProduction);
    if (ssl) config.ssl = ssl;

    return config;
}

const pool = mysql.createPool(buildPoolConfig());

pool.buildPoolConfig = buildPoolConfig;
pool.buildTlsConfiguration = buildTlsConfiguration;
pool.validateProductionDatabaseConfig = validateProductionDatabaseConfig;

module.exports = pool;

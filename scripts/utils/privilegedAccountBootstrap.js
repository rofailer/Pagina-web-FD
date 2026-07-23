'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SEED_PASSWORD_MARKER = '!DISABLED-SEED-ACCOUNT!';
const INITIAL_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;
const PRIVILEGED_ACCOUNTS = Object.freeze({
    admin: 'INITIAL_ADMIN_PASSWORD',
    owner: 'INITIAL_OWNER_PASSWORD'
});

function generateInitialPassword(length = 20) {
    const groups = [
        'ABCDEFGHJKLMNPQRSTUVWXYZ',
        'abcdefghijkmnopqrstuvwxyz',
        '23456789',
        '!@#$%*-_+'
    ];
    const characters = groups.join('');
    const password = groups.map(group => group[crypto.randomInt(group.length)]);

    while (password.length < length) {
        password.push(characters[crypto.randomInt(characters.length)]);
    }

    for (let index = password.length - 1; index > 0; index -= 1) {
        const swapIndex = crypto.randomInt(index + 1);
        [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
    }

    return password.join('');
}

function resolveInitialPassword(role, environment = process.env) {
    const variableName = PRIVILEGED_ACCOUNTS[role];
    const configuredPassword = variableName ? environment[variableName] : null;

    if (!configuredPassword) {
        return { password: generateInitialPassword(), generated: true, variableName };
    }

    if (!INITIAL_PASSWORD_PATTERN.test(configuredPassword)) {
        const error = new Error(
            `${variableName} debe tener entre 12 y 128 caracteres e incluir mayúscula, minúscula, número y símbolo`
        );
        error.code = 'INVALID_INITIAL_PASSWORD';
        throw error;
    }

    return { password: configuredPassword, generated: false, variableName };
}

async function initializePrivilegedAccounts(options = {}) {
    const database = options.database || require('../db/pool');
    const environment = options.environment || process.env;
    const logger = options.logger || console;
    const hashPassword = options.hashPassword || (password => bcrypt.hash(password, 12));

    const [accounts] = await database.query(
        `SELECT id, usuario, rol, password
         FROM users
         WHERE (usuario = 'admin' AND rol = 'admin')
            OR (usuario = 'owner' AND rol = 'owner')`
    );

    const pendingAccounts = accounts.filter(account =>
        account.password === SEED_PASSWORD_MARKER && PRIVILEGED_ACCOUNTS[account.rol]
    );
    // Validar ambas credenciales antes de modificar una sola fila evita una
    // inicialización parcial cuando alguna variable de entorno es incorrecta.
    const credentials = new Map(pendingAccounts.map(account => [
        account.id,
        resolveInitialPassword(account.rol, environment)
    ]));

    const initialized = [];
    for (const account of pendingAccounts) {
        const credential = credentials.get(account.id);
        const passwordHash = await hashPassword(credential.password);
        const [result] = await database.query(
            `UPDATE users
             SET password = ?, force_password_change = 1, updated_at = NOW()
             WHERE id = ? AND password = ?`,
            [passwordHash, account.id, SEED_PASSWORD_MARKER]
        );

        // La condición sobre el marcador evita que dos instancias inicialicen
        // la misma cuenta con contraseñas diferentes.
        if (!result?.affectedRows) continue;

        initialized.push({
            usuario: account.usuario,
            role: account.rol,
            generated: credential.generated,
            password: credential.generated ? credential.password : undefined,
            variableName: credential.variableName
        });

        if (credential.generated) {
            logger.warn(
                `[inicio seguro] Contraseña temporal generada para ${account.usuario}: ${credential.password}`
            );
            logger.warn('[inicio seguro] Guárdala ahora: solo se muestra una vez y deberá cambiarse al iniciar sesión.');
        } else {
            logger.info(
                `[inicio seguro] ${account.usuario} fue habilitado con la contraseña temporal configurada en ${credential.variableName}.`
            );
        }
    }

    return initialized;
}

module.exports = {
    INITIAL_PASSWORD_PATTERN,
    SEED_PASSWORD_MARKER,
    generateInitialPassword,
    initializePrivilegedAccounts,
    resolveInitialPassword
};

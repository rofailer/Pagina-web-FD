const crypto = require('crypto');

function getKey(key, type) {
    // Ajusta el tamaño de la clave según el algoritmo
    if (type === 'aes-256-cbc') return Buffer.from(key).slice(0, 32).toString().padEnd(32, '0').slice(0, 32);
    if (type === 'aes-192-cbc') return Buffer.from(key).slice(0, 24).toString().padEnd(24, '0').slice(0, 24);
    if (type === 'aes-128-cbc') return Buffer.from(key).slice(0, 16).toString().padEnd(16, '0').slice(0, 16);
    throw new Error('Tipo de cifrado no soportado');
}

const IV_LENGTH = 16;

function encryptAES(text, key, type = 'aes-256-cbc') {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(type, Buffer.from(getKey(key, type)), iv);
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return iv.toString('base64') + ':' + encrypted;
}
function decryptAES(text, key, type = 'aes-256-cbc') {
    const [ivBase64, encrypted] = text.split(':');
    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = crypto.createDecipheriv(type, Buffer.from(getKey(key, type)), iv);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function encryptWithType(text, password, type) {
    return encryptAES(text, password, type);
}
function decryptWithType(text, password, type) {
    return decryptAES(text, password, type);
}

module.exports = {
    encryptAES, decryptAES,
    encryptWithType, decryptWithType
};
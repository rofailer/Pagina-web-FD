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

/**
 * Genera el hash SHA256 de un buffer
 * @param {Buffer} buffer - El buffer del archivo
 * @returns {string} Hash SHA256 en formato hexadecimal
 */
function generateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Genera un manifest JSON determinista para anexos
 * @param {Array} files - Array de objetos {name, buffer, mimetype}
 * @returns {string} JSON manifest ordenado alfabéticamente
 */
function generateManifest(files) {
    const filesData = {};

    // Procesar cada archivo
    files.forEach(file => {
        filesData[file.name] = {
            sha256: generateFileHash(file.buffer),
            size: file.buffer.length,
            mimetype: file.mimetype || 'application/octet-stream'
        };
    });

    // Ordenar alfabéticamente las claves para determinismo
    const sortedFiles = Object.keys(filesData)
        .sort()
        .reduce((acc, key) => {
            acc[key] = filesData[key];
            return acc;
        }, {});

    const manifest = {
        version: '1.0.0',
        created_at: new Date().toISOString(),
        files: sortedFiles
    };

    // Retornar JSON con claves ordenadas para asegurar determinismo
    return JSON.stringify(manifest, null, 2);
}

/**
 * Verifica la integridad de archivos contra un manifest
 * @param {Array} files - Array de objetos {name, buffer}
 * @param {Object} manifest - Manifest parseado
 * @returns {Object} Resultado de la verificación
 */
function verifyManifest(files, manifest) {
    const result = {
        filesMatched: [],
        filesModified: [],
        filesMissing: [],
        filesExtra: [],
        isValid: true
    };

    const manifestFiles = manifest.files || {};
    const uploadedFileNames = files.map(f => f.name);

    // Verificar archivos en el manifest
    for (const [fileName, fileData] of Object.entries(manifestFiles)) {
        const uploadedFile = files.find(f => f.name === fileName);

        if (!uploadedFile) {
            result.filesMissing.push(fileName);
            result.isValid = false;
        } else {
            const uploadedHash = generateFileHash(uploadedFile.buffer);

            if (uploadedHash === fileData.sha256) {
                result.filesMatched.push({
                    name: fileName,
                    size: fileData.size,
                    hash: uploadedHash
                });
            } else {
                result.filesModified.push({
                    name: fileName,
                    expectedHash: fileData.sha256,
                    actualHash: uploadedHash
                });
                result.isValid = false;
            }
        }
    }

    // Verificar archivos extra (no en manifest)
    uploadedFileNames.forEach(fileName => {
        if (!manifestFiles[fileName]) {
            result.filesExtra.push(fileName);
            result.isValid = false;
        }
    });

    return result;
}

module.exports = {
    encryptAES, decryptAES,
    encryptWithType, decryptWithType,
    generateFileHash,
    generateManifest,
    verifyManifest
};
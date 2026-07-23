const crypto = require('crypto');

const V2_ENCRYPTION_TYPE = 'aes-256-gcm-v2';
const V2_PREFIX = 'v2:';
const V2_AAD = Buffer.from('FirmasDigitalesFD:key-envelope:v2', 'utf8');
const V3_ENCRYPTION_TYPE = 'chacha20-poly1305-v3';
const V3_PREFIX = 'v3:';
const V3_AAD = Buffer.from('FirmasDigitalesFD:key-envelope:v3', 'utf8');
const SUPPORTED_ENCRYPTION_TYPES = Object.freeze([
    V2_ENCRYPTION_TYPE,
    V3_ENCRYPTION_TYPE
]);
const SCRYPT_OPTIONS = Object.freeze({
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024
});

function assertSecret(secret) {
    if (typeof secret !== 'string' || secret.length === 0) {
        throw new Error('La contrasena de la llave es requerida');
    }
    if (secret.length > 1024) {
        throw new Error('La contrasena de la llave excede el tamano permitido');
    }
}

function parseV2Envelope(value) {
    if (typeof value !== 'string' || !value.startsWith(V2_PREFIX)) {
        throw new Error('Sobre de cifrado v2 invalido');
    }

    let envelope;
    try {
        envelope = JSON.parse(Buffer.from(value.slice(V2_PREFIX.length), 'base64').toString('utf8'));
    } catch (error) {
        throw new Error('Sobre de cifrado v2 corrupto');
    }

    const requiredStrings = ['salt', 'iv', 'tag', 'data'];
    if (
        envelope.v !== 2 ||
        envelope.cipher !== 'aes-256-gcm' ||
        envelope.kdf !== 'scrypt' ||
        envelope.n !== SCRYPT_OPTIONS.N ||
        envelope.r !== SCRYPT_OPTIONS.r ||
        envelope.p !== SCRYPT_OPTIONS.p ||
        requiredStrings.some(field => typeof envelope[field] !== 'string' || envelope[field].length === 0)
    ) {
        throw new Error('Parametros del sobre de cifrado v2 invalidos');
    }

    return envelope;
}

function encryptV2(text, password) {
    assertSecret(password);
    if (typeof text !== 'string') {
        throw new TypeError('El contenido a cifrar debe ser texto');
    }

    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(password, salt, 32, SCRYPT_OPTIONS);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(V2_AAD);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

    const envelope = {
        v: 2,
        cipher: 'aes-256-gcm',
        kdf: 'scrypt',
        n: SCRYPT_OPTIONS.N,
        r: SCRYPT_OPTIONS.r,
        p: SCRYPT_OPTIONS.p,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        data: encrypted.toString('base64')
    };

    return V2_PREFIX + Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
}

function decryptV2(value, password) {
    assertSecret(password);
    const envelope = parseV2Envelope(value);
    const salt = Buffer.from(envelope.salt, 'base64');
    const iv = Buffer.from(envelope.iv, 'base64');
    const tag = Buffer.from(envelope.tag, 'base64');
    const encrypted = Buffer.from(envelope.data, 'base64');

    if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) {
        throw new Error('Sobre de cifrado v2 corrupto');
    }

    const key = crypto.scryptSync(password, salt, 32, SCRYPT_OPTIONS);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(V2_AAD);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function parseV3Envelope(value) {
    if (typeof value !== 'string' || !value.startsWith(V3_PREFIX)) {
        throw new Error('Sobre de cifrado v3 invalido');
    }

    let envelope;
    try {
        envelope = JSON.parse(Buffer.from(value.slice(V3_PREFIX.length), 'base64').toString('utf8'));
    } catch (error) {
        throw new Error('Sobre de cifrado v3 corrupto');
    }

    const requiredStrings = ['salt', 'iv', 'tag', 'data'];
    if (
        envelope.v !== 3 ||
        envelope.cipher !== 'chacha20-poly1305' ||
        envelope.kdf !== 'scrypt' ||
        envelope.n !== SCRYPT_OPTIONS.N ||
        envelope.r !== SCRYPT_OPTIONS.r ||
        envelope.p !== SCRYPT_OPTIONS.p ||
        requiredStrings.some(field => typeof envelope[field] !== 'string' || envelope[field].length === 0)
    ) {
        throw new Error('Parametros del sobre de cifrado v3 invalidos');
    }

    return envelope;
}

function encryptV3(text, password) {
    assertSecret(password);
    if (typeof text !== 'string') {
        throw new TypeError('El contenido a cifrar debe ser texto');
    }

    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = crypto.scryptSync(password, salt, 32, SCRYPT_OPTIONS);
    const cipher = crypto.createCipheriv('chacha20-poly1305', key, iv, {
        authTagLength: 16
    });
    cipher.setAAD(V3_AAD);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);

    const envelope = {
        v: 3,
        cipher: 'chacha20-poly1305',
        kdf: 'scrypt',
        n: SCRYPT_OPTIONS.N,
        r: SCRYPT_OPTIONS.r,
        p: SCRYPT_OPTIONS.p,
        salt: salt.toString('base64'),
        iv: iv.toString('base64'),
        tag: cipher.getAuthTag().toString('base64'),
        data: encrypted.toString('base64')
    };

    return V3_PREFIX + Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');
}

function decryptV3(value, password) {
    assertSecret(password);
    const envelope = parseV3Envelope(value);
    const salt = Buffer.from(envelope.salt, 'base64');
    const iv = Buffer.from(envelope.iv, 'base64');
    const tag = Buffer.from(envelope.tag, 'base64');
    const encrypted = Buffer.from(envelope.data, 'base64');

    if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) {
        throw new Error('Sobre de cifrado v3 corrupto');
    }

    const key = crypto.scryptSync(password, salt, 32, SCRYPT_OPTIONS);
    const decipher = crypto.createDecipheriv('chacha20-poly1305', key, iv, {
        authTagLength: 16
    });
    decipher.setAAD(V3_AAD);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function isSupportedEncryptionType(type) {
    return SUPPORTED_ENCRYPTION_TYPES.includes(type);
}

function encryptWithType(text, password, type = V2_ENCRYPTION_TYPE) {
    switch (type) {
        case V2_ENCRYPTION_TYPE:
            return encryptV2(text, password);
        case V3_ENCRYPTION_TYPE:
            return encryptV3(text, password);
        default:
            throw new Error('Tipo de cifrado de llave no soportado');
    }
}

function decryptWithType(text, password, type = V2_ENCRYPTION_TYPE) {
    switch (type) {
        case V2_ENCRYPTION_TYPE:
            return decryptV2(text, password);
        case V3_ENCRYPTION_TYPE:
            return decryptV3(text, password);
        default:
            throw new Error('Tipo de cifrado de llave no soportado');
    }
}

function toPayloadBuffer(payload) {
    if (Buffer.isBuffer(payload)) return payload;
    if (payload instanceof Uint8Array) return Buffer.from(payload);
    if (typeof payload === 'string') return Buffer.from(payload, 'utf8');
    throw new TypeError('El contenido criptografico debe ser texto, Buffer o Uint8Array');
}

function decodeBase64Signature(signatureBase64) {
    if (
        typeof signatureBase64 !== 'string' ||
        signatureBase64.length === 0 ||
        signatureBase64.length > 16384 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(signatureBase64) ||
        signatureBase64.length % 4 !== 0
    ) {
        throw new Error('Firma en base64 invalida');
    }
    const signature = Buffer.from(signatureBase64, 'base64');
    if (signature.length === 0) {
        throw new Error('Firma vacia');
    }
    return signature;
}

function signPayload(payload, privateKey) {
    const key = privateKey instanceof crypto.KeyObject
        ? privateKey
        : crypto.createPrivateKey(privateKey);
    return crypto.sign('sha256', toPayloadBuffer(payload), {
        key,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }).toString('base64');
}

function verifyPayloadSignature(payload, signatureBase64, publicKey) {
    try {
        const key = publicKey instanceof crypto.KeyObject
            ? publicKey
            : crypto.createPublicKey(publicKey);
        return crypto.verify('sha256', toPayloadBuffer(payload), {
            key,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, decodeBase64Signature(signatureBase64));
    } catch (error) {
        return false;
    }
}

function generateFileHash(buffer) {
    return crypto.createHash('sha256').update(toPayloadBuffer(buffer)).digest('hex');
}

function generateManifest(files, context = {}) {
    const filesData = {};

    files.forEach(file => {
        if (!file || typeof file.name !== 'string' || file.name.length === 0) {
            throw new Error('Cada anexo debe tener un nombre valido');
        }
        if (Object.prototype.hasOwnProperty.call(filesData, file.name)) {
            throw new Error(`No se permiten anexos duplicados: ${file.name}`);
        }
        const buffer = toPayloadBuffer(file.buffer);
        filesData[file.name] = {
            sha256: generateFileHash(buffer),
            size: buffer.length,
            mimetype: file.mimetype || 'application/octet-stream'
        };
    });

    const sortedFiles = Object.keys(filesData).sort().reduce((acc, key) => {
        acc[key] = filesData[key];
        return acc;
    }, {});

    const hasSecurityContext = context.signerId && context.signingKeyId && context.documentSignature;
    const manifest = {
        version: hasSecurityContext ? '2.0.0' : '1.0.0',
        created_at: new Date().toISOString(),
        ...(hasSecurityContext ? {
            signer_id: Number(context.signerId),
            signing_key_id: Number(context.signingKeyId),
            document_signature_sha256: generateFileHash(String(context.documentSignature))
        } : {}),
        files: sortedFiles
    };

    return JSON.stringify(manifest, null, 2);
}

function verifyManifest(files, manifest) {
    const result = {
        filesMatched: [],
        filesModified: [],
        filesMissing: [],
        filesExtra: [],
        isValid: true
    };

    if (!manifest || typeof manifest !== 'object' || !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
        return { ...result, isValid: false, error: 'Manifest invalido' };
    }

    const manifestFiles = manifest.files;
    const uploadedByName = new Map();
    files.forEach(file => {
        if (!uploadedByName.has(file.name)) uploadedByName.set(file.name, []);
        uploadedByName.get(file.name).push(file);
    });

    for (const [fileName, fileData] of Object.entries(manifestFiles)) {
        const candidates = uploadedByName.get(fileName) || [];
        if (candidates.length === 0) {
            result.filesMissing.push(fileName);
            result.isValid = false;
            continue;
        }
        if (candidates.length > 1) {
            result.filesModified.push({ name: fileName, reason: 'duplicate-upload' });
            result.isValid = false;
            continue;
        }

        const uploadedBuffer = toPayloadBuffer(candidates[0].buffer);
        const uploadedHash = generateFileHash(uploadedBuffer);
        const expectedHashIsValid = fileData && /^[a-f0-9]{64}$/i.test(fileData.sha256 || '');
        if (expectedHashIsValid && uploadedHash === fileData.sha256 && uploadedBuffer.length === Number(fileData.size)) {
            result.filesMatched.push({ name: fileName, size: uploadedBuffer.length, hash: uploadedHash });
        } else {
            result.filesModified.push({
                name: fileName,
                expectedHash: fileData && fileData.sha256,
                actualHash: uploadedHash
            });
            result.isValid = false;
        }
    }

    for (const [fileName, candidates] of uploadedByName.entries()) {
        if (!Object.prototype.hasOwnProperty.call(manifestFiles, fileName)) {
            candidates.forEach(() => result.filesExtra.push(fileName));
            result.isValid = false;
        }
    }

    return result;
}

module.exports = {
    V2_ENCRYPTION_TYPE,
    V3_ENCRYPTION_TYPE,
    SUPPORTED_ENCRYPTION_TYPES,
    encryptV2,
    decryptV2,
    encryptV3,
    decryptV3,
    isSupportedEncryptionType,
    encryptWithType,
    decryptWithType,
    signPayload,
    verifyPayloadSignature,
    generateFileHash,
    generateManifest,
    verifyManifest
};

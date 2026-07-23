'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { describe, test } = require('node:test');
const {
  V2_ENCRYPTION_TYPE,
  V3_ENCRYPTION_TYPE,
  decryptWithType,
  encryptV2,
  encryptV3,
  generateManifest,
  signPayload,
  verifyManifest,
  verifyPayloadSignature
} = require('../scripts/utils/crypto');

describe('cryptographic utilities', () => {
  test('AES-GCM v2 decrypts valid data and rejects password or ciphertext changes', () => {
    const secret = 'VeryStrong-Key_Password-2026!';
    const plaintext = 'private-key-material';
    const first = encryptV2(plaintext, secret);
    const second = encryptV2(plaintext, secret);

    assert.notEqual(first, second);
    assert.equal(decryptWithType(first, secret, V2_ENCRYPTION_TYPE), plaintext);
    assert.throws(() => decryptWithType(first, 'wrong-password', V2_ENCRYPTION_TYPE));

    const envelope = JSON.parse(Buffer.from(first.slice(3), 'base64').toString('utf8'));
    const data = Buffer.from(envelope.data, 'base64');
    data[0] ^= 1;
    envelope.data = data.toString('base64');
    const tampered = `v2:${Buffer.from(JSON.stringify(envelope)).toString('base64')}`;
    assert.throws(() => decryptWithType(tampered, secret, V2_ENCRYPTION_TYPE));
  });

  test('ChaCha20-Poly1305 v3 decrypts valid data and rejects password or ciphertext changes', () => {
    const secret = 'VeryStrong-Key_Password-2026!';
    const plaintext = 'private-key-material';
    const first = encryptV3(plaintext, secret);
    const second = encryptV3(plaintext, secret);

    assert.notEqual(first, second);
    assert.equal(decryptWithType(first, secret, V3_ENCRYPTION_TYPE), plaintext);
    assert.throws(() => decryptWithType(first, 'wrong-password', V3_ENCRYPTION_TYPE));

    const envelope = JSON.parse(Buffer.from(first.slice(3), 'base64').toString('utf8'));
    const data = Buffer.from(envelope.data, 'base64');
    data[0] ^= 1;
    envelope.data = data.toString('base64');
    const tampered = `v3:${Buffer.from(JSON.stringify(envelope)).toString('base64')}`;
    assert.throws(() => decryptWithType(tampered, secret, V3_ENCRYPTION_TYPE));
  });

  test('rejects unsupported key encryption formats', () => {
    const encrypted = encryptV2('private-key-material', 'VeryStrong-Key_Password-2026!');
    assert.throws(() => decryptWithType(encrypted, 'VeryStrong-Key_Password-2026!', 'unsupported-format'));
  });

  test('RSA signatures reject modified payloads and unrelated keys', () => {
    const signer = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const payload = Buffer.from('document bytes');
    const signature = signPayload(payload, signer.privateKey);

    assert.equal(verifyPayloadSignature(payload, signature, signer.publicKey), true);
    assert.equal(verifyPayloadSignature(Buffer.from('modified'), signature, signer.publicKey), false);
    assert.equal(verifyPayloadSignature(payload, signature, other.publicKey), false);
  });

  test('signed attachment manifests bind signer context and detect file changes', () => {
    const files = [
      { name: 'evidence.txt', buffer: Buffer.from('original'), mimetype: 'text/plain' },
      { name: 'photo.png', buffer: Buffer.from([1, 2, 3]), mimetype: 'image/png' }
    ];
    const manifest = JSON.parse(generateManifest(files, {
      signerId: 7,
      signingKeyId: 11,
      documentSignature: 'document-signature'
    }));

    assert.equal(manifest.version, '2.0.0');
    assert.equal(manifest.signer_id, 7);
    assert.equal(manifest.signing_key_id, 11);
    assert.equal(verifyManifest(files, manifest).isValid, true);

    const modified = files.map(file => ({ ...file }));
    modified[0].buffer = Buffer.from('changed');
    const verification = verifyManifest(modified, manifest);
    assert.equal(verification.isValid, false);
    assert.equal(verification.filesModified[0].name, 'evidence.txt');

    assert.throws(
      () => generateManifest([files[0], { ...files[0] }]),
      /duplicados/
    );
  });
});

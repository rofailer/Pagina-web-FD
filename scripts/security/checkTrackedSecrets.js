'use strict';

const { execFileSync } = require('node:child_process');
const { basename, extname } = require('node:path');
const { readFileSync, statSync } = require('node:fs');

const MAX_SCANNED_FILE_BYTES = 2 * 1024 * 1024;
const FORBIDDEN_TRACKED_NAMES = [
    /^\.env(?:\..+)?$/i,
    /^\.npmrc$/i,
    /^\.netrc$/i,
    /^id_rsa(?:\..+)?$/i
];
const FORBIDDEN_TRACKED_EXTENSIONS = new Set([
    '.bak',
    '.db',
    '.dump',
    '.jks',
    '.key',
    '.keystore',
    '.ovpn',
    '.p12',
    '.pem',
    '.pfx',
    '.sqlite',
    '.sqlite3'
]);
const CONTENT_PATTERNS = [
    {
        name: 'private-key',
        pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
    },
    {
        name: 'github-token',
        pattern: /\b(?:github_pat_[A-Za-z0-9_]{40,}|gh[pousr]_[A-Za-z0-9]{36,})\b/
    },
    {
        name: 'aws-access-key',
        pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/
    },
    {
        name: 'google-api-key',
        pattern: /\bAIza[0-9A-Za-z_-]{35}\b/
    },
    {
        name: 'stripe-live-key',
        pattern: /\bsk_live_[0-9A-Za-z]{20,}\b/
    },
    {
        name: 'configured-secret',
        pattern: /^\s*(?:JWT_SECRET|DB_PASSWORD|INITIAL_ADMIN_PASSWORD|INITIAL_OWNER_PASSWORD)\s*=\s*(?!$|reemplaza|replace|change|example|ejemplo)(?:"[^"]+"|'[^']+'|[^\s#]+)/im
    }
];

function listTrackedFiles() {
    return execFileSync(
        'git',
        ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
        {
        encoding: 'utf8',
        windowsHide: true
        }
    ).split('\0').filter(Boolean);
}

function isForbiddenTrackedFile(filePath) {
    const fileName = basename(filePath);
    if (fileName.toLowerCase() === '.env.example') return false;
    return FORBIDDEN_TRACKED_NAMES.some(pattern => pattern.test(fileName))
        || FORBIDDEN_TRACKED_EXTENSIONS.has(extname(fileName).toLowerCase());
}

function scanTrackedFiles(filePaths = listTrackedFiles()) {
    const findings = [];

    for (const filePath of filePaths) {
        if (isForbiddenTrackedFile(filePath)) {
            findings.push({ filePath, rule: 'sensitive-file' });
            continue;
        }
        if (basename(filePath).toLowerCase() === '.env.example') continue;

        let stats;
        try {
            stats = statSync(filePath);
        } catch {
            continue;
        }
        if (!stats.isFile() || stats.size > MAX_SCANNED_FILE_BYTES) continue;

        let content;
        try {
            content = readFileSync(filePath, 'utf8');
        } catch {
            continue;
        }
        if (content.includes('\0')) continue;

        for (const { name, pattern } of CONTENT_PATTERNS) {
            if (pattern.test(content)) findings.push({ filePath, rule: name });
        }
    }

    return findings;
}

if (require.main === module) {
    const findings = scanTrackedFiles();
    if (findings.length > 0) {
        console.error('Se detectaron posibles secretos o archivos sensibles versionados:');
        findings.forEach(({ filePath, rule }) => console.error(`- ${filePath} (${rule})`));
        process.exitCode = 1;
    } else {
        console.log('No se detectaron secretos conocidos en los archivos versionados actuales.');
    }
}

module.exports = {
    isForbiddenTrackedFile,
    scanTrackedFiles
};

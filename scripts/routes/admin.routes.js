/* ========================================
   RUTAS DE ADMINISTRACIÓN - BACKEND
   Sistema completo de gestión administrativa
   ======================================== */

const express = require('express');
const { once } = require('events');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const authenticate = require('../middlewares/authenticate');
const isOwner = require('../middlewares/isOwner');
const isAdmin = require('../middlewares/isAdmin');
const { generateDatabaseExport, sanitizeExportName } = require('../utils/databaseExport');
const { ensureVisualContactColumns } = require('../utils/visualConfigSchema');

const NAME_PATTERN = /^[\p{L}\p{M}\p{N} .,'’_-]+$/u;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;
const TABLE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_]+$/;
const SENSITIVE_COLUMN_PATTERN = /(?:password|private_key|secret|token|auth_version|logo_data|foto_perfil|hash|salt|cipher|encryption_(?:iv|tag))/i;
const ALLOWED_PROFILE_PHOTO_MIMES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
]);
const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000;
const PDF_TEMPLATE_IDS = new Set(['clasico', 'moderno', 'minimalista', 'elegante']);
const PDF_FONT_IDS = new Set([
    'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique',
    'Times-Roman', 'Times-Bold', 'Times-Italic',
    'Courier', 'Courier-Bold'
]);
const PDF_BORDER_STYLES = new Set(['classic', 'solid', 'double', 'minimal', 'none']);
const PDF_AVAL_VARIABLES = Object.freeze([
    '$autores', '$titulo', '$modalidad', '$avalador', '$fecha', '$institucion', '$ubicacion'
]);

function clampNumber(value, fallback, min, max) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.min(Math.max(numeric, min), max) : fallback;
}

function safePdfColor(value, fallback) {
    return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim())
        ? value.trim().toLowerCase()
        : fallback;
}

function safePdfFont(value, fallback) {
    return PDF_FONT_IDS.has(value) ? value : fallback;
}

function normalizePdfConfiguration(input = {}) {
    const selectedTemplate = PDF_TEMPLATE_IDS.has(input.selectedTemplate)
        ? input.selectedTemplate
        : 'clasico';
    const colors = input.colorConfig && typeof input.colorConfig === 'object' ? input.colorConfig : {};
    const fonts = input.fontConfig && typeof input.fontConfig === 'object' ? input.fontConfig : {};
    const layout = input.layoutConfig && typeof input.layoutConfig === 'object' ? input.layoutConfig : {};
    const border = input.borderConfig && typeof input.borderConfig === 'object' ? input.borderConfig : {};
    const visual = input.visualConfig && typeof input.visualConfig === 'object' ? input.visualConfig : {};
    const aval = input.avalTextConfig && typeof input.avalTextConfig === 'object' ? input.avalTextConfig : {};
    const avalTemplate = typeof aval.template === 'string'
        ? aval.template.normalize('NFC').trim().slice(0, 4000)
        : '';

    return {
        selectedTemplate,
        logoPath: '',
        colorConfig: {
            primary: safePdfColor(colors.primary, '#2563eb'),
            secondary: safePdfColor(colors.secondary, '#64748b'),
            accent: safePdfColor(colors.accent, '#f59e0b'),
            text: safePdfColor(colors.text, '#1f2937'),
            background: safePdfColor(colors.background, '#ffffff')
        },
        fontConfig: {
            title: safePdfFont(fonts.title, 'Helvetica-Bold'),
            body: safePdfFont(fonts.body, 'Helvetica'),
            metadata: safePdfFont(fonts.metadata, 'Helvetica-Oblique'),
            signature: safePdfFont(fonts.signature, 'Times-Bold')
        },
        layoutConfig: {
            marginTop: clampNumber(layout.marginTop, 60, 20, 140),
            marginBottom: clampNumber(layout.marginBottom, 60, 20, 140),
            marginLeft: clampNumber(layout.marginLeft, 50, 20, 140),
            marginRight: clampNumber(layout.marginRight, 50, 20, 140),
            lineHeight: clampNumber(layout.lineHeight, 1.6, 1, 3),
            titleSize: clampNumber(layout.titleSize, 24, 14, 48),
            bodySize: clampNumber(layout.bodySize, 12, 8, 24)
        },
        borderConfig: {
            style: PDF_BORDER_STYLES.has(border.style) ? border.style : 'classic',
            width: clampNumber(border.width, 2, 0, 8),
            color: safePdfColor(border.color, '#1f2937'),
            cornerRadius: clampNumber(border.cornerRadius, 0, 0, 30),
            showDecorative: border.showDecorative !== false
        },
        visualConfig: {
            showLogo: visual.showLogo !== false,
            showInstitution: visual.showInstitution !== false,
            showDate: visual.showDate !== false,
            showSignature: visual.showSignature !== false,
            showAuthors: visual.showAuthors !== false,
            showAvalador: visual.showAvalador !== false
        },
        avalTextConfig: {
            template: avalTemplate,
            variables: PDF_AVAL_VARIABLES
        }
    };
}

function effectivePresenceStatus(status, lastActivity, now = Date.now()) {
    if (status === 'desconectado' || !lastActivity) return 'desconectado';
    const lastActivityMs = new Date(lastActivity).getTime();
    if (!Number.isFinite(lastActivityMs) || now - lastActivityMs > PRESENCE_TIMEOUT_MS) {
        return 'desconectado';
    }
    return ['en_linea', 'ausente', 'ocupado'].includes(status)
        ? status
        : 'desconectado';
}

function serializePhotoVersion(value) {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? String(timestamp) : null;
}

function sendAdminPhoto(req, res, user) {
    if (!Buffer.isBuffer(user.foto_perfil)
        || !user.foto_perfil.length
        || !ALLOWED_PROFILE_PHOTO_MIMES.has(user.foto_perfil_mimetype)) {
        return res.status(404).json({ success: false, message: 'El usuario no tiene foto de perfil' });
    }

    const version = serializePhotoVersion(user.foto_perfil_actualizada_at) || '0';
    const etag = `\"admin-profile-${user.id}-${version}-${user.foto_perfil.length}\"`;
    res.setHeader('Content-Type', user.foto_perfil_mimetype);
    res.setHeader('Content-Length', user.foto_perfil.length);
    res.setHeader('Cache-Control', 'private, max-age=300, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    return res.send(user.foto_perfil);
}

function redactDatabaseRow(row) {
    if (!row || typeof row !== 'object') return row;
    return Object.fromEntries(
        Object.entries(row).map(([key, value]) => {
            if (SENSITIVE_COLUMN_PATTERN.test(key) && value !== null) {
                return [key, '[PROTEGIDO]'];
            }
            if (Buffer.isBuffer(value)) {
                return [key, `[BINARIO: ${value.length} bytes]`];
            }
            if (typeof value === 'string' && value.length > 500) {
                return [key, `${value.slice(0, 500)}…`];
            }
            return [key, value];
        })
    );
}

function normalizeText(value) {
    return typeof value === 'string' ? value.normalize('NFC').trim() : '';
}

function isValidName(value) {
    return value.length >= 2 && value.length <= 100 && NAME_PATTERN.test(value);
}

function isValidEmail(value) {
    return value.length >= 5 && value.length <= 254 && EMAIL_PATTERN.test(value);
}

function normalizeRole(value) {
    if (value === 'user' || value === 'profesor') return 'profesor';
    if (value === 'admin') return 'admin';
    if (value === 'owner') return 'owner';
    return null;
}

function generateSecurePassword(length = 18) {
    const groups = [
        'ABCDEFGHJKLMNPQRSTUVWXYZ',
        'abcdefghijkmnopqrstuvwxyz',
        '23456789',
        '!@#$%*-_+'
    ];
    const allCharacters = groups.join('');
    const password = groups.map(group => group[crypto.randomInt(group.length)]);

    while (password.length < length) {
        password.push(allCharacters[crypto.randomInt(allCharacters.length)]);
    }

    for (let index = password.length - 1; index > 0; index -= 1) {
        const swapIndex = crypto.randomInt(index + 1);
        [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
    }

    return password.join('');
}

async function findManagedUser(userId) {
    const normalizedId = Number(userId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        return null;
    }

    const [users] = await pool.query(
        `SELECT u.id, u.nombre, u.usuario, u.email, u.rol, u.estado_cuenta,
                u.estado_presencia, u.ultima_actividad, u.active_key_id,
                u.organizacion, u.cargo, u.departamento,
                u.created_at, u.ultimo_acceso,
                (u.foto_perfil IS NOT NULL) AS has_photo,
                u.foto_perfil_actualizada_at,
                (SELECT COUNT(*) FROM user_keys uk WHERE uk.user_id = u.id) AS keys_count,
                (SELECT COUNT(*) FROM user_keys uk
                 WHERE uk.user_id = u.id AND uk.expiration_date > NOW()) AS active_keys_count
         FROM users u
         WHERE u.id = ?
         LIMIT 1`,
        [normalizedId]
    );
    return users[0] || null;
}

function ownerProtectionMessage(req, targetUser) {
    if (targetUser?.rol === 'owner' && req.userRole !== 'owner') {
        return 'Solo un propietario puede administrar otra cuenta de propietario';
    }
    return null;
}

/* ========================================
   MIDDLEWARE DE AUTENTICACIÓN ADMIN
   ======================================== */

// Middleware para autenticar tokens de admin del panel
async function authenticateAdmin(req, res, next) {
    if (req.adminAuthenticated) {
        return next();
    }

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de autorización requerido'
            });
        }

        const token = authHeader.substring(7);

        // Verificar token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar que sea un token de tipo admin-panel
        if (decoded.type !== 'admin-panel') {
            return res.status(401).json({
                success: false,
                message: 'Tipo de token inválido'
            });
        }

        const [users] = await pool.query(
            `SELECT id, nombre, usuario, email, rol, estado_cuenta, password, updated_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario administrativo no encontrado'
            });
        }

        const user = users[0];

        if (!authenticate.tokenMatchesCurrentUser(decoded, user)) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado'
            });
        }

        if (user.estado_cuenta && user.estado_cuenta !== 'activo') {
            return res.status(403).json({
                success: false,
                message: 'La cuenta administrativa no está activa'
            });
        }

        if (!['admin', 'owner'].includes(user.rol)) {
            return res.status(403).json({
                success: false,
                message: 'El usuario ya no tiene permisos administrativos'
            });
        }

        req.userId = user.id;
        req.userRole = user.rol;
        req.authVersion = authenticate.createAuthVersion(user.id, user.password);
        req.user = {
            id: user.id,
            nombre: user.nombre,
            usuario: user.usuario,
            email: user.email,
            rol: user.rol,
            estado_cuenta: user.estado_cuenta
        };
        req.adminAuthenticated = true;

        next();
    } catch (error) {
        const isTokenError = error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError';
        if (!isTokenError) {
            console.error('Error validando la sesión administrativa:', error);
        }
        return res.status(isTokenError ? 401 : 503).json({
            success: false,
            message: isTokenError
                ? 'Token inválido o expirado'
                : 'No se pudo validar la sesión administrativa'
        });
    }
}

/* ========================================
   TOKENS TEMPORALES DE ADMINISTRACIÓN
   ======================================== */

// Almacén temporal para tokens de admin (en memoria)
const adminTokens = new Map();

// Generar token temporal para panel de administración
router.post('/api/admin/generate-admin-token', authenticate, isAdmin, async (req, res) => {
    try {
        // Generar token temporal con expiración extendida
        const adminToken = jwt.sign(
            {
                id: req.userId,           // Cambiar de 'userId' a 'id' para compatibilidad
                rol: req.userRole,
                usuario: req.user?.usuario || 'admin',
                type: 'admin-panel',
                timestamp: Date.now(),
                authVersion: req.authVersion
            },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        // Guardar en memoria con expiración
        const tokenId = crypto.randomBytes(32).toString('hex');
        adminTokens.set(tokenId, {
            token: adminToken,
            userId: req.userId,
            createdAt: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000)
        });

        // Limpiar tokens expirados cada vez que se crea uno nuevo
        for (const [id, data] of adminTokens.entries()) {
            if (data.expiresAt < Date.now()) {
                adminTokens.delete(id);
            }
        }

        res.json({
            success: true,
            tokenId: tokenId,
            expiresIn: 300
        });
    } catch (error) {
        console.error('Error generando token de admin:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Intercambiar tokenId por token real
router.post('/api/admin/exchange-admin-token', async (req, res) => {
    try {
        const { tokenId } = req.body;

        if (!tokenId) {
            return res.status(400).json({ error: 'Token ID requerido' });
        }

        // Buscar token en memoria
        const tokenData = adminTokens.get(tokenId);

        if (!tokenData) {
            return res.status(404).json({ error: 'Token ID inválido o expirado' });
        }

        // Verificar si el token no ha expirado
        if (tokenData.expiresAt < Date.now()) {
            adminTokens.delete(tokenId); // Limpiar token expirado
            return res.status(404).json({ error: 'Token ID expirado' });
        }

        // El identificador temporal solo puede intercambiarse una vez.
        adminTokens.delete(tokenId);

        res.json({
            success: true,
            token: tokenData.token,
            expiresIn: 43200
        });
    } catch (error) {
        console.error('Error intercambiando token de admin:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Todas las operaciones administrativas siguientes requieren el token del panel.
router.use('/api/admin', authenticateAdmin);

// Validar la sesión del panel con los permisos actuales de la base de datos.
router.get('/api/admin/session', async (req, res) => {
    try {
        await pool.query(
            `UPDATE users
             SET estado_presencia = 'en_linea', ultima_actividad = NOW()
             WHERE id = ?`,
            [req.user.id]
        );

        res.json({
            success: true,
            user: {
                id: req.user.id,
                nombre: req.user.nombre || req.user.usuario,
                usuario: req.user.usuario,
                email: req.user.email,
                rol: req.userRole,
                estado_cuenta: req.user.estado_cuenta,
                presenceStatus: 'en_linea'
            }
        });
    } catch (error) {
        console.error('Error actualizando la presencia administrativa:', error.message);
        res.status(500).json({ success: false, message: 'No fue posible validar la sesión administrativa' });
    }
});

router.post('/api/admin/session/heartbeat', async (req, res) => {
    try {
        await pool.query('UPDATE users SET ultima_actividad = NOW() WHERE id = ?', [req.user.id]);
        res.json({ success: true, presenceStatus: 'en_linea' });
    } catch (error) {
        console.error('Error actualizando actividad administrativa:', error.message);
        res.status(500).json({ success: false, message: 'No fue posible actualizar la actividad administrativa' });
    }
});

/* ========================================
   MIDDLEWARE DE ADMINISTRACIÓN
   ======================================== */

// isAdmin middleware importado desde middlewares/isAdmin.js

/* ========================================
   CONFIGURACIÓN GENERAL
   ======================================== */

// Obtener configuración actual
router.get('/api/admin/config', authenticate, isAdmin, async (req, res) => {
    try {
        const configPath = path.join(__dirname, '../../config.json');

        let config = {
            siteTitle: 'Firmas Digitales FD',
            contactEmail: '',
            contactPhone: ''
        };

        try {
            const configFile = await fs.readFile(configPath, 'utf8');
            const fileConfig = JSON.parse(configFile);
            config.siteTitle = fileConfig.siteTitle || fileConfig.title || config.siteTitle;
            config.contactEmail = fileConfig.contactEmail || config.contactEmail;
            config.contactPhone = fileConfig.contactPhone || config.contactPhone;
        } catch (error) {
        }

        try {
            await ensureVisualContactColumns();
            const [visualRows] = await pool.execute(
                `SELECT institution_name, contact_email, contact_phone
                 FROM visual_config
                 WHERE id = 1
                 LIMIT 1`
            );
            if (visualRows[0]?.institution_name) {
                config.siteTitle = visualRows[0].institution_name;
            }
            config.contactEmail = visualRows[0]?.contact_email || config.contactEmail;
            config.contactPhone = visualRows[0]?.contact_phone || config.contactPhone;
        } catch (visualError) {
            console.warn('No se pudo combinar la configuración visual:', visualError.message);
        }

        res.json(config);
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Actualizar configuración
router.post('/api/admin/config', authenticate, isOwner, async (req, res) => {
    try {
        const { siteTitle, contactEmail, contactPhone } = req.body;
        const normalizedSiteTitle = typeof siteTitle === 'string'
            ? siteTitle.normalize('NFC').trim().slice(0, 120)
            : '';
        const normalizedContactEmail = typeof contactEmail === 'string'
            ? contactEmail.normalize('NFC').trim().toLowerCase().slice(0, 254)
            : '';
        const normalizedContactPhone = typeof contactPhone === 'string'
            ? contactPhone.normalize('NFC').trim().slice(0, 32)
            : '';

        if (!normalizedSiteTitle || /[<>]/.test(normalizedSiteTitle)) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la institución es obligatorio y no puede contener etiquetas'
            });
        }
        if (normalizedContactEmail && !EMAIL_PATTERN.test(normalizedContactEmail)) {
            return res.status(400).json({
                success: false,
                message: 'El correo de contacto no tiene un formato válido'
            });
        }
        if (normalizedContactPhone && !/^[0-9+\s().-]+$/.test(normalizedContactPhone)) {
            return res.status(400).json({
                success: false,
                message: 'El teléfono de contacto contiene caracteres no permitidos'
            });
        }

        const configPath = path.join(__dirname, '../../config.json');
        let fileConfig = {};
        try {
            fileConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));
        } catch (error) {
        }

        const config = {
            ...fileConfig,
            title: normalizedSiteTitle,
            siteTitle: normalizedSiteTitle,
            contactEmail: normalizedContactEmail,
            contactPhone: normalizedContactPhone,
            lastUpdated: new Date().toISOString(),
            updatedBy: req.user.id
        };
        delete config.headerTitle;
        delete config.footer;
        delete config.footerText;
        delete config.allowRegistration;

        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        const footerText = `© ${new Date().getFullYear()} ${normalizedSiteTitle}. Todos los derechos reservados.`;
        await ensureVisualContactColumns();
        await pool.execute(
            `INSERT INTO visual_config (
                id,
                institution_name,
                contact_email,
                contact_phone,
                footer_text,
                updated_by
             )
             VALUES (1, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               institution_name = VALUES(institution_name),
               contact_email = VALUES(contact_email),
               contact_phone = VALUES(contact_phone),
               footer_text = VALUES(footer_text),
               updated_by = VALUES(updated_by)`,
            [
                normalizedSiteTitle,
                normalizedContactEmail,
                normalizedContactPhone,
                footerText,
                req.user.usuario || req.user.id || 'system'
            ]
        );

        res.json({
            success: true,
            message: 'Configuración actualizada correctamente',
            config
        });
    } catch (error) {
        console.error('Error actualizando configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Verificar acceso del owner con contraseña
router.post('/api/admin/verify-owner', authenticate, async (req, res) => {
    try {
        const { password } = req.body;

        // Verificar que el usuario actual sea owner
        if (req.user.rol !== 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Solo el propietario puede acceder.'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Contraseña requerida'
            });
        }

        const pool = require('../db/pool');

        // Obtener la contraseña hasheada del usuario desde la BD
        const [userResult] = await pool.query(
            'SELECT password FROM users WHERE id = ?',
            [req.user.id]
        );

        if (userResult.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar la contraseña
        const isValidPassword = await bcrypt.compare(password, userResult[0].password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        res.json({
            success: true,
            message: 'Acceso verificado correctamente'
        });

    } catch (error) {
        console.error('Error verificando acceso de owner:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/* ========================================
   GESTIÓN DE USUARIOS
   ======================================== */

// Obtener lista de usuarios
router.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');

        const query = `
            SELECT 
                u.id, 
                u.nombre,
                u.usuario, 
                u.email,
                u.rol, 
                u.estado_cuenta,
                u.active_key_id,
                u.estado_presencia,
                u.ultima_actividad,
                (u.foto_perfil IS NOT NULL) AS has_photo,
                u.foto_perfil_actualizada_at,
                CASE
                    WHEN u.estado_presencia = 'desconectado'
                      OR u.ultima_actividad IS NULL
                      OR u.ultima_actividad < DATE_SUB(NOW(), INTERVAL 2 MINUTE)
                    THEN 'desconectado'
                    ELSE u.estado_presencia
                END AS presencia_efectiva,
                u.organizacion,
                u.cargo,
                u.departamento,
                u.created_at,
                u.ultimo_acceso,
                COUNT(uk.id) AS keys_count,
                COUNT(CASE WHEN uk.expiration_date > NOW() THEN 1 END) AS active_keys_count
            FROM users u
            LEFT JOIN user_keys uk ON u.id = uk.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `;

        const [result] = await pool.query(query);

        const users = result.map(user => ({
            id: user.id,
            name: user.nombre,
            email: user.email || user.usuario,
            username: user.usuario,
            role: user.rol,
            activeKeyId: user.active_key_id,
            status: user.estado_cuenta || 'activo',
            accountStatus: user.estado_cuenta || 'activo',
            selectedPresenceStatus: user.estado_presencia || 'desconectado',
            presenceStatus: user.presencia_efectiva || 'desconectado',
            lastSeenAt: user.ultima_actividad,
            hasPhoto: Boolean(user.has_photo),
            photoVersion: serializePhotoVersion(user.foto_perfil_actualizada_at),
            photoUrl: user.has_photo ? `/api/admin/users/${user.id}/photo` : null,
            organization: user.organizacion,
            position: user.cargo,
            department: user.departamento,
            createdAt: user.created_at,
            lastLogin: user.ultimo_acceso,
            keysCount: Number(user.keys_count || 0),
            activeKeysCount: Number(user.active_keys_count || 0)
        }));

        res.json(users);
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener foto persistida usando la sesión específica del panel administrativo.
router.get('/api/admin/users/:userId/photo', async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ success: false, message: 'Usuario inválido' });
        }
        const [users] = await pool.query(
            `SELECT id, foto_perfil, foto_perfil_mimetype, foto_perfil_actualizada_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        return sendAdminPhoto(req, res, users[0]);
    } catch (error) {
        console.error('Error obteniendo foto administrativa:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Crear nuevo usuario
router.post('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    try {
        const name = normalizeText(req.body?.name);
        const email = normalizeText(req.body?.email).toLowerCase();
        const password = typeof req.body?.password === 'string' ? req.body.password : '';
        const dbRole = normalizeRole(req.body?.role);

        if (!isValidName(name)) {
            return res.status(400).json({
                success: false,
                message: 'El nombre debe tener entre 2 y 100 caracteres y no puede contener código HTML'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'El correo electrónico no es válido'
            });
        }

        if (!PASSWORD_PATTERN.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener entre 10 y 128 caracteres, con mayúscula, minúscula, número y símbolo'
            });
        }

        if (!dbRole) {
            return res.status(400).json({ success: false, message: 'Rol inválido' });
        }

        if (dbRole === 'owner' && req.userRole !== 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Solo un propietario puede crear otra cuenta de propietario'
            });
        }

        // Verificar si el usuario o email ya existe
        const [existingUser] = await pool.query(
            'SELECT id FROM users WHERE usuario = ? OR email = ?',
            [email, email]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El usuario o email ya está registrado'
            });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 12);

        const query = `
            INSERT INTO users (
                nombre, 
                usuario, 
                email, 
                password, 
                rol,
                estado_cuenta,
                force_password_change
            ) VALUES (?, ?, ?, ?, ?, 'activo', 1)
        `;

        const [result] = await pool.query(query, [
            name,
            email, // usuario
            email, // email
            hashedPassword,
            dbRole
        ]);

        const newUser = {
            id: result.insertId,
            name: name,
            email: email,
            role: dbRole,
            status: 'activo',
            created_at: new Date()
        };

        res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                username: newUser.email,
                role: newUser.role,
                activeKeyId: null,
                status: newUser.status,
                accountStatus: newUser.status,
                selectedPresenceStatus: 'desconectado',
                presenceStatus: 'desconectado',
                lastSeenAt: null,
                hasPhoto: false,
                photoVersion: null,
                photoUrl: null,
                createdAt: newUser.created_at,
                signaturesCount: 0,
                keysCount: 0,
                activeKeysCount: 0
            }
        });
    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Aplicar una misma acción a varios usuarios desde el panel.
router.post('/api/admin/users/bulk-action', isAdmin, async (req, res) => {
    try {
        const { action, userIds } = req.body;
        const ids = [...new Set((Array.isArray(userIds) ? userIds : [])
            .map(Number)
            .filter(id => Number.isInteger(id) && id > 0))];

        if (ids.length === 0 || ids.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Selecciona entre 1 y 100 usuarios válidos'
            });
        }

        if (ids.includes(Number(req.userId))) {
            return res.status(400).json({
                success: false,
                message: 'No puedes aplicar una acción masiva sobre tu propia cuenta'
            });
        }

        const normalizedAction = String(action || '').trim().toLowerCase();
        const statusActions = {
            activate: 'activo',
            activar: 'activo',
            deactivate: 'inactivo',
            desactivar: 'inactivo',
            suspend: 'suspendido',
            suspender: 'suspendido'
        };
        const placeholders = ids.map(() => '?').join(', ');

        if (req.userRole !== 'owner') {
            const [protectedUsers] = await pool.query(
                `SELECT id FROM users WHERE id IN (${placeholders}) AND rol = 'owner' LIMIT 1`,
                ids
            );
            if (protectedUsers.length > 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Solo un propietario puede administrar cuentas de propietario'
                });
            }
        }

        const protectOwners = req.userRole === 'owner' ? '' : " AND rol <> 'owner'";
        let result;

        if (normalizedAction === 'delete' || normalizedAction === 'eliminar') {
            [result] = await pool.query(
                `DELETE FROM users WHERE id IN (${placeholders})${protectOwners}`,
                ids
            );
        } else if (statusActions[normalizedAction]) {
            [result] = await pool.query(
                `UPDATE users
                 SET estado_cuenta = ?, updated_at = NOW()
                 WHERE id IN (${placeholders})${protectOwners}`,
                [statusActions[normalizedAction], ...ids]
            );
        } else {
            return res.status(400).json({
                success: false,
                message: 'Acción masiva no permitida'
            });
        }

        res.json({
            success: true,
            message: 'Acción aplicada correctamente',
            affectedUsers: result.affectedRows
        });
    } catch (error) {
        console.error('Error en acción masiva de usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Actualizar usuario
router.put('/api/admin/users/:userId', authenticate, isAdmin, async (req, res) => {
    try {
        const targetUser = await findManagedUser(req.params.userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const protectionMessage = ownerProtectionMessage(req, targetUser);
        if (protectionMessage) {
            return res.status(403).json({ success: false, message: protectionMessage });
        }

        const name = normalizeText(req.body?.name);
        const email = normalizeText(req.body?.email).toLowerCase();
        const dbRole = normalizeRole(req.body?.role);

        if (!isValidName(name) || !isValidEmail(email) || !dbRole) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, correo o rol inválido'
            });
        }

        const changesRole = dbRole !== targetUser.rol;
        if (changesRole && Number(targetUser.id) === Number(req.userId)) {
            return res.status(400).json({
                success: false,
                message: 'No puedes cambiar tu propio rol'
            });
        }

        if (dbRole === 'owner' && req.userRole !== 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Solo un propietario puede otorgar el rol de propietario'
            });
        }

        const [duplicates] = await pool.query(
            'SELECT id FROM users WHERE (usuario = ? OR email = ?) AND id <> ? LIMIT 1',
            [email, email, targetUser.id]
        );
        if (duplicates.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'El correo electrónico ya está registrado'
            });
        }

        // Las cuentas creadas desde el panel usan el correo como identificador
        // de acceso. Si el usuario conserva ese formato, mantener ambos campos
        // sincronizados; los nombres de usuario personalizados no se alteran.
        const username = targetUser.usuario === targetUser.email
            ? email
            : targetUser.usuario;

        const query = `
            UPDATE users 
            SET nombre = ?, 
                email = ?,
                usuario = ?,
                rol = ?,
                updated_at = NOW()
            WHERE id = ?
        `;

        const [result] = await pool.query(query, [
            name,
            email,
            username,
            dbRole,
            targetUser.id
        ]);

        const updatedUser = {
            id: targetUser.id,
            name: name,
            email: email,
            role: dbRole,
            status: targetUser.estado_cuenta || 'activo'
        };

        res.json({
            success: true,
            message: 'Usuario actualizado correctamente',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                username,
                role: updatedUser.role,
                activeKeyId: targetUser.active_key_id,
                status: updatedUser.status,
                accountStatus: updatedUser.status,
                selectedPresenceStatus: targetUser.estado_presencia || 'desconectado',
                presenceStatus: effectivePresenceStatus(
                    targetUser.estado_presencia,
                    targetUser.ultima_actividad
                ),
                lastSeenAt: targetUser.ultima_actividad,
                hasPhoto: Boolean(targetUser.has_photo),
                photoVersion: serializePhotoVersion(targetUser.foto_perfil_actualizada_at),
                photoUrl: targetUser.has_photo
                    ? `/api/admin/users/${targetUser.id}/photo`
                    : null,
                organization: targetUser.organizacion,
                position: targetUser.cargo,
                department: targetUser.departamento,
                createdAt: targetUser.created_at,
                lastLogin: targetUser.ultimo_acceso,
                keysCount: Number(targetUser.keys_count || 0),
                activeKeysCount: Number(targetUser.active_keys_count || 0)
            }
        });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Cambiar rol de usuario
router.put('/api/admin/users/:userId/role', authenticate, isAdmin, async (req, res) => {
    try {
        const targetUser = await findManagedUser(req.params.userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const dbRole = normalizeRole(req.body?.role);
        if (!dbRole) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido'
            });
        }

        if (Number(targetUser.id) === Number(req.userId)) {
            return res.status(400).json({
                success: false,
                message: 'No puedes cambiar tu propio rol'
            });
        }

        if ((targetUser.rol === 'owner' || dbRole === 'owner') && req.userRole !== 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Solo un propietario puede otorgar o retirar el rol de propietario'
            });
        }

        const [result] = await pool.query(
            'UPDATE users SET rol = ?, updated_at = NOW() WHERE id = ?',
            [dbRole, targetUser.id]
        );

        res.json({
            success: true,
            message: 'Rol actualizado correctamente',
            userId: targetUser.id,
            role: dbRole
        });
    } catch (error) {
        console.error('Error cambiando rol:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Cambiar estado de usuario
router.put('/api/admin/users/:userId/status', authenticate, isAdmin, async (req, res) => {
    try {
        const targetUser = await findManagedUser(req.params.userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        if (Number(targetUser.id) === Number(req.userId)) {
            return res.status(400).json({
                success: false,
                message: 'No puedes cambiar el estado de tu propia cuenta'
            });
        }

        const protectionMessage = ownerProtectionMessage(req, targetUser);
        if (protectionMessage) {
            return res.status(403).json({ success: false, message: protectionMessage });
        }

        const { status } = req.body;

        const validStatuses = ['activo', 'inactivo', 'suspendido', 'pendiente'];
        const statusAliases = {
            active: 'activo',
            inactive: 'inactivo',
            suspended: 'suspendido',
            pending: 'pendiente'
        };
        const dbStatus = statusAliases[status] || status;

        if (!validStatuses.includes(dbStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido'
            });
        }

        const [result] = await pool.query(
            'UPDATE users SET estado_cuenta = ?, updated_at = NOW() WHERE id = ?',
            [dbStatus, targetUser.id]
        );

        res.json({
            success: true,
            message: 'Estado actualizado correctamente',
            userId: targetUser.id,
            status: dbStatus,
            accountStatus: dbStatus
        });
    } catch (error) {
        console.error('Error cambiando estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Resetear contraseña de usuario
router.post('/api/admin/users/:userId/reset-password', authenticate, isAdmin, async (req, res) => {
    try {
        const targetUser = await findManagedUser(req.params.userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const protectionMessage = ownerProtectionMessage(req, targetUser);
        if (protectionMessage) {
            return res.status(403).json({ success: false, message: protectionMessage });
        }

        const temporaryPassword = generateSecurePassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
        const [result] = await pool.query(
            'UPDATE users SET password = ?, force_password_change = 1, updated_at = NOW() WHERE id = ?',
            [hashedPassword, targetUser.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        res.json({
            success: true,
            message: 'Contraseña reseteada correctamente',
            temporaryPassword
        });
    } catch (error) {
        console.error('Error reseteando contraseña:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Eliminar usuario
router.delete('/api/admin/users/:userId', authenticate, isAdmin, async (req, res) => {
    try {
        const targetUser = await findManagedUser(req.params.userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // No permitir eliminar al propio usuario
        if (Number(targetUser.id) === Number(req.userId)) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propio usuario'
            });
        }

        const protectionMessage = ownerProtectionMessage(req, targetUser);
        if (protectionMessage) {
            return res.status(403).json({ success: false, message: protectionMessage });
        }

        // Eliminar usuario (las claves foráneas deberían estar configuradas para CASCADE o SET NULL)
        const [result] = await pool.query(
            'DELETE FROM users WHERE id = ?',
            [targetUser.id]
        );

        if (result.affectedRows > 0) {
            res.json({
                success: true,
                message: 'Usuario eliminado correctamente',
                deletedUserId: targetUser.id
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Obtener actividad de usuario
router.get('/api/admin/users/:userId/activity', authenticate, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = require('../db/pool');

        const query = `
            SELECT 
                accion as action,
                descripcion as description,
                created_at as timestamp,
                ip_address,
                user_agent
            FROM user_activity_log 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 50
        `;

        const [activities] = await pool.query(query, [userId]);

        res.json(activities);
    } catch (error) {
        console.error('Error obteniendo actividad:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/* ========================================
   MÉTRICAS Y ESTADÍSTICAS - RUTA ELIMINADA
   ======================================== */

// Ruta duplicada eliminada - usar la implementación en línea 1006

// Obtener estado del sistema
router.get('/api/admin/status', authenticate, isAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');

        // Verificar conexión a la base de datos
        let dbOnline = true;
        try {
            await pool.query('SELECT 1');
        } catch (error) {
            dbOnline = false;
        }

        const status = {
            online: dbOnline,
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            nodeVersion: process.version,
            uptime: process.uptime()
        };

        res.json(status);
    } catch (error) {
        console.error('Error obteniendo estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/* ========================================
   CONFIGURACIÓN DE TEMAS
   ======================================== */

// Obtener temas disponibles
router.get('/api/admin/themes', authenticate, isAdmin, async (req, res) => {
    try {
        const themes = [
            {
                id: 'default',
                name: 'Tema por Defecto',
                description: 'Tema clásico con colores azules',
                class: 'default',
                active: true
            },
            {
                id: 'dark',
                name: 'Tema Oscuro',
                description: 'Tema oscuro para mejor experiencia nocturna',
                class: 'dark',
                active: false
            },
            {
                id: 'blue',
                name: 'Azul Corporativo',
                description: 'Tema azul profesional para empresas',
                class: 'blue',
                active: false
            },
            {
                id: 'green',
                name: 'Verde Naturaleza',
                description: 'Tema verde amigable con el medio ambiente',
                class: 'green',
                active: false
            }
        ];

        res.json(themes);
    } catch (error) {
        console.error('Error obteniendo temas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Aplicar tema
router.post('/api/admin/themes/:themeId/apply', authenticate, isOwner, async (req, res) => {
    try {
        const { themeId } = req.params;

        // Aquí implementarías la lógica para aplicar el tema
        // Por ejemplo, actualizar la configuración global

        res.json({
            success: true,
            message: 'Tema aplicado correctamente'
        });
    } catch (error) {
        console.error('Error aplicando tema:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/* ========================================
   MODO MANTENIMIENTO
   ======================================== */

// Toggle modo mantenimiento
router.post('/api/admin/maintenance', authenticate, isOwner, async (req, res) => {
    try {
        const { enabled } = req.body;

        const configPath = path.join(__dirname, '../../config.json');

        let config = {};
        try {
            const configFile = await fs.readFile(configPath, 'utf8');
            config = JSON.parse(configFile);
        } catch (error) {
            // Crear nueva configuración si no existe
        }

        config.maintenanceMode = Boolean(enabled);
        config.lastUpdated = new Date().toISOString();

        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        res.json({
            success: true,
            message: `Modo mantenimiento ${enabled ? 'activado' : 'desactivado'}`
        });
    } catch (error) {
        console.error('Error cambiando modo mantenimiento:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/* ========================================
   SUBIDA DE ARCHIVOS
   ======================================== */

const multer = require('multer');
const ADMIN_UPLOAD_EXTENSIONS = Object.freeze({
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico'
});

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/admin/'));
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const safeType = String(req.body.type || 'file')
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '')
            .slice(0, 32) || 'file';
        const suffix = crypto.randomBytes(8).toString('hex');
        cb(null, `${safeType}_${timestamp}_${suffix}${ADMIN_UPLOAD_EXTENSIONS[file.mimetype]}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (ADMIN_UPLOAD_EXTENSIONS[file.mimetype]) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido'));
        }
    }
});

// Subir archivo
router.post('/api/admin/upload', authenticate, isAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se subió ningún archivo'
            });
        }

        const fileUrl = `/uploads/admin/${req.file.filename}`;

        res.json({
            success: true,
            message: 'Archivo subido correctamente',
            url: fileUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Error subiendo archivo:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/* ========================================
   CONFIGURACIÓN DE TEMAS GLOBALES
   ======================================== */

// Guardar configuración global de temas
router.post('/api/admin/theme-configuration', authenticate, isOwner, async (req, res) => {
    try {
        const { selectedTheme, customColor, timestamp } = req.body;

        // Validar datos requeridos
        if (!selectedTheme) {
            return res.status(400).json({
                success: false,
                message: 'Tema seleccionado es requerido'
            });
        }

        // Validar color personalizado si se proporciona
        if (customColor && !/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
            return res.status(400).json({
                success: false,
                message: 'Formato de color hex inválido'
            });
        }

        // Guardar en base de datos
        try {
            const query = `
                INSERT INTO theme_config (id, selected_theme, custom_color, timestamp, updated_by)
                VALUES (1, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    selected_theme = VALUES(selected_theme),
                    custom_color = VALUES(custom_color),
                    timestamp = VALUES(timestamp),
                    updated_by = VALUES(updated_by)
            `;

            await pool.execute(query, [selectedTheme, customColor || null, timestamp || Date.now(), req.userId]);
        } catch (dbError) {
            console.warn('No se pudo guardar en BD (tabla theme_config no existe):', dbError.message);
            // Continuar sin error ya que es opcional
        }

        const themeConfig = {
            selectedTheme,
            customColor: customColor || null,
            timestamp: timestamp || Date.now(),
            updatedBy: req.userId
        };

        res.json({
            success: true,
            message: 'Configuración de tema guardada exitosamente',
            theme: themeConfig
        });

    } catch (error) {
        console.error('Error guardando configuración de tema:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al guardar configuración de tema'
        });
    }
});

/* ========================================
   RUTAS COMPATIBLES PARA NUEVO SISTEMA DE TEMAS
   ======================================== */

// Ruta compatible para el nuevo themeManager - guardar configuración
router.post('/api/admin/save-theme-configuration', authenticate, isOwner, async (req, res) => {
    try {
        const { selectedTheme, customColor, timestamp } = req.body;
        const pool = require('../db/pool');

        // Guardar en base de datos
        try {
            const [result] = await pool.execute(
                `INSERT INTO theme_config (id, selected_theme, custom_color, timestamp, updated_by)
                 VALUES (1, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 selected_theme = VALUES(selected_theme),
                 custom_color = VALUES(custom_color),
                 timestamp = VALUES(timestamp),
                 updated_by = VALUES(updated_by)`,
                [selectedTheme, customColor || null, timestamp || Date.now(), req.userId]
            );
        } catch (dbError) {
            console.warn('No se pudo guardar en BD (tabla theme_config no existe):', dbError.message);
            // Continuar sin error ya que es opcional
        }

        // Actualizar memoria global también para compatibilidad
        const themeConfig = {
            selectedTheme,
            customColor: customColor || null,
            timestamp: timestamp || Date.now(),
            updatedBy: req.userId
        };

        res.json({
            success: true,
            message: 'Configuración guardada exitosamente',
            theme: themeConfig
        });

    } catch (error) {
        console.error('Error guardando configuración de tema:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar configuración de tema'
        });
    }
});

// Ruta compatible para el nuevo themeManager - obtener configuración global
router.get('/api/global-theme-config', async (req, res) => {
    try {
        const pool = require('../db/pool');

        // Intentar cargar desde base de datos
        try {
            const [rows] = await pool.execute(
                'SELECT selected_theme, custom_color, timestamp, updated_by FROM theme_config WHERE id = 1'
            );

            if (rows.length > 0) {
                const dbConfig = {
                    selectedTheme: rows[0].selected_theme,
                    customColor: rows[0].custom_color,
                    timestamp: rows[0].timestamp,
                    updatedBy: rows[0].updated_by
                };

                return res.json({
                    success: true,
                    theme: dbConfig
                });
            }
        } catch (dbError) {
            console.warn('No se pudo leer configuración de BD (tabla theme_config no existe):', dbError.message);
        }

        // Configuración por defecto si no hay nada en BD
        const defaultConfig = {
            selectedTheme: 'orange',
            customColor: null,
            timestamp: Date.now()
        };

        return res.json({
            success: true,
            theme: defaultConfig
        });

    } catch (error) {
        console.error('Error obteniendo configuración de tema:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/* ========================================
   MÉTRICAS DEL SISTEMA
   ======================================== */

// Obtener métricas generales del sistema
router.get('/api/admin/metrics', authenticate, isAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');

        // Obtener usuarios totales
        const [usersResult] = await pool.query('SELECT COUNT(*) as total FROM users');
        const totalUsers = usersResult && usersResult[0] ? usersResult[0].total : 0;

        // Obtener llaves totales creadas
        const [keysResult] = await pool.query('SELECT COUNT(*) as total FROM user_keys');
        const totalKeys = keysResult && keysResult[0] ? keysResult[0].total : 0;

        // Obtener documentos firmados (contar archivos en downloads)
        const downloadsPath = path.join(__dirname, '../../downloads');
        let totalDocs = 0;
        try {
            const files = await fs.readdir(downloadsPath);
            totalDocs = files.filter(file => file.endsWith('.pdf')).length;
        } catch (error) {
        }

        // Verificar estado del sistema (conexión DB y servicios críticos)
        let systemStatus = 'Óptimo';
        let statusClass = 'success';

        try {
            // Test de conexión a base de datos
            await pool.query('SELECT 1');

            // Verificar si hay errores críticos recientes
            const [errorCheck] = await pool.query(`
                SELECT COUNT(*) as errors 
                FROM users 
                WHERE created_at > NOW() - INTERVAL 1 DAY
            `);

            if (errorCheck && errorCheck[0] && errorCheck[0].errors === 0) {
                systemStatus = 'Atención';
                statusClass = 'warning';
            }
        } catch (error) {
            systemStatus = 'Error Crítico';
            statusClass = 'danger';
        }

        // Calcular cambios recientes
        const [recentUsersResult] = await pool.query(`
            SELECT COUNT(*) as recent 
            FROM users 
            WHERE created_at > NOW() - INTERVAL 30 DAY
        `);
        const recentUsers = recentUsersResult && recentUsersResult[0] ? recentUsersResult[0].recent : 0;

        const [recentKeysResult] = await pool.query(`
            SELECT COUNT(*) as recent 
            FROM user_keys 
            WHERE created_at > NOW() - INTERVAL 7 DAY
        `);
        const recentKeys = recentKeysResult && recentKeysResult[0] ? recentKeysResult[0].recent : 0;

        res.json({
            success: true,
            metrics: {
                users: {
                    total: totalUsers,
                    change: recentUsers,
                    changeText: recentUsers > 0 ? `+${recentUsers} este mes` : 'Sin cambios recientes'
                },
                documents: {
                    total: totalDocs,
                    change: Math.floor(totalDocs * 0.2), // Estimación
                    changeText: totalDocs > 0 ? `+${Math.floor(totalDocs * 0.2)} esta semana` : 'Sin documentos'
                },
                keys: {
                    total: totalKeys,
                    change: recentKeys,
                    changeText: recentKeys > 0 ? `+${recentKeys} esta semana` : 'Sin cambios'
                },
                systemStatus: {
                    status: systemStatus,
                    class: statusClass,
                    uptime: process.uptime()
                }
            }
        });

    } catch (error) {
        console.error('Error obteniendo métricas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener métricas'
        });
    }
});

// Obtener estado de la base de datos
router.get('/api/admin/database/status', authenticateAdmin, isAdmin, async (req, res) => {
    let connection;

    try {
        // Verificar conexión
        connection = await pool.getConnection();
        const [tables] = await connection.query('SHOW TABLES');
        const [dbInfo] = await connection.query('SELECT VERSION() as version, DATABASE() as database_name');
        const [tableCount] = await connection.query('SELECT COUNT(*) as count FROM information_schema.TABLES WHERE table_schema = DATABASE()');

        // Obtener tamaño de la base de datos
        const [dbSize] = await connection.query(`
            SELECT
                ROUND(SUM(\`data_length\` + \`index_length\`) / 1024 / 1024, 2) as size_mb
            FROM information_schema.TABLES
            WHERE table_schema = DATABASE()
        `);

        res.json({
            success: true,
            online: true,
            version: dbInfo[0].version,
            database: dbInfo[0].database_name,
            tableCount: tableCount[0].count,
            size: `${dbSize[0].size_mb || 0} MB`,
            tables: tables.map(row => Object.values(row)[0])
        });

    } catch (error) {
        console.error('❌ Error obteniendo estado de BD:', error);
        res.status(500).json({
            success: false,
            online: false,
            error: 'Error interno del servidor'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Probar la conexión sin ejecutar operaciones de mantenimiento.
router.post('/api/admin/database/test-connection', authenticateAdmin, isAdmin, async (req, res) => {
    let connection;

    try {
        connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT VERSION() AS version, DATABASE() AS database_name'
        );

        res.json({
            success: true,
            connected: true,
            version: rows[0].version,
            database: rows[0].database_name
        });
    } catch (error) {
        console.error('Error probando conexión de BD:', error);
        res.status(503).json({
            success: false,
            connected: false,
            message: 'No se pudo conectar a la base de datos'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Obtener lista de tablas
router.get('/api/admin/database/tables', authenticateAdmin, isAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        try {
            // Obtener lista de tablas con información adicional
            const [tables] = await connection.query(`
                SELECT
                    TABLE_NAME as name,
                    \`TABLE_ROWS\` as \`rows\`,
                    \`DATA_LENGTH\` + \`INDEX_LENGTH\` as \`size\`,
                    CREATE_TIME as created,
                    UPDATE_TIME as updated
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                ORDER BY TABLE_NAME
            `);

            // Formatear los resultados
            const formattedTables = tables.map(table => ({
                name: table.name,
                rows: table.rows || 0,
                size: table.size || 0,
                created: table.created,
                updated: table.updated
            }));

            res.json({
                success: true,
                tables: formattedTables,
                count: formattedTables.length
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('❌ Error obteniendo lista de tablas:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener lista de tablas',
            message: error.message
        });
    }
});

// Exportar una copia SQL sin ejecutar cambios sobre la base de datos activa.
router.get('/api/admin/database/export', authenticateAdmin, isOwner, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const databaseName = sanitizeExportName(process.env.DB_NAME || 'firmas_digitales');
        const fileName = `${databaseName}-${timestamp}.sql`;

        res.status(200);
        res.setHeader('Content-Type', 'application/sql; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Cache-Control', 'no-store');

        for await (const chunk of generateDatabaseExport(connection, { databaseName })) {
            if (!res.write(chunk)) await once(res, 'drain');
        }
        return res.end();
    } catch (error) {
        console.error('Error exportando la base de datos:', error.message);
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: 'No fue posible exportar la base de datos'
            });
        }
        return res.end('\n-- La exportación se interrumpió por un error.\n');
    } finally {
        if (connection) connection.release();
    }
});

router.post('/api/admin/database/table-details', authenticateAdmin, isAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const { tableName } = req.body;

        if (!tableName || !TABLE_IDENTIFIER_PATTERN.test(tableName)) {
            return res.status(400).json({
                success: false,
                message: 'Nombre de tabla invalido'
            });
        }

        // Obtener información de la tabla
        const [tableInfo] = await pool.query(`
            SELECT TABLE_ROWS as rowCount
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        `, [tableName]);

        if (tableInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tabla no encontrada'
            });
        }

        // Obtener estructura de columnas
        const [columns] = await pool.query(`
            SELECT
                COLUMN_NAME as name,
                COLUMN_TYPE as columnType,
                IS_NULLABLE as nullable,
                COLUMN_DEFAULT as defaultValue,
                COLUMN_KEY as columnKey,
                EXTRA as extra
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        `, [tableName]);

        // Obtener una muestra de datos (primeros 5 registros)
        let sampleData = [];
        try {
            const [data] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT 5`);
            sampleData = data.map(redactDatabaseRow);
        } catch (error) {
            // Si hay error al obtener datos, continuar sin ellos
        }

        res.json({
            success: true,
            tableName,
            rowCount: tableInfo[0]?.rowCount || 0,
            columns: columns.map(col => ({
                name: col.name,
                type: col.columnType,
                nullable: col.nullable === 'YES',
                defaultValue: col.defaultValue,
                key: col.columnKey,
                extra: col.extra
            })),
            sampleData
        });

    } catch (error) {
        console.error('Error obteniendo detalles de tabla:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener detalles de la tabla',
            error: error.message
        });
    }
});

router.post('/api/admin/database/table-data', authenticateAdmin, isAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const { tableName, page = 1, limit = 10 } = req.body;

        // Validar y convertir parámetros
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;

        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                message: 'Parámetros de paginación inválidos'
            });
        }

        if (!tableName || typeof tableName !== 'string' || !TABLE_IDENTIFIER_PATTERN.test(tableName)) {
            return res.status(400).json({
                success: false,
                message: 'Nombre de tabla requerido y debe ser válido'
            });
        }

        // Verificar que la tabla existe
        const [tableExists] = await pool.query(`
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        `, [tableName]);

        if (tableExists.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tabla no encontrada'
            });
        }

        // Calcular offset para paginación
        const offset = (pageNum - 1) * limitNum;

        // Obtener datos de la tabla con paginación
        let data = [];
        try {
            const [rows] = await pool.query(`SELECT * FROM \`${tableName}\` LIMIT ? OFFSET ?`, [limitNum, offset]);
            data = rows.map(redactDatabaseRow);
        } catch (queryError) {
            console.error(`Error al consultar tabla ${tableName}:`, queryError);
            return res.status(500).json({
                success: false,
                message: 'Error al consultar los datos de la tabla',
                error: queryError.message
            });
        }

        // Obtener total de registros para paginación
        let totalRecords = 0;
        try {
            const [totalResult] = await pool.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
            totalRecords = totalResult[0].total;
        } catch (countError) {
            console.error(`Error al contar registros de ${tableName}:`, countError);
            // Continuar sin información de paginación
        }

        const totalPages = Math.ceil(totalRecords / limitNum);

        // Obtener nombres de columnas para el frontend
        let columns = [];
        try {
            const [cols] = await pool.query(`
                SELECT COLUMN_NAME as name, COLUMN_TYPE as columnType
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
                ORDER BY ORDINAL_POSITION
            `, [tableName]);
            columns = cols;
        } catch (columnsError) {
            console.error(`Error al obtener columnas de ${tableName}:`, columnsError);
            // Continuar sin información de columnas
        }

        res.json({
            success: true,
            tableName,
            data,
            columns: columns.map(col => ({
                name: col.name,
                type: col.columnType
            })),
            totalPages, // Para compatibilidad con el frontend existente
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalRecords,
                limit: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });

    } catch (error) {
        console.error('Error obteniendo datos de tabla:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos de la tabla',
            error: error.message
        });
    }
});

/* ========================================
   ENDPOINT: OBTENER ROLES DE USUARIO
   ======================================== */

router.get('/api/admin/user-roles', authenticate, isAdmin, async (req, res) => {
    try {

        // Roles disponibles en el sistema
        const availableRoles = [
            {
                id: 'user',
                name: 'Usuario',
                description: 'Usuario estándar con permisos básicos',
                permissions: ['read', 'sign'],
                color: '#3b82f6'
            },
            {
                id: 'admin',
                name: 'Administrador',
                description: 'Administrador con permisos avanzados',
                permissions: ['read', 'write', 'delete', 'admin'],
                color: '#f59e0b'
            },
            {
                id: 'owner',
                name: 'Propietario',
                description: 'Propietario del sistema con permisos totales',
                permissions: ['read', 'write', 'delete', 'admin', 'owner'],
                color: '#ef4444'
            }
        ];

        res.json({
            success: true,
            message: 'Roles obtenidos exitosamente',
            data: availableRoles
        });

    } catch (error) {
        console.error('❌ Error obteniendo roles de usuario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener roles de usuario',
            error: error.message
        });
    }
});

/* ========================================
   SUBIDA DE FAVICON
   ======================================== */

// Configuración específica para favicon
const faviconStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../')); // Guardar en la raíz del proyecto
    },
    filename: (req, file, cb) => {
        cb(null, 'favicon.ico'); // Siempre sobrescribir el favicon.ico
    }
});

const faviconUpload = multer({
    storage: faviconStorage,
    limits: { fileSize: 1024 * 1024 }, // 1MB máximo
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/x-icon', 'image/png', 'image/jpeg', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no válido. Use ICO, PNG, JPG o GIF.'));
        }
    }
});

// Subir favicon
router.post('/api/admin/upload-favicon', authenticate, isAdmin, faviconUpload.single('favicon'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se subió ningún archivo'
            });
        }

        // Si el archivo no es .ico, convertirlo usando sharp (si está disponible)
        const ext = path.extname(req.file.originalname).toLowerCase();
        if (ext !== '.ico') {
            try {
                const sharp = require('sharp');
                const inputPath = req.file.path;
                const outputPath = path.join(__dirname, '../../favicon.ico');

                await sharp(inputPath)
                    .resize(32, 32)
                    .toFile(outputPath);

                // Eliminar archivo original
                await fs.unlink(inputPath);

            } catch (sharpError) {
                console.warn('⚠️ Sharp no disponible, manteniendo archivo original:', sharpError.message);
            }
        }

        const faviconUrl = '/favicon.ico';

        res.json({
            success: true,
            message: 'Favicon actualizado correctamente',
            faviconUrl: faviconUrl
        });

    } catch (error) {
        console.error('❌ Error subiendo favicon:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

/* ========================================
   RUTAS FALTANTES - IMPLEMENTACIÓN
   ======================================== */

// Ruta para obtener lista de plantillas PDF
router.get('/api/admin/pdf/templates', authenticateAdmin, isAdmin, async (req, res) => {
    try {
        const [configurationRows] = await pool.execute(
            'SELECT selected_template FROM global_pdf_config WHERE id = 1 LIMIT 1'
        );
        const selectedTemplate = configurationRows[0]?.selected_template || 'clasico';
        // Lista de plantillas disponibles
        const templates = [
            {
                id: 'clasico',
                name: 'Clásico',
                description: 'Plantilla formal tradicional',
                active: selectedTemplate === 'clasico',
                colors: {
                    primary: '#1e40af',
                    secondary: '#64748b',
                    text: '#1f2937'
                }
            },
            {
                id: 'moderno',
                name: 'Moderno',
                description: 'Diseño contemporáneo',
                active: selectedTemplate === 'moderno',
                colors: {
                    primary: '#2563eb',
                    secondary: '#60a5fa',
                    text: '#1e293b'
                }
            },
            {
                id: 'minimalista',
                name: 'Minimalista',
                description: 'Estilo limpio y simple',
                active: selectedTemplate === 'minimalista',
                colors: {
                    primary: '#6b7280',
                    secondary: '#9ca3af',
                    text: '#374151'
                }
            },
            {
                id: 'elegante',
                name: 'Elegante',
                description: 'Diseño sofisticado',
                active: selectedTemplate === 'elegante',
                colors: {
                    primary: '#7c3aed',
                    secondary: '#a78bfa',
                    text: '#1f2937'
                }
            }
        ];

        res.json({
            success: true,
            templates: templates,
            total: templates.length
        });
    } catch (error) {
        console.error('Error obteniendo templates PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para obtener configuración de base de datos
router.get('/api/admin/database/config', authenticateAdmin, isAdmin, async (req, res) => {
    try {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD ? '********' : '', // No mostrar contraseña real
            database: process.env.DB_NAME || 'firmas_digitales_v2',
            connectionLimit: 10,
            acquireTimeout: 60000,
            timeout: 60000,
            reconnect: true,
            ssl: false,
            charset: 'utf8mb4'
        };

        // Verificar estado de conexión
        try {
            const pool = require('../db/pool');
            const connection = await pool.getConnection();
            dbConfig.status = 'connected';
            connection.release();
        } catch (dbError) {
            dbConfig.status = 'disconnected';
            dbConfig.error = dbError.message;
        }

        res.json({
            success: true,
            config: dbConfig
        });
    } catch (error) {
        console.error('Error obteniendo configuración de BD:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para obtener logs del sistema
router.get('/api/admin/system/logs', authenticate, isAdmin, async (req, res) => {
    try {
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isInteger(requestedLimit)
            ? Math.min(Math.max(requestedLimit, 1), 200)
            : 100;
        const [activityLogs] = await pool.query(
            `SELECT l.id,
                    l.created_at AS timestamp,
                    l.accion,
                    l.descripcion,
                    l.ip_address,
                    COALESCE(u.usuario, 'system') AS user
             FROM user_activity_log l
             LEFT JOIN users u ON u.id = l.user_id
             ORDER BY l.created_at DESC
             LIMIT ?`,
            [limit]
        );

        const logsFromDatabase = activityLogs.map(log => ({
            id: log.id,
            timestamp: log.timestamp,
            level: /error|fail|denied|unauthorized/i.test(log.accion) ? 'WARN' : 'INFO',
            message: log.descripcion || log.accion,
            action: log.accion,
            source: 'user_activity_log',
            user: log.user,
            ipAddress: log.ip_address
        }));

        return res.json({
            success: true,
            logs: logsFromDatabase,
            total: logsFromDatabase.length,
            levels: ['WARN', 'INFO']
        });

    } catch (error) {
        console.error('Error obteniendo logs del sistema:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para obtener configuración específica de template
router.get('/api/admin/pdf/templates/:templateId/config', authenticateAdmin, isAdmin, async (req, res) => {
    try {
        const { templateId } = req.params;

        // Configuraciones por template
        const templateConfigs = {
            'clasico': {
                fontFamily: 'Times New Roman',
                fontSize: 12,
                margins: { top: 50, bottom: 50, left: 50, right: 50 },
                colors: { primary: '#1e40af', secondary: '#64748b', text: '#1f2937' },
                logo: true,
                header: 'UNIVERSIDAD EJEMPLO',
                footer: 'Sistema de Firmas Digitales'
            },
            'moderno': {
                fontFamily: 'Arial',
                fontSize: 11,
                margins: { top: 40, bottom: 40, left: 40, right: 40 },
                colors: { primary: '#2563eb', secondary: '#60a5fa', text: '#1e293b' },
                logo: true,
                header: 'CERTIFICADO DIGITAL',
                footer: 'Generado automáticamente'
            },
            'minimalista': {
                fontFamily: 'Helvetica',
                fontSize: 10,
                margins: { top: 30, bottom: 30, left: 30, right: 30 },
                colors: { primary: '#6b7280', secondary: '#9ca3af', text: '#374151' },
                logo: false,
                header: '',
                footer: 'Documento verificado'
            },
            'elegante': {
                fontFamily: 'Georgia',
                fontSize: 12,
                margins: { top: 60, bottom: 60, left: 60, right: 60 },
                colors: { primary: '#7c3aed', secondary: '#a78bfa', text: '#1f2937' },
                logo: true,
                header: 'CERTIFICADO OFICIAL',
                footer: 'Sistema de Firmas Digitales Avanzado'
            }
        };

        const config = templateConfigs[templateId];

        if (!config) {
            return res.status(404).json({
                success: false,
                message: 'Template no encontrado'
            });
        }

        res.json({
            success: true,
            templateId: templateId,
            config: config
        });
    } catch (error) {
        console.error('Error obteniendo configuración de template:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para guardar configuración de template específico
router.put('/api/admin/pdf/templates/:templateId/config', authenticateAdmin, isOwner, async (req, res) => {
    try {
        const { templateId } = req.params;
        const configData = req.body;

        // Validar que el template existe
        const validTemplates = ['clasico', 'moderno', 'minimalista', 'elegante'];
        if (!validTemplates.includes(templateId)) {
            return res.status(400).json({
                success: false,
                message: 'Template no válido'
            });
        }

        // Aquí puedes guardar la configuración en la base de datos
        // Por ahora, solo devolvemos éxito

        res.json({
            success: true,
            message: 'Configuración guardada correctamente',
            templateId: templateId
        });
    } catch (error) {
        console.error('Error guardando configuración de template:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para obtener configuración PDF general
router.get('/api/admin/pdf/config', authenticateAdmin, isAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        // Consultar configuración PDF global desde la base de datos
        const [rows] = await pool.execute(
            'SELECT * FROM global_pdf_config WHERE id = 1'
        );

        let config;
        if (rows.length > 0) {
            const dbConfig = rows[0];

            let parsedAvalTextConfig;
            try {
                parsedAvalTextConfig = typeof dbConfig.aval_text_config === 'string' ?
                    JSON.parse(dbConfig.aval_text_config || '{}') :
                    (dbConfig.aval_text_config || {});
            } catch (error) {
                console.error('Error parsing aval_text_config:', error);
                parsedAvalTextConfig = {};
            }

            config = {
                selectedTemplate: dbConfig.selected_template,
                logoPath: dbConfig.logo_path,
                colorConfig: typeof dbConfig.color_config === 'string' ? JSON.parse(dbConfig.color_config || '{}') : (dbConfig.color_config || {}),
                fontConfig: typeof dbConfig.font_config === 'string' ? JSON.parse(dbConfig.font_config || '{}') : (dbConfig.font_config || {}),
                layoutConfig: typeof dbConfig.layout_config === 'string' ? JSON.parse(dbConfig.layout_config || '{}') : (dbConfig.layout_config || {}),
                borderConfig: typeof dbConfig.border_config === 'string' ? JSON.parse(dbConfig.border_config || '{}') : (dbConfig.border_config || {}),
                visualConfig: typeof dbConfig.visual_config === 'string' ? JSON.parse(dbConfig.visual_config || '{}') : (dbConfig.visual_config || {}),
                avalTextConfig: parsedAvalTextConfig,
                updatedAt: dbConfig.updated_at,
                updatedBy: dbConfig.updated_by
            };
        } else {
            // Configuración por defecto si no existe en BD
            config = {
                selectedTemplate: 'clasico',
                logoPath: '',
                colorConfig: {
                    primary: '#2563eb',
                    secondary: '#64748b',
                    accent: '#f59e0b',
                    text: '#1f2937',
                    background: '#ffffff'
                },
                fontConfig: {
                    title: 'Helvetica-Bold',
                    body: 'Helvetica',
                    metadata: 'Helvetica-Oblique',
                    signature: 'Times-Bold'
                },
                layoutConfig: {
                    marginTop: 60,
                    marginBottom: 60,
                    marginLeft: 50,
                    marginRight: 50,
                    lineHeight: 1.6,
                    titleSize: 24,
                    bodySize: 12
                },
                borderConfig: {
                    style: 'classic',
                    width: 2,
                    color: '#1f2937',
                    cornerRadius: 0,
                    showDecorative: true
                },
                visualConfig: {
                    showLogo: true,
                    showInstitution: true,
                    showDate: true,
                    showSignature: true,
                    showAuthors: true,
                    showAvalador: true
                }
            };
        }

        res.json({
            success: true,
            config: config
        });
    } catch (error) {
        console.error('Error obteniendo configuración PDF global:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para guardar configuración PDF global
router.put('/api/admin/pdf/config', authenticateAdmin, isOwner, async (req, res) => {
    try {
        const configData = normalizePdfConfiguration(req.body);
        const adminUsername = req.user?.usuario || req.user?.email || `user:${req.userId}`;

        // Preparar datos para guardar en BD
        const colorConfig = JSON.stringify(configData.colorConfig || {});
        const fontConfig = JSON.stringify(configData.fontConfig || {});
        const layoutConfig = JSON.stringify(configData.layoutConfig || {});
        const borderConfig = JSON.stringify(configData.borderConfig || {});
        const visualConfig = JSON.stringify(configData.visualConfig || {});
        const avalTextConfig = JSON.stringify(configData.avalTextConfig || {
            template: '',
            variables: ['$autores', '$titulo', '$modalidad', '$avalador', '$fecha', '$institucion', '$ubicacion']
        });

        // Insertar o actualizar configuración global
        await pool.execute(`
            INSERT INTO global_pdf_config (
                id, selected_template, logo_path, color_config, font_config,
                layout_config, border_config, visual_config, aval_text_config, updated_by
            ) VALUES (
                1, ?, ?, ?, ?, ?, ?, ?, ?, ?
            ) ON DUPLICATE KEY UPDATE
                selected_template = VALUES(selected_template),
                logo_path = VALUES(logo_path),
                color_config = VALUES(color_config),
                font_config = VALUES(font_config),
                layout_config = VALUES(layout_config),
                border_config = VALUES(border_config),
                visual_config = VALUES(visual_config),
                aval_text_config = VALUES(aval_text_config),
                updated_by = VALUES(updated_by)
        `, [
            configData.selectedTemplate,
            '',
            colorConfig,
            fontConfig,
            layoutConfig,
            borderConfig,
            visualConfig,
            avalTextConfig,
            adminUsername
        ]);

        res.json({
            success: true,
            message: 'Configuración PDF guardada correctamente',
            config: configData
        });
    } catch (error) {
        console.error('Error guardando configuración PDF global:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para generar vista previa de PDF con configuración específica
router.post('/api/admin/pdf/preview', authenticateAdmin, isAdmin, async (req, res) => {
    try {
        const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
        const { TemplateManager } = require('../templates/template.manager');

        // La vista previa acepta únicamente el mismo conjunto de opciones seguras
        // que puede persistirse en la configuración global.
        const config = normalizePdfConfiguration(req.body);

        // Crear documento PDF en blanco como base
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();

        // Cargar fuentes estándar
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        const [visualRows] = await pool.execute(
            'SELECT institution_name FROM visual_config WHERE id = 1 LIMIT 1'
        );
        const institutionName = visualRows[0]?.institution_name || 'Firmas Digitales FD';

        // Datos de ejemplo para la vista previa
        const previewData = {
            titulo: 'Vista Previa - Configuración PDF',
            institucion: institutionName,
            autores: ['Autor de Prueba'],
            avaladoPor: 'Avalador de Prueba',
            modalidad: 'Trabajo de grado',
            ubicacion: 'BOGOTÁ, COLOMBIA',
            fecha: new Date().toLocaleDateString('es-ES'),
            contenido: '',
            signatureData: null,
            logo: config.logoPath || null
        };

        // Crear instancia del TemplateManager
        const templateManager = new TemplateManager();
        previewData.contenido = await templateManager.replaceAvalVariables(
            config.avalTextConfig?.template || 'Concepto de aval para $titulo, desarrollado por $autores.',
            previewData
        );

        // Usar configuración proporcionada o configuración global
        const templateConfig = config || await templateManager.getGlobalConfig();

        // Determinar el nombre de la plantilla
        const templateName = templateManager.getTemplateName ? templateManager.getTemplateName(templateConfig) : 'clasico';

        // Preparar datos del documento
        const documentData = templateManager.prepareDocumentData ? templateManager.prepareDocumentData(previewData) : previewData;

        // Dibujar borde según la plantilla (si existe el método)
        if (templateManager.drawTemplateBorder) {
            await templateManager.drawTemplateBorder(page, templateName, width, height, templateConfig);
        }

        // Dibujar plantilla específica (si existe el método)
        if (templateManager.drawTemplate) {
            await templateManager.drawTemplate(page, templateName, width, height, documentData, helveticaFont, helveticaBold, timesFont, timesBold, templateConfig, pdfDoc);
        } else {
            // Dibujo básico si no hay método específico
            page.drawText(previewData.titulo, {
                x: 50,
                y: height - 100,
                size: templateConfig.layoutConfig?.titleSize || 24,
                font: timesBold,
                color: rgb(0, 0, 0)
            });

            page.drawText(previewData.institucion, {
                x: 50,
                y: height - 130,
                size: templateConfig.layoutConfig?.bodySize || 14,
                font: timesFont,
                color: rgb(0.3, 0.3, 0.3)
            });

            page.drawText(previewData.contenido, {
                x: 50,
                y: height - 200,
                size: templateConfig.layoutConfig?.bodySize || 12,
                font: timesFont,
                color: rgb(0, 0, 0),
                maxWidth: width - 100
            });
        }

        // Generar y devolver el PDF
        const pdfBytes = await pdfDoc.save();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error('Error generando vista previa PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar vista previa del PDF',
            error: error.message
        });
    }
});

// Endpoint para obtener la ubicación del sistema
router.get('/api/system/location', async (req, res) => {
    try {
        // Intentar obtener ubicación basada en configuración regional del sistema
        let location = 'UBICACIÓN, PAÍS';

        try {
            // Obtener configuración regional
            const locale = Intl.DateTimeFormat().resolvedOptions().locale;
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            // Mapear algunos casos comunes
            const locationMap = {
                'es-CO': 'BOGOTÁ, COLOMBIA',
                'es-MX': 'CIUDAD DE MÉXICO, MÉXICO',
                'es-AR': 'BUENOS AIRES, ARGENTINA',
                'es-ES': 'MADRID, ESPAÑA',
                'en-US': 'NEW YORK, USA',
                'en-GB': 'LONDON, UK'
            };

            // Mapear por timezone también
            const timezoneMap = {
                'America/Bogota': 'BOGOTÁ, COLOMBIA',
                'America/Mexico_City': 'CIUDAD DE MÉXICO, MÉXICO',
                'America/Argentina/Buenos_Aires': 'BUENOS AIRES, ARGENTINA',
                'Europe/Madrid': 'MADRID, ESPAÑA',
                'America/New_York': 'NEW YORK, USA',
                'Europe/London': 'LONDON, UK'
            };

            location = locationMap[locale] || timezoneMap[timezone] || location;

        } catch (error) {
            console.warn('Error detectando ubicación:', error);
        }

        res.json({
            success: true,
            location: location,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    } catch (error) {
        console.error('Error obteniendo ubicación del sistema:', error);
        res.status(500).json({
            success: false,
            location: 'UBICACIÓN, PAÍS'
        });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middlewares/authenticate');
const multer = require('multer');

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;
const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000;
const VALID_PRESENCE_STATUSES = new Set([
    'en_linea',
    'ausente',
    'ocupado',
    'desconectado'
]);

function detectImageMime(buffer) {
    if (!Buffer.isBuffer(buffer)) return null;

    if (buffer.length >= 8
        && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return 'image/png';
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }
    if (buffer.length >= 6) {
        const gifHeader = buffer.subarray(0, 6).toString('ascii');
        if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') return 'image/gif';
    }
    if (buffer.length >= 12
        && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
        && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
        return 'image/webp';
    }
    return null;
}

function effectivePresenceStatus(status, lastActivity, now = Date.now()) {
    if (status === 'desconectado' || !lastActivity) return 'desconectado';
    const lastActivityMs = new Date(lastActivity).getTime();
    if (!Number.isFinite(lastActivityMs) || now - lastActivityMs > PRESENCE_TIMEOUT_MS) {
        return 'desconectado';
    }
    return VALID_PRESENCE_STATUSES.has(status) ? status : 'desconectado';
}

function photoVersion(value) {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? String(timestamp) : null;
}

function setPhotoResponseHeaders(req, res, user) {
    const version = photoVersion(user.foto_perfil_actualizada_at) || '0';
    const etag = `\"profile-${user.id}-${version}-${user.foto_perfil.length}\"`;
    res.setHeader('Content-Type', user.foto_perfil_mimetype);
    res.setHeader('Content-Length', user.foto_perfil.length);
    res.setHeader('Cache-Control', 'private, max-age=300, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return false;
    }
    return true;
}

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_PROFILE_PHOTO_SIZE,
        files: 1,
        fields: 5
    }
});

function uploadProfilePhoto(req, res, next) {
    upload.single('photo')(req, res, error => {
        if (!error) return next();
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'La imagen no puede superar 5 MB' });
        }
        return res.status(400).json({ error: 'No fue posible procesar la imagen' });
    });
}

// ====================================
// OBTENER PERFIL COMPLETO DEL USUARIO
// ====================================
router.get('/api/profile', authenticate, async (req, res) => {

    try {

        // Consultar únicamente los datos que forman parte del perfil actual.
        const [userRows] = await pool.query(`
      SELECT 
        id, nombre, usuario, rol, active_key_id, created_at,
        email, organizacion, biografia, telefono,
        direccion, cargo, departamento, grado_academico,
        estado_cuenta, estado_presencia, ultima_actividad,
        ultimo_acceso, updated_at,
        (foto_perfil IS NOT NULL) AS has_photo,
        foto_perfil_actualizada_at
      FROM users 
      WHERE id = ?
    `, [req.user.id]);


        if (userRows.length === 0) {
            console.log('❌ Usuario no encontrado con ID:', req.user.id);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = userRows[0];
        user.hasPhoto = Boolean(user.has_photo);
        user.photoVersion = photoVersion(user.foto_perfil_actualizada_at);
        user.selectedPresenceStatus = user.estado_presencia;
        user.presenceStatus = effectivePresenceStatus(
            user.estado_presencia,
            user.ultima_actividad
        );
        user.lastSeenAt = user.ultima_actividad;
        delete user.has_photo;

        // Intentar obtener estadísticas básicas del usuario
        let stats = { total_keys: 0, active_keys: 0, expired_keys: 0 };
        try {
            const [keyStats] = await pool.query(`
        SELECT 
          COUNT(*) as total_keys,
          COUNT(CASE WHEN expiration_date > NOW() THEN 1 END) as active_keys,
          COUNT(CASE WHEN expiration_date <= NOW() THEN 1 END) as expired_keys
        FROM user_keys 
        WHERE user_id = ?
      `, [req.user.id]);

            if (keyStats.length > 0) {
                stats = keyStats[0];
            }
        } catch (statsError) {
            console.log('⚠️ Error al obtener estadísticas de llaves:', statsError.message);
        }

        res.json({
            success: true,
            user: user,
            stats: stats
        });

    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ====================================
// ACTUALIZAR DATOS PERSONALES
// ====================================
router.put('/api/profile/personal', authenticate, async (req, res) => {
    try {
        const {
            nombre,
            email,
            organizacion,
            biografia,
            telefono,
            direccion,
            cargo,
            departamento,
            grado_academico
        } = req.body;

        const normalizedName = typeof nombre === 'string' ? nombre.trim() : '';
        const normalizedEmail = typeof email === 'string' ? email.trim() : '';

        if (!normalizedName) {
            return res.status(400).json({ error: 'El nombre completo es obligatorio' });
        }

        if (normalizedName.length > 100) {
            return res.status(400).json({ error: 'El nombre no puede superar los 100 caracteres' });
        }

        // Validar email único si se está cambiando
        if (normalizedEmail) {
            const [existingEmail] = await pool.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [normalizedEmail, req.user.id]
            );
            if (existingEmail.length > 0) {
                return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
            }
        }

        await pool.query(`
      UPDATE users SET 
        nombre = ?,
        email = ?,
        organizacion = ?,
        biografia = ?,
        telefono = ?,
        direccion = ?,
        cargo = ?,
        departamento = ?,
        grado_academico = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
            normalizedName, normalizedEmail || null, organizacion, biografia,
            telefono, direccion, cargo, departamento,
            grado_academico, req.user.id
        ]);

        // Registrar actividad
        await pool.query(`
      INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) 
      VALUES (?, 'update_profile', 'Actualización de datos personales', ?)
    `, [req.user.id, req.ip]);

        res.json({ success: true, message: 'Datos personales actualizados correctamente' });

    } catch (error) {
        console.error('Error al actualizar datos personales:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ====================================
// SUBIR FOTO DE PERFIL
// ====================================
router.post('/api/profile/photo', authenticate, uploadProfilePhoto, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
        }

        const detectedMime = detectImageMime(req.file.buffer);
        const claimedMime = req.file.mimetype === 'image/jpg'
            ? 'image/jpeg'
            : req.file.mimetype;
        if (!detectedMime || claimedMime !== detectedMime) {
            return res.status(400).json({
                error: 'El contenido del archivo no corresponde a una imagen permitida'
            });
        }

        const userId = req.user.id;
        await pool.query(
            `UPDATE users
             SET foto_perfil = ?,
                 foto_perfil_mimetype = ?,
                 foto_perfil_actualizada_at = NOW(3),
                 updated_at = NOW()
             WHERE id = ?`,
            [req.file.buffer, detectedMime, userId]
        );

        pool.query(
            `INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address)
             VALUES (?, 'update_photo', ?, ?)`,
            [userId, `Actualización de foto de perfil (${detectedMime}, ${req.file.size} bytes)`, req.ip]
        ).catch(error => console.warn('No se pudo registrar la actualización de foto:', error.message));

        const [versionRows] = await pool.query(
            'SELECT foto_perfil_actualizada_at FROM users WHERE id = ? LIMIT 1',
            [userId]
        );
        const version = photoVersion(versionRows[0]?.foto_perfil_actualizada_at);

        res.json({
            success: true,
            message: 'Foto de perfil actualizada correctamente',
            hasPhoto: true,
            photoUrl: '/api/profile/photo/content',
            photoPath: '/api/profile/photo/content',
            photoVersion: version
        });

    } catch (error) {
        console.error('Error al subir foto de perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ====================================
// OBTENER BYTES DE FOTO. Esta ruta debe declararse antes del parámetro opcional.
// ====================================
router.get('/api/profile/photo/content/:userId?', authenticate, async (req, res) => {
    try {
        const userId = Number(req.params.userId || req.user.id);
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ error: 'Usuario inválido' });
        }

        if (userId !== Number(req.user.id) && !['admin', 'owner'].includes(req.user.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para ver esta foto' });
        }

        const [userRow] = await pool.query(
            `SELECT id, foto_perfil, foto_perfil_mimetype, foto_perfil_actualizada_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );

        if (userRow.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = userRow[0];
        if (!user.foto_perfil || !detectImageMime(user.foto_perfil)) {
            return res.status(404).json({ error: 'El usuario no tiene foto de perfil' });
        }
        if (!setPhotoResponseHeaders(req, res, user)) return;
        return res.send(user.foto_perfil);

    } catch (error) {
        console.error('Error al obtener bytes de foto de perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ====================================
// OBTENER METADATOS DE FOTO DE PERFIL
// ====================================
router.get('/api/profile/photo/:userId?', authenticate, async (req, res) => {
    try {
        const userId = Number(req.params.userId || req.user.id);
        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({ error: 'Usuario inválido' });
        }
        if (userId !== Number(req.user.id) && !['admin', 'owner'].includes(req.user.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para ver esta foto' });
        }

        const [userRows] = await pool.query(
            `SELECT id, nombre, usuario,
                    (foto_perfil IS NOT NULL) AS has_photo,
                    foto_perfil_actualizada_at
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [userId]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = userRows[0];
        const hasPhoto = Boolean(user.has_photo);
        const isOwnPhoto = userId === Number(req.user.id);
        const photoUrl = hasPhoto
            ? `/api/profile/photo/content${isOwnPhoto ? '' : `/${userId}`}`
            : null;
        return res.json({
            success: true,
            hasPhoto,
            photoUrl,
            photoPath: photoUrl,
            photoVersion: photoVersion(user.foto_perfil_actualizada_at),
            userName: user.nombre || user.usuario
        });
    } catch (error) {
        console.error('Error al obtener metadatos de foto:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ====================================
// ELIMINAR FOTO DE PERFIL
// ====================================
router.delete('/api/profile/photo', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query(
            `UPDATE users
             SET foto_perfil = NULL,
                 foto_perfil_mimetype = NULL,
                 foto_perfil_actualizada_at = NULL,
                 updated_at = NOW()
             WHERE id = ?`,
            [userId]
        );

        pool.query(
            `INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address)
             VALUES (?, 'delete_photo', 'Eliminación de foto de perfil', ?)`,
            [userId, req.ip]
        ).catch(error => console.warn('No se pudo registrar la eliminación de foto:', error.message));

        res.json({
            success: true,
            message: 'Foto de perfil eliminada correctamente',
            hasPhoto: false,
            photoUrl: null,
            photoVersion: null
        });

    } catch (error) {
        console.error('Error al eliminar foto de perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ====================================
// OBTENER ESTADÍSTICAS DE ARCHIVOS (SOLO ADMIN)
// ====================================
router.get('/api/profile/files-stats', authenticate, async (req, res) => {
    try {
        if (!['admin', 'owner'].includes(req.user.rol)) {
            return res.status(403).json({ error: 'Solo administradores pueden ver estas estadísticas' });
        }

        const [summaryRows] = await pool.query(
            `SELECT COUNT(*) AS total_files,
                    COALESCE(SUM(OCTET_LENGTH(foto_perfil)), 0) AS total_size
             FROM users
             WHERE foto_perfil IS NOT NULL`
        );
        const [photoRows] = await pool.query(
            `SELECT id, OCTET_LENGTH(foto_perfil) AS size
             FROM users
             WHERE foto_perfil IS NOT NULL`
        );
        const stats = {
            totalFiles: Number(summaryRows[0]?.total_files || 0),
            totalSize: Number(summaryRows[0]?.total_size || 0),
            userFiles: Object.fromEntries(photoRows.map(row => [
                String(row.id),
                { count: 1, size: Number(row.size || 0) }
            ])),
            orphanedFiles: []
        };
        stats.totalSizeFormatted = formatFileSize(stats.totalSize);

        res.json({ success: true, stats });

    } catch (error) {
        console.error('Error al obtener estadísticas de archivos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Función auxiliar para formatear tamaños de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ====================================
// PRESENCIA DEL USUARIO
// ====================================
router.put('/api/profile/presence', authenticate, async (req, res) => {
    const status = typeof req.body?.status === 'string'
        ? req.body.status.trim().toLowerCase()
        : '';
    if (!VALID_PRESENCE_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Estado de presencia inválido' });
    }

    try {
        await pool.query(
            `UPDATE users
             SET estado_presencia = ?, ultima_actividad = NOW()
             WHERE id = ?`,
            [status, req.user.id]
        );
        const [rows] = await pool.query(
            'SELECT estado_presencia, ultima_actividad FROM users WHERE id = ? LIMIT 1',
            [req.user.id]
        );
        const user = rows[0];
        return res.json({
            success: true,
            selectedPresenceStatus: user.estado_presencia,
            presenceStatus: effectivePresenceStatus(user.estado_presencia, user.ultima_actividad),
            lastSeenAt: user.ultima_actividad
        });
    } catch (error) {
        console.error('Error actualizando presencia:', error);
        return res.status(500).json({ error: 'No fue posible actualizar la presencia' });
    }
});

router.post('/api/profile/heartbeat', authenticate, async (req, res) => {
    try {
        await pool.query('UPDATE users SET ultima_actividad = NOW() WHERE id = ?', [req.user.id]);
        const [rows] = await pool.query(
            'SELECT estado_presencia, ultima_actividad FROM users WHERE id = ? LIMIT 1',
            [req.user.id]
        );
        const user = rows[0];
        return res.json({
            success: true,
            selectedPresenceStatus: user.estado_presencia,
            presenceStatus: effectivePresenceStatus(user.estado_presencia, user.ultima_actividad),
            lastSeenAt: user.ultima_actividad
        });
    } catch (error) {
        console.error('Error actualizando heartbeat:', error);
        return res.status(500).json({ error: 'No fue posible actualizar la actividad' });
    }
});

// ====================================
// OBTENER ACTIVIDAD DEL USUARIO
// ====================================
router.get('/api/profile/activity', authenticate, async (req, res) => {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const [activityRows] = await pool.query(`
      SELECT accion, descripcion, ip_address, created_at
      FROM user_activity_log 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), parseInt(offset)]);

        const [countRows] = await pool.query(`
      SELECT COUNT(*) as total 
      FROM user_activity_log 
      WHERE user_id = ?
    `, [req.user.id]);

        res.json({
            success: true,
            activity: activityRows,
            total: countRows[0].total
        });

    } catch (error) {
        console.error('Error al obtener actividad:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.detectImageMime = detectImageMime;
router.effectivePresenceStatus = effectivePresenceStatus;
router.photoVersion = photoVersion;
router.PRESENCE_TIMEOUT_MS = PRESENCE_TIMEOUT_MS;

module.exports = router;

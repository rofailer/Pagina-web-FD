const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const authenticate = require('../middlewares/authenticate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subida de fotos de perfil
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/profile-photos');
        // Ya no necesitamos crear el directorio aquí porque server.js lo crea automáticamente
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Obtener datos del usuario para un nombre más descriptivo
        const userId = req.user.id;
        const userLogin = req.user.usuario || 'unknown';
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1E6);
        const extension = path.extname(file.originalname).toLowerCase();

        // Formato: profile_userid-username_timestamp-random.ext
        // Ejemplo: profile_1-admin_1725456789-123456.jpg
        const filename = `profile_${userId}-${userLogin}_${timestamp}-${randomSuffix}${extension}`;

        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB límite
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// ====================================
// OBTENER PERFIL COMPLETO DEL USUARIO
// ====================================
router.get('/api/profile', authenticate, async (req, res) => {

    try {

        // Consultar datos del usuario con estructura expandida
        const [userRows] = await pool.query(`
      SELECT 
        id, nombre, usuario, password, rol, active_key_id, created_at,
        nombre_completo, email, organizacion, biografia, foto_perfil, telefono, 
        direccion, cargo, departamento, grado_academico, zona_horaria, idioma, 
        estado_cuenta, notificaciones_email, autenticacion_2fa, ultimo_acceso, updated_at
      FROM users 
      WHERE id = ?
    `, [req.user.id]);


        if (userRows.length === 0) {
            console.log('❌ Usuario no encontrado con ID:', req.user.id);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = userRows[0];

        // Intentar obtener preferencias del usuario (puede no existir la tabla)
        let preferences = {};
        try {
            const [preferencesRows] = await pool.query(`
        SELECT clave, valor 
        FROM user_preferences 
        WHERE user_id = ?
      `, [req.user.id]);

            preferencesRows.forEach(pref => {
                preferences[pref.clave] = pref.valor;
            });
            console.log('✅ Preferencias cargadas:', Object.keys(preferences).length);
        } catch (prefError) {
            console.log('⚠️ Tabla user_preferences no existe, usando valores por defecto');
            preferences = {};
        }

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
            preferences: preferences,
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
            nombre_completo,
            email,
            organizacion,
            biografia,
            telefono,
            direccion,
            cargo,
            departamento,
            grado_academico
        } = req.body;

        // Validar email único si se está cambiando
        if (email) {
            const [existingEmail] = await pool.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.user.id]
            );
            if (existingEmail.length > 0) {
                return res.status(400).json({ error: 'El correo electrónico ya está en uso' });
            }
        }

        await pool.query(`
      UPDATE users SET 
        nombre_completo = ?,
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
            nombre_completo, email, organizacion, biografia,
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
// FUNCIONES AUXILIARES PARA GESTIÓN DE ARCHIVOS
// ====================================

// Función para limpiar fotos antiguas del usuario
async function cleanupOldUserPhotos(userId, excludeFile = null) {
    try {
        const photosDir = path.join(__dirname, '../../uploads/profile-photos');
        if (!fs.existsSync(photosDir)) return;

        const files = fs.readdirSync(photosDir);
        const userPhotos = files.filter(file =>
            file.startsWith(`profile_${userId}-`) && file !== excludeFile
        );

        // Eliminar fotos antiguas del usuario (mantener solo la más reciente)
        userPhotos.forEach(photo => {
            const photoPath = path.join(photosDir, photo);
            if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
            }
        });

    } catch (error) {
        console.error('Error al limpiar fotos antiguas:', error);
    }
}

// ====================================
// SUBIR FOTO DE PERFIL
// ====================================
router.post('/api/profile/photo', authenticate, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
        }

        const photoPath = `/uploads/profile-photos/${req.file.filename}`;
        const userId = req.user.id;

        // Limpiar fotos anteriores del usuario (excluyendo la nueva)
        await cleanupOldUserPhotos(userId, req.file.filename);

        // Actualizar ruta de la foto en la base de datos
        await pool.query(
            'UPDATE users SET foto_perfil = ?, updated_at = NOW() WHERE id = ?',
            [photoPath, userId]
        );

        // Registrar actividad
        await pool.query(`
      INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) 
      VALUES (?, 'update_photo', ?, ?)
    `, [userId, `Actualización de foto de perfil: ${req.file.filename}`, req.ip]);

        res.json({
            success: true,
            message: 'Foto de perfil actualizada correctamente',
            photoPath: photoPath,
            fileName: req.file.filename
        });

    } catch (error) {
        console.error('Error al subir foto de perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ====================================
// OBTENER FOTO DE PERFIL DE USUARIO
// ====================================
router.get('/api/profile/photo/:userId?', authenticate, async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id;

        // Solo admin/owner pueden ver fotos de otros usuarios
        if (userId != req.user.id && !['admin', 'owner'].includes(req.user.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para ver esta foto' });
        }

        const [userRow] = await pool.query(
            'SELECT foto_perfil, nombre_completo, usuario FROM users WHERE id = ?',
            [userId]
        );

        if (userRow.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = userRow[0];

        if (!user.foto_perfil) {
            return res.json({
                success: true,
                hasPhoto: false,
                message: 'El usuario no tiene foto de perfil'
            });
        }

        // Verificar que el archivo existe
        const photoPath = path.join(__dirname, '../../', user.foto_perfil);
        if (!fs.existsSync(photoPath)) {
            // Limpiar referencia en BD si el archivo no existe
            await pool.query(
                'UPDATE users SET foto_perfil = NULL WHERE id = ?',
                [userId]
            );

            return res.json({
                success: true,
                hasPhoto: false,
                message: 'Archivo de foto no encontrado, referencia limpiada'
            });
        }

        res.json({
            success: true,
            hasPhoto: true,
            photoPath: user.foto_perfil,
            userName: user.nombre_completo || user.usuario
        });

    } catch (error) {
        console.error('Error al obtener foto de perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ====================================
// ELIMINAR FOTO DE PERFIL
// ====================================
router.delete('/api/profile/photo', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Obtener foto actual
        const [currentUser] = await pool.query(
            'SELECT foto_perfil FROM users WHERE id = ?',
            [userId]
        );

        if (!currentUser[0]?.foto_perfil) {
            return res.json({
                success: true,
                message: 'No hay foto de perfil para eliminar'
            });
        }

        // Eliminar archivo físico
        const photoPath = path.join(__dirname, '../../', currentUser[0].foto_perfil);
        if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
        }

        // Limpiar todas las fotos antiguas del usuario
        await cleanupOldUserPhotos(userId);

        // Actualizar base de datos
        await pool.query(
            'UPDATE users SET foto_perfil = NULL, updated_at = NOW() WHERE id = ?',
            [userId]
        );

        // Registrar actividad
        await pool.query(`
      INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) 
      VALUES (?, 'delete_photo', 'Eliminación de foto de perfil', ?)
    `, [userId, req.ip]);

        res.json({
            success: true,
            message: 'Foto de perfil eliminada correctamente'
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
        // Solo admin puede ver estadísticas
        if (req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo administradores pueden ver estas estadísticas' });
        }

        const photosDir = path.join(__dirname, '../../uploads/profile-photos');
        let stats = {
            totalFiles: 0,
            totalSize: 0,
            userFiles: {},
            orphanedFiles: []
        };

        if (!fs.existsSync(photosDir)) {
            return res.json({ success: true, stats });
        }

        const files = fs.readdirSync(photosDir);

        // Obtener todos los usuarios con fotos
        const [usersWithPhotos] = await pool.query(
            'SELECT id, usuario, foto_perfil FROM users WHERE foto_perfil IS NOT NULL'
        );

        const validPhotos = usersWithPhotos.map(user => path.basename(user.foto_perfil));

        files.forEach(file => {
            const filePath = path.join(photosDir, file);
            const fileStat = fs.statSync(filePath);

            stats.totalFiles++;
            stats.totalSize += fileStat.size;

            // Extraer user ID del nombre del archivo
            const match = file.match(/^profile_(\d+)-/);
            if (match) {
                const userId = match[1];
                if (!stats.userFiles[userId]) {
                    stats.userFiles[userId] = { count: 0, size: 0 };
                }
                stats.userFiles[userId].count++;
                stats.userFiles[userId].size += fileStat.size;

                // Verificar si es un archivo huérfano
                if (!validPhotos.includes(file)) {
                    stats.orphanedFiles.push(file);
                }
            }
        });

        // Convertir tamaños a formato legible
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
// ACTUALIZAR CONFIGURACIONES
// ====================================
router.put('/api/profile/settings', authenticate, async (req, res) => {
    try {
        const {
            zona_horaria,
            idioma,
            notificaciones_email,
            autenticacion_2fa
        } = req.body;

        // Actualizar configuraciones en la tabla users
        await pool.query(`
      UPDATE users SET 
        zona_horaria = ?,
        idioma = ?,
        notificaciones_email = ?,
        autenticacion_2fa = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [zona_horaria, idioma, notificaciones_email, autenticacion_2fa, req.user.id]);

        // Registrar actividad
        await pool.query(`
      INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) 
      VALUES (?, 'update_settings', 'Actualización de configuraciones', ?)
    `, [req.user.id, req.ip]);

        res.json({ success: true, message: 'Configuraciones actualizadas correctamente' });

    } catch (error) {
        console.error('Error al actualizar configuraciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ====================================
// ACTUALIZAR PREFERENCIAS PERSONALIZADAS
// ====================================
router.put('/api/profile/preferences', authenticate, async (req, res) => {
    try {
        const { preferences } = req.body;

        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({ error: 'Formato de preferencias inválido' });
        }

        // Usar transacción para actualizar múltiples preferencias
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            for (const [clave, valor] of Object.entries(preferences)) {
                await connection.query(`
          INSERT INTO user_preferences (user_id, clave, valor) 
          VALUES (?, ?, ?) 
          ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()
        `, [req.user.id, clave, valor]);
            }

            await connection.commit();
            connection.release();

            // Registrar actividad
            await pool.query(`
        INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) 
        VALUES (?, 'update_preferences', 'Actualización de preferencias personalizadas', ?)
      `, [req.user.id, req.ip]);

            res.json({ success: true, message: 'Preferencias actualizadas correctamente' });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Error al actualizar preferencias:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
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

module.exports = router;

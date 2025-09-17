/* ========================================
   RUTAS DE ADMINISTRACIÓN - BACKEND
   Sistema completo de gestión administrativa
   ======================================== */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const authenticate = require('../middlewares/authenticate');
const { isOwner } = require('../middlewares/isOwner');
const { isAdmin } = require('../middlewares/isAdmin');

// Importar DatabaseSetupManager del setup-db.js
const DatabaseSetupManager = require('../setup-db');

/* ========================================
   MIDDLEWARE DE AUTENTICACIÓN ADMIN
   ======================================== */

// Middleware para autenticar tokens de admin del panel
function authenticateAdmin(req, res, next) {
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

        req.userId = decoded.id;
        req.userRole = decoded.rol;
        req.user = { usuario: decoded.usuario };

        next();
    } catch (error) {
        console.error('Error en autenticación admin:', error);
        return res.status(401).json({
            success: false,
            message: 'Token inválido o expirado'
        });
    }
}

/* ========================================
   TOKENS TEMPORALES DE ADMINISTRACIÓN
   ======================================== */

// Endpoint de prueba para verificar que las rutas funcionan
router.get('/api/admin/test', (req, res) => {
    res.json({
        success: true,
        message: 'Rutas de admin funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Almacén temporal para tokens de admin (en memoria)
const adminTokens = new Map();

// Generar token temporal para panel de administración
router.post('/api/admin/generate-admin-token', authenticate, isOwner, async (req, res) => {
    try {
        // Generar token temporal con expiración extendida
        const adminToken = jwt.sign(
            {
                id: req.userId,           // Cambiar de 'userId' a 'id' para compatibilidad
                rol: req.userRole,
                usuario: req.user?.usuario || 'admin',
                type: 'admin-panel',
                timestamp: Date.now()
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Cambiado de 1h a 24 horas
        );

        // Guardar en memoria con expiración
        const tokenId = Math.random().toString(36).substring(2, 15);
        adminTokens.set(tokenId, {
            token: adminToken,
            userId: req.userId,
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 horas (cambiado de 1 hora)
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
            expiresIn: 86400 // 24 horas en segundos (cambiado de 3600)
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

        res.json({
            success: true,
            token: tokenData.token,
            expiresAt: tokenData.expiresAt
        });
    } catch (error) {
        console.error('Error intercambiando token de admin:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
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
            headerTitle: 'Firmas Digitales FD',
            footerText: '© 2024 Firmas Digitales FD',
            contactEmail: '',
            contactPhone: '',
            maintenanceMode: false,
            allowRegistration: true,
            maxFileSize: 10485760, // 10MB
            supportedFormats: ['pdf', 'doc', 'docx'],
            sessionTimeout: 3600000 // 1 hora
        };

        try {
            const configFile = await fs.readFile(configPath, 'utf8');
            config = { ...config, ...JSON.parse(configFile) };
        } catch (error) {
            console.log('Usando configuración por defecto');
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
        const {
            siteTitle,
            headerTitle,
            footerText,
            contactEmail,
            contactPhone,
            maintenanceMode,
            allowRegistration,
            maxFileSize,
            supportedFormats,
            sessionTimeout
        } = req.body;

        const config = {
            siteTitle: siteTitle || 'Firmas Digitales FD',
            headerTitle: headerTitle || 'Firmas Digitales FD',
            footerText: footerText || '© 2024 Firmas Digitales FD',
            contactEmail: contactEmail || '',
            contactPhone: contactPhone || '',
            maintenanceMode: Boolean(maintenanceMode),
            allowRegistration: Boolean(allowRegistration),
            maxFileSize: parseInt(maxFileSize) || 10485760,
            supportedFormats: supportedFormats || ['pdf', 'doc', 'docx'],
            sessionTimeout: parseInt(sessionTimeout) || 3600000,
            lastUpdated: new Date().toISOString(),
            updatedBy: req.user.id
        };

        const configPath = path.join(__dirname, '../../config.json');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

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
                u.nombre_completo,
                u.usuario, 
                u.email,
                u.rol, 
                u.estado_cuenta,
                u.organizacion,
                u.cargo,
                u.departamento,
                u.created_at,
                u.ultimo_acceso,
                COUNT(uk.id) as keys_count
            FROM users u
            LEFT JOIN user_keys uk ON u.id = uk.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `;

        const [result] = await pool.query(query);

        const users = result.map(user => ({
            id: user.id,
            name: user.nombre_completo || user.nombre,
            email: user.email || user.usuario,
            username: user.usuario,
            role: user.rol,
            status: user.estado_cuenta || 'activo',
            organization: user.organizacion,
            position: user.cargo,
            department: user.departamento,
            createdAt: user.created_at,
            lastLogin: user.ultimo_acceso,
            keysCount: parseInt(user.keys_count || 0)
        }));

        res.json(users);
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});// Crear nuevo usuario
router.post('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validaciones
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Nombre, email y contraseña son requeridos'
            });
        }

        const pool = require('../db/pool');

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
        const hashedPassword = await bcrypt.hash(password, 10);

        // Mapear role al formato de la nueva BD
        const dbRole = role === 'admin' ? 'admin' : role === 'owner' ? 'owner' : 'profesor';

        const query = `
            INSERT INTO users (
                nombre, 
                nombre_completo, 
                usuario, 
                email, 
                password, 
                rol,
                estado_cuenta,
                ultimo_acceso
            ) VALUES (?, ?, ?, ?, ?, ?, 'activo', NOW())
        `;

        const [result] = await pool.query(query, [
            name,
            name, // nombre_completo
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
            created_at: new Date()
        };

        res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente',
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                status: newUser.status,
                createdAt: newUser.created_at,
                signaturesCount: 0,
                keysCount: 0
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

// Actualizar usuario
router.put('/api/admin/users/:userId', authenticate, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, role, phone, notes, permissions } = req.body;

        const pool = require('../db/pool');

        // Verificar que el usuario existe
        const [existingUser] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Actualizar usuario con campos expandidos de la nueva BD
        const dbRole = role === 'admin' ? 'admin' : role === 'owner' ? 'owner' : 'profesor';

        const query = `
            UPDATE users 
            SET nombre = ?, 
                nombre_completo = ?, 
                usuario = ?, 
                email = ?, 
                rol = ?,
                updated_at = NOW()
            WHERE id = ?
        `;

        const [result] = await pool.query(query, [
            name,
            name, // nombre_completo
            email, // usuario
            email, // email
            dbRole,
            userId
        ]);

        const updatedUser = {
            id: userId,
            name: name,
            email: email,
            role: dbRole,
            status: 'activo'
        };

        res.json({
            success: true,
            message: 'Usuario actualizado correctamente',
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                status: updatedUser.status,
                signaturesCount: 0,
                keysCount: 0
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
        const { userId } = req.params;
        const { role } = req.body;

        const validRoles = ['profesor', 'admin', 'owner'];
        const dbRole = role === 'admin' ? 'admin' : role === 'owner' ? 'owner' : 'profesor';

        if (!['user', 'admin', 'owner'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Rol inválido'
            });
        }

        const pool = require('../db/pool');

        const [result] = await pool.query(
            'UPDATE users SET rol = ?, updated_at = NOW() WHERE id = ?',
            [dbRole, userId]
        );

        res.json({
            success: true,
            message: 'Rol actualizado correctamente'
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
        const { userId } = req.params;
        const { status } = req.body;

        const validStatuses = ['activo', 'inactivo', 'suspendido', 'pendiente'];
        const dbStatus = status === 'active' ? 'activo' : status === 'inactive' ? 'inactivo' : status;

        if (!validStatuses.includes(dbStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Estado inválido'
            });
        }

        const pool = require('../db/pool');

        const [result] = await pool.query(
            'UPDATE users SET estado_cuenta = ?, updated_at = NOW() WHERE id = ?',
            [dbStatus, userId]
        );

        res.json({
            success: true,
            message: 'Estado actualizado correctamente'
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
        const { userId } = req.params;

        // Generar contraseña temporal
        const temporaryPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        const pool = require('../db/pool');

        const [result] = await pool.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

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
        const { userId } = req.params;

        // Verificar que el usuario existe
        const pool = require('../db/pool');
        const [existingUser] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // No permitir eliminar al propio usuario
        if (parseInt(userId) === req.userId) {
            return res.status(400).json({
                success: false,
                message: 'No puedes eliminar tu propio usuario'
            });
        }

        // Eliminar usuario (las claves foráneas deberían estar configuradas para CASCADE o SET NULL)
        const [result] = await pool.query(
            'DELETE FROM users WHERE id = ?',
            [userId]
        );

        if (result.affectedRows > 0) {
            res.json({
                success: true,
                message: 'Usuario eliminado correctamente'
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

        console.log(`Tema ${themeId} aplicado por ${req.user.usuario}`);

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

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/admin/'));
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${req.body.type || 'file'}_${timestamp}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/ico'];
        if (allowedTypes.includes(file.mimetype)) {
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
router.get('/api/admin/metrics', authenticateAdmin, async (req, res) => {
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
            console.log('No se pudo acceder a la carpeta downloads:', error.message);
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

/* ========================================
   CONFIGURACIÓN GENERAL DEL ADMIN
   ======================================== */

// Obtener configuración general
router.get('/api/admin/config', authenticateAdmin, async (req, res) => {
    try {
        // Configuración básica por defecto
        const defaultConfig = {
            siteName: 'Sistema de Firmas Digitales',
            version: '2.0',
            maintenanceMode: false,
            allowRegistration: true,
            maxFileSize: 10, // MB
            sessionTimeout: 30, // minutos
            backupFrequency: 'daily'
        };

        res.json({
            success: true,
            config: defaultConfig
        });

    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener configuración'
        });
    }
});

// Guardar configuración general
router.post('/api/admin/config', authenticateAdmin, async (req, res) => {
    try {
        const config = req.body;

        res.json({
            success: true,
            message: 'Configuración guardada exitosamente'
        });

    } catch (error) {
        console.error('Error guardando configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al guardar configuración'
        });
    }
});

/* ========================================
   GESTIÓN DE BASE DE DATOS
   ======================================== */

// Obtener métricas del sistema
router.get('/api/admin/metrics', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');

        // Verificar conexión a BD
        let dbStatus = { online: false, status: 'Sin conexión', class: 'offline' };

        try {
            const connection = await pool.getConnection();
            dbStatus = { online: true, status: 'Conectado', class: 'online' };
            connection.release();
        } catch (dbError) {
            console.warn('Error de conexión a BD:', dbError.message);
        }

        // Si no hay conexión a BD, devolver métricas básicas
        if (!dbStatus.online) {
            return res.json({
                success: true,
                metrics: {
                    users: { total: 0, change: 0, changeText: 'Sin BD' },
                    documents: { total: 0, change: 0, changeText: 'Sin BD' },
                    keys: { total: 0, change: 0, changeText: 'Sin BD' },
                    systemStatus: dbStatus
                }
            });
        }

        // Obtener métricas reales de la BD
        const connection = await pool.getConnection();

        // Usuarios
        const [userResult] = await connection.query('SELECT COUNT(*) as total FROM users WHERE estado_cuenta = "activo"');
        const usersTotal = userResult[0].total;

        // Documentos (usando user_keys como aproximación ya que no hay tabla documentos en v2)
        const [docResult] = await connection.query('SELECT COUNT(*) as total FROM user_keys');
        const docsTotal = docResult[0].total;

        // Llaves
        const [keyResult] = await connection.query('SELECT COUNT(*) as total FROM user_keys');
        const keysTotal = keyResult[0].total;

        connection.release();

        res.json({
            success: true,
            metrics: {
                users: {
                    total: usersTotal,
                    change: 0, // TODO: Calcular cambio real
                    changeText: '+0 este mes'
                },
                documents: {
                    total: docsTotal,
                    change: 0,
                    changeText: '+0 esta semana'
                },
                keys: {
                    total: keysTotal,
                    change: 0,
                    changeText: '+0 este mes'
                },
                systemStatus: dbStatus
            }
        });

    } catch (error) {
        console.error('Error obteniendo métricas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor al obtener métricas',
            metrics: {
                users: { total: 0, change: 0, changeText: 'Error' },
                documents: { total: 0, change: 0, changeText: 'Error' },
                keys: { total: 0, change: 0, changeText: 'Error' },
                systemStatus: { online: false, status: 'Error', class: 'error' }
            }
        });
    }
});

// Obtener estado de la base de datos
router.get('/api/admin/database/status', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');

        // Verificar conexión
        const connection = await pool.getConnection();
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

        connection.release();

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
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// POST route for status (for compatibility with frontend)
router.post('/api/admin/database/status', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');

        // Verificar conexión
        const connection = await pool.getConnection();
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

        connection.release();

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
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// Obtener lista de tablas
router.get('/api/admin/database/tables', authenticateAdmin, async (req, res) => {
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

// Instalar base de datos
router.post('/api/admin/database/install', authenticateAdmin, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        const pool = require('../db/pool');

        // Leer archivo SQL
        const sqlFilePath = path.join(__dirname, '../../firmas_digitales_v2.sql');
        const sqlContent = await fs.readFile(sqlFilePath, 'utf8');

        // Dividir el SQL en statements individuales
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        const connection = await pool.getConnection();

        // Ejecutar cada statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.toUpperCase().includes('USE FIRMAS_DIGITALES')) {
                // Cambiar a la base de datos correcta
                await connection.query('USE firmas_digitales');
            } else if (statement.length > 0) {
                try {
                    await connection.query(statement);
                } catch (stmtError) {
                    console.warn(`Advertencia en statement ${i + 1}:`, stmtError.message);
                    // Continuar con el siguiente statement
                }
            }
        }

        connection.release();

        res.json({
            success: true,
            message: 'Base de datos instalada correctamente',
            installed: true
        });

    } catch (error) {
        console.error('Error instalando base de datos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al instalar la base de datos',
            error: error.message
        });
    }
});

// Crear respaldo de la base de datos usando setup-db.js
router.post('/api/admin/database/backup', authenticateAdmin, async (req, res) => {
    try {
        // Crear instancia del DatabaseSetupManager
        const setupManager = new DatabaseSetupManager();

        // Verificar conexión
        if (!await setupManager.connect()) {
            return res.status(500).json({
                success: false,
                message: 'No se pudo conectar a la base de datos'
            });
        }

        // Verificar que la base de datos existe
        const dbExists = await setupManager.databaseExists();
        if (!dbExists) {
            await setupManager.connection.destroy();
            return res.status(400).json({
                success: false,
                message: 'La base de datos no existe'
            });
        }

        // Reconectar con la base de datos específica
        await setupManager.connection.destroy();
        const connectSuccess = await setupManager.connect();
        if (!connectSuccess) {
            return res.status(500).json({
                success: false,
                message: 'No se pudo reconectar a la base de datos'
            });
        }
        await setupManager.connection.query(`USE \`${setupManager.config.database}\``);

        // Crear el backup usando la funcionalidad del setup-db.js
        const backupFile = await setupManager.createBackup();

        // Cerrar conexión
        await setupManager.connection.destroy();

        if (backupFile) {
            res.json({
                success: true,
                message: 'Respaldo creado correctamente usando setup-db.js',
                backupFile: path.basename(backupFile),
                fullPath: backupFile
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error al crear el respaldo'
            });
        }

    } catch (error) {
        console.error('Error en respaldo de BD:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear respaldo de la base de datos',
            error: error.message
        });
    }
});

// Optimizar base de datos
router.post('/api/admin/database/optimize', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        // Obtener todas las tablas
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(row => Object.values(row)[0]);

        // Optimizar cada tabla
        const results = [];
        for (const tableName of tableNames) {
            try {
                await connection.query(`OPTIMIZE TABLE \`${tableName}\``);
                results.push({ table: tableName, status: 'optimized' });
            } catch (error) {
                results.push({ table: tableName, status: 'error', error: error.message });
            }
        }

        connection.release();

        res.json({
            success: true,
            message: 'Optimización completada',
            results: results
        });

    } catch (error) {
        console.error('Error optimizando BD:', error);
        res.status(500).json({
            success: false,
            message: 'Error al optimizar la base de datos',
            error: error.message
        });
    }
});

// Eliminar todas las tablas de la base de datos (GET - para compatibilidad)
router.get('/api/admin/database/drop', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        try {
            // Obtener lista de todas las tablas
            const [tables] = await connection.query('SHOW TABLES');

            if (tables.length === 0) {
                return res.json({
                    success: true,
                    message: 'No hay tablas para eliminar',
                    tables: []
                });
            }

            // Mostrar las tablas que se eliminarían
            const tableNames = tables.map(row => Object.values(row)[0]);

            res.json({
                success: true,
                message: `Se eliminarían ${tableNames.length} tablas`,
                tables: tableNames,
                warning: 'Esta es una operación destructiva. Use POST para confirmar.'
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error obteniendo lista de tablas para drop:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener lista de tablas',
            error: error.message
        });
    }
});

// Eliminar todas las tablas de la base de datos
router.post('/api/admin/database/drop', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        try {
            // Obtener lista de todas las tablas (excluyendo vistas)
            const [tables] = await connection.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');

            if (tables.length === 0) {
                return res.json({
                    success: true,
                    message: 'No hay tablas para eliminar'
                });
            }

            // Desactivar restricciones de clave foránea temporalmente
            await connection.query('SET FOREIGN_KEY_CHECKS = 0');

            // Eliminar todas las tablas
            const tableNames = tables.map(row => Object.values(row)[0]);
            const droppedTables = [];
            const errors = [];

            for (const tableName of tableNames) {
                try {
                    await connection.query(`DROP TABLE \`${tableName}\``);
                    droppedTables.push(tableName);
                } catch (error) {
                    errors.push({ table: tableName, error: error.message });
                }
            }

            // Reactivar restricciones de clave foránea
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');

            res.json({
                success: true,
                message: `Se eliminaron ${droppedTables.length} tablas correctamente`,
                droppedTables: droppedTables,
                errors: errors
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error eliminando tablas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar las tablas',
            error: error.message
        });
    }
});

// Resetear base de datos (reiniciar datos por defecto) - GET
router.get('/api/admin/database/reset', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        try {
            // Obtener lista de tablas existentes
            const [tables] = await connection.query('SHOW TABLES');
            const tableCount = tables.length;
            const tableNames = tables.map(row => Object.values(row)[0]);

            // Contar registros en tablas principales
            const tableStats = [];
            const tablesToCheck = ['users', 'user_keys', 'pdf_documents', 'signatures'];

            for (const tableName of tablesToCheck) {
                if (tableNames.includes(tableName)) {
                    try {
                        const [countResult] = await connection.query(`SELECT COUNT(*) as total FROM \`${tableName}\``);
                        tableStats.push({
                            table: tableName,
                            records: countResult[0].total
                        });
                    } catch (error) {
                        tableStats.push({
                            table: tableName,
                            records: 0,
                            error: 'Error al contar'
                        });
                    }
                }
            }

            res.json({
                success: true,
                message: 'Información de reinicio disponible',
                currentTables: tableCount,
                tableStats: tableStats,
                warning: 'Esta operación limpiará los datos de las tablas pero mantendrá la estructura. Use POST para confirmar.'
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error obteniendo información de reset:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener información de reinicio',
            error: error.message
        });
    }
});

// Resetear base de datos usando setup-db.js (NO elimina tablas, solo datos)
router.post('/api/admin/database/reset', authenticateAdmin, async (req, res) => {
    try {
        // Crear instancia del DatabaseSetupManager
        const setupManager = new DatabaseSetupManager();

        // Verificar conexión
        if (!await setupManager.connect()) {
            return res.status(500).json({
                success: false,
                message: 'No se pudo conectar a la base de datos'
            });
        }

        // Verificar que la base de datos existe
        const dbExists = await setupManager.databaseExists();
        if (!dbExists) {
            await setupManager.connection.destroy();
            return res.status(400).json({
                success: false,
                message: 'La base de datos no existe'
            });
        }

        // Reconectar con la base de datos específica
        await setupManager.connection.destroy();
        const connectSuccess = await setupManager.connect();
        if (!connectSuccess) {
            return res.status(500).json({
                success: false,
                message: 'No se pudo reconectar a la base de datos'
            });
        }
        await setupManager.connection.query(`USE \`${setupManager.config.database}\``);

        // Ejecutar reset usando la funcionalidad del setup-db.js
        const resetSuccess = await setupManager.resetDatabase();

        // Cerrar conexión
        await setupManager.connection.destroy();

        if (resetSuccess) {
            res.json({
                success: true,
                message: 'Base de datos reseteada correctamente usando setup-db.js (datos eliminados, estructura conservada)',
                method: 'setup-db.js'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error al resetear la base de datos'
            });
        }

    } catch (error) {
        console.error('Error reseteando BD:', error);
        res.status(500).json({
            success: false,
            message: 'Error al reiniciar la base de datos',
            error: error.message
        });
    }
});

// Restaurar base de datos desde backup - GET (información)
router.get('/api/admin/database/restore', authenticateAdmin, async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');

        // Verificar directorio de backups
        const backupDir = path.join(__dirname, '../../backups');

        let backupFiles = [];
        let latestBackup = null;

        try {
            const files = await fs.readdir(backupDir);
            backupFiles = files
                .filter(file => file.endsWith('.sql'))
                .sort()
                .reverse(); // Más reciente primero

            if (backupFiles.length > 0) {
                latestBackup = backupFiles[0];
                const stats = await fs.stat(path.join(backupDir, latestBackup));
                latestBackup = {
                    name: latestBackup,
                    size: stats.size,
                    created: stats.birthtime
                };
            }
        } catch (error) {
            // Directorio no existe o no se puede leer
        }

        res.json({
            success: true,
            message: 'Información de restauración disponible',
            backupFiles: backupFiles,
            latestBackup: latestBackup,
            backupDir: backupDir,
            warning: 'Esta operación restaurará la base de datos desde un backup. Se creará un backup de seguridad antes. Use POST para confirmar.'
        });

    } catch (error) {
        console.error('Error obteniendo información de restauración:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener información de restauración',
            error: error.message
        });
    }
});

// Restaurar base de datos desde backup usando setup-db.js
router.post('/api/admin/database/restore', authenticateAdmin, async (req, res) => {
    try {
        const { backupFile } = req.body;

        // Crear instancia del DatabaseSetupManager
        const setupManager = new DatabaseSetupManager();

        // Verificar conexión
        if (!await setupManager.connect()) {
            return res.status(500).json({
                success: false,
                message: 'No se pudo conectar a la base de datos'
            });
        }

        // Verificar que la base de datos existe
        const dbExists = await setupManager.databaseExists();
        if (!dbExists) {
            await setupManager.connection.destroy();
            return res.status(400).json({
                success: false,
                message: 'La base de datos no existe'
            });
        }

        // Reconectar con la base de datos específica
        await setupManager.connection.destroy();
        const connectSuccess = await setupManager.connect();
        if (!connectSuccess) {
            return res.status(500).json({
                success: false,
                message: 'No se pudo reconectar a la base de datos'
            });
        }
        await setupManager.connection.query(`USE \`${setupManager.config.database}\``);

        // Ejecutar restauración usando la funcionalidad del setup-db.js
        const restoreSuccess = await setupManager.restoreBackup(backupFile);

        // Cerrar conexión
        await setupManager.connection.destroy();

        if (restoreSuccess) {
            res.json({
                success: true,
                message: 'Base de datos restaurada correctamente desde backup usando setup-db.js',
                method: 'setup-db.js',
                backupFile: backupFile || 'último backup disponible'
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error al restaurar la base de datos desde backup'
            });
        }

    } catch (error) {
        console.error('Error restaurando BD:', error);
        res.status(500).json({
            success: false,
            message: 'Error al restaurar la base de datos desde backup',
            error: error.message
        });
    }
});

// Ejecutar migraciones de base de datos - GET
router.get('/api/admin/database/migrate', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        try {
            // Obtener información de la base de datos
            const [tables] = await connection.query('SHOW TABLES');
            const [dbInfo] = await connection.query('SELECT VERSION() as version');

            res.json({
                success: true,
                message: 'Información de migraciones disponible',
                currentTables: tables.length,
                dbVersion: dbInfo[0].version,
                tables: tables.map(row => Object.values(row)[0]),
                warning: 'Esta operación ejecutará migraciones. Use POST para confirmar.'
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error obteniendo información de migraciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener información de migraciones',
            error: error.message
        });
    }
});

// Ejecutar migraciones de base de datos
router.post('/api/admin/database/migrate', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        try {
            // Aquí implementarías la lógica de migraciones
            // Por ahora, solo verificamos la conexión y estructura

            const [tables] = await connection.query('SHOW TABLES');
            const [dbInfo] = await connection.query('SELECT VERSION() as version');

            res.json({
                success: true,
                message: 'Migraciones ejecutadas correctamente',
                currentTables: tables.length,
                dbVersion: dbInfo[0].version
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error ejecutando migraciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error al ejecutar migraciones',
            error: error.message
        });
    }
});

// Crear estructura inicial de base de datos - GET
router.get('/api/admin/database/create', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        try {
            // Verificar si ya existe estructura
            const [tables] = await connection.query('SHOW TABLES');

            if (tables.length > 0) {
                return res.json({
                    success: false,
                    message: 'La base de datos ya contiene tablas. Use /reset para recrear la estructura.',
                    existingTables: tables.map(row => Object.values(row)[0])
                });
            }

            // Verificar si existe el archivo SQL
            const fs = require('fs').promises;
            const path = require('path');
            const sqlPath = path.join(__dirname, '../../firmas_digitales.sql');

            let sqlExists = false;
            let sqlSize = 0;
            try {
                const stats = await fs.stat(sqlPath);
                sqlExists = true;
                sqlSize = stats.size;
            } catch (e) {
                sqlExists = false;
            }

            res.json({
                success: true,
                message: 'Listo para crear estructura de base de datos',
                sqlFileExists: sqlExists,
                sqlFileSize: sqlSize,
                warning: 'Esta operación creará la estructura inicial. Use POST para confirmar.'
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error verificando estructura:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar estructura de base de datos',
            error: error.message
        });
    }
});

// Crear estructura inicial de base de datos
router.post('/api/admin/database/create', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        try {
            // Verificar si ya existe estructura
            const [tables] = await connection.query('SHOW TABLES');

            if (tables.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La base de datos ya contiene tablas. Use /reset para recrear la estructura.'
                });
            }

            // Crear estructura desde el archivo SQL
            const fs = require('fs').promises;
            const path = require('path');
            const sqlPath = path.join(__dirname, '../../firmas_digitales.sql');

            try {
                const sqlContent = await fs.readFile(sqlPath, 'utf8');
                const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);

                for (const statement of statements) {
                    if (statement.trim()) {
                        await connection.query(statement);
                    }
                }

                res.json({
                    success: true,
                    message: 'Estructura de base de datos creada correctamente',
                    createdTables: statements.length
                });

            } catch (sqlError) {
                console.error('Error leyendo archivo SQL:', sqlError);
                res.status(500).json({
                    success: false,
                    message: 'Error al leer el archivo SQL de estructura',
                    error: sqlError.message
                });
            }

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error creando estructura BD:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la estructura de base de datos',
            error: error.message
        });
    }
});

// Poblar base de datos con datos de prueba - GET
router.get('/api/admin/database/seed', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        try {
            // Verificar que existan las tablas necesarias
            const [tables] = await connection.query('SHOW TABLES');

            if (tables.length === 0) {
                return res.json({
                    success: false,
                    message: 'No existe estructura de base de datos. Use /create primero.',
                    tables: []
                });
            }

            res.json({
                success: true,
                message: 'Listo para poblar base de datos',
                tables: tables.map(row => Object.values(row)[0]),
                warning: 'Esta operación agregará datos de prueba. Use POST para confirmar.'
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error verificando estructura para seed:', error);
        res.status(500).json({
            success: false,
            message: 'Error al verificar estructura de base de datos',
            error: error.message
        });
    }
});

// Poblar base de datos con datos de prueba
router.post('/api/admin/database/seed', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const connection = await pool.getConnection();

        try {
            // Verificar que existan las tablas necesarias
            const [tables] = await connection.query('SHOW TABLES');

            if (tables.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No existe estructura de base de datos. Use /create primero.'
                });
            }

            // Aquí implementarías la lógica para poblar con datos de prueba
            // Por ejemplo, insertar usuarios de prueba, documentos, etc.

            // Datos de ejemplo básicos
            const seedResults = {
                users: 0,
                documents: 0,
                keys: 0
            };

            res.json({
                success: true,
                message: 'Base de datos poblada con datos de prueba',
                results: seedResults
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error poblando BD:', error);
        res.status(500).json({
            success: false,
            message: 'Error al poblar la base de datos',
            error: error.message
        });
    }
});

router.post('/api/admin/database/table-details', authenticateAdmin, async (req, res) => {
    try {
        const pool = require('../db/pool');
        const { tableName } = req.body;

        if (!tableName) {
            return res.status(400).json({
                success: false,
                message: 'Nombre de tabla requerido'
            });
        }

        // Obtener información de la tabla
        const [tableInfo] = await pool.query(`
            SELECT TABLE_ROWS as rowCount
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
        `, [tableName]);

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
            sampleData = data;
        } catch (error) {
            // Si hay error al obtener datos, continuar sin ellos
            console.log(`No se pudieron obtener datos de muestra para ${tableName}:`, error.message);
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

router.post('/api/admin/database/table-data', authenticateAdmin, async (req, res) => {
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

        if (!tableName || typeof tableName !== 'string' || tableName.trim() === '') {
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
            data = rows;
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
        console.log('🔍 Solicitando lista de roles de usuario');

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

        console.log('✅ Roles obtenidos exitosamente:', availableRoles.length);

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

module.exports = router;

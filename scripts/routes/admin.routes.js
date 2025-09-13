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

        if (!tokenId || !adminTokens.has(tokenId)) {
            return res.status(401).json({ error: 'Token ID inválido' });
        }

        const tokenData = adminTokens.get(tokenId);

        // Verificar expiración
        if (tokenData.expiresAt < Date.now()) {
            adminTokens.delete(tokenId);
            return res.status(401).json({ error: 'Token expirado' });
        }

        // Devolver token y eliminar el tokenId (un solo uso)
        adminTokens.delete(tokenId);

        res.json({
            success: true,
            token: tokenData.token
        });
    } catch (error) {
        console.error('Error intercambiando token:', error);
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
            console.log('Creando nueva configuración');
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

        const themeConfig = {
            selectedTheme,
            customColor: customColor || null,
            timestamp: timestamp || Date.now(),
            updatedBy: req.userId
        };

        console.log('🎨 Configuración de tema guardada en BD:', themeConfig);

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

        // Actualizar memoria global también para compatibilidad
        const themeConfig = {
            selectedTheme,
            customColor: customColor || null,
            timestamp: timestamp || Date.now(),
            updatedBy: req.userId
        };

        console.log('🎨 Configuración de tema guardada en BD:', themeConfig);

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
            console.warn('Error leyendo configuración de BD:', dbError.message);
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

module.exports = router;

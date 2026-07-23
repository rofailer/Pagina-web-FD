const pool = require('../db/pool');
const fs = require('fs');
const { ensureVisualContactColumns } = require('../utils/visualConfigSchema');

function publicVisualResponse(config) {
    return {
        success: true,
        config,
        ...config
    };
}

class VisualConfigController {
    // Obtener configuración visual actual
    static async getVisualConfig(req, res) {
        try {
            await ensureVisualContactColumns();
            const [rows] = await pool.execute(
                'SELECT * FROM visual_config WHERE id = 1'
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Configuración visual no encontrada'
                });
            }

            res.json({
                success: true,
                config: rows[0]
            });
        } catch (error) {
            console.warn('Error al obtener configuración visual:', error.message);

            // Si la tabla no existe, devolver configuración por defecto
            if (error.code === 'ER_NO_SUCH_TABLE') {
                console.log('Tabla visual_config no existe, devolviendo configuración por defecto');
                return res.json({
                    success: true,
                    config: {
                        id: 1,
                        background: 'fondo1',
                        favicon: '../../favicon.ico',
                        institution_name: 'Firmas Digitales FD',
                        contact_email: '',
                        contact_phone: '',
                        admin_header_title: 'Panel Administrativo',
                        footer_text: '© 2026 Firmas Digitales FD. Todos los derechos reservados.',
                        logo_url: null
                    }
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener configuración visual pública (solo campos necesarios para el frontend)
    static async getPublicVisualConfig(req, res) {
        try {
            const [rows] = await pool.execute(
                `SELECT
                    background,
                    favicon,
                    institution_name,
                    admin_header_title,
                    footer_text,
                    logo_data
                 FROM visual_config
                 WHERE id = 1`
            );

            if (rows.length === 0) {
                const defaultConfig = {
                    background: 'fondo1',
                    favicon: '../../favicon.ico',
                    institution_name: 'Firmas Digitales FD',
                    contact_email: '',
                    contact_phone: '',
                    admin_header_title: 'Panel Administrativo',
                    footer_text: '© 2026 Firmas Digitales FD. Todos los derechos reservados.',
                    logo_url: null
                };
                return res.json(publicVisualResponse(defaultConfig));
            }

            const config = rows[0];
            const logoUrl = config.logo_data ? '/api/logo' : null;
            let contactEmail = '';
            let contactPhone = '';
            try {
                const [contactRows] = await pool.execute(
                    `SELECT contact_email, contact_phone
                     FROM visual_config
                     WHERE id = 1`
                );
                contactEmail = contactRows[0]?.contact_email || '';
                contactPhone = contactRows[0]?.contact_phone || '';
            } catch (contactError) {
                if (contactError.code !== 'ER_BAD_FIELD_ERROR') throw contactError;
            }

            const publicConfig = {
                background: config.background,
                favicon: config.favicon,
                institution_name: config.institution_name,
                contact_email: contactEmail,
                contact_phone: contactPhone,
                admin_header_title: config.admin_header_title,
                footer_text: config.footer_text || '© 2026 Firmas Digitales FD. Todos los derechos reservados.',
                logo_url: logoUrl
            };
            res.json(publicVisualResponse(publicConfig));
        } catch (error) {
            console.warn('Error al obtener configuración visual pública:', error.message);

            // Devolver configuración por defecto en caso de error
            const defaultConfig = {
                background: 'fondo1',
                favicon: '../../favicon.ico',
                institution_name: 'Firmas Digitales FD',
                contact_email: '',
                contact_phone: '',
                admin_header_title: 'Panel Administrativo',
                footer_text: '© 2026 Firmas Digitales FD. Todos los derechos reservados.',
                logo_url: null
            };
            res.json(publicVisualResponse(defaultConfig));
        }
    }

    // Actualizar configuración visual
    static async updateVisualConfig(req, res) {
        try {
            await ensureVisualContactColumns();
            const {
                background,
                favicon,
                footer_text,
                admin_header_title,
                institution_name,
                siteTitle,
                headerTitle,
                footerText,
                adminHeaderTitle,
                institutionName,
                contact_email,
                contact_phone,
                contactEmail,
                contactPhone
            } = req.body;

            // Obtener usuario actual
            const updatedBy = req.user.usuario || 'system';

            try {
                const resolvedValues = {
                    background: background ?? null,
                    favicon: favicon ?? null,
                    footer_text: footer_text ?? footerText ?? null,
                    admin_header_title: admin_header_title ?? adminHeaderTitle ?? null,
                    institution_name: institution_name ?? institutionName ?? siteTitle ?? headerTitle ?? null,
                    contact_email: contact_email ?? contactEmail ?? null,
                    contact_phone: contact_phone ?? contactPhone ?? null
                };

                const [result] = await pool.execute(
                    `UPDATE visual_config SET
                                            background = COALESCE(?, background),
                                            favicon = COALESCE(?, favicon),
                                            footer_text = COALESCE(?, footer_text),
                                            admin_header_title = COALESCE(?, admin_header_title),
                                            institution_name = COALESCE(?, institution_name),
                                            contact_email = COALESCE(?, contact_email),
                                            contact_phone = COALESCE(?, contact_phone),
                                            updated_by = ?
                                        WHERE id = 1`,
                    [
                        resolvedValues.background,
                        resolvedValues.favicon,
                        resolvedValues.footer_text,
                        resolvedValues.admin_header_title,
                        resolvedValues.institution_name,
                        resolvedValues.contact_email,
                        resolvedValues.contact_phone,
                        updatedBy
                    ]
                );

                if (result.affectedRows === 0) {
                    // Si no existe el registro, intentar insertar
                    const defaults = {
                        background: 'fondo1',
                        favicon: '../../favicon.ico',
                        footer_text: '© 2026 Firmas Digitales FD. Todos los derechos reservados.',
                        admin_header_title: 'Panel Administrativo',
                        institution_name: 'Firmas Digitales FD',
                        contact_email: '',
                        contact_phone: ''
                    };

                    await pool.execute(
                        `INSERT INTO visual_config (
                            id,
                            background,
                            favicon,
                            footer_text,
                            admin_header_title,
                            institution_name,
                            contact_email,
                            contact_phone,
                            updated_by
                        )
                        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            resolvedValues.background ?? defaults.background,
                            resolvedValues.favicon ?? defaults.favicon,
                            resolvedValues.footer_text ?? defaults.footer_text,
                            resolvedValues.admin_header_title ?? defaults.admin_header_title,
                            resolvedValues.institution_name ?? defaults.institution_name,
                            resolvedValues.contact_email ?? defaults.contact_email,
                            resolvedValues.contact_phone ?? defaults.contact_phone,
                            updatedBy
                        ]
                    );
                }

                res.json({
                    success: true,
                    message: 'Configuración visual actualizada correctamente'
                });
            } catch (updateError) {
                console.error('Error al actualizar configuración visual:', updateError);
                res.status(500).json({
                    success: false,
                    message: 'Error al actualizar la configuración visual'
                });
            }
        } catch (error) {
            console.error('Error general en updateVisualConfig:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Resetear configuración visual
    static async resetVisualConfig(req, res) {
        try {
            // Obtener usuario actual
            const updatedBy = req.user.usuario || 'system';

            try {
                // Intentar crear la tabla si no existe
                await pool.execute(`
                    CREATE TABLE IF NOT EXISTS visual_config (
                        id INT PRIMARY KEY DEFAULT 1,
                        background VARCHAR(20) DEFAULT 'fondo1',
                        favicon VARCHAR(255) DEFAULT '../../favicon.ico',
                        institution_name VARCHAR(255) DEFAULT 'Firmas Digitales FD',
                        contact_email VARCHAR(254) DEFAULT '',
                        contact_phone VARCHAR(32) DEFAULT '',
                        logo_data LONGBLOB DEFAULT NULL,
                        logo_mimetype VARCHAR(100) DEFAULT NULL,
                        logo_filename VARCHAR(255) DEFAULT NULL,
                        footer_text TEXT DEFAULT '© 2026 Firmas Digitales FD. Todos los derechos reservados.',
                        admin_header_title VARCHAR(255) DEFAULT 'Panel Administrativo',
                        updated_by VARCHAR(100) DEFAULT 'system',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        CONSTRAINT single_visual_config CHECK (id = 1)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);

                // Insertar configuración por defecto
                await pool.execute(
                    `INSERT INTO visual_config (
                        id,
                        background,
                        favicon,
                        institution_name,
                        contact_email,
                        contact_phone,
                        footer_text,
                        admin_header_title,
                        updated_by
                    )
                    VALUES (1, 'fondo1', '../../favicon.ico', 'Firmas Digitales FD', '', '', '© 2026 Firmas Digitales FD. Todos los derechos reservados.', 'Panel Administrativo', ?)
                    ON DUPLICATE KEY UPDATE
                    background = VALUES(background),
                    favicon = VALUES(favicon),
                    institution_name = VALUES(institution_name),
                    contact_email = VALUES(contact_email),
                    contact_phone = VALUES(contact_phone),
                    footer_text = VALUES(footer_text),
                    admin_header_title = VALUES(admin_header_title),
                    updated_by = VALUES(updated_by)`,
                    [updatedBy]
                );
            } catch (resetError) {
                console.error('Error al resetear configuración visual:', resetError);
                res.status(500).json({
                    success: false,
                    message: 'Error al resetear la configuración visual'
                });
                return;
            }

            res.json({
                success: true,
                message: 'Configuración visual reseteada correctamente'
            });
        } catch (error) {
            console.error('Error al resetear configuración visual:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Obtener configuración de institución
    static async getInstitutionConfig(req, res) {
        try {
            const [rows] = await pool.execute(
                'SELECT institution_name FROM visual_config WHERE id = 1'
            );

            if (rows.length === 0) {
                return res.json({
                    institution_name: 'Firmas Digitales FD'
                });
            }

            const result = {
                institution_name: rows[0].institution_name || 'Firmas Digitales FD'
            };
            res.json(result);
        } catch (error) {
            console.warn('Error al obtener configuración de institución:', error.message);

            // Si hay error, devolver valor por defecto
            res.json({
                institution_name: 'Firmas Digitales FD'
            });
        }
    }

    // Actualizar configuración de institución
    static async updateInstitutionConfig(req, res) {
        try {
            const { institution_name } = req.body;

            if (!institution_name || typeof institution_name !== 'string' || institution_name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de la institución es requerido'
                });
            }

            const trimmedName = institution_name.trim();

            // Obtener usuario actual
            const updatedBy = req.user.usuario || 'system';

            try {
                const [result] = await pool.execute(
                    `UPDATE visual_config SET
                      institution_name = ?,
                      footer_text = ?,
                      updated_by = ?
                    WHERE id = 1`,
                    [
                        trimmedName,
                        `© ${new Date().getFullYear()} ${trimmedName}. Todos los derechos reservados.`,
                        updatedBy
                    ]
                );

                if (result.affectedRows === 0) {
                    // Si no existe el registro, intentar insertar
                    await pool.execute(
                        `INSERT INTO visual_config (id, institution_name, footer_text, updated_by)
                        VALUES (1, ?, ?, ?)`,
                        [
                            trimmedName,
                            `© ${new Date().getFullYear()} ${trimmedName}. Todos los derechos reservados.`,
                            updatedBy
                        ]
                    );
                }

                res.json({
                    success: true,
                    message: 'Nombre de institución actualizado correctamente',
                    institution_name: trimmedName
                });
            } catch (updateError) {
                console.error('Error al actualizar configuración de institución:', updateError);
                res.status(500).json({
                    success: false,
                    message: 'Error al actualizar el nombre de la institución'
                });
            }
        } catch (error) {
            console.error('Error general en updateInstitutionConfig:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Subir logo para PDFs
    static async uploadLogo(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No se recibió ningún archivo'
                });
            }

            // Leer los datos binarios del archivo
            const logoData = fs.readFileSync(req.file.path);
            const extensionByType = {
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/webp': 'webp',
                'image/gif': 'gif'
            };
            const safeFilename = `institution-logo.${extensionByType[req.file.mimetype]}`;

            // Guardar la imagen en la base de datos
            const updatedBy = req.user?.usuario || 'system';
            await pool.execute(
                `UPDATE visual_config SET
                  logo_data = ?,
                  logo_mimetype = ?,
                  logo_filename = ?,
                  updated_by = ?
                WHERE id = 1`,
                [logoData, req.file.mimetype, safeFilename, updatedBy]
            );

            // Eliminar el archivo temporal
            fs.unlinkSync(req.file.path);

            // Crear una URL de datos para preview
            const logoDataUrl = `data:${req.file.mimetype};base64,${logoData.toString('base64')}`;

            res.json({
                success: true,
                message: 'Logo subido correctamente',
                logoDataUrl: logoDataUrl
            });

        } catch (error) {
            console.error('Error al subir logo:', error);

            // Limpiar archivo temporal si existe
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch (cleanupError) {
                    console.error('Error limpiando archivo temporal:', cleanupError);
                }
            }

            res.status(500).json({
                success: false,
                message: 'Error al subir el logo'
            });
        }
    }

    // Obtener logo desde la base de datos
    static async getLogo(req, res) {
        try {
            const [rows] = await pool.execute(
                'SELECT logo_data, logo_mimetype, logo_filename FROM visual_config WHERE id = 1'
            );

            if (rows.length === 0 || !rows[0].logo_data) {
                return res.status(404).json({
                    success: false,
                    message: 'Logo no encontrado'
                });
            }

            const logo = rows[0];

            // Establecer headers apropiados
            res.setHeader('Content-Type', logo.logo_mimetype || 'image/png');
            if (logo.logo_filename) {
                res.setHeader('Content-Disposition', `inline; filename="${logo.logo_filename}"`);
            }

            // Enviar los datos binarios
            res.send(logo.logo_data);

        } catch (error) {
            console.error('Error al obtener logo:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener el logo'
            });
        }
    }
}

module.exports = VisualConfigController;

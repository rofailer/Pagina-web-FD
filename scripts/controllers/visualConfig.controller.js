const pool = require('../db/pool');

class VisualConfigController {
    // Obtener configuración visual actual
    static async getVisualConfig(req, res) {
        try {
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
                        admin_header_title: 'Panel Administrativo',
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
                'SELECT background, favicon, institution_name, admin_header_title, logo_data FROM visual_config WHERE id = 1'
            );

            if (rows.length === 0) {
                return res.json({
                    background: 'fondo1',
                    favicon: '../../favicon.ico',
                    institution_name: 'Firmas Digitales FD',
                    admin_header_title: 'Panel Administrativo',
                    logo_url: null
                });
            }

            const config = rows[0];
            const logoUrl = config.logo_data ? '/api/logo' : null;

            res.json({
                background: config.background,
                favicon: config.favicon,
                institution_name: config.institution_name,
                admin_header_title: config.admin_header_title,
                logo_url: logoUrl
            });
        } catch (error) {
            console.warn('Error al obtener configuración visual pública:', error.message);

            // Devolver configuración por defecto en caso de error
            res.json({
                background: 'fondo1',
                favicon: '../../favicon.ico',
                institution_name: 'Firmas Digitales FD',
                admin_header_title: 'Panel Administrativo',
                logo_url: null
            });
        }
    }

    // Actualizar configuración visual
    static async updateVisualConfig(req, res) {
        try {
            const {
                background,
                favicon,
                site_title,
                header_title,
                footer_text,
                admin_header_title
            } = req.body;

            // Obtener usuario actual
            const updatedBy = req.user.usuario || 'system';

            try {
                const [result] = await pool.execute(
                    `UPDATE visual_config SET
                      background = ?,
                      favicon = ?,
                      site_title = ?,
                      header_title = ?,
                      footer_text = ?,
                      admin_header_title = ?,
                      updated_by = ?
                    WHERE id = 1`,
                    [background, favicon, site_title, header_title, footer_text, admin_header_title, updatedBy]
                );

                if (result.affectedRows === 0) {
                    // Si no existe el registro, intentar insertar
                    await pool.execute(
                        `INSERT INTO visual_config (id, background, favicon, site_title, header_title, footer_text, admin_header_title, updated_by)
                        VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
                        [background, favicon, site_title, header_title, footer_text, admin_header_title, updatedBy]
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
                        background VARCHAR(50) DEFAULT 'fondo1',
                        favicon VARCHAR(255) DEFAULT '../../favicon.ico',
                        site_title VARCHAR(255) DEFAULT 'Firmas Digitales FD',
                        header_title VARCHAR(255) DEFAULT 'Firmas Digitales FD',
                        footer_text TEXT DEFAULT '© 2024 Firmas Digitales FD. Todos los derechos reservados.',
                        admin_header_title VARCHAR(255) DEFAULT 'Panel Administrativo',
                        logo_data LONGBLOB DEFAULT NULL,
                        logo_mimetype VARCHAR(100) DEFAULT NULL,
                        logo_filename VARCHAR(255) DEFAULT NULL,
                        updated_by VARCHAR(100) DEFAULT 'system',
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        institution_name VARCHAR(255) DEFAULT 'Firmas Digitales FD',
                        CONSTRAINT single_visual_config CHECK (id = 1)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                `);

                // Insertar configuración por defecto
                await pool.execute(
                    `INSERT INTO visual_config (id, background, favicon, site_title, header_title, footer_text, admin_header_title, updated_by)
                    VALUES (1, 'fondo1', '../../favicon.ico', 'Firmas Digitales FD', 'Firmas Digitales FD', '© 2024 Firmas Digitales FD. Todos los derechos reservados.', 'Panel Administrativo', ?)
                    ON DUPLICATE KEY UPDATE
                    background = VALUES(background),
                    favicon = VALUES(favicon),
                    site_title = VALUES(site_title),
                    header_title = VALUES(header_title),
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
                      updated_by = ?
                    WHERE id = 1`,
                    [trimmedName, updatedBy]
                );

                if (result.affectedRows === 0) {
                    // Si no existe el registro, intentar insertar
                    await pool.execute(
                        `INSERT INTO visual_config (id, institution_name, updated_by)
                        VALUES (1, ?, ?)`,
                        [trimmedName, updatedBy]
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

            const fs = require('fs');
            const path = require('path');

            // Leer los datos binarios del archivo
            const logoData = fs.readFileSync(req.file.path);

            // Guardar la imagen en la base de datos
            const updatedBy = req.user?.usuario || 'system';
            await pool.execute(
                `UPDATE visual_config SET
                  logo_data = ?,
                  logo_mimetype = ?,
                  logo_filename = ?,
                  updated_by = ?
                WHERE id = 1`,
                [logoData, req.file.mimetype, req.file.originalname, updatedBy]
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

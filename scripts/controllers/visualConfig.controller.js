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
                        site_title: 'Firmas Digitales FD',
                        header_title: 'Firmas Digitales FD',
                        footer_text: '© 2024 Firmas Digitales FD. Todos los derechos reservados.',
                        admin_header_title: 'Panel Administrativo'
                    }
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
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

            // Validar que el fondo sea válido
            const validBackgrounds = ['fondo1', 'fondo2'];
            if (background && !validBackgrounds.includes(background)) {
                return res.status(400).json({
                    success: false,
                    message: 'Fondo no válido. Debe ser fondo1 o fondo2'
                });
            }

            // Obtener usuario actual (si está disponible)
            const updatedBy = req.user ? req.user.email : 'admin';

            try {
                const [result] = await pool.execute(
                    `UPDATE visual_config SET
              background = COALESCE(?, background),
              favicon = COALESCE(?, favicon),
              site_title = COALESCE(?, site_title),
              header_title = COALESCE(?, header_title),
              footer_text = COALESCE(?, footer_text),
              admin_header_title = COALESCE(?, admin_header_title),
              updated_by = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = 1`,
                    [background, favicon, site_title, header_title, footer_text, admin_header_title, updatedBy]
                );

                if (result.affectedRows === 0) {
                    // Si no se actualizó nada, intentar insertar
                    await pool.execute(
                        `INSERT INTO visual_config (id, background, favicon, site_title, header_title, footer_text, admin_header_title, updated_by)
                        VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
                        [background || 'fondo1', favicon || '../../favicon.ico', site_title || 'Firmas Digitales FD',
                        header_title || 'Firmas Digitales FD', footer_text || '© 2024 Firmas Digitales FD. Todos los derechos reservados.',
                        admin_header_title || 'Panel Administrativo', updatedBy]
                    );
                }
            } catch (updateError) {
                // Si la tabla no existe, crearla primero
                if (updateError.code === 'ER_NO_SUCH_TABLE') {
                    console.log('Tabla visual_config no existe, creándola...');

                    // Crear la tabla
                    await pool.execute(`
                        CREATE TABLE visual_config (
                          id INT PRIMARY KEY DEFAULT 1,
                          background VARCHAR(20) NOT NULL DEFAULT 'fondo1',
                          favicon VARCHAR(255) DEFAULT '../../favicon.ico',
                          site_title VARCHAR(255) DEFAULT 'Firmas Digitales FD',
                          header_title VARCHAR(255) DEFAULT 'Firmas Digitales FD',
                          footer_text TEXT DEFAULT '© 2024 Firmas Digitales FD. Todos los derechos reservados.',
                          admin_header_title VARCHAR(255) DEFAULT 'Panel Administrativo',
                          updated_by VARCHAR(100) NULL,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          CONSTRAINT single_visual_config CHECK (id = 1)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    `);

                    // Insertar configuración por defecto
                    await pool.execute(
                        `INSERT INTO visual_config (id, background, favicon, site_title, header_title, footer_text, admin_header_title, updated_by)
                        VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
                        [background || 'fondo1', favicon || '../../favicon.ico', site_title || 'Firmas Digitales FD',
                        header_title || 'Firmas Digitales FD', footer_text || '© 2024 Firmas Digitales FD. Todos los derechos reservados.',
                        admin_header_title || 'Panel Administrativo', updatedBy]
                    );
                } else {
                    throw updateError;
                }
            }

            res.json({
                success: true,
                message: 'Configuración visual actualizada correctamente'
            });
        } catch (error) {
            console.error('Error al actualizar configuración visual:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // Resetear configuración visual a valores por defecto
    static async resetVisualConfig(req, res) {
        try {
            const updatedBy = req.user ? req.user.email : 'admin';

            try {
                const [result] = await pool.execute(
                    `UPDATE visual_config SET
              background = 'fondo1',
              favicon = '../../favicon.ico',
              site_title = 'Firmas Digitales FD',
              header_title = 'Firmas Digitales FD',
              footer_text = '© 2024 Firmas Digitales FD. Todos los derechos reservados.',
              admin_header_title = 'Panel Administrativo',
              updated_by = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = 1`,
                    [updatedBy]
                );

                if (result.affectedRows === 0) {
                    // Si no se actualizó nada, intentar insertar
                    await pool.execute(
                        `INSERT INTO visual_config (id, background, favicon, site_title, header_title, footer_text, admin_header_title, updated_by)
                        VALUES (1, 'fondo1', '../../favicon.ico', 'Firmas Digitales FD', 'Firmas Digitales FD', '© 2024 Firmas Digitales FD. Todos los derechos reservados.', 'Panel Administrativo', ?)`,
                        [updatedBy]
                    );
                }
            } catch (resetError) {
                // Si la tabla no existe, crearla primero
                if (resetError.code === 'ER_NO_SUCH_TABLE') {
                    console.log('Tabla visual_config no existe, creándola para reset...');

                    // Crear la tabla
                    await pool.execute(`
                        CREATE TABLE visual_config (
                          id INT PRIMARY KEY DEFAULT 1,
                          background VARCHAR(20) NOT NULL DEFAULT 'fondo1',
                          favicon VARCHAR(255) DEFAULT '../../favicon.ico',
                          site_title VARCHAR(255) DEFAULT 'Firmas Digitales FD',
                          header_title VARCHAR(255) DEFAULT 'Firmas Digitales FD',
                          footer_text TEXT DEFAULT '© 2024 Firmas Digitales FD. Todos los derechos reservados.',
                          admin_header_title VARCHAR(255) DEFAULT 'Panel Administrativo',
                          updated_by VARCHAR(100) NULL,
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                          CONSTRAINT single_visual_config CHECK (id = 1)
                        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                    `);

                    // Insertar configuración por defecto
                    await pool.execute(
                        `INSERT INTO visual_config (id, background, favicon, site_title, header_title, footer_text, admin_header_title, updated_by)
                        VALUES (1, 'fondo1', '../../favicon.ico', 'Firmas Digitales FD', 'Firmas Digitales FD', '© 2024 Firmas Digitales FD. Todos los derechos reservados.', 'Panel Administrativo', ?)`,
                        [updatedBy]
                    );
                } else {
                    throw resetError;
                }
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
}

module.exports = VisualConfigController;
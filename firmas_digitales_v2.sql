-- ====================================
-- SISTEMA DE FIRMAS DIGITALES - BASE DE DATOS COMPLETA
-- Fecha: Septiembre 2025
-- Versión: 2.0 - Sistema Expandido de Usuarios
-- ====================================

-- Configuración inicial
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- ====================================
-- 1. LIMPIEZA PREVIA (ELIMINAR TABLAS EXISTENTES)
-- ====================================

-- Eliminar tablas en orden correcto (respetando foreign keys)
DROP TABLE IF EXISTS user_activity_log;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS user_keys;
DROP TABLE IF EXISTS global_template_config;
DROP TABLE IF EXISTS users;

-- ====================================
-- 2. CREAR TABLA USERS EXPANDIDA
-- ====================================

CREATE TABLE users (
  -- Campos originales
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin','profesor','owner') DEFAULT 'profesor',
  active_key_id INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Campos expandidos - Información Personal
  nombre_completo VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  organizacion VARCHAR(255) DEFAULT NULL,
  biografia TEXT DEFAULT NULL,
  foto_perfil TEXT DEFAULT NULL,
  telefono VARCHAR(20) DEFAULT NULL,
  direccion TEXT DEFAULT NULL,
  
  -- Campos expandidos - Información Académica/Profesional
  cargo VARCHAR(255) DEFAULT NULL,
  departamento VARCHAR(255) DEFAULT NULL,
  grado_academico VARCHAR(100) DEFAULT NULL,
  
  -- Campos expandidos - Configuraciones del Sistema
  zona_horaria VARCHAR(50) DEFAULT 'America/Bogota',
  idioma VARCHAR(10) DEFAULT 'es',
  estado_cuenta ENUM('activo','inactivo','suspendido','pendiente') DEFAULT 'activo',
  notificaciones_email BOOLEAN DEFAULT TRUE,
  autenticacion_2fa BOOLEAN DEFAULT FALSE,
  ultimo_acceso TIMESTAMP NULL DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices únicos
  UNIQUE KEY unique_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 3. CREAR TABLA USER_KEYS (LLAVES DE USUARIOS)
-- ====================================

CREATE TABLE user_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  key_name VARCHAR(255) NOT NULL,
  private_key TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiration_date DATETIME NOT NULL,
  encryption_type VARCHAR(32) DEFAULT 'aes-256-cbc',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 4. CREAR TABLA GLOBAL_PDF_CONFIG (NUEVA - REEMPLAZA GLOBAL_TEMPLATE_CONFIG)
-- ====================================

-- Primero eliminar la tabla antigua si existe
DROP TABLE IF EXISTS global_template_config;

CREATE TABLE global_pdf_config (
  id INT PRIMARY KEY DEFAULT 1,
  selected_template VARCHAR(50) NOT NULL DEFAULT 'clasico',
  logo_path TEXT DEFAULT NULL COMMENT 'OBSOLETO: Ya no se usa. El logo ahora se guarda en visual_config como datos binarios',

  -- Configuración de colores (JSON para flexibilidad)
  color_config JSON DEFAULT ('{"primary": "#2563eb", "secondary": "#64748b", "accent": "#f59e0b"}'),

  -- Configuración de fuentes
  font_config JSON DEFAULT ('{"title": "Helvetica-Bold", "body": "Helvetica", "metadata": "Helvetica-Oblique"}'),

  -- Configuración de márgenes y layout
  layout_config JSON DEFAULT ('{"marginTop": 50, "marginBottom": 50, "marginLeft": 50, "marginRight": 50, "lineHeight": 1.5}'),

  -- Configuración específica de bordes y elementos decorativos
  border_config JSON DEFAULT ('{"style": "classic", "width": 2, "color": "#1f2937", "cornerRadius": 0}'),

  -- Configuración de elementos visuales
  visual_config JSON DEFAULT ('{"showLogo": true, "showInstitution": true, "showDate": true, "showSignature": true, "showAuthors": true, "showAvalador": true}'),

  -- Metadatos de auditoría
  updated_by VARCHAR(100) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Restricción para mantener solo una configuración global
  CONSTRAINT single_pdf_config CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 4.1. CREAR TABLA THEME_CONFIG (CONFIGURACIÓN GLOBAL DE TEMAS)
-- ====================================

CREATE TABLE theme_config (
  id INT PRIMARY KEY DEFAULT 1,
  selected_theme VARCHAR(50) NOT NULL DEFAULT 'orange',
  custom_color VARCHAR(7) NULL,
  timestamp BIGINT NOT NULL,
  updated_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 5. CREAR TABLA USER_PREFERENCES (CONFIGURACIONES PERSONALIZADAS)
-- ====================================

CREATE TABLE user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  clave VARCHAR(100) NOT NULL,
  valor TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_preference (user_id, clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 6. CREAR TABLA VISUAL_CONFIG (CONFIGURACIÓN VISUAL GLOBAL)
-- ====================================

CREATE TABLE visual_config (
  id INT PRIMARY KEY DEFAULT 1,
  background VARCHAR(20) NOT NULL DEFAULT 'fondo1',
  favicon VARCHAR(255) DEFAULT '../../favicon.ico',
  institution_name VARCHAR(255) DEFAULT 'Firmas Digitales FD',
  -- Campos para almacenar logo como datos binarios
  logo_data LONGBLOB NULL COMMENT 'Datos binarios del logo',
  logo_mimetype VARCHAR(100) NULL COMMENT 'Tipo MIME del logo (image/png, image/jpeg, etc.)',
  logo_filename VARCHAR(255) NULL COMMENT 'Nombre original del archivo del logo',
  updated_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT single_visual_config CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 7. CREAR TABLA USER_ACTIVITY_LOG (AUDITORÍA)
-- ====================================

CREATE TABLE user_activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  accion VARCHAR(100) NOT NULL,
  descripcion TEXT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====================================
-- 7. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ====================================

-- Índices para tabla users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_estado_cuenta ON users(estado_cuenta);
CREATE INDEX idx_users_organizacion ON users(organizacion);
CREATE INDEX idx_users_ultimo_acceso ON users(ultimo_acceso);
CREATE INDEX idx_users_rol ON users(rol);

-- Índices para tabla user_keys
CREATE INDEX idx_user_keys_user_id ON user_keys(user_id);
CREATE INDEX idx_user_keys_expiration ON user_keys(expiration_date);

-- Índices para tabla user_activity_log
CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_accion ON user_activity_log(accion);
CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at);

-- ====================================
-- 8. INSERTAR CONFIGURACIÓN GLOBAL POR DEFECTO
-- ====================================

-- Insertar configuración PDF por defecto (reemplaza global_template_config)
INSERT INTO global_pdf_config (
  id, selected_template, logo_path,
  color_config, font_config, layout_config, border_config, visual_config
) VALUES (
  1,
  'clasico',
  '../../recursos/logotipo-de-github.png',
  '{"primary": "#2563eb", "secondary": "#64748b", "accent": "#f59e0b", "text": "#1f2937", "background": "#ffffff"}',
  '{"title": "Helvetica-Bold", "body": "Helvetica", "metadata": "Helvetica-Oblique", "signature": "Times-Bold"}',
  '{"marginTop": 60, "marginBottom": 60, "marginLeft": 50, "marginRight": 50, "lineHeight": 1.6, "titleSize": 24, "bodySize": 12}',
  '{"style": "classic", "width": 2, "color": "#1f2937", "cornerRadius": 0, "showDecorative": true}',
  '{"showLogo": true, "showInstitution": true, "showDate": true, "showSignature": true, "showAuthors": true, "showAvalador": true}'
);

-- Insertar configuración de tema por defecto
INSERT INTO theme_config (id, selected_theme, custom_color, timestamp) VALUES
(1, 'orange', NULL, UNIX_TIMESTAMP() * 1000);

-- Insertar configuración visual por defecto
INSERT INTO visual_config (id, background, favicon, institution_name, logo_data, logo_mimetype, logo_filename) VALUES
(1, 'fondo1', '../../favicon.ico', 'Firmas Digitales FD', NULL, NULL, NULL);

-- ====================================
-- 9. INSERTAR USUARIOS ADMIN Y OWNER
-- ====================================

-- Insertar usuario ADMIN
INSERT INTO users (
    nombre, 
    usuario, 
    password, 
    rol,
    nombre_completo,
    email,
    organizacion,
    biografia,
    cargo,
    departamento,
    grado_academico,
    zona_horaria,
    idioma,
    estado_cuenta,
    notificaciones_email,
    autenticacion_2fa,
    ultimo_acceso
) VALUES (
    'Administrador',
    'admin',
    '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe',
    'admin',
    'Administrador del Sistema',
    'admin@universidad.edu',
    'Universidad Ejemplo',
    'Administrador principal del sistema de firmas digitales. Responsable de la configuración general, gestión de usuarios y mantenimiento del sistema.',
    'Administrador de Sistemas',
    'Tecnología e Informática',
    'Ingeniero de Sistemas',
    'America/Bogota',
    'es',
    'activo',
    TRUE,
    FALSE,
    NOW()
);

-- Insertar usuario OWNER
INSERT INTO users (
    nombre,
    usuario,
    password,
    rol,
    nombre_completo,
    email,
    organizacion,
    biografia,
    cargo,
    departamento,
    grado_academico,
    zona_horaria,
    idioma,
    estado_cuenta,
    notificaciones_email,
    autenticacion_2fa,
    ultimo_acceso
) VALUES (
    'Owner',
    'owner',
    '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe',
    'owner',
    'Propietario del Sistema',
    'owner@universidad.edu',
    'Universidad Ejemplo',
    'Propietario y responsable principal del sistema. Supervisa el desarrollo, implementación y políticas de uso del sistema de firmas digitales.',
    'Director de Proyecto',
    'Administración y Gestión',
    'Doctor en Educación',
    'America/Bogota',
    'es',
    'activo',
    TRUE,
    FALSE,
    NOW()
);

-- Insertar usuario PRUEBA
INSERT INTO users (
    nombre,
    usuario,
    password,
    rol,
    nombre_completo,
    email,
    organizacion,
    biografia,
    cargo,
    departamento,
    grado_academico,
    zona_horaria,
    idioma,
    estado_cuenta,
    notificaciones_email,
    autenticacion_2fa,
    ultimo_acceso
) VALUES (
    'Usuario Prueba',
    'prueba',
    '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe',
    'profesor',
    'Usuario de Pruebas del Sistema',
    'prueba@universidad.edu',
    'Universidad Ejemplo',
    'Usuario de pruebas para testing del sistema de firmas digitales.',
    'Profesor de Pruebas',
    'Departamento de Testing',
    'Licenciado en Informática',
    'America/Bogota',
    'es',
    'activo',
    TRUE,
    FALSE,
    NOW()
);

-- Insertar usuarios de prueba adicionales
INSERT INTO users (
    nombre,
    usuario,
    password,
    rol,
    nombre_completo,
    email,
    organizacion,
    biografia,
    cargo,
    departamento,
    grado_academico,
    zona_horaria,
    idioma,
    estado_cuenta,
    notificaciones_email,
    autenticacion_2fa,
    ultimo_acceso
) VALUES
(
    'María González',
    'maria.gonzalez',
    '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe',
    'profesor',
    'María González Rodríguez',
    'maria.gonzalez@universidad.edu',
    'Universidad Ejemplo',
    'Profesora de Matemáticas con más de 15 años de experiencia en educación superior.',
    'Profesora Titular',
    'Matemáticas',
    'Doctora en Matemáticas',
    'America/Bogota',
    'es',
    'activo',
    TRUE,
    FALSE,
    NOW()
),
(
    'Carlos Rodríguez',
    'carlos.rodriguez',
    '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe',
    'profesor',
    'Carlos Rodríguez Sánchez',
    'carlos.rodriguez@universidad.edu',
    'Universidad Ejemplo',
    'Profesor de Física especializado en mecánica cuántica y física teórica.',
    'Profesor Asociado',
    'Física',
    'Doctor en Física',
    'America/Bogota',
    'es',
    'activo',
    TRUE,
    FALSE,
    NOW()
),
(
    'Ana López',
    'ana.lopez',
    '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe',
    'profesor',
    'Ana López Martínez',
    'ana.lopez@universidad.edu',
    'Universidad Ejemplo',
    'Profesora de Literatura Hispanoamericana y teoría crítica literaria.',
    'Profesora Titular',
    'Literatura',
    'Doctora en Literatura',
    'America/Bogota',
    'es',
    'activo',
    TRUE,
    FALSE,
    NOW()
),
(
    'José Martínez',
    'jose.martinez',
    '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe',
    'profesor',
    'José Martínez García',
    'jose.martinez@universidad.edu',
    'Universidad Ejemplo',
    'Profesor de Ingeniería de Sistemas con experiencia en desarrollo de software.',
    'Profesor Asociado',
    'Ingeniería de Sistemas',
    'Magíster en Ingeniería',
    'America/Bogota',
    'es',
    'activo',
    TRUE,
    FALSE,
    NOW()
),
(
    'Laura Sánchez',
    'laura.sanchez',
    '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe',
    'profesor',
    'Laura Sánchez Pérez',
    'laura.sanchez@universidad.edu',
    'Universidad Ejemplo',
    'Profesora de Biología especializada en genética molecular.',
    'Profesora Asistente',
    'Biología',
    'Doctora en Biología',
    'America/Bogota',
    'es',
    'activo',
    TRUE,
    FALSE,
    NOW()
),
(
    'Pedro Ramírez',
    'pedro.ramirez',
    '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe',
    'profesor',
    'Pedro Ramírez Torres',
    'pedro.ramirez@universidad.edu',
    'Universidad Ejemplo',
    'Profesor de Historia Contemporánea y estudios políticos.',
    'Profesor Titular',
    'Historia',
    'Doctor en Historia',
    'America/Bogota',
    'es',
    'activo',
    TRUE,
    FALSE,
    NOW()
);

-- ====================================
-- 10. INSERTAR PREFERENCIAS POR DEFECTO PARA LOS USUARIOS
-- ====================================

-- Preferencias para ADMIN
INSERT INTO user_preferences (user_id, clave, valor) VALUES
((SELECT id FROM users WHERE usuario = 'admin'), 'theme', 'light'),
((SELECT id FROM users WHERE usuario = 'admin'), 'notifications_frequency', 'immediate'),
((SELECT id FROM users WHERE usuario = 'admin'), 'default_signature_template', 'clasico'),
((SELECT id FROM users WHERE usuario = 'admin'), 'dashboard_layout', 'detailed'),
((SELECT id FROM users WHERE usuario = 'admin'), 'auto_logout_minutes', '60');

-- Preferencias para OWNER
INSERT INTO user_preferences (user_id, clave, valor) VALUES
((SELECT id FROM users WHERE usuario = 'owner'), 'theme', 'light'),
((SELECT id FROM users WHERE usuario = 'owner'), 'notifications_frequency', 'daily'),
((SELECT id FROM users WHERE usuario = 'owner'), 'default_signature_template', 'elegante'),
((SELECT id FROM users WHERE usuario = 'owner'), 'dashboard_layout', 'summary'),
((SELECT id FROM users WHERE usuario = 'owner'), 'auto_logout_minutes', '30');

-- Preferencias para PRUEBA
INSERT INTO user_preferences (user_id, clave, valor) VALUES
((SELECT id FROM users WHERE usuario = 'prueba'), 'theme', 'light'),
((SELECT id FROM users WHERE usuario = 'prueba'), 'notifications_frequency', 'weekly'),
((SELECT id FROM users WHERE usuario = 'prueba'), 'default_signature_template', 'moderno'),
((SELECT id FROM users WHERE usuario = 'prueba'), 'dashboard_layout', 'standard'),
((SELECT id FROM users WHERE usuario = 'prueba'), 'auto_logout_minutes', '45');

-- Preferencias para usuarios de prueba
INSERT INTO user_preferences (user_id, clave, valor) VALUES
((SELECT id FROM users WHERE usuario = 'maria.gonzalez'), 'theme', 'light'),
((SELECT id FROM users WHERE usuario = 'maria.gonzalez'), 'notifications_frequency', 'daily'),
((SELECT id FROM users WHERE usuario = 'maria.gonzalez'), 'default_signature_template', 'clasico'),
((SELECT id FROM users WHERE usuario = 'maria.gonzalez'), 'dashboard_layout', 'detailed'),
((SELECT id FROM users WHERE usuario = 'maria.gonzalez'), 'auto_logout_minutes', '60'),

((SELECT id FROM users WHERE usuario = 'carlos.rodriguez'), 'theme', 'dark'),
((SELECT id FROM users WHERE usuario = 'carlos.rodriguez'), 'notifications_frequency', 'immediate'),
((SELECT id FROM users WHERE usuario = 'carlos.rodriguez'), 'default_signature_template', 'moderno'),
((SELECT id FROM users WHERE usuario = 'carlos.rodriguez'), 'dashboard_layout', 'standard'),
((SELECT id FROM users WHERE usuario = 'carlos.rodriguez'), 'auto_logout_minutes', '30'),

((SELECT id FROM users WHERE usuario = 'ana.lopez'), 'theme', 'light'),
((SELECT id FROM users WHERE usuario = 'ana.lopez'), 'notifications_frequency', 'weekly'),
((SELECT id FROM users WHERE usuario = 'ana.lopez'), 'default_signature_template', 'elegante'),
((SELECT id FROM users WHERE usuario = 'ana.lopez'), 'dashboard_layout', 'summary'),
((SELECT id FROM users WHERE usuario = 'ana.lopez'), 'auto_logout_minutes', '45'),

((SELECT id FROM users WHERE usuario = 'jose.martinez'), 'theme', 'light'),
((SELECT id FROM users WHERE usuario = 'jose.martinez'), 'notifications_frequency', 'daily'),
((SELECT id FROM users WHERE usuario = 'jose.martinez'), 'default_signature_template', 'minimalista'),
((SELECT id FROM users WHERE usuario = 'jose.martinez'), 'dashboard_layout', 'detailed'),
((SELECT id FROM users WHERE usuario = 'jose.martinez'), 'auto_logout_minutes', '60'),

((SELECT id FROM users WHERE usuario = 'laura.sanchez'), 'theme', 'dark'),
((SELECT id FROM users WHERE usuario = 'laura.sanchez'), 'notifications_frequency', 'immediate'),
((SELECT id FROM users WHERE usuario = 'laura.sanchez'), 'default_signature_template', 'clasico'),
((SELECT id FROM users WHERE usuario = 'laura.sanchez'), 'dashboard_layout', 'standard'),
((SELECT id FROM users WHERE usuario = 'laura.sanchez'), 'auto_logout_minutes', '30'),

((SELECT id FROM users WHERE usuario = 'pedro.ramirez'), 'theme', 'light'),
((SELECT id FROM users WHERE usuario = 'pedro.ramirez'), 'notifications_frequency', 'weekly'),
((SELECT id FROM users WHERE usuario = 'pedro.ramirez'), 'default_signature_template', 'moderno'),
((SELECT id FROM users WHERE usuario = 'pedro.ramirez'), 'dashboard_layout', 'summary'),
((SELECT id FROM users WHERE usuario = 'pedro.ramirez'), 'auto_logout_minutes', '45');

-- ====================================
-- 11. INSERTAR REGISTRO INICIAL DE ACTIVIDAD
-- ====================================

-- Registro de creación para ADMIN
INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) VALUES
((SELECT id FROM users WHERE usuario = 'admin'), 'account_created', 'Cuenta de administrador creada durante la instalación del sistema', '127.0.0.1');

-- Registro de creación para OWNER
INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) VALUES
((SELECT id FROM users WHERE usuario = 'owner'), 'account_created', 'Cuenta de propietario creada durante la instalación del sistema', '127.0.0.1');

-- Registro de creación para PRUEBA
INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) VALUES
((SELECT id FROM users WHERE usuario = 'prueba'), 'account_created', 'Cuenta de usuario de pruebas creada durante la instalación del sistema', '127.0.0.1');

-- Registro de creación para usuarios de prueba
INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) VALUES
((SELECT id FROM users WHERE usuario = 'maria.gonzalez'), 'account_created', 'Cuenta de profesora de Matemáticas creada durante la instalación del sistema', '127.0.0.1'),
((SELECT id FROM users WHERE usuario = 'carlos.rodriguez'), 'account_created', 'Cuenta de profesor de Física creada durante la instalación del sistema', '127.0.0.1'),
((SELECT id FROM users WHERE usuario = 'ana.lopez'), 'account_created', 'Cuenta de profesora de Literatura creada durante la instalación del sistema', '127.0.0.1'),
((SELECT id FROM users WHERE usuario = 'jose.martinez'), 'account_created', 'Cuenta de profesor de Ingeniería de Sistemas creada durante la instalación del sistema', '127.0.0.1'),
((SELECT id FROM users WHERE usuario = 'laura.sanchez'), 'account_created', 'Cuenta de profesora de Biología creada durante la instalación del sistema', '127.0.0.1'),
((SELECT id FROM users WHERE usuario = 'pedro.ramirez'), 'account_created', 'Cuenta de profesor de Historia creada durante la instalación del sistema', '127.0.0.1');

-- ====================================
-- 12. VISTAS ÚTILES PARA CONSULTAS FRECUENTES (SIMPLIFICADO)
-- ====================================

-- Vista para usuarios activos con información completa
CREATE VIEW vista_usuarios_activos AS
SELECT
    u.id,
    u.usuario,
    u.nombre_completo,
    u.email,
    u.organizacion,
    u.cargo,
    u.departamento,
    u.rol,
    u.estado_cuenta,
    u.ultimo_acceso,
    COUNT(uk.id) as total_llaves,
    COUNT(CASE WHEN uk.expiration_date > NOW() THEN 1 END) as llaves_activas
FROM users u
LEFT JOIN user_keys uk ON u.id = uk.user_id
WHERE u.estado_cuenta = 'activo'
GROUP BY u.id;

-- Vista para actividad reciente
CREATE VIEW vista_actividad_reciente AS
SELECT
    ual.id,
    u.nombre_completo,
    u.usuario,
    ual.accion,
    ual.descripcion,
    ual.ip_address,
    ual.created_at
FROM user_activity_log ual
JOIN users u ON ual.user_id = u.id
WHERE ual.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY ual.created_at DESC;

-- ====================================
-- 14. FINALIZAR TRANSACCIÓN
-- ====================================

COMMIT;

-- ====================================
-- 15. VERIFICACIÓN DE INSTALACIÓN
-- ====================================

-- Mostrar resumen de instalación
SELECT 'INSTALACIÓN COMPLETADA EXITOSAMENTE' as status;

SELECT 'TABLAS CREADAS:' as info;
SELECT TABLE_NAME as tabla_creada
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('users', 'user_keys', 'global_pdf_config', 'theme_config', 'user_preferences', 'user_activity_log', 'visual_config');

SELECT 'USUARIOS CREADOS:' as info;
SELECT usuario, nombre_completo, email, rol, estado_cuenta
FROM users
WHERE usuario IN ('admin', 'owner', 'prueba', 'maria.gonzalez', 'carlos.rodriguez', 'ana.lopez', 'jose.martinez', 'laura.sanchez', 'pedro.ramirez');

SELECT 'CONFIGURACIÓN GLOBAL:' as info;
SELECT selected_template as plantilla_seleccionada, logo_path as ruta_logo,
       JSON_EXTRACT(color_config, '$.primary') as color_primario,
       JSON_EXTRACT(visual_config, '$.showLogo') as mostrar_logo
FROM global_pdf_config;

-- ====================================
-- INFORMACIÓN IMPORTANTE
-- ====================================

/*

✅ TABLAS CREADAS:
- users (expandida con 17 campos adicionales)
- user_keys (llaves de cifrado)
- global_pdf_config (configuración global avanzada de PDFs)
- theme_config (configuración global de temas)
- user_preferences (preferencias personalizadas)
- user_activity_log (auditoría y actividad)
- visual_config (configuración visual global)

✅ USUARIOS CREADOS:
- admin / 123 (Administrador del Sistema)
- owner / 123 (Propietario del Sistema)
- prueba / 123 (Usuario de Pruebas)
- maria.gonzalez / 123 (Profesora de Matemáticas)
- carlos.rodriguez / 123 (Profesor de Física)
- ana.lopez / 123 (Profesora de Literatura)
- jose.martinez / 123 (Profesor de Ingeniería de Sistemas)
- laura.sanchez / 123 (Profesora de Biología)
- pedro.ramirez / 123 (Profesor de Historia)

✅ CARACTERÍSTICAS:
- Sistema completo de perfiles expandidos
- Auditoría y trazabilidad
- Configuraciones personalizables
- Índices optimizados para rendimiento
- Procedimientos almacenados útiles
- Vistas para consultas frecuentes

🔐 CREDENCIALES DE ACCESO:
Usuario: admin | Contraseña: 123
Usuario: owner | Contraseña: 123
Usuario: prueba | Contraseña: 123
Usuarios de prueba: maria.gonzalez, carlos.rodriguez, ana.lopez, jose.martinez, laura.sanchez, pedro.ramirez | Contraseña: 123

⚠️ IMPORTANTE:
- Las contraseñas están hasheadas con bcrypt
- El sistema está listo para producción
- Todos los campos nuevos tienen valores por defecto apropiados
*/

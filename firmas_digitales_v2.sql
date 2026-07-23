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
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS document_attachments;
DROP TABLE IF EXISTS user_activity_log;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS user_keys;
DROP TABLE IF EXISTS global_template_config;
DROP TABLE IF EXISTS global_pdf_config;
DROP TABLE IF EXISTS theme_config;
DROP TABLE IF EXISTS visual_config;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ====================================
-- 2. CREAR TABLA USERS EXPANDIDA
-- ====================================

CREATE TABLE users (
  -- Identidad y acceso
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin','profesor','owner') DEFAULT 'profesor',
  active_key_id INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Información personal
  email VARCHAR(255) DEFAULT NULL,
  organizacion VARCHAR(255) DEFAULT NULL,
  biografia TEXT DEFAULT NULL,
  foto_perfil MEDIUMBLOB DEFAULT NULL COMMENT 'Contenido binario persistente de la foto de perfil',
  foto_perfil_mimetype VARCHAR(50) DEFAULT NULL,
  foto_perfil_actualizada_at TIMESTAMP(3) NULL DEFAULT NULL,
  telefono VARCHAR(20) DEFAULT NULL,
  direccion TEXT DEFAULT NULL,
  
  -- Información académica/profesional
  cargo VARCHAR(255) DEFAULT NULL,
  departamento VARCHAR(255) DEFAULT NULL,
  grado_academico VARCHAR(100) DEFAULT NULL,
  
  -- Estado de la cuenta
  estado_cuenta ENUM('activo','inactivo','suspendido','pendiente') DEFAULT 'activo',
  estado_presencia ENUM('en_linea','ausente','ocupado','desconectado') NOT NULL DEFAULT 'desconectado',
  ultima_actividad TIMESTAMP NULL DEFAULT NULL,
  force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
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
  encryption_type VARCHAR(32) NOT NULL DEFAULT 'aes-256-gcm-v2',
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

  -- Configuración del texto del aval con variables dinámicas
  aval_text_config JSON DEFAULT ('{"template": "Concepto de aval: $modalidad desarrollado por $autores con título $titulo. Concepto: APROBADO. Solicito designación de jurados.", "variables": ["$autores", "$titulo", "$modalidad", "$avalador", "$fecha", "$institucion", "$ubicacion"]}') COMMENT 'Configuración del texto del aval con variables dinámicas',

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
  contact_email VARCHAR(254) DEFAULT '',
  contact_phone VARCHAR(32) DEFAULT '',
  -- Campos para almacenar logo como datos binarios
  logo_data LONGBLOB NULL COMMENT 'Datos binarios del logo',
  logo_mimetype VARCHAR(100) NULL COMMENT 'Tipo MIME del logo (image/png, image/jpeg, etc.)',
  logo_filename VARCHAR(255) NULL COMMENT 'Nombre original del archivo del logo',
  footer_text TEXT DEFAULT '© 2026 Firmas Digitales FD. Todos los derechos reservados.',
  admin_header_title VARCHAR(255) DEFAULT 'Panel Administrativo',
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
-- 8. CREAR TABLA DOCUMENT_ATTACHMENTS (MANIFIESTOS DE ANEXOS)
-- ====================================

CREATE TABLE document_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  document_filename VARCHAR(255) NOT NULL COMMENT 'Nombre del PDF avalado asociado',
  
  -- Manifest JSON con hashes SHA256 de cada anexo
  manifest_json MEDIUMTEXT NOT NULL COMMENT 'JSON con hashes SHA256 de archivos anexos',
  
  -- Firma digital del manifest
  manifest_signature TEXT NOT NULL COMMENT 'Firma digital del manifest JSON',
  
  -- Metadata
  file_count INT NOT NULL DEFAULT 0 COMMENT 'Cantidad de archivos en el manifest',
  total_size BIGINT NOT NULL DEFAULT 0 COMMENT 'Tamaño total de anexos en bytes',
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_document (user_id, document_filename),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Almacena manifiestos de archivos anexos (NO archivos) para verificación de integridad';

-- ====================================
-- 9. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ====================================

-- Índices para tabla users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_estado_cuenta ON users(estado_cuenta);
CREATE INDEX idx_users_organizacion ON users(organizacion);
CREATE INDEX idx_users_ultimo_acceso ON users(ultimo_acceso);
CREATE INDEX idx_users_ultima_actividad ON users(ultima_actividad);
CREATE INDEX idx_users_rol ON users(rol);

-- Índices para tabla user_keys
CREATE INDEX idx_user_keys_user_id ON user_keys(user_id);
CREATE INDEX idx_user_keys_expiration ON user_keys(expiration_date);

-- Índices para tabla user_activity_log
CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_accion ON user_activity_log(accion);
CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at);

-- ====================================
-- 10. INSERTAR CONFIGURACIÓN GLOBAL POR DEFECTO
-- ====================================

-- Insertar configuración PDF por defecto (reemplaza global_template_config)
INSERT INTO global_pdf_config (
  id, selected_template, logo_path,
  color_config, font_config, layout_config, border_config, visual_config, aval_text_config
) VALUES (
  1,
  'clasico',
  '../../recursos/logotipo-de-github.png',
  '{"primary": "#2563eb", "secondary": "#64748b", "accent": "#f59e0b", "text": "#1f2937", "background": "#ffffff"}',
  '{"title": "Helvetica-Bold", "body": "Helvetica", "metadata": "Helvetica-Oblique", "signature": "Times-Bold"}',
  '{"marginTop": 60, "marginBottom": 60, "marginLeft": 50, "marginRight": 50, "lineHeight": 1.6, "titleSize": 24, "bodySize": 12}',
  '{"style": "classic", "width": 2, "color": "#1f2937", "cornerRadius": 0, "showDecorative": true}',
  '{"showLogo": true, "showInstitution": true, "showDate": true, "showSignature": true, "showAuthors": true, "showAvalador": true}',
  '{"template": "Concepto de aval: $modalidad desarrollado por $autores con título $titulo. Concepto: APROBADO. Solicito designación de jurados.", "variables": ["$autores", "$titulo", "$modalidad", "$avalador", "$fecha", "$institucion", "$ubicacion"]}'
);

-- Insertar configuración de tema por defecto
INSERT INTO theme_config (id, selected_theme, custom_color, timestamp) VALUES
(1, 'orange', NULL, UNIX_TIMESTAMP() * 1000);

-- Insertar configuración visual por defecto
INSERT INTO visual_config (
  id,
  background,
  favicon,
  institution_name,
  contact_email,
  contact_phone,
  logo_data,
  logo_mimetype,
  logo_filename,
  footer_text
) VALUES
(1, 'fondo1', '../../favicon.ico', 'Firmas Digitales FD', '', '', NULL, NULL, NULL, '© 2026 Firmas Digitales FD. Todos los derechos reservados.');

-- ====================================
-- 11. INSERTAR USUARIOS ADMIN Y OWNER
-- ====================================

-- Insertar usuario ADMIN
INSERT INTO users (
    nombre, 
    usuario, 
    password, 
    rol,
    email,
    organizacion,
    biografia,
    cargo,
    departamento,
    grado_academico,
    estado_cuenta,
    force_password_change,
    ultimo_acceso
) VALUES (
    'Administrador del Sistema',
    'admin',
    '!DISABLED-SEED-ACCOUNT!',
    'admin',
    'admin@universidad.edu',
    'Universidad Ejemplo',
    'Administrador principal del sistema de firmas digitales. Responsable de la configuración general, gestión de usuarios y mantenimiento del sistema.',
    'Administrador de Sistemas',
    'Tecnología e Informática',
    'Ingeniero de Sistemas',
    'activo',
    TRUE,
    NOW()
);

-- Insertar usuario OWNER
INSERT INTO users (
    nombre,
    usuario,
    password,
    rol,
    email,
    organizacion,
    biografia,
    cargo,
    departamento,
    grado_academico,
    estado_cuenta,
    force_password_change,
    ultimo_acceso
) VALUES (
    'Propietario del Sistema',
    'owner',
    '!DISABLED-SEED-ACCOUNT!',
    'owner',
    'owner@universidad.edu',
    'Universidad Ejemplo',
    'Propietario y responsable principal del sistema. Supervisa el desarrollo, implementación y políticas de uso del sistema de firmas digitales.',
    'Director de Proyecto',
    'Administración y Gestión',
    'Doctor en Educación',
    'activo',
    TRUE,
    NOW()
);

-- Insertar usuario PRUEBA
INSERT INTO users (
    nombre,
    usuario,
    password,
    rol,
    email,
    organizacion,
    biografia,
    cargo,
    departamento,
    grado_academico,
    estado_cuenta,
    ultimo_acceso
) VALUES (
    'Usuario de Pruebas del Sistema',
    'prueba',
    '!DISABLED-SEED-ACCOUNT!',
    'profesor',
    'prueba@universidad.edu',
    'Universidad Ejemplo',
    'Usuario de pruebas para testing del sistema de firmas digitales.',
    'Profesor de Pruebas',
    'Departamento de Testing',
    'Licenciado en Informática',
    'activo',
    NOW()
);

-- Insertar usuarios de prueba adicionales
INSERT INTO users (
    nombre,
    usuario,
    password,
    rol,
    email,
    organizacion,
    biografia,
    cargo,
    departamento,
    grado_academico,
    estado_cuenta,
    ultimo_acceso
) VALUES
(
    'María González Rodríguez',
    'maria.gonzalez',
    '!DISABLED-SEED-ACCOUNT!',
    'profesor',
    'maria.gonzalez@universidad.edu',
    'Universidad Ejemplo',
    'Profesora de Matemáticas con más de 15 años de experiencia en educación superior.',
    'Profesora Titular',
    'Matemáticas',
    'Doctora en Matemáticas',
    'activo',
    NOW()
),
(
    'Carlos Rodríguez Sánchez',
    'carlos.rodriguez',
    '!DISABLED-SEED-ACCOUNT!',
    'profesor',
    'carlos.rodriguez@universidad.edu',
    'Universidad Ejemplo',
    'Profesor de Física especializado en mecánica cuántica y física teórica.',
    'Profesor Asociado',
    'Física',
    'Doctor en Física',
    'activo',
    NOW()
),
(
    'Ana López Martínez',
    'ana.lopez',
    '!DISABLED-SEED-ACCOUNT!',
    'profesor',
    'ana.lopez@universidad.edu',
    'Universidad Ejemplo',
    'Profesora de Literatura Hispanoamericana y teoría crítica literaria.',
    'Profesora Titular',
    'Literatura',
    'Doctora en Literatura',
    'activo',
    NOW()
),
(
    'Dr. Ricardo Antonio Vega Mendoza',
    'ricardo.vega',
    '!DISABLED-SEED-ACCOUNT!',
    'profesor',
    'ricardo.vega@universidad.edu',
    'Universidad Nacional Tecnológica',
    'Doctor en Ingeniería de Sistemas con especialización en desarrollo de software y gestión documental.',
    'Profesor Titular',
    'Ingeniería de Sistemas',
    'Doctor en Ingeniería',
    'activo',
    NOW()
),
(
    'Laura Sánchez Pérez',
    'laura.sanchez',
    '!DISABLED-SEED-ACCOUNT!',
    'profesor',
    'laura.sanchez@universidad.edu',
    'Universidad Ejemplo',
    'Profesora de Biología especializada en genética molecular.',
    'Profesora Asistente',
    'Biología',
    'Doctora en Biología',
    'activo',
    NOW()
),
(
    'Pedro Ramírez Torres',
    'pedro.ramirez',
    '!DISABLED-SEED-ACCOUNT!',
    'profesor',
    'pedro.ramirez@universidad.edu',
    'Universidad Ejemplo',
    'Profesor de Historia Contemporánea y estudios políticos.',
    'Profesor Titular',
    'Historia',
    'Doctor en Historia',
    'activo',
    NOW()
);

-- ====================================
-- 12. INSERTAR PREFERENCIAS POR DEFECTO PARA LOS USUARIOS
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

((SELECT id FROM users WHERE usuario = 'ricardo.vega'), 'theme', 'light'),
((SELECT id FROM users WHERE usuario = 'ricardo.vega'), 'notifications_frequency', 'daily'),
((SELECT id FROM users WHERE usuario = 'ricardo.vega'), 'default_signature_template', 'minimalista'),
((SELECT id FROM users WHERE usuario = 'ricardo.vega'), 'dashboard_layout', 'detailed'),
((SELECT id FROM users WHERE usuario = 'ricardo.vega'), 'auto_logout_minutes', '60'),

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
-- 13. INSERTAR REGISTRO INICIAL DE ACTIVIDAD
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
((SELECT id FROM users WHERE usuario = 'ricardo.vega'), 'account_created', 'Cuenta de profesor de Ingeniería de Sistemas creada durante la instalación del sistema', '127.0.0.1'),
((SELECT id FROM users WHERE usuario = 'laura.sanchez'), 'account_created', 'Cuenta de profesora de Biología creada durante la instalación del sistema', '127.0.0.1'),
((SELECT id FROM users WHERE usuario = 'pedro.ramirez'), 'account_created', 'Cuenta de profesor de Historia creada durante la instalación del sistema', '127.0.0.1');

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
SELECT usuario, nombre, email, rol, estado_cuenta
FROM users
WHERE usuario IN ('admin', 'owner', 'prueba', 'maria.gonzalez', 'carlos.rodriguez', 'ana.lopez', 'ricardo.vega', 'laura.sanchez', 'pedro.ramirez');

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
- admin y owner se inicializan automáticamente al arrancar la aplicación.
- Las cuentas de demostración quedan bloqueadas hasta que un owner les asigne una contraseña.

✅ CARACTERÍSTICAS:
- Sistema completo de perfiles expandidos
- Auditoría y trazabilidad
- Configuraciones personalizables
- Índices optimizados para rendimiento
- Procedimientos almacenados útiles
- Vistas para consultas frecuentes

🔐 CREDENCIALES DE ACCESO:
Configura INITIAL_ADMIN_PASSWORD e INITIAL_OWNER_PASSWORD antes del primer arranque.
Si se omiten, la aplicación genera contraseñas aleatorias y las muestra una sola vez
en la consola. Ambas cuentas deben cambiarlas al iniciar sesión por primera vez.

⚠️ IMPORTANTE:
- El SQL por sí solo no habilita ninguna contraseña conocida.
- Importa este archivo en una base vacía y después inicia o reinicia la aplicación.
- Todos los campos nuevos tienen valores por defecto apropiados
*/

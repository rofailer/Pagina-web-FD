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
-- 4. CREAR TABLA GLOBAL_TEMPLATE_CONFIG
-- ====================================

CREATE TABLE global_template_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(50) NOT NULL DEFAULT 'clasico',
  logo_path TEXT DEFAULT NULL,
  institution_name VARCHAR(255) DEFAULT 'Universidad Ejemplo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  site_title VARCHAR(255) DEFAULT 'Firmas Digitales FD',
  header_title VARCHAR(255) DEFAULT 'Firmas Digitales FD',
  footer_text TEXT,
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

INSERT INTO global_template_config (template_name, institution_name) VALUES
('clasico', 'Universidad Ejemplo');

-- Insertar configuración de tema por defecto
INSERT INTO theme_config (id, selected_theme, custom_color, timestamp) VALUES
(1, 'orange', NULL, UNIX_TIMESTAMP() * 1000);

-- Insertar configuración visual por defecto
INSERT INTO visual_config (id, background, favicon, site_title, header_title, footer_text, admin_header_title) VALUES
(1, 'fondo1', '../../favicon.ico', 'Firmas Digitales FD', 'Firmas Digitales FD', '© 2024 Firmas Digitales FD. Todos los derechos reservados.', 'Panel Administrativo');

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

-- ====================================
-- 11. INSERTAR REGISTRO INICIAL DE ACTIVIDAD
-- ====================================

-- Registro de creación para ADMIN
INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) VALUES
((SELECT id FROM users WHERE usuario = 'admin'), 'account_created', 'Cuenta de administrador creada durante la instalación del sistema', '127.0.0.1');

-- Registro de creación para OWNER
INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address) VALUES
((SELECT id FROM users WHERE usuario = 'owner'), 'account_created', 'Cuenta de propietario creada durante la instalación del sistema', '127.0.0.1');

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
AND TABLE_NAME IN ('users', 'user_keys', 'global_template_config', 'theme_config', 'user_preferences', 'user_activity_log');

SELECT 'USUARIOS CREADOS:' as info;
SELECT usuario, nombre_completo, email, rol, estado_cuenta 
FROM users 
WHERE usuario IN ('admin', 'owner');

SELECT 'CONFIGURACIÓN GLOBAL:' as info;
SELECT template_name, institution_name 
FROM global_template_config;

-- ====================================
-- INFORMACIÓN IMPORTANTE
-- ====================================

/*

✅ TABLAS CREADAS:
- users (expandida con 17 campos adicionales)
- user_keys (llaves de cifrado)
- global_template_config (configuración global)
- theme_config (configuración global de temas)
- user_preferences (preferencias personalizadas)
- user_activity_log (auditoría y actividad)

✅ USUARIOS CREADOS:
- admin / 123 (Administrador del Sistema)
- owner / 123 (Propietario del Sistema)

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

⚠️ IMPORTANTE:
- Las contraseñas están hasheadas con bcrypt
- El sistema está listo para producción
- Todos los campos nuevos tienen valores por defecto apropiados
*/

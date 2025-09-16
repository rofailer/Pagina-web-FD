# 🛠️ SISTEMA DE CONFIGURACIÓN AUTOMÁTICA DE BASE DE DATOS

## 📋 Descripción General

El **Sistema de Configuración Automática de Base de Datos** es una herramienta ultra-avanzada que permite gestionar completamente la base de datos MySQL del proyecto "Firmas Digitales FD". Este sistema automatiza la instalación, configuración, backup y mantenimiento de la base de datos de forma inteligente y segura.

## 🎯 Características Principales

### ✅ **Instalación Automática**

- Creación automática de base de datos si no existe
- Ejecución ordenada de statements SQL
- Verificación de integridad de datos
- Configuración de índices y vistas

### ✅ **Sistema de Backup Inteligente**

- Backup automático antes de operaciones destructivas
- Archivos organizados con timestamp
- Recuperación de datos en caso de errores
- Backup diferencial (solo cambios nuevos)

### ✅ **Manejo de Errores Robusto**

- Recuperación automática de errores menores
- Continuación de instalación ante fallos no críticos
- Mensajes de error detallados y coloreados
- Rollback automático en caso de fallos críticos

### ✅ **Parser SQL Avanzado**

- Manejo de delimitadores complejos (`DELIMITER $$`)
- Procesamiento de comentarios multilinea (`/* */`)
- Manejo de strings con comillas simples y dobles
- Detección automática de tipos de statements

## 🚀 Comandos Disponibles

### Instalación y Configuración

```bash
# Instalación completa del sistema (recomendado para primera vez)
npm run db:install

# Configuración estándar (solo actualizaciones)
npm run db:setup

# Verificar estado actual de la base de datos
npm run db:status
```

### Mantenimiento y Backup

```bash
# Crear backup manual de la base de datos
npm run db:backup

# Reset completo con backup automático
npm run db:reset
```

## 📁 Estructura de Archivos

```
scripts/
├── setup-db.js                 # Script principal del sistema
├── db/
│   └── pool.js                 # Configuración de conexión MySQL
└── controllers/
    └── visualConfig.controller.js # Controlador de configuración visual

firmas_digitales_v2.sql         # Archivo SQL maestro
backups/                        # Directorio de backups automáticos
.env                            # Variables de entorno (credenciales)
```

## ⚙️ Configuración

### Variables de Entorno (.env)

```env
# Base de datos MySQL local
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_PORT=3306
DB_NAME=firmas_digitales_v2

# JWT Secret para autenticación
JWT_SECRET=tu_jwt_secret_key

# Clave para cifrado de llaves privadas
KEY_ENCRYPTION_SECRET=12345678901234567890123456789012

# Entorno
NODE_ENV=development
```

### Requisitos del Sistema

- **Node.js** 14+
- **MySQL** 5.7+ o **MariaDB** 10.0+
- **npm** o **yarn**
- **Git** (para control de versiones)

## 📊 Estados de la Base de Datos

### Estado 1: Base de Datos No Existe

```bash
npm run db:status
# ❌ Base de datos 'firmas_digitales_v2' no existe
# 💡 Ejecuta: npm run db:setup
```

**Solución automática:**

```bash
npm run db:install
# ✅ Base de datos creada exitosamente
# ✅ Tablas creadas
# ✅ Datos insertados
```

### Estado 2: Base de Datos Vacía

```bash
npm run db:status
# 📊 Tablas: 0
```

**Solución automática:**

```bash
npm run db:setup
# ✅ Datos insertados correctamente
```

### Estado 3: Base de Datos con Datos

```bash
npm run db:status
# 📊 Tablas: 9
# ✅ users: 2 registros
# ✅ visual_config: 1 registros
```

**Actualización automática:**

```bash
npm run db:setup
# ✅ Solo agrega cambios nuevos
# ⚠️ Datos existentes preservados
```

## 🔧 Funcionamiento Interno

### 1. Conexión Inteligente

```javascript
// Conecta primero sin base de datos
const tempConfig = { ...config };
delete tempConfig.database;
const connection = await mysql.createConnection(tempConfig);

// Crea BD si no existe
await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);

// Reconecta con la base de datos específica
const fullConnection = await mysql.createConnection(config);
```

### 2. Parser SQL Avanzado

```javascript
// Maneja diferentes tipos de statements
const statements = parseSQLStatements(sqlContent);

// Categoriza por tipo
const categories = categorizeStatements(statements);
// {
//   createTable: [...],
//   createIndex: [...],
//   insert: [...],
//   createView: [...]
// }
```

### 3. Ejecución Ordenada

```javascript
// Orden de ejecución optimizado
await executeStatements(categories.createTable, "tablas");
await executeStatements(categories.createIndex, "índices");
await executeStatements(categories.insert, "datos");
await executeStatements(categories.createView, "vistas");
```

### 4. Sistema de Backup

```javascript
// Backup automático antes de reset
const backupFile = await createBackup();
// backup_firmas_digitales_v2_2025-09-13T23-15-57.sql

// Estructura del backup
-- Backup de la base de datos firmas_digitales_v2
-- Fecha: 2025-09-13T23:15:57.000Z
-- Tablas: 8

-- Estructura de la tabla users
-- CREATE TABLE users (...)

-- Datos de la tabla users
-- INSERT INTO users VALUES (...)
```

## 📋 Tablas Gestionadas

### Tablas Principales

- **`users`** - Usuarios del sistema (admin, profesores, owner)
- **`user_keys`** - Llaves de cifrado de usuarios
- **`global_template_config`** - Configuración global de plantillas PDF
- **`theme_config`** - Configuración global de temas
- **`visual_config`** - Configuración visual global
- **`user_preferences`** - Preferencias personalizadas de usuarios
- **`user_activity_log`** - Registro de actividad de usuarios

### Tablas de Sistema

- **`vista_usuarios_activos`** - Vista de usuarios activos
- **`vista_actividad_reciente`** - Vista de actividad reciente

## 🔒 Seguridad y Backup

### Backup Automático

- **Antes de reset**: Backup completo automático
- **Archivos organizados**: `backups/backup_db_timestamp.sql`
- **Recuperación**: `mysql -u root -p db_name < backup.sql`

### Verificación de Integridad

```bash
npm run db:status
# 📋 Total de tablas: 9
# ✅ users: 2 registros
# ✅ visual_config: 1 registros
```

### Recuperación de Errores

- **Errores menores**: Continúa ejecución
- **Errores críticos**: Rollback automático
- **Backup de seguridad**: Siempre disponible

## 🎨 Integración con Sistema Visual

### API de Configuración Visual

```javascript
// Controlador inteligente
class VisualConfigController {
  static async getVisualConfig(req, res) {
    try {
      // Intenta leer de BD
      const [rows] = await pool.execute("SELECT * FROM visual_config");
      return res.json({ success: true, config: rows[0] });
    } catch (error) {
      if (error.code === "ER_NO_SUCH_TABLE") {
        // Crea tabla automáticamente si no existe
        await createVisualConfigTable();
        // Devuelve configuración por defecto
        return res.json({
          success: true,
          config: getDefaultConfig(),
        });
      }
    }
  }
}
```

### Frontend Automático

```javascript
// Carga configuración con fallback
async function loadVisualConfig() {
  try {
    const response = await fetch("/api/visual-config/public");
    const data = await response.json();

    if (data.success) {
      applyConfig(data.config);
    }
  } catch (error) {
    // Fallback a localStorage
    loadFromLocalStorage();
  }
}
```

## 🚀 Casos de Uso

### 1. Primera Instalación

```bash
# En un servidor nuevo
git clone <repo>
npm install
npm run db:install
npm start
```

### 2. Actualización de Producción

```bash
# Backup automático
npm run db:backup

# Actualizar código
git pull

# Aplicar cambios
npm run db:setup

# Verificar
npm run db:status
```

### 3. Recuperación de Desastres

```bash
# Reset completo con backup
npm run db:reset

# Reinstalar desde cero
npm run db:install
```

### 4. Desarrollo Local

```bash
# Verificar estado
npm run db:status

# Reset para desarrollo
npm run db:reset

# Instalar datos de prueba
npm run db:install
```

## 📈 Monitoreo y Logs

### Logs Coloreados

```
🔌 Conectando a MySQL...
✅ Conexión a MySQL exitosa
📦 Creando base de datos 'firmas_digitales_v2'...
✅ Base de datos creada exitosamente
📖 Leyendo archivo SQL...
📄 Archivo SQL cargado (15219 caracteres)
🔍 Encontrados 45 statements SQL
📋 Ejecutando 45 statements en orden...
  ✅ 5/45 statements ejecutados
  ✅ 10/45 statements ejecutados
  ⚠️ Statement 15 ya existe, continuando...
  ✅ 45/45 statements ejecutados
🎉 Configuración completada!
```

### Verificación Final

```bash
npm run db:status
# 📋 Base de datos: firmas_digitales_v2
# 📊 Tablas: 9
# 📄 Archivo SQL: 14.93 KB
# 💾 Backups: 4 archivos
```

## 🔧 Solución de Problemas

### Error: "Access denied for user"

```bash
# Verificar credenciales en .env
DB_USER=root
DB_PASSWORD=tu_password_correcta
```

### Error: "Table doesn't exist"

```bash
# El sistema crea tablas automáticamente
npm run db:install
```

### Error: "Duplicate entry"

```bash
# El sistema maneja duplicados inteligentemente
npm run db:setup  # Solo actualiza cambios
```

### Error: "Connection timeout"

```bash
# Verificar configuración de MySQL
DB_HOST=localhost
DB_PORT=3306
```

## 🎯 Próximos Pasos

### Integración con Panel Admin

```javascript
// En panelAdmin.js
const DatabaseSetupManager = require("../scripts/setup-db");

async function installDatabase() {
  const setupManager = new DatabaseSetupManager();
  const success = await setupManager.setupDatabase();

  if (success) {
    showNotification("Base de datos instalada correctamente", "success");
    // Recargar métricas
    loadSystemMetrics();
  } else {
    showNotification("Error instalando base de datos", "error");
  }
}
```

### Funcionalidades Avanzadas Futuras

- ✅ **Migraciones incrementales**
- ✅ **Backup programado automático**
- ✅ **Monitoreo de rendimiento**
- ✅ **Optimización automática de índices**
- ✅ **Sincronización multi-servidor**

## 📞 Soporte

Para soporte técnico:

1. Verificar logs del sistema
2. Ejecutar `npm run db:status`
3. Revisar archivo `.env`
4. Consultar documentación de MySQL

---

**Estado del Sistema**: ✅ **COMPLETAMENTE FUNCIONAL**
**Última Actualización**: Septiembre 2025
**Versión**: 2.0 - Sistema Automatizado</content>
<parameter name="filePath">c:\Users\Robert\Desktop\La carpeta\Universidad\Trabajo de grado\Latex Firmas Digitales\Pagina web FD\DATABASE_SETUP_GUIDE.md

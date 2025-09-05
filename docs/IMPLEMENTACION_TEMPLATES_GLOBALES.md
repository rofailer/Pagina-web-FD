# Sistema de Plantillas PDF Unificado - Guía de Implementación

## ¿Qué hemos implementado?

### 🎯 **Objetivo Principal**

Hemos creado un sistema unificado donde:

1. **El owner** puede cambiar la plantilla PDF globalmente
2. **Todos los usuarios** descargan PDFs con la misma plantilla que configuró el owner
3. **La plantilla de preview** coincide exactamente con **la plantilla del PDF descargado**

### ⚙️ **Cambios Implementados**

#### 1. **Base de Datos**

- ✅ Nueva tabla `global_template_config` para guardar configuración global
- ✅ Scripts de actualización de BD creados

#### 2. **Backend (Server.js)**

- ✅ API unificada para configuración global (`/api/save-global-template-config`)
- ✅ Sistema de mapeo entre nombres del frontend y backend
- ✅ Configuración global cargada al inicio del servidor
- ✅ PDFs generados usan la configuración global automáticamente

#### 3. **Frontend (professionalPDF.js)**

- ✅ Sistema conectado a la nueva API global
- ✅ Carga automática de configuración al iniciar
- ✅ Guardado automático cuando el owner cambia plantillas
- ✅ Campo de institución sincronizado con el backend

### 🔧 **Pasos para completar la implementación**

#### Paso 1: Actualizar la Base de Datos

Ejecuta este SQL en tu base de datos MySQL:

```sql
-- Crear tabla para configuración global
CREATE TABLE IF NOT EXISTS global_template_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(50) NOT NULL DEFAULT 'clasico',
  logo_path TEXT DEFAULT NULL,
  institution_name VARCHAR(255) DEFAULT 'Universidad Ejemplo',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insertar configuración por defecto
INSERT INTO global_template_config (template_name, institution_name)
SELECT 'clasico', 'Universidad Ejemplo'
WHERE NOT EXISTS (SELECT 1 FROM global_template_config);
```

#### Paso 2: Probar el Sistema

1. Inicia el servidor: `node scripts/server.js`
2. Accede como **owner** a la sección "Perfil" → "Personalización PDF"
3. Cambia la plantilla y aplica los cambios
4. Como **usuario normal**, ve a "Firmar" y sube un documento
5. Verifica que el PDF descargado usa la plantilla configurada por el owner

### 🎨 **Cómo Funciona el Sistema**

#### Para el Owner:

1. **Ve a Perfil** → Tab "Personalización PDF"
2. **Selecciona una plantilla** (Clásico, Moderno, Minimalista, Elegante)
3. **Configura el nombre de la institución**
4. **Aplica los cambios** - se guardan globalmente para todos los usuarios

#### Para los Usuarios:

1. **Van a Firmar** y suben un documento
2. **El sistema automáticamente** usa la plantilla que configuró el owner
3. **Descargan el PDF** con la plantilla global aplicada

### 🔄 **Mapeo de Plantillas**

| Nombre Frontend | ID Backend  | Descripción                      |
| --------------- | ----------- | -------------------------------- |
| `clasico`       | `template1` | Diseño tradicional y formal      |
| `moderno`       | `template2` | Diseño contemporáneo con acentos |
| `minimalista`   | `template3` | Diseño limpio y simple           |
| `elegante`      | `template4` | Diseño sofisticado con detalles  |

### 🛡️ **Seguridad y Permisos**

- ✅ **Solo owners** pueden cambiar la configuración global
- ✅ **Verificación de roles** en el backend
- ✅ **Mensajes de error** apropiados para usuarios sin permisos
- ✅ **Configuración persistente** en base de datos

### 📁 **Archivos Modificados**

1. **`firmas_digitales.sql`** - Agregada tabla `global_template_config`
2. **`scripts/server.js`** - Sistema unificado de plantillas
3. **`scripts/frontend/professionalPDF.js`** - Conexión con API global
4. **`update_database.sql`** - Script para actualizar BD existente

### 🚀 **Estado Actual**

- ✅ **Código completado** y sin errores de sintaxis
- ✅ **Sistema unificado** implementado
- ⏳ **Requiere**: Actualización de base de datos
- ⏳ **Pendiente**: Pruebas en entorno real

### 🎯 **Resultados Esperados**

Después de aplicar los cambios:

1. **Owner cambia plantilla** → Afecta a todos los usuarios
2. **PDFs descargados** usan la plantilla global
3. **Preview y PDF final** son idénticos
4. **Configuración persistente** entre sesiones
5. **Sistema centralizado** y fácil de administrar

---

## 🎉 **¡Sistema Listo para Usar!**

Una vez actualices la base de datos, el sistema estará completamente funcional. El owner podrá cambiar la plantilla globalmente y todos los usuarios descargarán PDFs con la plantilla configurada.

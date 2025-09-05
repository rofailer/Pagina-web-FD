# 📸 SISTEMA DE GESTIÓN DE FOTOS DE PERFIL

## 🔧 **CONFIGURACIÓN AUTOMÁTICA**

### **📁 Creación Automática de Directorios**

El servidor crea automáticamente al iniciar:

```
uploads/
├── profile-photos/    # 📷 Fotos de perfil de todos los usuarios
├── (otros archivos)   # 📄 Otros uploads del sistema
```

### **🎯 Ubicación de Archivos**

- **Directorio**: `uploads/profile-photos/`
- **Servido en**: `http://tu-dominio/uploads/profile-photos/`
- **Acceso**: Público para archivos, protegido por API para gestión

---

## 📋 **SISTEMA DE NOMENCLATURA**

### **🏷️ Formato de Nombres de Archivo**

```
profile_[USER_ID]-[USERNAME]_[TIMESTAMP]-[RANDOM].[EXTENSION]
```

### **📝 Ejemplos:**

```
profile_1-admin_1725456789-123456.jpg       # Admin user
profile_5-johndoe_1725456890-789012.png     # Usuario johndoe
profile_12-maria_1725456999-345678.webp     # Usuario maria
```

### **🔍 Componentes del Nombre:**

- `profile_` - Prefijo identificador
- `1` - ID único del usuario en la base de datos
- `admin` - Nombre de usuario (login)
- `1725456789` - Timestamp Unix (momento de subida)
- `123456` - Número aleatorio (evita conflictos)
- `.jpg` - Extensión original del archivo

---

## 🚀 **APIs DISPONIBLES**

### **📤 Subir Foto de Perfil**

```http
POST /api/profile/photo
Authorization: Bearer [token]
Content-Type: multipart/form-data

Body: photo=[archivo]
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Foto de perfil actualizada correctamente",
  "photoPath": "/uploads/profile-photos/profile_1-admin_1725456789-123456.jpg",
  "fileName": "profile_1-admin_1725456789-123456.jpg"
}
```

### **👀 Obtener Foto de Perfil**

```http
GET /api/profile/photo/[userId]    # Ver foto de otro usuario (admin/owner)
GET /api/profile/photo             # Ver mi propia foto
Authorization: Bearer [token]
```

**Respuesta:**

```json
{
  "success": true,
  "hasPhoto": true,
  "photoPath": "/uploads/profile-photos/profile_1-admin_1725456789-123456.jpg",
  "userName": "Administrador del Sistema"
}
```

### **🗑️ Eliminar Foto de Perfil**

```http
DELETE /api/profile/photo
Authorization: Bearer [token]
```

### **📊 Estadísticas de Archivos (Solo Admin)**

```http
GET /api/profile/files-stats
Authorization: Bearer [token]
```

**Respuesta:**

```json
{
  "success": true,
  "stats": {
    "totalFiles": 15,
    "totalSize": 2048576,
    "totalSizeFormatted": "2.00 MB",
    "userFiles": {
      "1": { "count": 1, "size": 204800 },
      "2": { "count": 2, "size": 512000 }
    },
    "orphanedFiles": ["profile_999-deleted_1725456789-123456.jpg"]
  }
}
```

---

## 🛡️ **CARACTERÍSTICAS DE SEGURIDAD**

### **✅ Validaciones Implementadas:**

- **Tipo de archivo**: Solo imágenes (jpg, png, gif, webp)
- **Tamaño máximo**: 5MB por archivo
- **Autenticación**: Token JWT requerido
- **Autorización**: Solo el propietario puede cambiar su foto
- **Limpieza automática**: Elimina fotos anteriores del usuario

### **🔒 Permisos por Rol:**

```
USUARIO:
✅ Subir su propia foto
✅ Ver su propia foto
✅ Eliminar su propia foto
❌ Ver fotos de otros usuarios

ADMIN/OWNER:
✅ Todo lo anterior
✅ Ver fotos de cualquier usuario
✅ Ver estadísticas del sistema
✅ Acceso completo a gestión de archivos
```

---

## 🧹 **GESTIÓN AUTOMÁTICA DE ARCHIVOS**

### **🔄 Limpieza Automática:**

1. **Al subir nueva foto**: Elimina automáticamente fotos anteriores del mismo usuario
2. **Al eliminar foto**: Limpia todas las fotos del usuario
3. **Verificación de integridad**: Detecta archivos huérfanos

### **📝 Logging y Auditoría:**

Todas las acciones se registran en `user_activity_log`:

- `update_photo` - Subida de nueva foto
- `delete_photo` - Eliminación de foto
- Incluye nombre del archivo y timestamp

---

## 🎨 **INTEGRACIÓN CON FRONTEND**

### **📷 Componente de Foto de Perfil:**

```javascript
// Subir foto
const formData = new FormData();
formData.append("photo", file);

fetch("/api/profile/photo", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

// Mostrar foto
<img
  src="/uploads/profile-photos/profile_1-admin_1725456789-123456.jpg"
  alt="Foto de perfil"
/>;
```

### **🔄 Actualización en Tiempo Real:**

El sistema actualiza automáticamente:

- Preview inmediato tras subida exitosa
- Limpieza de archivos antiguos
- Actualización en base de datos

---

## 📈 **OPTIMIZACIONES IMPLEMENTADAS**

### **⚡ Rendimiento:**

- Servicio estático de archivos optimizado
- Limpieza automática previene acumulación
- Nombres únicos evitan conflictos de caché

### **💾 Almacenamiento:**

- Solo una foto por usuario (elimina automáticamente anteriores)
- Detección de archivos huérfanos
- Estadísticas para monitoreo de uso

### **🔍 Identificación:**

- ID de usuario en nombre de archivo
- Username para identificación visual
- Timestamp para organización temporal

---

## 🚨 **MONITOREO Y MANTENIMIENTO**

### **📊 Comandos Útiles para Admin:**

```bash
# Ver todas las fotos
ls -la uploads/profile-photos/

# Ver tamaño total usado
du -sh uploads/profile-photos/

# Buscar archivos de un usuario específico
ls uploads/profile-photos/profile_1-*

# Limpiar archivos huérfanos (desde API)
GET /api/profile/files-stats
```

### **🔧 Tareas de Mantenimiento:**

1. **Revisar estadísticas mensualmente**
2. **Limpiar archivos huérfanos si es necesario**
3. **Monitorear tamaño total del directorio**
4. **Verificar integridad de referencias en BD**

---

## 💡 **CASOS DE USO**

### **👤 Para Usuarios:**

- Personalización del perfil
- Identificación visual en documentos firmados
- Mejor experiencia de usuario

### **👨‍💼 Para Administradores:**

- Identificación rápida de usuarios
- Gestión profesional de perfiles
- Auditoría completa de cambios

### **📋 Para el Sistema:**

- Información rica para documentos
- Trazabilidad completa
- Gestión eficiente de recursos

---

**El sistema está completamente automatizado y listo para uso en producción.** 🎉

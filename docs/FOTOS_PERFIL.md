# Sistema de Fotos de Perfil

## Resumen del Sistema

El sistema de fotos de perfil permite a los usuarios cargar, actualizar y mostrar su foto de perfil de forma persistente a través de toda la aplicación web.

## Funcionalidades Implementadas

### 🔧 Backend (API)

**Rutas implementadas en `scripts/routes/profile.routes.js`:**

- `POST /api/profile/photo` - Subir nueva foto de perfil
- `GET /api/profile/photo/:userId?` - Obtener foto de perfil
- `DELETE /api/profile/photo` - Eliminar foto de perfil

**Características del backend:**

- Configuración multer para subida de archivos
- Validación de tipos de archivo (solo imágenes)
- Límite de 5MB por archivo
- Limpieza automática de fotos anteriores
- Nomenclatura organizada: `profile_userid-username_timestamp-random.ext`
- Integración con base de datos (campo `foto_perfil` en tabla `users`)

### 🎨 Frontend (JavaScript)

**Archivos modificados:**

1. **`scripts/frontend/profile.frontend.js`**

   - `handleProfilePhoto()` - Maneja la subida de fotos
   - `updateProfilePhoto(photoPath)` - Actualiza foto en múltiples ubicaciones UI
   - `loadUserData()` - Carga datos del usuario incluyendo foto

2. **`scripts/frontend/auth.frontend.js`**
   - `loadUserProfilePhoto()` - Carga foto después de autenticación
   - `checkAuthStatus()` - Modificado para cargar foto automáticamente

### 🎯 Ubicaciones de Display

La foto de perfil se muestra automáticamente en:

1. **`.user-profile-avatar`** - Avatar en menú móvil/header
2. **`.perfil-photo`** - Sección de perfil principal
3. **`.profile-avatar-large`** - Avatar grande en dropdown (desktop)
4. **`.profile-avatar-small`** - Avatar pequeño en header

### 📁 Estructura de Archivos

```
uploads/
└── profile-photos/
    ├── profile_1-admin_1752303352721-123456.jpg
    ├── profile_2-usuario_1752308520762-789012.png
    └── ...
```

### 🗄️ Base de Datos

**Campo agregado en tabla `users`:**

```sql
ALTER TABLE users ADD COLUMN foto_perfil TEXT NULL;
```

## Flujo de Funcionamiento

### 1. Subida de Foto

1. Usuario selecciona foto en sección perfil
2. `handleProfilePhoto()` envía archivo al backend
3. Backend guarda archivo y actualiza BD
4. `updateProfilePhoto()` actualiza UI inmediatamente

### 2. Carga de Foto Existente

1. Al iniciar sesión: `checkAuthStatus()` → `loadUserProfilePhoto()`
2. Al cargar perfil: `loadUserData()` → `updateProfilePhoto()`
3. La foto aparece automáticamente en todas las ubicaciones

### 3. Persistencia

- Las fotos se almacenan en disco en `/uploads/profile-photos/`
- La ruta se guarda en BD en campo `foto_perfil`
- Limpieza automática de fotos anteriores del usuario

## Características de Seguridad

✅ **Validación de archivos:** Solo acepta imágenes
✅ **Límite de tamaño:** Máximo 5MB
✅ **Autenticación requerida:** Solo usuarios logueados
✅ **Limpieza automática:** Elimina fotos anteriores
✅ **Nombres únicos:** Evita conflictos de archivos

## Integración con Temas

El sistema respeta el sistema de temas actual:

- Los componentes de imagen usan CSS heredado
- Compatible con modo claro/oscuro
- Bordes y estilos siguen variables CSS del tema

## Testing Recomendado

1. **Subida de fotos:** Probar diferentes formatos de imagen
2. **Persistencia:** Logout/login para verificar que se mantiene
3. **Responsive:** Verificar en móvil y desktop
4. **Limpieza:** Subir múltiples fotos para verificar eliminación automática
5. **Errores:** Probar archivos no válidos y conexión de red

## Mantenimiento

- Las fotos se almacenan en `uploads/profile-photos/`
- Logs de actividad registran cambios de foto
- La limpieza automática mantiene solo la foto más reciente por usuario

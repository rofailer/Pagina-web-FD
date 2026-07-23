# 🔐 Sistema de Firmas Digitales

**Sistema web profesional para la autenticación criptográfica de documentos académicos y de investigación**

Un sistema completo para la **firma y verificación de documentos PDF** usando criptografía de llaves públicas y privadas, diseñado específicamente para proteger documentos de investigación, trabajos académicos, proyectos científicos y documentos profesionales con tecnología de cifrado militar.

---

## 📋 Tabla de Contenido

- [🚀 Características Principales](#-características-principales)
- [🏗️ Arquitectura del Sistema](#️-arquitectura-del-sistema)
- [⚙️ Instalación y Configuración](#️-instalación-y-configuración)
- [🗄️ Base de Datos](#️-base-de-datos)
- [🔧 Estructura del Proyecto](#-estructura-del-proyecto)
- [🛡️ Seguridad y Criptografía](#️-seguridad-y-criptografía)
- [👤 Gestión de Usuarios](#-gestión-de-usuarios)
- [🔑 Sistema de Llaves](#-sistema-de-llaves)
- [📝 Proceso de Firma](#-proceso-de-firma)
- [✅ Verificación de Documentos](#-verificación-de-documentos)
- [🎨 Panel de Administración](#-panel-de-administración)
- [📱 Interfaz de Usuario](#-interfaz-de-usuario)
- [🚀 Comandos de NPM](#-comandos-de-npm)
- [🔧 Configuración Avanzada](#-configuración-avanzada)
- [📖 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [🚀 Despliegue](#-despliegue)
- [📋 Troubleshooting](#-troubleshooting)
- [🔄 Actualizaciones y Mantenimiento](#-actualizaciones-y-mantenimiento)
- [🤝 Contribución](#-contribución)
- [📞 Soporte y Contacto](#-soporte-y-contacto)
- [📄 Licencia](#-licencia)
- [🎯 Roadmap Futuro](#-roadmap-futuro)
- [📊 Estadísticas del Proyecto](#-estadísticas-del-proyecto)

---

## 🚀 Características Principales

### 🔒 **Seguridad Criptográfica Avanzada**

- **Cifrado AES-256-CBC/192/128**: Protección de llaves privadas con algoritmos militares
- **Llaves RSA-4096**: Generación de pares de llaves criptográficas robustas
- **Firma Digital PKI**: Implementación completa de infraestructura de clave pública
- **Integridad de Documentos**: Verificación criptográfica de autenticidad
- **Expiración de Llaves**: Sistema automatizado de vencimiento de llaves

### 👥 **Sistema de Usuarios Expandido**

- **Roles Diferenciados**: Admin, Profesor/Investigador, Owner
- **Perfiles Completos**: Información académica, profesional y personal
- **Autenticación JWT**: Tokens seguros con expiración configurable
- **Gestión de Sesiones**: Control avanzado de acceso y persistencia

### 📄 **Procesamiento de Documentos**

- **Firma de PDFs**: Aplicación de firmas digitales a documentos
- **Verificación Automática**: Detección automática de firmantes
- **Metadatos de Documentos**: Gestión de títulos, autores y información
- **Plantillas Personalizables**: Sistema de templates para documentos firmados
- **Historial Completo**: Registro de todas las operaciones de firma

### 🎨 **Interfaz y Experiencia de Usuario**

- **Diseño Responsive**: Adaptación completa a dispositivos móviles
- **Interfaz Moderna**: UI/UX profesional con Material Design
- **Sistema de Pestañas**: Navegación intuitiva y organizada
- **Tutorial Interactivo**: Guía paso a paso para nuevos usuarios
- **Temas Personalizables**: Configuración visual avanzada

---

## 🏗️ Arquitectura del Sistema

### **Backend (Node.js/Express)**

```
scripts/
├── server.js                 # Servidor principal
├── db/
│   └── pool.js              # Pool de conexiones MySQL
├── controllers/             # Lógica de negocio
├── routes/                  # Endpoints de API
├── middlewares/            # Middleware de autenticación
├── utils/                  # Utilidades y helpers
└── templates/              # Plantillas de documentos
```

### **Frontend (HTML/CSS/JS)**

```
html/
├── index.html              # Aplicación principal SPA
├── components/             # Componentes reutilizables
admin/
├── html/                   # Panel de administración
├── css/                    # Estilos del admin
└── js/                     # Lógica del admin
css/
├── mainStyle.css           # Estilos principales
├── sections/               # Estilos por sección
└── Header/                 # Estilos del header
```

### **Base de Datos (MySQL)**

- **users**: Información completa de usuarios
- **user_keys**: Gestión de llaves criptográficas
- **global_pdf_config**: Configuración de plantillas
- **user_preferences**: Preferencias personalizadas
- **user_activity_log**: Registro de actividades

---

## ⚙️ Instalación y Configuración

### **Requisitos del Sistema**

- **Node.js** v18+
- **MySQL** 8.0+
- **OpenSSL** (en PATH del sistema)
- **NPM** o **Yarn**

### **1. Clonación del Repositorio**

```bash
git clone https://github.com/rofailer/Pagina-web-FD.git
cd Pagina-web-FD
```

### **2. Instalación de Dependencias**

```bash
npm install
```

### **3. Configuración de Variables de Entorno**

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=firmas_digitales_v2
DB_USER=root
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_jwt_secret_super_seguro

# Configuración del servidor
PORT=3000
NODE_ENV=development

# Railway (Producción)
RAILWAY_STATIC_URL=tu_url_de_railway
```

### **4. Configuración de Base de Datos**

```bash
# Instalar y configurar base de datos
npm run db:install

# Verificar estado
npm run db:status

# Crear backup
npm run db:backup
```

### **5. Inicialización del Servidor**

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

---

## 🗄️ Base de Datos

### **Esquema Completo**

#### **Tabla: users**

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin','profesor','owner') DEFAULT 'profesor',
  active_key_id INT DEFAULT NULL,

  -- Información Personal
  email VARCHAR(255) UNIQUE,
  organizacion VARCHAR(255),
  biografia TEXT,
  foto_perfil TEXT,
  telefono VARCHAR(20),
  direccion TEXT,

  -- Información Académica/Profesional
  cargo VARCHAR(255),
  departamento VARCHAR(255),
  grado_academico VARCHAR(100),

  -- Estado y seguridad de la cuenta
  estado_cuenta ENUM('activo','inactivo','suspendido','pendiente') DEFAULT 'activo',
  force_password_change BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_acceso TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **Tabla: user_keys**

```sql
CREATE TABLE user_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  key_name VARCHAR(255) NOT NULL,
  private_key TEXT NOT NULL,     -- Cifrada con AES
  public_key TEXT NOT NULL,      -- Cifrada con userId
  encryption_type VARCHAR(32) NOT NULL DEFAULT 'aes-256-gcm-v2',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiration_date DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### **Tabla: global_pdf_config**

```sql
CREATE TABLE global_pdf_config (
  id INT PRIMARY KEY DEFAULT 1,
  selected_template VARCHAR(50) DEFAULT 'clasico',
  color_config JSON DEFAULT ('{"primary": "#2563eb", "secondary": "#64748b"}'),
  font_config JSON DEFAULT ('{"title": "Helvetica-Bold", "body": "Helvetica"}'),
  layout_config JSON DEFAULT ('{"marginTop": 50, "marginBottom": 50}'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔧 Estructura del Proyecto

### **Organización de Directorios**

```
SistemaFirmasDigitales/
├── html/                          # Frontend principal
│   ├── index.html                 # SPA principal
│   ├── 403-unauthorized.html      # Página de error
│   └── components/                # Componentes reutilizables
├── css/                           # Estilos de la aplicación
│   ├── mainStyle.css             # Estilos principales
│   ├── authModal.css             # Modal de autenticación
│   ├── Header/                   # Estilos del header
│   └── sections/                 # Estilos por sección
├── scripts/                       # Backend Node.js
│   ├── server.js                 # Servidor principal
│   ├── db/pool.js                # Pool de conexiones
│   ├── routes/                   # Rutas de API
│   │   ├── auth.routes.js        # Autenticación
│   │   ├── keys.routes.js        # Gestión de llaves
│   │   ├── admin.routes.js       # Admin panel
│   │   └── profile.routes.js     # Perfiles de usuario
│   ├── controllers/              # Controladores
│   ├── middlewares/              # Middleware personalizado
│   ├── utils/                    # Utilidades
│   │   ├── crypto.js             # Funciones criptográficas
│   │   ├── pdfGenerator.js       # Generación de PDFs
│   │   └── themeManager.js       # Gestión de temas
│   └── templates/                # Plantillas de documentos
├── admin/                         # Panel de administración
│   ├── html/                     # Páginas del admin
│   ├── css/                      # Estilos del admin
│   └── js/                       # Lógica del admin
├── uploads/                       # Archivos subidos
│   ├── template.pdf              # Plantillas
│   ├── profile-photos/           # Fotos de perfil
│   └── logos/                    # Logos personalizados
├── downloads/                     # PDFs firmados generados
├── llaves/                        # Almacén de llaves (temporal)
├── config/                        # Configuraciones
├── docs/                          # Documentación técnica
├── package.json                   # Dependencias del proyecto
├── firmas_digitales_v2.sql       # Schema de base de datos
└── README.md                      # Documentación principal
```

---

## 🛡️ Seguridad y Criptografía

### **Algoritmos de Cifrado Implementados**

#### **1. Cifrado Simétrico (AES)**

Las llaves privadas y públicas se protegen exclusivamente con un sobre
`AES-256-GCM v2`, derivación `scrypt`, sal aleatoria, IV independiente y etiqueta
de autenticación. El formato no es seleccionable desde el navegador.

#### **2. Criptografía Asimétrica (RSA)**

```bash
# Generación de llaves RSA-4096
openssl genrsa -out private.pem 4096
openssl rsa -in private.pem -pubout -out public.pem
```

#### **3. Funciones Hash**

- **SHA-256**: Para integridad de documentos
- **bcrypt**: Para hash de contraseñas (salt rounds: 10)

### **Flujo de Seguridad**

1. **Generación de Llaves**:

   - RSA-4096 para firma/verificación
   - AES para cifrado de llaves privadas
   - IV único para cada operación

2. **Almacenamiento Seguro**:

   - Llaves privadas cifradas con contraseña del usuario
   - Llaves públicas cifradas con userId
   - Separación de datos sensibles

3. **Proceso de Firma**:

   ```
   Documento → Hash SHA-256 → Firma RSA → Documento Firmado
   ```

4. **Verificación**:
   ```
   Documento Firmado → Extracción de Firma → Verificación RSA → Resultado
   ```

---

## 👤 Gestión de Usuarios

### **Sistema de Roles**

#### **Admin**

- Gestión completa del sistema
- Configuración global de plantillas
- Administración de usuarios
- Acceso a logs y estadísticas

#### **Profesor/Investigador**

- Firma de documentos académicos
- Gestión de llaves personales
- Verificación de documentos
- Perfil profesional completo

#### **Owner**

- Permisos de administrador
- Configuración de sistema
- Gestión de backups

### **Características del Perfil**

#### **Información Personal**

```javascript
{
  nombre: "Dr. María García López",
  email: "maria.garcia@universidad.edu",
  organizacion: "Universidad Nacional",
  cargo: "Profesora Titular",
  departamento: "Facultad de Ingeniería",
  grado_academico: "Doctor",
  biografia: "Especialista en criptografía...",
  telefono: "+57 300 123 4567"
}
```

#### **Configuraciones Avanzadas**

- Recordar la última sección visitada del perfil
- Reducir el movimiento de la interfaz
- Cambio seguro de contraseña
- Acceso al panel administrativo para owner
- Temas personalizados

---

## 🔑 Sistema de Llaves

### **Generación de Llaves**

#### **Proceso Completo**

1. **Validación de Usuario**: Autenticación requerida
2. **Configuración**: Selección de algoritmo de cifrado
3. **Generación**: Par de llaves RSA-4096 con OpenSSL
4. **Cifrado**:
   - Llave privada: AES con contraseña del usuario
   - Llave pública: AES con userId
5. **Almacenamiento**: Base de datos con metadata
6. **Limpieza**: Eliminación de archivos temporales

#### **Formato de cifrado**

Todas las llaves nuevas usan `aes-256-gcm-v2`. No se conservan formatos CBC
heredados porque el esquema está diseñado para instalaciones nuevas.

### **Gestión de Llaves**

#### **Características**

- **Expiración Configurable**: 30 días por defecto
- **Múltiples Llaves**: Soporte para varias llaves por usuario
- **Selección Activa**: Una llave activa para firma
- **Rotación**: Renovación automática antes del vencimiento
- **Eliminación Segura**: Proceso confirmado con contraseña

#### **Estados de Llaves**

- ✅ **Activa**: Disponible para firma
- ⚠️ **Próxima a Vencer**: Menos de 7 días
- ❌ **Expirada**: Solo verificación
- 🗑️ **Eliminada**: No disponible

---

## 📝 Proceso de Firma

### **Flujo Completo de Firma**

#### **Paso 1: Selección de Documento**

```javascript
// Validación de archivo
const validExtensions = ['.pdf'];
const maxFileSize = 10 * 1024 * 1024; // 10MB

// Metadatos del documento
{
  titulo: "Título del trabajo",
  autores: ["Autor 1", "Autor 2"],
  fechaCreacion: new Date(),
  tipoDocumento: "Trabajo de Investigación"
}
```

#### **Paso 2: Selección de Llave**

- Lista de llaves disponibles del usuario
- Información de expiración
- Algoritmo de cifrado utilizado
- Estado de la llave

#### **Paso 3: Firma Electrónica del Avalador**

- **Método Dibujo**: Canvas HTML5 para firma manuscrita
- **Método Imagen**: Subida de imagen de firma
- Validación de firma antes de continuar

#### **Paso 4: Generación del Documento Firmado**

```javascript
// Proceso de firma
1. Generación de hash SHA-256 del documento
2. Aplicación de firma RSA con llave privada
3. Integración de firma en plantilla PDF
4. Aplicación de metadatos y marca de tiempo
5. Generación de documento final avalado
```

### **Plantillas de Documentos**

#### **Template Clásico**

```javascript
// scripts/templates/clasico.template.js
{
  layout: 'portrait',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  colors: { primary: '#2563eb', secondary: '#64748b' },
  fonts: { title: 'Helvetica-Bold', body: 'Helvetica' },
  signatures: {
    position: 'bottom-right',
    size: { width: 200, height: 100 }
  }
}
```

---

## ✅ Verificación de Documentos

### **Métodos de Verificación**

#### **1. Verificación Manual**

- Búsqueda y selección manual del avalador
- Filtros por nombre y orden alfabético
- Lista completa de profesores/investigadores

#### **2. Verificación Automática**

- Detección automática del firmante
- Análisis de metadatos del documento
- Identificación por firma digital

### **Proceso de Verificación**

#### **Pasos del Proceso**

1. **Selección de Método**: Manual o automático
2. **Carga de Documento Firmado**: Archivo PDF avalado
3. **Carga de Documento Original**: Archivo sin firmar
4. **Verificación Criptográfica**:
   ```javascript
   // Proceso de verificación
   1. Extracción de firma del PDF
   2. Generación de hash del documento original
   3. Verificación RSA con llave pública
   4. Comparación de integridad
   5. Validación de vigencia de llave
   ```

#### **Resultados Posibles**

- ✅ **Válida**: Documento íntegro y firma verificada
- ⚠️ **Advertencia**: Llave expirada pero firma válida
- ❌ **Inválida**: Documento alterado o firma incorrecta
- 🔍 **No Encontrada**: No se pudo verificar la firma

---

## 🎨 Panel de Administración

### **Acceso y Seguridad**

- **URL**: `/admin` o `/panelAdmin`
- **Autenticación**: Roles admin/owner únicamente
- **Token de Administrador**: Generación segura temporal

### **Funcionalidades Disponibles**

#### **1. Gestión de Usuarios**

```javascript
// Operaciones disponibles
- Crear nuevos usuarios
- Modificar roles y permisos
- Suspender/activar cuentas
- Ver historial de actividad
- Gestionar configuraciones de usuario
```

#### **2. Configuración Visual Global**

- **Logo del Sistema**: Subida y gestión de logos
- **Colores Primarios**: Personalización de paleta
- **Título de la Aplicación**: Configuración de branding
- **Footer Personalizado**: Información institucional
- **Favicon**: Icono del sitio web

#### **3. Gestión de Plantillas PDF**

```javascript
// Configuración de templates
{
  selectedTemplate: 'clasico',
  colorConfig: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f59e0b'
  },
  fontConfig: {
    title: 'Helvetica-Bold',
    body: 'Helvetica',
    metadata: 'Helvetica-Oblique'
  },
  layoutConfig: {
    marginTop: 50,
    marginBottom: 50,
    lineHeight: 1.5
  }
}
```

#### **4. Estadísticas y Monitoreo**

- Número de usuarios registrados
- Documentos firmados por período
- Uso de llaves criptográficas
- Errores y logs del sistema

---

## 📱 Interfaz de Usuario

### **Diseño Responsive**

#### **Breakpoints**

```css
/* Móvil */
@media (max-width: 768px) {
  ...;
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  ...;
}

/* Desktop */
@media (min-width: 1025px) {
  ...;
}
```

#### **Características Mobile-First**

- Menú hamburguesa adaptativo
- Touch-friendly buttons
- Optimización de formularios
- Carga progresiva de contenido

### **Componentes de UI**

#### **Sistema de Navegación**

- **Header Responsive**: Logo, menú y perfil de usuario
- **Navegación por Pestañas**: Inicio, Firmar, Verificar, Perfil
- **Breadcrumbs**: Navegación contextual en procesos

#### **Modales y Overlays**

- Modal de autenticación (login/registro)
- Modal de gestión de llaves
- Modal de tutorial interactivo
- Confirmaciones de acciones críticas

#### **Formularios Avanzados**

- Validación en tiempo real
- Indicadores de progreso
- Drag & drop para archivos
- Autocompletado inteligente

### **Sistema de Temas**

#### **Tema por Defecto**

```css
:root {
  --primary-color: #2563eb;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --warning-color: #f59e0b;
  --error-color: #ef4444;
  --background-color: #ffffff;
  --text-color: #1f2937;
}
```

#### **Personalización Avanzada**

- Configuración por usuario
- Modo oscuro/claro
- Paletas de colores predefinidas
- Fuentes personalizables

---

## 🚀 Comandos de NPM

### **Scripts de Desarrollo**

```bash
# Iniciar servidor de desarrollo
npm run dev
npm start

# Verificaciones
npm test
```

La base de datos se crea importando `firmas_digitales_v2.sql` desde MySQL o el
proveedor de alojamiento. El panel administrativo solo permite consultar datos
redactados y exportar una copia SQL; no instala, restaura ni elimina la base.

### **Scripts de Producción**

```bash
# Despliegue
npm run build            # Build para producción
npm run start:prod       # Servidor de producción

# Mantenimiento
npm run backup:auto      # Backup automatizado
npm run clean:uploads    # Limpiar archivos temporales
npm run optimize:db      # Optimizar base de datos
```

---

## 🔧 Configuración Avanzada

### **Variables de Entorno Completas**

```env
# ====== CONFIGURACIÓN DE BASE DE DATOS ======
DB_HOST=localhost
DB_PORT=3306
DB_NAME=firmas_digitales_v2
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_CONNECTION_LIMIT=10
DB_TIMEOUT=10000

# ====== CONFIGURACIÓN JWT ======
JWT_SECRET=tu_jwt_secret_super_seguro_minimo_32_caracteres
JWT_EXPIRES_IN=30d
JWT_REFRESH_EXPIRES_IN=7d

# ====== CONFIGURACIÓN DEL SERVIDOR ======
PORT=3000
NODE_ENV=development
HOST=localhost

# ====== CONFIGURACIÓN DE ARCHIVOS ======
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads
DOWNLOAD_PATH=./downloads
KEYS_PATH=./llaves

# ====== CONFIGURACIÓN DE SEGURIDAD ======
BCRYPT_ROUNDS=10
SESSION_SECRET=tu_session_secret
CORS_ORIGIN=http://localhost:3000

# ====== CONFIGURACIÓN DE EMAIL (OPCIONAL) ======
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_email

# ====== CONFIGURACIÓN DE RAILWAY (PRODUCCIÓN) ======
RAILWAY_STATIC_URL=https://tu-app.railway.app
DATABASE_URL=mysql://usuario:password@host:puerto/database
```

### **Configuración de OpenSSL**

#### **Windows**

```bash
# Verificar instalación
openssl version

# Si no está instalado, descargar desde:
# https://slproweb.com/products/Win32OpenSSL.html

# Agregar al PATH del sistema:
# C:\Program Files\OpenSSL-Win64\bin
```

#### **Linux/macOS**

```bash
# Ubuntu/Debian
sudo apt-get install openssl

# macOS (Homebrew)
brew install openssl

# Verificar
openssl version -a
```

### **Configuración de MySQL**

#### **Configuración Básica**

```sql
-- Crear usuario dedicado
CREATE USER 'firmas_user'@'localhost' IDENTIFIED BY 'password_seguro';
GRANT ALL PRIVILEGES ON firmas_digitales_v2.* TO 'firmas_user'@'localhost';
FLUSH PRIVILEGES;

-- Configuración de caracteres
ALTER DATABASE firmas_digitales_v2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### **Optimizaciones de Rendimiento**

```sql
-- my.cnf optimizaciones
[mysqld]
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
max_connections = 100
query_cache_size = 32M
```

---

## 📖 API Documentation

### **Endpoints de Autenticación**

#### **POST /api/register**

```javascript
// Request
{
  "nombre": "Dr. Juan Pérez",
  "usuario": "juan.perez",
  "password": "Password123!"
}

// Response
{
  "success": true,
  "message": "Usuario registrado exitosamente"
}
```

#### **POST /api/login**

```javascript
// Request
{
  "usuario": "juan.perez",
  "password": "Password123!"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "nombre": "Dr. Juan Pérez",
  "rol": "profesor",
  "usuario": "juan.perez"
}
```

### **Endpoints de Llaves**

#### **GET /api/user-keys**

```javascript
// Headers: Authorization: Bearer <token>

// Response
{
  "keys": [
    {
      "id": 1,
      "key_name": "Key1",
      "created_at": "2024-01-15T10:30:00Z",
      "expiration_date": "2024-02-15T10:30:00Z",
      "encryption_type": "aes-256-gcm-v2"
    }
  ],
  "hasKeys": true
}
```

#### **POST /generate-keys**

```javascript
// Request
{
  "keyPassword": "password123",
  "keyName": "Mi Llave Principal"
}

// Response
{
  "success": true,
  "message": "Llaves generadas exitosamente",
  "keyId": 1,
  "keyName": "Mi Llave Principal"
}
```

### **Endpoints de Verificación**

#### **POST /verify-signature**

```javascript
// Request (FormData)
{
  "professorId": 1,
  "signedFile": <PDF File>,
  "originalFile": <PDF File>,
  "keyPassword": "password123"
}

// Response
{
  "success": true,
  "verification": {
    "isValid": true,
    "professor": "Dr. Juan Pérez",
    "signDate": "2024-01-15T10:30:00Z",
    "keyExpiration": "2024-02-15T10:30:00Z",
    "documentIntegrity": true
  }
}
```

---

## 🧪 Testing

### **Estructura de Tests**

```
tests/
├── unit/                    # Tests unitarios
│   ├── crypto.test.js      # Funciones criptográficas
│   ├── auth.test.js        # Autenticación
│   └── database.test.js    # Operaciones de BD
├── integration/            # Tests de integración
│   ├── api.test.js         # Endpoints de API
│   └── workflows.test.js   # Flujos completos
└── e2e/                    # Tests end-to-end
    ├── login.test.js       # Proceso de login
    ├── signing.test.js     # Proceso de firma
    └── verification.test.js # Proceso de verificación
```

### **Ejecutar Tests**

```bash
# Todos los tests
npm test

# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 🚀 Despliegue

### **Despliegue en Railway**

#### **1. Configuración Inicial**

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login y conectar proyecto
railway login
railway link
```

#### **2. Variables de Entorno en Railway**

```bash
# Configurar variables críticas
railway variables set JWT_SECRET=tu_jwt_secret
railway variables set DB_HOST=tu_mysql_host
railway variables set DB_PASSWORD=tu_mysql_password
railway variables set NODE_ENV=production
```

#### **3. Deploy**

```bash
# Deploy automático
git push origin main

# Deploy manual
railway up
```

### **Despliegue en Docker**

#### **Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

#### **docker-compose.yml**

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
    depends_on:
      - mysql

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: firmas_digitales_v2
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

---

## 🛠️ Requisitos del Sistema

### **Servidor de Desarrollo**

- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **RAM**: 4GB mínimo, 8GB recomendado
- **Almacenamiento**: 2GB libres
- **Red**: Conexión a internet para dependencias

### **Servidor de Producción**

- **OS**: Ubuntu 20.04+ LTS recomendado
- **RAM**: 8GB mínimo, 16GB recomendado
- **CPU**: 2 cores mínimo, 4 cores recomendado
- **Almacenamiento**: 10GB mínimo SSD
- **Base de Datos**: MySQL 8.0+ o compatible

### **Dependencias del Sistema**

```json
{
  "bcryptjs": "^3.0.2", // Hash de contraseñas
  "body-parser": "^1.20.3", // Parser de requests
  "canvas": "^3.2.0", // Generación de imágenes
  "cors": "^2.8.5", // CORS policy
  "dotenv": "^16.5.0", // Variables de entorno
  "express": "^4.21.2", // Framework web
  "jsonwebtoken": "^9.0.2", // JWT tokens
  "multer": "^1.4.5-lts.2", // Upload de archivos
  "mysql2": "^3.14.0", // Driver MySQL
  "pdf-lib": "^1.17.1", // Manipulación de PDFs
  "pdf2pic": "^3.2.0" // Conversión PDF a imagen
}
```

---

## 📋 Troubleshooting

### **Problemas Comunes**

#### **Error: OpenSSL no encontrado**

```bash
# Windows
# Descargar e instalar desde: https://slproweb.com/products/Win32OpenSSL.html
# Agregar al PATH: C:\Program Files\OpenSSL-Win64\bin

# Verificar instalación
openssl version
```

#### **Error de conexión a MySQL**

```bash
# Verificar servicio MySQL activo
# Windows (XAMPP): Iniciar Apache y MySQL desde panel
# Linux: sudo systemctl start mysql

# Verificar credenciales en .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
```

#### **Error: JWT_SECRET no configurado**

```bash
# Configurar en .env
JWT_SECRET=tu_jwt_secret_super_seguro_minimo_32_caracteres

# Railway
railway variables set JWT_SECRET=tu_jwt_secret
```

#### **Error: Puerto ya en uso**

```bash
# Cambiar puerto en .env
PORT=3001

# O terminar proceso que usa el puerto
# Windows: netstat -ano | findstr :3000
# Linux/macOS: lsof -ti:3000 | xargs kill
```

### **Logs y Debugging**

#### **Activar Logs Detallados**

```bash
# En .env
NODE_ENV=development
DEBUG=true
```

#### **Ubicación de Logs**

- **Aplicación**: Consola del servidor
- **MySQL**: XAMPP logs o `/var/log/mysql/`
- **Errores**: `logs/error.log` (si existe)

---

## 🔄 Actualizaciones y Mantenimiento

### **Actualización del Sistema**

```bash
# Backup previo
npm run db:backup

# Actualizar dependencias
npm update

# Verificar funcionamiento
npm run db:status
npm test
```

### **Rotación de Llaves**

```bash
# Ejecutar script de rotación
npm run keys:rotate

# Notificar usuarios de llaves próximas a vencer
npm run keys:notify-expiration
```

### **Limpieza de Sistema**

```bash
# Limpiar archivos temporales
npm run clean:temp

# Optimizar base de datos
npm run db:optimize

# Limpiar uploads antiguos
npm run clean:old-uploads
```

---

## 🤝 Contribución

### **Código de Conducta**

- Seguir estándares de código JavaScript ES6+
- Documentar funciones complejas
- Escribir tests para nuevas características
- Mantener compatibilidad con versiones anteriores

### **Proceso de Contribución**

1. **Fork** del repositorio
2. **Branch** para nueva característica: `git checkout -b feature/nueva-caracteristica`
3. **Commit** cambios: `git commit -m 'Agregar nueva característica'`
4. **Push** al branch: `git push origin feature/nueva-caracteristica`
5. **Pull Request** con descripción detallada

### **Estructura de Commits**

```bash
# Formato
tipo(scope): descripción breve

# Ejemplos
feat(auth): agregar autenticación 2FA
fix(crypto): corregir algoritmo de cifrado AES
docs(readme): actualizar documentación de API
style(css): mejorar responsive design
```

---

## 📞 Soporte y Contacto

### **Recursos de Ayuda**

- **Documentación**: Ver carpeta `/docs/` para guías técnicas
- **Issues**: [GitHub Issues](https://github.com/rofailer/Pagina-web-FD/issues)
- **Discusiones**: [GitHub Discussions](https://github.com/rofailer/Pagina-web-FD/discussions)

### **Información del Proyecto**

- **Autor**: Roberto Florez
- **Universidad**: Universidad de san buenaventura cartagena
- **Proyecto**: Trabajo de Grado - Sistema de Firmas Digitales
- **Año**: 2024-2025

### **Tecnologías Utilizadas**

- **Backend**: Node.js, Express.js, MySQL
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Criptografía**: OpenSSL, crypto (Node.js)
- **Seguridad**: JWT, bcrypt, AES-256
- **Base de Datos**: MySQL 8.0+
- **Deploy**: Railway, Docker

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

```
MIT License

Copyright (c) 2024 Roberto Failer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🎯 Roadmap Futuro

### **Versión 3.0 - Planificada**

- [ ] **Blockchain Integration**: Registro inmutable de firmas
- [ ] **API REST Completa**: Endpoints para integración externa
- [ ] **Mobile App**: Aplicación móvil nativa
- [ ] **Advanced Analytics**: Dashboard de estadísticas avanzadas
- [ ] **Multi-tenant**: Soporte para múltiples organizaciones
- [ ] **SSO Integration**: Single Sign-On con LDAP/OAuth

### **Mejoras Inmediatas**

- [ ] **Tests Automatizados**: Cobertura completa de testing
- [ ] **CI/CD Pipeline**: Integración y deploy automático
- [ ] **Performance Optimization**: Optimización de consultas DB
- [ ] **Security Audit**: Auditoría de seguridad completa
- [ ] **Documentation**: API documentation con Swagger

---

## 📊 Estadísticas del Proyecto

### **Métricas de Código**

- **Líneas de Código**: ~15,000+
- **Archivos**: 100+
- **Dependencias**: 15+ paquetes
- **Rutas de API**: 30+
- **Componentes UI**: 50+

### **Características Técnicas**

- **Algoritmos Criptográficos**: 3 (AES-256/192/128)
- **Tipos de Firma**: RSA-4096
- **Roles de Usuario**: 3 (Admin, Profesor, Owner)
- **Formatos Soportados**: PDF
- **Navegadores Soportados**: Chrome, Firefox, Safari, Edge

---

**✨ ¡Gracias por usar el Sistema de Firmas Digitales! ✨**

_Sistema desarrollado como parte del trabajo de grado en [Tu Universidad]. Contribuyendo a la seguridad y autenticidad de documentos académicos y de investigación._

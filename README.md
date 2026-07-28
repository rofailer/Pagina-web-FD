# Firmas Digitales FD

Aplicación web para firmar, avalar y verificar documentos PDF mediante criptografía de clave pública. El proyecto reúne en una sola plataforma la gestión de usuarios, llaves digitales, perfiles, plantillas PDF, anexos verificables y configuración institucional.

> Proyecto académico **open source**, publicado bajo la licencia permisiva [ISC](LICENSE).

## Contenido

- [Qué permite hacer](#qué-permite-hacer)
- [Cómo funciona](#cómo-funciona)
- [Tecnologías](#tecnologías)
- [Instalación local](#instalación-local)
- [Variables de entorno](#variables-de-entorno)
- [Cuentas y roles](#cuentas-y-roles)
- [Comandos disponibles](#comandos-disponibles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Seguridad](#seguridad)
- [Despliegue](#despliegue)
- [Documentación](#documentación)
- [Autores](#autores)
- [Licencia y código abierto](#licencia-y-código-abierto)

## Qué permite hacer

- Firmar documentos PDF con llaves RSA de 4096 bits.
- Verificar la autenticidad e integridad de documentos firmados.
- Vincular anexos a un documento mediante manifiestos criptográficos.
- Crear y administrar llaves personales con fecha de expiración.
- Proteger llaves privadas mediante cifrado autenticado y una contraseña elegida por el usuario.
- Gestionar perfiles, fotografías y estados de presencia.
- Personalizar la apariencia institucional y las plantillas de aval PDF.
- Administrar usuarios, roles, estados de cuenta y contraseñas temporales.
- Consultar información redactada de la base de datos.
- Exportar una copia SQL completa desde una cuenta `owner`.

El registro público está deshabilitado. Las cuentas se crean desde el panel administrativo.

## Cómo funciona

```text
Navegador
   │
   ├── HTML, CSS y JavaScript
   │
   └── API HTTP con JWT
          │
          ├── Node.js + Express
          ├── criptografía y procesamiento de PDF
          └── MySQL
```

Durante la firma, el servidor genera o recupera la llave del usuario, valida su vigencia, descifra la llave privada únicamente para la operación autorizada y produce el documento avalado. La verificación compara la firma RSA y los hashes SHA-256 del documento y sus anexos.

Las llaves privadas nuevas no se escriben como archivos sin cifrar: se generan en memoria y se almacenan cifradas en MySQL. Los documentos generados se entregan mediante enlaces temporales de un solo uso.

## Tecnologías

| Área | Tecnología |
| --- | --- |
| Backend | Node.js, Express 4 |
| Base de datos | MySQL, `mysql2` |
| Frontend | HTML5, CSS3, JavaScript |
| Autenticación | JSON Web Tokens, `bcryptjs` |
| Criptografía | `node:crypto`, RSA-4096, SHA-256, scrypt |
| Cifrado de llaves | AES-256-GCM v2 y ChaCha20-Poly1305 v3 |
| PDF | `pdf-lib` |
| Archivos | `multer` |
| Pruebas | Node.js Test Runner |
| Despliegue | Railway |

## Instalación local

### Requisitos

- Node.js `26.5.0` o posterior, según `package.json`.
- npm.
- MySQL 8 o una instancia compatible.
- Cliente de Git.

### 1. Clonar el repositorio

```bash
git clone https://github.com/rofailer/Pagina-web-FD.git
cd Pagina-web-FD
```

### 2. Instalar dependencias

```bash
npm ci
```

### 3. Crear la configuración local

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

En Linux o macOS:

```bash
cp .env.example .env
```

Genera un secreto JWT aleatorio:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copia el resultado en `JWT_SECRET` dentro de `.env`. No publiques ni confirmes este archivo en Git.

### 4. Crear la base de datos

Abre el cliente de MySQL:

```bash
mysql -u root -p
```

Importa el esquema:

```sql
CREATE DATABASE IF NOT EXISTS firmas_digitales_v2
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE firmas_digitales_v2;
SOURCE firmas_digitales_v2.sql;
```

Si ejecutas el cliente desde otra carpeta, usa la ruta absoluta del archivo SQL en `SOURCE`.

### 5. Iniciar la aplicación

```bash
npm start
```

La aplicación quedará disponible en `http://localhost:3000`, salvo que cambies `PORT`.

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NODE_ENV` | Sí | `development` o `production`. |
| `PORT` | No | Puerto HTTP. Valor predeterminado: `3000`. |
| `JWT_SECRET` | Sí | Secreto aleatorio de al menos 32 bytes para firmar JWT. |
| `DB_HOST` | Sí | Host de MySQL. |
| `DB_PORT` | Sí | Puerto de MySQL. |
| `DB_USER` | Sí | Usuario de la base de datos. |
| `DB_PASSWORD` | Sí | Contraseña de la base de datos. |
| `DB_NAME` | Sí | Nombre de la base de datos. |
| `DB_SSL_MODE` | Producción | `required`, `verify-ca` o `verify-identity`. En producción usa TLS; para desarrollo local puede ser `disabled`. |
| `DB_SSL_CA` | Según proveedor | Certificado CA en formato PEM, aceptando saltos de línea como `\n`. |
| `DB_SSL_CA_BASE64` | Según proveedor | Alternativa Base64 a `DB_SSL_CA`. |
| `DB_CONNECTION_LIMIT` | No | Máximo de conexiones del pool. Valor predeterminado: `10`. |
| `DB_MAX_IDLE` | No | Máximo de conexiones inactivas. Valor predeterminado: `10`. |
| `DB_QUEUE_LIMIT` | No | Solicitudes máximas en espera de conexión. Valor predeterminado: `20`. |
| `DB_CONNECT_TIMEOUT_MS` | No | Tiempo máximo para conectar con MySQL. Valor predeterminado: `10000`. |
| `DB_IDLE_TIMEOUT_MS` | No | Tiempo de inactividad de una conexión. Valor predeterminado: `60000`. |
| `MAX_UPLOAD_SIZE_MB` | No | Tamaño máximo por archivo; valor predeterminado: 25 MB. |
| `MAX_UPLOAD_TOTAL_SIZE_MB` | No | Suma máxima por solicitud multipart; valor predeterminado: 100 MB. |
| `MAX_KEYS_PER_USER` | No | Cuota de llaves almacenadas por usuario. Valor predeterminado: `10`. |
| `KEY_GENERATION_MAX_REQUESTS` | No | Generaciones permitidas por ventana y usuario. Valor predeterminado: `3`. |
| `KEY_GENERATION_WINDOW_MS` | No | Duración de la ventana de generación. Valor predeterminado: una hora. |
| `KEY_GENERATION_CONCURRENCY` | No | Generaciones RSA simultáneas por proceso. Valor predeterminado: `2`. |
| `CORS_ORIGINS` | Producción | Lista de orígenes permitidos, separados por comas. |
| `INITIAL_ADMIN_PASSWORD` | Primer inicio | Contraseña temporal para la cuenta seed `admin`; obligatoria en producción mientras siga sin inicializar. |
| `INITIAL_OWNER_PASSWORD` | Primer inicio | Contraseña temporal para la cuenta seed `owner`; obligatoria en producción mientras siga sin inicializar. |

Usa `.env.example` como referencia. En producción, configura las variables en el proveedor de alojamiento y no incluyas archivos `.env` en la imagen o repositorio.

El servidor se niega a iniciar en producción si `JWT_SECRET` es débil o conserva un placeholder, si faltan credenciales MySQL, si `DB_USER=root` o si alguna credencial de base de datos parece un valor de ejemplo.

Para actualizar una base existente, comprueba que `users.session_version` exista antes de desplegar. El esquema incluido ya contiene esa columna. En desarrollo la aplicación puede añadirla automáticamente; en producción exige una migración explícita para que el usuario de ejecución no necesite permisos `ALTER`.

## Cuentas y roles

| Rol | Alcance |
| --- | --- |
| `profesor` | Perfil, llaves personales, firma y verificación. |
| `admin` | Gestión operativa de usuarios y consulta de configuración. |
| `owner` | Acciones de máximo privilegio, cambios globales y exportación SQL. |

El esquema incluye cuentas privilegiadas deshabilitadas. En el primer arranque, la aplicación inicializa únicamente las cuentas que todavía conservan el marcador seguro del esquema:

- Si se configuró la variable correspondiente, usa esa contraseña temporal.
- En desarrollo, si no se configuró, genera una contraseña aleatoria y la muestra una sola vez en el registro de inicio.
- En producción, el arranque se detiene si una cuenta seed pendiente no tiene su variable `INITIAL_*` configurada.
- En ambos casos obliga a cambiar la contraseña antes de usar el resto de la aplicación.

En un despliegue real define las contraseñas iniciales mediante el gestor de secretos de la plataforma y elimínalas del entorno después de completar y comprobar el primer cambio de contraseña.

## Comandos disponibles

```bash
# Iniciar el servidor
npm start

# Iniciar el mismo servidor durante desarrollo
npm run dev

# Ejecutar la suite automatizada
npm test

# Comprobar que no se versionen secretos conocidos
npm run security:secrets
```

El proyecto no requiere una fase de compilación del frontend.

## Estructura del proyecto

```text
.
├── admin/                    # Interfaz del panel administrativo
├── config/                   # Configuración de plantillas
├── css/                      # Estilos del sitio público
├── docs/                     # Guías técnicas y de implementación
├── html/                     # Páginas públicas
├── recursos/                 # Imágenes y recursos visuales
├── scripts/
│   ├── controllers/         # Lógica de configuración y PDF
│   ├── db/                  # Pool de conexiones MySQL
│   ├── frontend/            # JavaScript del navegador
│   ├── middlewares/         # Autenticación, roles y seguridad HTTP
│   ├── routes/              # Rutas de la API
│   ├── templates/           # Plantillas de documentos
│   ├── utils/               # Criptografía, exportación y utilidades
│   └── server.js            # Entrada de la aplicación
├── test/                     # Pruebas automatizadas
├── firmas_digitales_v2.sql  # Esquema e información inicial
├── railway.json             # Configuración de Railway
└── package.json
```

`uploads/`, `downloads/` y `llaves/` se reservan para datos temporales. Git conserva únicamente sus archivos `.gitkeep`.

## Seguridad

El proyecto incluye:

- Validación del rol actual contra la base de datos en cada petición protegida.
- Revocación inmediata de sesiones mediante una versión almacenada en la cuenta.
- Vida absoluta de sesión de 24 horas, incluso cuando se renueva el JWT.
- JWT normales y administrativos almacenados solo en `sessionStorage`; cerrar la pestaña elimina las credenciales del navegador.
- Tokens administrativos de hasta dos horas y ligados a la sesión normal vigente.
- Reautenticación reciente antes de abrir el panel administrativo.
- Acceso exclusivo del rol `owner` a la inspección de MySQL.
- Confirmación de contraseña dentro de la misma solicitud que genera la exportación SQL.
- Credenciales administrativas transmitidas únicamente en cuerpos o cabeceras HTTPS, nunca en la URL.
- Límite de intentos de inicio de sesión.
- Cuota, rate limit y concurrencia controlada para generar llaves RSA.
- CSP sin scripts ni eventos inline, HSTS en producción, `nosniff` y protección contra framing.
- CORS mediante lista de orígenes permitidos.
- Consultas parametrizadas y validación de identificadores SQL.
- Redacción de columnas sensibles en la vista administrativa.
- Cifrado autenticado de llaves privadas.
- Límites por archivo y por solicitud completa durante el streaming de cargas.
- Descargas temporales sin exposición estática del directorio.
- Configuración MySQL con TLS, timeouts, cola finita y usuario no-root en producción.
- Respuesta `/health` mínima en producción.
- Guard local y de CI contra `.env`, llaves privadas y formatos conocidos de tokens.
- Pruebas y auditoría de dependencias en cada push y pull request.

La seguridad del sistema no depende de ocultar la URL del panel. Conocer o abrir su HTML no concede permisos: las operaciones sensibles deben seguir protegidas por autenticación y autorización en el servidor.

Para reportar una vulnerabilidad, evita publicar credenciales, llaves, volcados SQL o datos personales en un issue público. Contacta primero a los autores o responsables del despliegue.

La guía [Operación segura y respuesta a secretos expuestos](docs/SECURITY_OPERATIONS.md) explica el alta de producción, la rotación de credenciales y el tratamiento coordinado del historial Git.

## Despliegue

El repositorio incluye `Procfile` y `railway.json`. Railway ejecuta:

```bash
npm start
```

Antes de desplegar:

1. Crea una instancia MySQL e importa `firmas_digitales_v2.sql`.
2. Si actualizas una base existente, aplica primero la columna `users.session_version` incluida en el esquema actual.
3. Crea un usuario MySQL exclusivo, sin privilegios globales ni DDL y distinto de `root`.
4. Configura todas las variables sensibles en el gestor de secretos.
5. Activa TLS con `DB_SSL_MODE=verify-identity` cuando el proveedor permita validar nombre y CA; usa `verify-ca` como segunda opción.
6. Usa un `JWT_SECRET` exclusivo del entorno.
7. Define `NODE_ENV=production`.
8. Limita `CORS_ORIGINS` a los dominios HTTPS reales.
9. Configura `INITIAL_ADMIN_PASSWORD` e `INITIAL_OWNER_PASSWORD` si las cuentas seed todavía no se han inicializado.
10. Verifica que `/health` responda correctamente sin publicar detalles internos.
11. Ejecuta `npm test` y `npm audit --omit=dev`.

No reutilices credenciales entre desarrollo y producción.

## Documentación

La carpeta `docs/` contiene guías sobre:

- sistema de usuarios y perfiles;
- fotografías y presencia;
- temas y configuración visual;
- plantillas y personalización PDF;
- flujos de firma y verificación;
- operación segura, rotación de secretos y respuesta a incidentes.

Consulta también:

- [SECURITY.md](SECURITY.md), para reportar vulnerabilidades de forma privada;
- [CONTRIBUTING.md](CONTRIBUTING.md), para preparar y enviar cambios;
- [LICENSE](LICENSE), con los términos de la licencia ISC.

## Autores

- Roberto Florez Bernal
- Camilo Beltran Acosta

Proyecto desarrollado en el contexto de un trabajo académico sobre firmas digitales y autenticidad documental.

## Licencia y código abierto

Firmas Digitales FD se distribuye bajo la licencia [ISC](LICENSE). Puedes usar, copiar, modificar y distribuir el software, con o sin fines comerciales, siempre que conserves el aviso de copyright y el texto de la licencia.

La licencia es permisiva y no ofrece garantías. Las contribuciones aceptadas se publican bajo los mismos términos.

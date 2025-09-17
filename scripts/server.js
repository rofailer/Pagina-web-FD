require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});
const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const { PDFDocument, rgb } = require("pdf-lib");
const pool = require('./db/pool');
const authenticate = require('./middlewares/authenticate');
const { isAdmin } = require('./middlewares/isAdmin');
const { isOwner } = require('./middlewares/isOwner');
const { encrypt, decrypt, decryptWithPassword, decryptAES, decryptWithType } = require('./utils/crypto');
const PORT = process.env.PORT || 3000;

// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET no está configurado en las variables de entorno');
  console.error('Por favor, configura JWT_SECRET en Railway');
  process.exit(1);
}

// =================== Crear directorios necesarios ===================
function createRequiredDirectories() {
  const directories = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/profile-photos'),
    path.join(__dirname, '../uploads/admin'),
    path.join(__dirname, '../downloads'),
    path.join(__dirname, '../llaves')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

}

// Crear directorios al iniciar el servidor
createRequiredDirectories();

// Middlewares globales
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Logging middleware optimizado (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  // Cache para evitar logs repetidos
  const logCache = new Map();
  const LOG_CACHE_DURATION = 30000; // 30 segundos

  app.use((req, res, next) => {
    const now = Date.now();
    const cacheKey = `${req.method} ${req.url}`;

    // Solo loggear si no se ha loggeado recientemente o es una ruta importante
    const shouldLog = !logCache.has(cacheKey) ||
      (now - logCache.get(cacheKey)) > LOG_CACHE_DURATION ||
      !req.url.includes('/api/global-theme-config') ||
      !req.url.includes('/api/global-template-config') ||
      req.url === '/' ||
      req.url.startsWith('/admin') ||
      req.url.startsWith('/panelAdmin') ||
      req.url.startsWith('/adminLogin') ||
      req.url.includes('/api/login') ||
      req.url.includes('/api/auth/me') ||
      req.url.includes('/api/admin/generate-admin-token');

    if (shouldLog) {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      logCache.set(cacheKey, now);

      // Limpiar cache antigua
      for (const [key, timestamp] of logCache.entries()) {
        if (now - timestamp > LOG_CACHE_DURATION) {
          logCache.delete(key);
        }
      }
    }

    next();
  });
}

// Configuración de archivos estáticos ANTES de las rutas
app.use("/css", express.static(path.join(__dirname, "../css"), { maxAge: "1d" }));
app.use("/scripts/frontend", express.static(path.join(__dirname, "./frontend"), {
  maxAge: "1d",
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));
app.use("/scripts/utils", express.static(path.join(__dirname, "./utils"), {
  maxAge: "1d",
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));
app.use("/scripts/templates", express.static(path.join(__dirname, "./templates"), {
  maxAge: "1d",
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/recursos", express.static(path.join(__dirname, "../recursos")));
app.use("/html", express.static(path.join(__dirname, "../html"), { maxAge: "1d" }));
app.use("/admin", express.static(path.join(__dirname, "../admin"), { maxAge: "1d" }));
// Rutas específicas para archivos del admin
app.use("/admin/css", express.static(path.join(__dirname, "../admin/css"), { maxAge: "1d" }));
app.use("/admin/js", express.static(path.join(__dirname, "../admin/js"), {
  maxAge: "1d",
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));
// app.use("/downloads", express.static(path.join(__dirname, "../downloads")));

// Servir favicon desde la raíz
app.use("/favicon.ico", express.static(path.join(__dirname, "../favicon.ico"), { maxAge: "1d" }));

// Middleware para manejar rutas .well-known (Chrome DevTools, etc.)
app.use('/.well-known', (req, res) => {
  // Responder con 404 silencioso para evitar logs innecesarios
  res.status(404).end();
});

// Configuración de multer para subir archivos
const upload = multer({ dest: path.join(__dirname, "../uploads") });

// Crear carpetas necesarias si no existen
[
  path.join(__dirname, "../downloads"),
  path.join(__dirname, "../llaves"),
  path.join(__dirname, "../uploads"),
].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// =================== MIDDLEWARE PARA MODO OFFLINE ===================

// Middleware para detectar estado de base de datos
app.use(async (req, res, next) => {
  // Solo verificar para rutas que requieren BD
  const dbRequiredRoutes = ['/api/auth/login', '/api/auth/register', '/api/keys', '/api/documents'];

  const requiresDb = dbRequiredRoutes.some(route => req.path.startsWith(route));

  if (requiresDb) {
    try {
      const pool = require('./db/pool');
      const connection = await pool.getConnection();
      connection.release();
      // BD está disponible
      res.locals.dbAvailable = true;
    } catch (error) {
      // BD no está disponible
      res.locals.dbAvailable = false;

      // Para rutas de API, devolver error específico
      if (req.path.startsWith('/api/')) {
        return res.status(503).json({
          success: false,
          message: 'Base de datos no disponible. Por favor, instala la base de datos desde el panel de administración.',
          offline: true,
          installUrl: '/panelAdmin'
        });
      }
    }
  }

  next();
});

// =================== RUTAS QUE FUNCIONAN EN MODO OFFLINE ===================

// Ruta principal - funciona sin BD
app.get("/", (req, res) => {
  try {
    const filePath = path.join(__dirname, "../html/index.html");

    if (!fs.existsSync(filePath)) {
      console.error(`Archivo no encontrado: ${filePath}`);
      return res.status(200).send("App is running - HTML file not found");
    }

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error al cargar la página principal:", err);
        if (!res.headersSent) {
          res.status(200).send("App is running - Error loading HTML");
        }
      }
    });
  } catch (error) {
    console.error("Error en ruta principal:", error);
    if (!res.headersSent) {
      res.status(200).send("App is running - Exception occurred");
    }
  }
});

// Health check endpoint para Railway
app.get('/health', async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'disconnected'
    });
  }
});

// Panel de administración - funciona sin BD (para instalar BD)
// REMOVIDO: Esta ruta estaba duplicada, se mantiene solo la versión más abajo

// Login de administración - funciona sin BD
// REMOVIDO: Ruta duplicada, se mantiene la versión más abajo


// =================== RUTAS LIMPIAS PARA SECCIONES PRINCIPALES ===================

// Rutas limpias que redirigen a hashes en la página principal
app.get('/inicio', (req, res) => res.redirect('/#inicio'));
app.get('/firmar', (req, res) => res.redirect('/#firmar'));
app.get('/verificar', (req, res) => res.redirect('/#verificar'));
app.get('/perfil', (req, res) => res.redirect('/#perfil'));
app.get('/contacto', (req, res) => res.redirect('/#contacto'));

// =================== RUTAS LIMPIAS PARA PANEL DE ADMINISTRACIÓN ===================

// Ruta limpia para panel de administración principal
app.get('/panelAdmin', (req, res) => {
  const filePath = path.join(__dirname, "../admin/html/panelAdmin.html");
  if (!fs.existsSync(filePath)) {
    console.error(`Archivo no encontrado: ${filePath}`);
    return res.status(404).send("Panel de administración no encontrado");
  }
  res.sendFile(filePath);
});

// Ruta limpia para login de administración
app.get('/adminLogin', (req, res) => {
  const filePath = path.join(__dirname, "../admin/html/loginAdminPanel.html");
  if (!fs.existsSync(filePath)) {
    console.error(`Archivo no encontrado: ${filePath}`);
    return res.status(404).send("Página de login de administración no encontrada");
  }
  res.sendFile(filePath);
});

// Alias para /admin -> redirige a /panelAdmin
app.get('/admin', (req, res) => res.redirect('/panelAdmin'));

// =================== RUTAS LIMPIAS PARA PÁGINAS DE ERROR ===================

// Ruta limpia para página 403 (acceso denegado)
app.get('/acceso-denegado', (req, res) => {
  const filePath = path.join(__dirname, "../html/403-unauthorized.html");
  if (!fs.existsSync(filePath)) {
    console.error(`Archivo no encontrado: ${filePath}`);
    return res.status(404).send("Página de error no encontrada");
  }
  res.sendFile(filePath);
});

// Alias para /forbidden -> redirige a /acceso-denegado
app.get('/forbidden', (req, res) => res.redirect('/acceso-denegado'));

// =================== REDIRECCIONES PARA COMPATIBILIDAD ===================

// Redirecciones de URLs antiguas a nuevas rutas limpias
app.get('/admin/html/panelAdmin.html', (req, res) => res.redirect(301, '/panelAdmin'));
app.get('/admin/html/loginAdminPanel.html', (req, res) => res.redirect(301, '/adminLogin'));

// Redirecciones para página 403
app.get('/403', (req, res) => res.redirect(301, '/acceso-denegado'));
app.get('/forbidden', (req, res) => res.redirect(301, '/acceso-denegado'));


// =================== Routers backend ===================

const authRoutes = require('./routes/auth.routes');
const keysRoutes = require('./routes/keys.routes');
const pdfTemplateRoutes = require('./routes/pdfTemplate.routes');
const profileRoutes = require('./routes/profile.routes');
const adminRoutes = require('./routes/admin.routes');
const visualConfigRoutes = require('./routes/visualConfig.routes');

app.use(authRoutes);
app.use(keysRoutes);
app.use('/api/pdf-template', pdfTemplateRoutes);
app.use(adminRoutes);  // ✅ Sin prefijo - las rutas incluyen /api/admin/ completos
app.use(profileRoutes);
app.use('/api', visualConfigRoutes);

// =================== Rutas para configuración de plantillas ===================

// ========================================
// CONFIGURACIÓN GLOBAL DE TEMPLATES UNIFICADA
// ========================================

let globalTemplateConfig = {
  selectedTemplate: 'clasico',
  logo: null,
  institutionName: 'Universidad Ejemplo'
};

// Cargar configuración desde la base de datos al iniciar
async function loadGlobalTemplateConfig() {
  try {
    const [rows] = await pool.query("SELECT * FROM global_template_config ORDER BY id DESC LIMIT 1");
    if (rows.length > 0) {
      globalTemplateConfig.selectedTemplate = rows[0].template_name;
      globalTemplateConfig.logo = rows[0].logo_path;
      globalTemplateConfig.institutionName = rows[0].institution_name;
    }
  } catch (error) {
    console.error('❌ Error cargando configuración global:', error);
  }
}

// Llamar al cargar la aplicación
loadGlobalTemplateConfig();

// Ruta para guardar configuración global (solo para owners)
app.post('/api/save-global-template-config', authenticate, async (req, res) => {
  try {
    // Verificar que el usuario sea owner
    const [userRows] = await pool.query("SELECT rol FROM users WHERE id = ?", [req.userId]);
    if (userRows.length === 0 || userRows[0].rol !== 'owner') {
      return res.status(403).json({ error: 'Solo los owners pueden cambiar la configuración global' });
    }

    const { template, logo, institutionName } = req.body;

    if (template) {
      globalTemplateConfig.selectedTemplate = template;
    }

    if (logo !== undefined) {
      globalTemplateConfig.logo = logo;
    }

    if (institutionName) {
      globalTemplateConfig.institutionName = institutionName;
    }

    // Guardar en la base de datos
    await pool.query(
      "UPDATE global_template_config SET template_name = ?, logo_path = ?, institution_name = ? WHERE id = 1",
      [globalTemplateConfig.selectedTemplate, globalTemplateConfig.logo, globalTemplateConfig.institutionName]
    );

    res.json({
      success: true,
      template: globalTemplateConfig.selectedTemplate,
      hasLogo: !!globalTemplateConfig.logo,
      institutionName: globalTemplateConfig.institutionName
    });

  } catch (error) {
    console.error('❌ Error guardando configuración global:', error);
    res.status(500).json({ error: 'Error guardando configuración' });
  }
});

// Ruta para obtener configuración global
app.get('/api/global-template-config', (req, res) => {
  // Solo loggear ocasionalmente para evitar spam
  res.json(globalTemplateConfig);
});
// Guardar configuración de plantilla (LEGACY - mantener por compatibilidad)
app.post('/api/save-template-config', authenticate, (req, res) => {
  try {
    if (req.userRole !== 'admin' && req.userRole !== 'owner') {
      return res.status(403).json({
        success: false,
        error: 'Solo los propietarios y administradores pueden cambiar la configuración de plantillas'
      });
    }

    const { template, logo } = req.body;

    if (template) {
      globalTemplateConfig.selectedTemplate = template;
    }

    if (logo !== undefined) {
      globalTemplateConfig.logo = logo;
    }

    res.json({ success: true, message: 'Configuración guardada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener configuración de plantilla (LEGACY - mantener por compatibilidad)
app.get('/api/template-config', (req, res) => {
  // Log reducido para legacy endpoint
  res.json(globalTemplateConfig);
});

// =================== Rutas de configuración ===================
const configPath = path.join(__dirname, "../config.json");

app.get("/api/config", (req, res) => {
  if (!fs.existsSync(configPath)) return res.json({});
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  res.json(config);
});

// Endpoint público para obtener configuración global de temas
app.get('/api/global-theme-config', async (req, res) => {
  try {
    const pool = require('./db/pool');

    // Intentar cargar desde base de datos
    try {
      const [rows] = await pool.execute(
        'SELECT selected_theme, custom_color, timestamp, updated_by FROM theme_config WHERE id = 1'
      );

      if (rows.length > 0) {
        const dbConfig = {
          selectedTheme: rows[0].selected_theme,
          customColor: rows[0].custom_color,
          timestamp: rows[0].timestamp,
          updatedBy: rows[0].updated_by
        };

        return res.json({
          success: true,
          theme: dbConfig
        });
      }
    } catch (dbError) {
      console.warn('Error leyendo configuración de BD:', dbError);
    }

    // Configuración por defecto si no hay nada en BD
    const defaultConfig = {
      selectedTheme: 'orange',
      customColor: null,
      timestamp: Date.now()
    };

    return res.json({
      success: true,
      theme: defaultConfig
    });

    res.json({
      success: true,
      theme: defaultConfig
    });
  } catch (error) {
    console.error('Error obteniendo configuración global de tema:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

app.post("/api/config", authenticate, (req, res) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({ error: "No tienes permisos para realizar esta acción" });
  }
  try {
    const config = req.body;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error("Error al guardar configuraciones:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// =================== Rutas de firma y verificación ===================
app.post("/sign-document", authenticate, upload.single("document"), async (req, res) => {
  const userId = req.userId;
  const keyPassword = req.body.keyPassword;
  const { renderPdfWithTemplate } = require("./utils/pdfGenerator.backend");

  try {
    // Obtener la llave privada activa del usuario
    const [rows] = await pool.query(
      "SELECT private_key, encryption_type, expiration_date FROM user_keys WHERE id = (SELECT active_key_id FROM users WHERE id = ?)",
      [userId]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: "No hay una llave activa seleccionada" });
    }

    const encryptedPrivateKey = rows[0].private_key;
    const encryptionType = rows[0].encryption_type || "aes-256-cbc";
    let privateKey;
    try {
      privateKey = decryptWithType(encryptedPrivateKey, keyPassword, encryptionType);
    } catch (err) {
      return res.status(401).json({ error: "Contraseña incorrecta o llave corrupta." });
    }
    const expirationDate = new Date(rows[0].expiration_date);
    const now = new Date();
    if (now > expirationDate) {
      return res.status(400).json({ error: "La llave activa ha expirado. Por favor, genere una nueva llave." });
    }

    // Guardar la llave privada en un archivo temporal
    const tempDir = path.join(__dirname, "../uploads");
    const privateKeyPath = path.join(tempDir, `private_key_${Date.now()}.pem`);
    fs.writeFileSync(privateKeyPath, privateKey, "utf8");

    // Firmar el documento con la llave privada
    const documentPath = req.file.path;
    const signedFilePath = `${documentPath}.signed`;
    const { exec } = require("child_process");
    const signCommand = `openssl dgst -sign "${privateKeyPath}" -keyform PEM -sha256 -out "${signedFilePath}" "${documentPath}"`;
    exec(signCommand, async (err) => {
      fs.unlinkSync(privateKeyPath);
      if (err) {
        console.error("Error al firmar documento:", err);
        return res.status(500).json({ error: "Error al firmar el documento" });
      }
      const signatureBinary = fs.readFileSync(signedFilePath);
      const signatureBase64 = signatureBinary.toString("base64").trim();

      // Obtener información del firmante para los metadatos
      const [userInfo] = await pool.query(
        "SELECT id, nombre, usuario FROM users WHERE id = ?",
        [userId]
      );

      // Usar configuración global de plantillas unificada con el sistema modular
      let templateName = globalTemplateConfig.selectedTemplate; // 'clasico', 'moderno', etc.


      // Datos a renderizar usando configuración global
      const data = {
        titulo: req.body.titulo || 'DOCUMENTO OFICIAL AVALADO',
        autores: req.body.autores || userInfo[0].nombre,
        institucion: req.body.institucion || globalTemplateConfig.institutionName,
        avalador: `Avalado por: ${userInfo[0].nombre}`,
        fecha: new Date().toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        logo: globalTemplateConfig.logo || path.join(__dirname, '../recursos', 'logotipo-de-github.png'),
        // Agregar datos de firma electrónica
        signatureData: req.body.signatureData || null,
        signatureMethod: req.body.signatureMethod || null,
        // Agregar contenido básico del documento
        contenido: 'Este documento ha sido procesado y avalado digitalmente a través del sistema de firmas Digitales. La autenticidad e integridad del contenido está garantizada mediante tecnología criptográfica.'
      };

      // Crear PDF base (hoja en blanco tamaño carta)
      const { PDFDocument } = require('pdf-lib');
      const blankPdfDoc = await PDFDocument.create();
      blankPdfDoc.addPage([612, 792]); // Carta
      const blankPdfBytes = await blankPdfDoc.save();
      const tempBlankPath = path.join(tempDir, `blank_${Date.now()}.pdf`);
      fs.writeFileSync(tempBlankPath, blankPdfBytes);

      // Renderizar PDF con plantilla usando el sistema modular
      const avaladoFilePath = path.join(__dirname, "../downloads", `avalado_${Date.now()}.pdf`);

      // El TemplateManager manejará la configuración específica de la plantilla
      await renderPdfWithTemplate(tempBlankPath, avaladoFilePath, data, { templateName });

      // Insertar metadatos de firma
      const finalPdfBytes = fs.readFileSync(avaladoFilePath);
      const finalPdfDoc = await PDFDocument.load(finalPdfBytes);
      finalPdfDoc.setSubject(signatureBase64);
      finalPdfDoc.setAuthor(`${userInfo[0].id}|${userInfo[0].nombre}|${userInfo[0].usuario}`);
      finalPdfDoc.setTitle("Documento Avalado");
      finalPdfDoc.setKeywords(["firma digital", "avalado", "documento"]);
      finalPdfDoc.setCreator("Firmas Digitales FD");
      finalPdfDoc.setCreationDate(new Date());
      finalPdfDoc.setModificationDate(new Date());
      const finalBytes = await finalPdfDoc.save();
      fs.writeFileSync(avaladoFilePath, finalBytes);

      // Limpieza de archivos temporales
      fs.unlinkSync(documentPath);
      fs.unlinkSync(signedFilePath);
      fs.unlinkSync(tempBlankPath);

      res.json({ success: true, downloadUrl: `/downloads/${path.basename(avaladoFilePath)}` });
    });
  } catch (err) {
    console.error("Error en el proceso de firma:", err);
    res.status(500).json({ error: "Error en el proceso de firma" });
  }
});

// Ruta para extraer metadatos del documento firmado
app.post("/extract-signer-info", authenticate, upload.single("signedFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se proporcionó archivo firmado." });
    }

    const signedFile = req.file;
    const pdfBytes = fs.readFileSync(signedFile.path);

    // Usar pdf-lib para leer metadatos
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const author = pdfDoc.getAuthor();
    const subject = pdfDoc.getSubject();

    // Limpiar archivo temporal
    fs.unlinkSync(signedFile.path);

    if (!author || !author.includes('|')) {
      return res.json({
        success: false,
        message: "El documento no contiene información del firmante válida."
      });
    }

    // Parsear información del firmante (formato: id|nombre|usuario)
    const [signerUserId, signerName, signerUsername] = author.split('|');

    // Verificar que el firmante existe en la base de datos
    const [userRows] = await pool.query(
      "SELECT id, nombre, usuario FROM users WHERE id = ? AND rol = 'profesor'",
      [signerUserId]
    );

    if (userRows.length === 0) {
      return res.json({
        success: false,
        message: "El firmante del documento no se encuentra en el sistema o no es un profesor."
      });
    }

    res.json({
      success: true,
      signer: {
        id: parseInt(signerUserId),
        nombre: signerName,
        usuario: signerUsername
      },
      message: `Documento firmado por: ${signerName}`
    });

  } catch (error) {
    console.error("Error al extraer información del firmante:", error);

    // Limpiar archivo temporal en caso de error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error("Error al limpiar archivo temporal:", e);
      }
    }

    res.status(500).json({
      success: false,
      error: "Error al procesar el documento firmado."
    });
  }
});

// Endpoint público para obtener profesores (sin autenticación requerida)
app.get('/api/profesores', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre FROM users WHERE rol = 'profesor'");
    res.json(rows);
  } catch (err) {
    console.error("Error SQL profesores:", err);
    res.status(500).json({ error: "Error al obtener profesores/tutores" });
  }
});

// Endpoint con autenticación para profesores (mantener por compatibilidad)
app.get('/api/profesores-auth', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre FROM users WHERE rol = 'profesor'");
    res.json(rows);
  } catch (err) {
    console.error("Error SQL profesores:", err);
    res.status(500).json({ error: "Error al obtener profesores/tutores" });
  }
});

app.post("/verify-document", authenticate, upload.fields([
  { name: "signedFile", maxCount: 1 },
  { name: "originalFile", maxCount: 1 }
]), async (req, res) => {
  const profesorId = req.body.profesorId;

  // Validaciones iniciales
  if (!profesorId) {
    return res.status(400).json({ error: "ID del profesor/tutor es requerido." });
  }

  if (!req.files || !req.files.signedFile || !req.files.signedFile[0]) {
    return res.status(400).json({ error: "El archivo avalado es requerido." });
  }

  if (!req.files.originalFile || !req.files.originalFile[0]) {
    return res.status(400).json({ error: "El archivo original es requerido." });
  }

  try {
    const { signedFile, originalFile } = req.files;

    // Verificar si los archivos son idénticos
    if (signedFile[0].originalname === originalFile[0].originalname &&
      signedFile[0].size === originalFile[0].size) {

      // Verificar contenido para confirmar
      const signedContent = fs.readFileSync(signedFile[0].path);
      const originalContent = fs.readFileSync(originalFile[0].path);

      if (signedContent.equals(originalContent)) {
        return res.status(400).json({
          error: "Los archivos subidos son idénticos. El archivo avalado debe ser diferente al archivo original."
        });
      }
    }

    const [rows] = await pool.query(
      "SELECT public_key FROM user_keys WHERE user_id = (SELECT id FROM users WHERE id = ?) ORDER BY created_at DESC LIMIT 1",
      [profesorId]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: "No se encontró la llave pública del profesor/tutor seleccionado." });
    }
    const encryptedPublicKey = rows[0].public_key;
    const publicKey = decryptAES(encryptedPublicKey, String(profesorId), 'aes-256-cbc');
    const signedPdfBytes = fs.readFileSync(signedFile[0].path);
    const pdfDoc = await PDFDocument.load(signedPdfBytes);
    const signatureBase64 = pdfDoc.getSubject()?.trim();
    if (!signatureBase64) {
      return res.status(400).json({
        verified: false,
        message: "El documento no contiene una firma válida en los metadatos."
      });
    }
    const signatureBuffer = Buffer.from(signatureBase64, "base64");
    const signaturePath = path.join(__dirname, "../uploads", `firma_${Date.now()}.bin`);
    fs.writeFileSync(signaturePath, signatureBuffer);
    const publicKeyPath = path.join(__dirname, "../uploads", `public_key_${Date.now()}.pem`);
    fs.writeFileSync(publicKeyPath, publicKey);
    const { exec } = require("child_process");
    const command = `openssl dgst -verify "${publicKeyPath}" -keyform PEM -sha256 -signature "${signaturePath}" "${originalFile[0].path}"`;
    exec(command, (error, stdout, stderr) => {
      let result = {
        valid: false,
        professorMatch: false,
        signatureMatch: false,
        message: ""
      };

      if (error) {
        if (stderr.includes("block type is not 01") || stderr.includes("padding check failed")) {
          result.message = "La llave pública del profesor/tutor seleccionado NO corresponde con la firma del documento avalado. Por favor, selecciona otro profesor/tutor.";
          result.reason = "key_mismatch";
          return res.json(result);
        } else {
          result.message = "El profesor/tutor seleccionado sí avaló el documento, pero el archivo original NO coincide con el aval. El documento pudo haber sido modificado.";
          result.reason = "invalid_signature";
          return res.json(result);
        }
      } else if (stdout.includes("Verified OK")) {
        result.valid = true;
        result.professorMatch = true;
        result.signatureMatch = true;
        result.message = "✅ El profesor/tutor seleccionado avaló el documento y la firma digital es válida. El documento no ha sido modificado.";
        return res.json(result);
      } else {
        result.professorMatch = true;
        result.signatureMatch = false;
        result.message = "El profesor/tutor seleccionado sí avaló el documento, pero el archivo original NO coincide con el aval. El documento pudo haber sido modificado.";
        result.reason = "invalid_signature";
        return res.json(result);
      }

      // Limpieza de archivos temporales
      try {
        fs.unlinkSync(signedFile[0].path);
        fs.unlinkSync(originalFile[0].path);
        fs.unlinkSync(signaturePath);
        fs.unlinkSync(publicKeyPath);
      } catch (e) {
        console.error("Error al limpiar archivos temporales:", e);
      }
    });
  } catch (error) {
    console.error("Error en el proceso de verificación:", error);
    res.status(500).json({ verified: false, message: "Error en el proceso de verificación." });
  }
});

// =================== Rutas protegidas por rol ===================
app.get('/admin-only', authenticate, isAdmin, (req, res) => {
  res.json({ message: "Solo admin y owner pueden ver esto" });
});
app.get('/owner-only', authenticate, isOwner, (req, res) => {
  res.json({ message: "Solo el owner puede ver esto" });
});

// =================== Manejo de errores global ===================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// =================== Manejo de rutas no encontradas ===================
app.use((req, res) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    message: `La ruta ${req.method} ${req.path} no existe`
  });
});

// =================== Rutas de descarga ===================
app.get('/downloads/:file', (req, res) => {
  const filePath = path.join(__dirname, '../downloads', req.params.file);
  res.download(filePath, (err) => {
    if (!err) {
      // Elimina el archivo después de descargarlo exitosamente
      fs.unlink(filePath, (e) => {
        if (e) console.error("Error al borrar archivo descargado:", e);
      });
    }
  });
});

// =================== Inicio del servidor ===================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

// =================== Manejo de errores del servidor ===================
server.on('error', (err) => {
  console.error('Error del servidor:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Puerto ${PORT} ya está en uso`);
  }
});

// =================== Manejo de errores no capturados ===================
process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  // No hacer exit aquí para evitar crashes
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
  // No hacer exit aquí para evitar crashes
});

// =================== Graceful shutdown ===================
process.on('SIGTERM', () => {
  console.log('🚨 SIGTERM recibido. Iniciando graceful shutdown...');

  server.close((err) => {
    if (err) {
      console.error('❌ Error al cerrar servidor:', err);
    } else {
      console.log('✅ Servidor cerrado correctamente.');
    }
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.log('⚠️ Forzando cierre después de timeout');
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  console.log('🚨 SIGINT recibido. Cerrando servidor gracefully...');
  server.close(() => {
    console.log('✅ Servidor cerrado.');
    process.exit(0);
  });
});


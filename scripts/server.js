
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

const express = require("express");
const app = express();
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const pool = require('./db/pool');
const authenticate = require('./middlewares/authenticate');
const { configureAppSecurity } = require('./middlewares/security');
const { initializePrivilegedAccounts } = require('./utils/privilegedAccountBootstrap');
const {
  decryptWithType,
  signPayload,
  verifyPayloadSignature,
  generateFileHash,
  generateManifest,
  verifyManifest
} = require('./utils/crypto');
const PORT = process.env.PORT || 3000;

const authRoutes = require('./routes/auth.routes');
const keysRoutes = require('./routes/keys.routes');
const pdfTemplateRoutes = require('./routes/pdfTemplate.routes');
const profileRoutes = require('./routes/profile.routes');
const adminRoutes = require('./routes/admin.routes');
const visualConfigRoutes = require('./routes/visualConfig.routes');
const tutorialRoutes = require('./routes/tutorial.routes');


// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET no está configurado en las variables de entorno');
  console.error('Por favor, configura JWT_SECRET en Railway');
  process.exit(1);
}

if (Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) {
  const message = 'JWT_SECRET debe tener al menos 32 bytes para resistir ataques de fuerza bruta';
  if (process.env.NODE_ENV === 'production') {
    console.error(`ERROR: ${message}`);
    process.exit(1);
  }
  console.warn(`ADVERTENCIA: ${message}`);
}

// =================== Crear directorios necesarios ===================
function createRequiredDirectories() {
  const directories = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/admin'),
    path.join(__dirname, '../uploads/logos'),
    path.join(__dirname, '../downloads'),
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

}

// Crear directorios al iniciar el servidor
createRequiredDirectories();

const downloadsDirectory = path.resolve(__dirname, '../downloads');
const downloadTokens = new Map();
const DOWNLOAD_TOKEN_TTL_MS = 10 * 60 * 1000;

function removeFileQuietly(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error('No se pudo eliminar un archivo de descarga:', error.message);
  }
}

function cleanupExpiredDownloads() {
  const now = Date.now();
  for (const [token, entry] of downloadTokens.entries()) {
    if (entry.expiresAt <= now) {
      downloadTokens.delete(token);
      removeFileQuietly(entry.filePath);
    }
  }
}

function createDownloadToken(filePath, userId) {
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(`${downloadsDirectory}${path.sep}`)) {
    throw new Error('Ruta de descarga fuera del directorio permitido');
  }

  cleanupExpiredDownloads();
  const token = crypto.randomBytes(32).toString('hex');
  downloadTokens.set(token, {
    filePath: resolvedPath,
    userId: Number(userId),
    expiresAt: Date.now() + DOWNLOAD_TOKEN_TTL_MS
  });
  return token;
}

// Los archivos generados que hayan quedado huérfanos se eliminan al iniciar.
for (const entry of fs.readdirSync(downloadsDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || entry.name.startsWith('.')) continue;
  const filePath = path.join(downloadsDirectory, entry.name);
  try {
    const age = Date.now() - fs.statSync(filePath).mtimeMs;
    if (age > 24 * 60 * 60 * 1000) removeFileQuietly(filePath);
  } catch (error) {
    console.error('No se pudo revisar una descarga antigua:', error.message);
  }
}

const downloadCleanupTimer = setInterval(cleanupExpiredDownloads, 60 * 1000);
downloadCleanupTimer.unref();

// Middlewares globales: deben registrarse antes de cualquier ruta.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
configureAppSecurity(app);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
app.get("/scripts/utils/tutorial.js", (req, res) => {
  res.sendFile(path.join(__dirname, "utils/tutorial.js"), { maxAge: "1d" });
});
app.get("/scripts/utils/themeManager.js", (req, res) => {
  res.sendFile(path.join(__dirname, "utils/themeManager.js"), { maxAge: "1d" });
});
app.use("/uploads/admin", express.static(path.join(__dirname, "../uploads/admin")));
app.use("/recursos", express.static(path.join(__dirname, "../recursos")));
app.use("/html", express.static(path.join(__dirname, "../html"), { maxAge: "1d" }));
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
app.use("/admin", express.static(path.join(__dirname, "../admin"), { maxAge: "1d" }));
// Servir favicon desde la raíz
app.use("/favicon.ico", express.static(path.join(__dirname, "../favicon.ico"), { maxAge: "1d" }));

// Descarga de un solo uso. El archivo no queda publicado como contenido estático.
app.get('/downloads/:token', (req, res, next) => {
  const token = String(req.params.token || '');
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return res.status(404).json({ error: 'Descarga no encontrada o expirada' });
  }

  cleanupExpiredDownloads();
  const entry = downloadTokens.get(token);
  if (!entry || entry.expiresAt <= Date.now() || !fs.existsSync(entry.filePath)) {
    if (entry) {
      downloadTokens.delete(token);
      removeFileQuietly(entry.filePath);
    }
    return res.status(404).json({ error: 'Descarga no encontrada o expirada' });
  }

  // Consumir el token antes de enviar para impedir descargas concurrentes repetidas.
  downloadTokens.delete(token);
  res.setHeader('Cache-Control', 'no-store');
  return res.download(entry.filePath, path.basename(entry.filePath), (error) => {
    removeFileQuietly(entry.filePath);
    if (error && !res.headersSent) next(error);
  });
});

// Middleware para manejar rutas .well-known (Chrome DevTools, etc.)
app.use('/.well-known', (req, res) => {
  // Responder con 404 silencioso para evitar logs innecesarios
  res.status(404).end();
});

// Configuración general de archivos. Los anexos pueden ser de cualquier tipo,
// pero cada archivo tiene un límite para evitar agotar el almacenamiento.
const maxUploadSizeMb = Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 25;
const upload = multer({
  dest: path.join(__dirname, "../uploads"),
  limits: {
    fileSize: maxUploadSizeMb * 1024 * 1024,
    files: 51,
    fields: 50
  }
});

// =================== MIDDLEWARE PARA MODO OFFLINE ===================

// Middleware para detectar estado de base de datos
app.use(async (req, res, next) => {
  // Solo verificar para rutas que requieren BD
  const dbRequiredRoutes = ['/api/login', '/api/register', '/api/keys', '/api/documents'];

  const requiresDb = dbRequiredRoutes.some(route => req.path.startsWith(route));

  if (requiresDb) {
    try {
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
          message: 'Base de datos no disponible. Verifica la conexión e importa firmas_digitales_v2.sql desde tu proveedor.',
          offline: true
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
      error: 'database_unavailable',
      database: 'disconnected'
    });
  }
});

// Panel de administración - la interfaz puede abrirse aunque la BD esté desconectada.
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
app.get('/tutorial', (req, res) => {
  const filePath = path.join(__dirname, "../html/tutorial.html");
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Tutorial no encontrado");
  }
  res.sendFile(filePath);
});

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

// =================== REDIRECCIONES PARA COMPATIBILIDAD ===================

// Redirecciones de URLs antiguas a nuevas rutas limpias
app.get('/admin/html/panelAdmin.html', (req, res) => res.redirect(301, '/panelAdmin'));
app.get('/admin/html/loginAdminPanel.html', (req, res) => res.redirect(301, '/adminLogin'));

// Redirecciones para página 403
app.get('/403', (req, res) => res.redirect(301, '/acceso-denegado'));
app.get('/forbidden', (req, res) => res.redirect(301, '/acceso-denegado'));


// =================== Routers backend ===================
app.use('/api', authRoutes);
app.use(keysRoutes);
app.use('/api/pdf-template', pdfTemplateRoutes);
app.use(adminRoutes);
app.use(profileRoutes);
app.use('/api', visualConfigRoutes);
app.use('/api/tutorial', tutorialRoutes);

// =================== Rutas para configuración de plantillas ===================

// ========================================
// CONFIGURACIÓN GLOBAL DE PDF - SISTEMA MODERNIZADO
// ========================================
// ✅ La configuración global ahora se maneja a través del controlador pdfTemplate.controller.js
// ✅ Usa la tabla global_pdf_config en lugar de archivos JSON o global_template_config
// ✅ Todas las rutas están disponibles en /api/pdf-template/*

// =================== Rutas de firma y verificación ===================
function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (error) {
    console.error('No se pudo limpiar un archivo temporal:', error.message);
  }
}

function cleanupUploadedFiles(req) {
  if (req.file && req.file.path) safeUnlink(req.file.path);
  if (!req.files) return;
  Object.values(req.files).flat().forEach(file => safeUnlink(file && file.path));
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function getPdfKeywordText(pdfDoc) {
  const keywords = pdfDoc.getKeywords();
  if (Array.isArray(keywords)) return keywords.join(' ');
  return typeof keywords === 'string' ? keywords : '';
}

function getSecurityKeyword(keywordText, name) {
  const match = keywordText.match(new RegExp(`(?:^|[\\s,;])${name}:([^\\s,;]+)`, 'i'));
  return match ? match[1] : null;
}

function extractPdfSecurityMetadata(pdfDoc) {
  const keywordText = getPdfKeywordText(pdfDoc);
  const signerKeyword = getSecurityKeyword(keywordText, 'SIGNER_USER_ID');
  const signingKeyKeyword = getSecurityKeyword(keywordText, 'SIGNING_KEY_ID');
  const signatureVersion = getSecurityKeyword(keywordText, 'SIGNATURE_VERSION');
  const keywordSignerId = parsePositiveInteger(signerKeyword);
  const legacyAuthorId = parsePositiveInteger((pdfDoc.getAuthor() || '').split('|')[0]);
  const signerUserId = keywordSignerId || legacyAuthorId;
  const signingKeyId = parsePositiveInteger(signingKeyKeyword);
  const hasV2Metadata = signerKeyword !== null || signingKeyKeyword !== null || signatureVersion !== null;

  let invalidReason = null;
  if (hasV2Metadata && (!keywordSignerId || !signingKeyId || signatureVersion !== '2')) {
    invalidReason = 'Los metadatos criptograficos del documento estan incompletos o son invalidos.';
  } else if (keywordSignerId && legacyAuthorId && keywordSignerId !== legacyAuthorId) {
    invalidReason = 'Los identificadores del firmante dentro del documento no coinciden.';
  }

  return {
    keywordText,
    signerUserId,
    signingKeyId,
    signatureVersion,
    isLegacy: !hasV2Metadata,
    invalidReason
  };
}

async function getPublicKeyCandidates(signerUserId, signingKeyId = null) {
  if (!signerUserId) return [];
  if (signingKeyId) {
    const [rows] = await pool.query(
      'SELECT id, user_id, public_key, encryption_type FROM user_keys WHERE id = ? AND user_id = ? LIMIT 1',
      [signingKeyId, signerUserId]
    );
    return rows;
  }
  // Un documento legado solo puede probar llaves pertenecientes al firmante embebido.
  const [rows] = await pool.query(
    'SELECT id, user_id, public_key, encryption_type FROM user_keys WHERE user_id = ? ORDER BY created_at DESC LIMIT 100',
    [signerUserId]
  );
  return rows;
}

function verifyWithPublicKeyCandidates(payload, signatureBase64, keyRows) {
  let decryptableKeyCount = 0;
  for (const row of keyRows) {
    try {
      const publicKey = decryptWithType(
        row.public_key,
        String(row.user_id),
        row.encryption_type
      );
      decryptableKeyCount += 1;
      if (verifyPayloadSignature(payload, signatureBase64, publicKey)) {
        return { verified: true, keyId: Number(row.id), decryptableKeyCount };
      }
    } catch (error) {
      console.error(`No se pudo usar la llave publica ${row.id}:`, error.message);
    }
  }
  return { verified: false, keyId: null, decryptableKeyCount };
}

app.post("/sign-document", authenticate, upload.fields([{ name: "document", maxCount: 1 }, { name: "attachments", maxCount: 50 }]), async (req, res) => {
  const userId = req.userId;
  const keyPassword = req.body.keyPassword;
  const { renderPdfWithTemplate } = require("./templates/template.manager");
  const { TemplateManager } = require("./templates/template.manager");
  let tempBlankPath = null;
  let avaladoFilePath = null;
  let completed = false;

  try {
    if (!req.files || !req.files.document || !req.files.document[0]) {
      return res.status(400).json({ error: "El documento PDF es requerido." });
    }
    if (typeof keyPassword !== 'string' || keyPassword.length === 0 || keyPassword.length > 1024) {
      return res.status(400).json({ error: "La contrasena de la llave no es valida." });
    }
    // Obtener la llave privada activa del usuario
    const [rows] = await pool.query(
      "SELECT id, user_id, private_key, encryption_type, expiration_date FROM user_keys WHERE id = (SELECT active_key_id FROM users WHERE id = ?) AND user_id = ?",
      [userId, userId]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: "No hay una llave activa seleccionada" });
    }

    const encryptedPrivateKey = rows[0].private_key;
    const encryptionType = rows[0].encryption_type;
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
    const signingKeyId = Number(rows[0].id);

    // Firmar el documento con la llave privada
    const documentPath = req.files.document[0].path;
    const documentBytes = fs.readFileSync(documentPath);
    const signatureBase64 = signPayload(documentBytes, privateKey);

    // Normalizar rutas para OpenSSL (evitar problemas con letras de unidad en Windows)
    {
      // NO eliminar privateKeyPath aquí - se necesita para firmar manifest si hay anexos
      // ==================== PREPARAR INFORMACIÓN DE ANEXOS ====================
      let attachmentCount = 0;
      let attachmentNames = [];
      let hasAttachments = false;

      if (req.files.attachments && req.files.attachments.length > 0) {
        hasAttachments = true;
        attachmentCount = req.files.attachments.length;
        attachmentNames = req.files.attachments.map(f => f.originalname);
      }

      // Obtener información del firmante para los metadatos
      const [userInfo] = await pool.query(
        "SELECT id, nombre, usuario, email FROM users WHERE id = ?",
        [userId]
      );

      // Cargar configuración global de PDF desde la base de datos
      const [pdfConfigRows] = await pool.query(
        "SELECT selected_template, color_config, font_config, layout_config, border_config, visual_config FROM global_pdf_config WHERE id = 1"
      );

      // Cargar configuración visual (incluyendo logo)
      const [visualConfigRows] = await pool.query(
        "SELECT institution_name, logo_data, logo_mimetype FROM visual_config WHERE id = 1"
      );

      // Configuración por defecto si no existe
      const defaultPdfConfig = {
        selected_template: 'clasico',
        color_config: JSON.stringify({ primary: '#1f2937', secondary: '#4b5563', accent: '#f59e0b' }),
        font_config: JSON.stringify({ title: 'Times-Bold', body: 'Times-Roman', signature: 'Times-Bold' }),
        layout_config: JSON.stringify({ marginTop: 60, marginBottom: 60, marginLeft: 50, marginRight: 50, titleSize: 28, bodySize: 14 }),
        border_config: JSON.stringify({ style: 'solid', width: 1, color: '#1f2937' }),
        visual_config: JSON.stringify({ showInstitution: true, showAuthors: true, showDate: true, showAvalador: true, showSignature: true, showLogo: true, showBackground: false })
      };

      const defaultInstitutionName = 'Firmas Digitales FD';

      // Usar configuración de la base de datos o valores por defecto
      const pdfConfig = pdfConfigRows.length > 0 ? pdfConfigRows[0] : defaultPdfConfig;
      const institutionName = visualConfigRows.length > 0 ? visualConfigRows[0].institution_name : defaultInstitutionName;

      // Preparar datos del logo para la función drawLogo
      let logoData = null;
      if (visualConfigRows.length > 0 && visualConfigRows[0].logo_data && Buffer.isBuffer(visualConfigRows[0].logo_data) && visualConfigRows[0].logo_data.length > 0) {
        logoData = {
          buffer: visualConfigRows[0].logo_data,
          mimetype: visualConfigRows[0].logo_mimetype || 'image/png'
        };
      }

      // Preparar configuración completa para el template manager
      const templateConfig = {
        selectedTemplate: pdfConfig.selected_template,
        colorConfig: typeof pdfConfig.color_config === 'string' ? JSON.parse(pdfConfig.color_config || '{}') : pdfConfig.color_config,
        fontConfig: typeof pdfConfig.font_config === 'string' ? JSON.parse(pdfConfig.font_config || '{}') : pdfConfig.font_config,
        layoutConfig: typeof pdfConfig.layout_config === 'string' ? JSON.parse(pdfConfig.layout_config || '{}') : pdfConfig.layout_config,
        borderConfig: typeof pdfConfig.border_config === 'string' ? JSON.parse(pdfConfig.border_config || '{}') : pdfConfig.border_config,
        visualConfig: typeof pdfConfig.visual_config === 'string' ? JSON.parse(pdfConfig.visual_config || '{}') : pdfConfig.visual_config
      };

      // Usar configuración global de plantillas unificada con el sistema modular
      let templateName = pdfConfig.selected_template; // 'clasico', 'moderno', etc.

      // Datos a renderizar usando configuración global
      const data = {
        titulo: req.body.titulo || 'DOCUMENTO OFICIAL AVALADO',
        autores: Array.isArray(req.body.autores) ? req.body.autores : [req.body.autores || userInfo[0].nombre],
        institucion: institutionName, // ✅ SIEMPRE usar el valor de la base de datos
        avaladoPor: userInfo[0].nombre,
        correoFirmante: userInfo[0].email || null,
        ubicacion: req.body.ubicacion || TemplateManager.detectSystemLocation(),
        modalidad: req.body.modalidad || 'Programa de Ingeniería Multimedia',
        fecha: new Date().toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        logoData: logoData, // Cambiar de logo a logoData
        // Agregar datos de firma electrónica solo si existen
        ...(req.body.signatureData && req.body.signatureData !== 'null' && req.body.signatureData !== 'undefined' && req.body.signatureData !== 'NaN' && req.body.signatureData.trim() !== '' ? {
          signatureData: req.body.signatureData,
          signatureMethod: req.body.signatureMethod
        } : {}),
        // Agregar información de anexos
        hasAttachments: hasAttachments,
        attachmentCount: attachmentCount,
        attachmentNames: attachmentNames,
        // Agregar configuración para la plantilla
        config: templateConfig,
        // Agregar contenido básico del documento
        contenido: 'Este documento ha sido procesado y avalado digitalmente a través del sistema de firmas Digitales. La autenticidad e integridad del contenido está garantizada mediante tecnología criptográfica.'
      };

      // Crear PDF base (hoja en blanco tamaño carta)
      const blankPdfDoc = await PDFDocument.create();
      blankPdfDoc.addPage([612, 792]); // Carta
      const blankPdfBytes = await blankPdfDoc.save();
      tempBlankPath = path.join(tempDir, `blank_${Date.now()}.pdf`);
      fs.writeFileSync(tempBlankPath, blankPdfBytes);

      // Renderizar PDF con plantilla usando el sistema modular
      avaladoFilePath = path.join(__dirname, "../downloads", `avalado_${Date.now()}.pdf`);

      // El TemplateManager manejará la configuración específica de la plantilla
      await renderPdfWithTemplate(tempBlankPath, avaladoFilePath, data, templateConfig);

      // Insertar metadatos de firma
      const finalPdfBytes = fs.readFileSync(avaladoFilePath);
      const finalPdfDoc = await PDFDocument.load(finalPdfBytes);
      finalPdfDoc.setSubject(signatureBase64);
      finalPdfDoc.setAuthor(`${userInfo[0].id}|${userInfo[0].nombre}|${userInfo[0].usuario}`);
      finalPdfDoc.setTitle("Documento Avalado");
      finalPdfDoc.setKeywords([
        "firma digital",
        "avalado",
        "documento",
        "SIGNATURE_VERSION:2",
        "SIGNATURE_ALGORITHM:RSA-SHA256",
        `SIGNER_USER_ID:${userId}`,
        `SIGNING_KEY_ID:${signingKeyId}`
      ]);
      finalPdfDoc.setCreator(institutionName);
      finalPdfDoc.setCreationDate(new Date());
      finalPdfDoc.setModificationDate(new Date());

      // ==================== PROCESAMIENTO DE ANEXOS ====================
      let manifestSignature = null;
      let manifestJson = null;
      let totalAttachmentSize = 0;

      if (req.files.attachments && req.files.attachments.length > 0) {
        const attachmentFiles = req.files.attachments.map(file => ({
          name: file.originalname,
          buffer: fs.readFileSync(file.path),
          mimetype: file.mimetype
        }));

        // Almacenar nombres de anexos
        attachmentNames = attachmentFiles.map(f => f.name);

        // Generar manifest determinista
        manifestJson = generateManifest(attachmentFiles, {
          signerId: userId,
          signingKeyId,
          documentSignature: signatureBase64
        });

        // Firmar el manifest con la llave privada del usuario
        manifestSignature = signPayload(manifestJson, privateKey);

        // Calcular estadísticas de anexos
        attachmentCount = attachmentFiles.length;
        totalAttachmentSize = attachmentFiles.reduce((sum, f) => sum + f.buffer.length, 0);

        // Embeber manifest completo en base64 en Keywords (Producer tiene límite de caracteres)
        const manifestBase64 = Buffer.from(manifestJson).toString('base64');
        const manifestDataKeyword = `MANIFEST_JSON:${manifestBase64}`;
        const manifestSigKeyword = `ATTACHMENT_MANIFEST_SIG:${manifestSignature}`;
        finalPdfDoc.setKeywords([
          "firma digital",
          "avalado",
          "documento",
          "SIGNATURE_VERSION:2",
          "SIGNATURE_ALGORITHM:RSA-SHA256",
          `SIGNER_USER_ID:${userId}`,
          `SIGNING_KEY_ID:${signingKeyId}`,
          manifestDataKeyword,
          manifestSigKeyword
        ]);

        // Limpiar archivos temporales de anexos
        req.files.attachments.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      // Guardar PDF final con metadatos de anexos incluidos
      const finalBytes = await finalPdfDoc.save();
      fs.writeFileSync(avaladoFilePath, finalBytes);

      // Guardar manifest en base de datos si existen anexos
      if (manifestJson && manifestSignature) {
        const pdfBaseName = path.basename(avaladoFilePath);
        await pool.query(
          `INSERT INTO document_attachments (user_id, document_filename, manifest_json, manifest_signature, file_count, total_size) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, pdfBaseName, manifestJson, manifestSignature, attachmentCount, totalAttachmentSize]
        );
      }

      const downloadToken = createDownloadToken(avaladoFilePath, userId);
      completed = true;
      res.json({
        success: true,
        downloadUrl: `/downloads/${downloadToken}`,
        downloadExpiresIn: DOWNLOAD_TOKEN_TTL_MS,
        attachmentsProcessed: attachmentCount
      });
    }
  } catch (err) {
    console.error("Error en el proceso de firma:", err);
    res.status(500).json({ error: "Error en el proceso de firma" });
  } finally {
    cleanupUploadedFiles(req);
    safeUnlink(tempBlankPath);
    if (!completed) safeUnlink(avaladoFilePath);
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
    const securityMetadata = extractPdfSecurityMetadata(pdfDoc);

    if (securityMetadata.invalidReason || !securityMetadata.signerUserId) {
      return res.json({
        success: false,
        message: "El documento no contiene información del firmante válida."
      });
    }

    // Parsear información del firmante (formato: id|nombre|usuario)
    // Verificar que el firmante existe en la base de datos
    const [userRows] = await pool.query(
      "SELECT id, nombre, usuario FROM users WHERE id = ? AND rol = 'profesor'",
      [securityMetadata.signerUserId]
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
        id: Number(userRows[0].id),
        nombre: userRows[0].nombre,
        usuario: userRows[0].usuario
      },
      signingKeyId: securityMetadata.signingKeyId,
      legacyDocument: securityMetadata.isLegacy,
      message: `Documento firmado por: ${userRows[0].nombre}`
    });

  } catch (error) {
    console.error("Error al extraer información del firmante:", error);

    // Limpiar archivo temporal en caso de error
    res.status(500).json({
      success: false,
      error: "Error al procesar el documento firmado."
    });
  } finally {
    cleanupUploadedFiles(req);
  }
});

// El directorio de profesores solo está disponible para usuarios autenticados.
app.get('/api/profesores', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre FROM users WHERE rol = 'profesor'");
    res.json(rows);
  } catch (err) {
    console.error("Error SQL profesores:", err);
    res.status(500).json({ error: "Error al obtener profesores/tutores" });
  }
});

// Alias autenticado mantenido por compatibilidad.
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
  try {
    const profesorId = parsePositiveInteger(req.body.profesorId);
    if (!profesorId) {
      return res.status(400).json({ error: "ID del profesor/tutor es requerido." });
    }
    if (!req.files || !req.files.signedFile || !req.files.signedFile[0]) {
      return res.status(400).json({ error: "El archivo avalado es requerido." });
    }
    if (!req.files.originalFile || !req.files.originalFile[0]) {
      return res.status(400).json({ error: "El archivo original es requerido." });
    }

    const { signedFile, originalFile } = req.files;
    if (signedFile[0].originalname === originalFile[0].originalname &&
      signedFile[0].size === originalFile[0].size) {
      const signedContent = fs.readFileSync(signedFile[0].path);
      const originalContent = fs.readFileSync(originalFile[0].path);
      if (signedContent.equals(originalContent)) {
        return res.status(400).json({
          error: "Los archivos subidos son idénticos. El archivo avalado debe ser diferente al archivo original."
        });
      }
    }

    const signedPdfBytes = fs.readFileSync(signedFile[0].path);
    const pdfDoc = await PDFDocument.load(signedPdfBytes);
    const securityMetadata = extractPdfSecurityMetadata(pdfDoc);
    if (securityMetadata.invalidReason || !securityMetadata.signerUserId) {
      return res.status(400).json({
        verified: false,
        reason: 'invalid_metadata',
        message: securityMetadata.invalidReason || 'No se pudo identificar al firmante del documento.'
      });
    }
    if (securityMetadata.signerUserId !== profesorId) {
      return res.json({
        valid: false,
        professorMatch: false,
        signatureMatch: false,
        reason: 'key_mismatch',
        message: 'El profesor seleccionado no corresponde al identificador del firmante del documento.'
      });
    }

    const candidateRows = await getPublicKeyCandidates(
      securityMetadata.signerUserId,
      securityMetadata.signingKeyId
    );
    if (candidateRows.length === 0) {
      return res.status(400).json({
        verified: false,
        reason: 'signing_key_not_found',
        message: securityMetadata.signingKeyId
          ? 'No se encontró la llave exacta con la que se firmó el documento.'
          : 'No se encontraron llaves históricas del firmante.'
      });
    }

    const signatureBase64 = pdfDoc.getSubject()?.trim();
    if (!signatureBase64) {
      return res.status(400).json({
        verified: false,
        message: "El documento no contiene una firma válida en los metadatos."
      });
    }

    const originalBytes = fs.readFileSync(originalFile[0].path);
    const verification = verifyWithPublicKeyCandidates(originalBytes, signatureBase64, candidateRows);
    if (verification.decryptableKeyCount === 0) {
      return res.status(500).json({
        verified: false,
        reason: 'public_key_unavailable',
        message: 'La llave pública registrada está dañada o no puede descifrarse.'
      });
    }
    if (!verification.verified) {
      return res.json({
        valid: false,
        professorMatch: true,
        signatureMatch: false,
        reason: 'invalid_signature',
        signingKeyId: securityMetadata.signingKeyId,
        legacyDocument: securityMetadata.isLegacy,
        message: 'El firmante coincide, pero el archivo original no supera la verificación criptográfica.'
      });
    }

    return res.json({
      valid: true,
      professorMatch: true,
      signatureMatch: true,
      signingKeyId: verification.keyId,
      legacyDocument: securityMetadata.isLegacy,
      message: 'El firmante y el archivo original coinciden. La firma digital es válida.'
    });
  } catch (error) {
    console.error("Error en el proceso de verificación:", error);
    res.status(500).json({ verified: false, message: "Error en el proceso de verificación." });
  } finally {
    cleanupUploadedFiles(req);
  }
});

// =================== VERIFICACIÓN DE ANEXOS ===================
app.post("/verify-attachments", authenticate, upload.fields([
  { name: "signedPdf", maxCount: 1 },
  { name: "attachments", maxCount: 50 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.signedPdf || !req.files.signedPdf[0]) {
      return res.status(400).json({ error: "El PDF firmado es requerido." });
    }

    const signedPdfFile = req.files.signedPdf[0];
    const pdfBytes = fs.readFileSync(signedPdfFile.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const keywordText = getPdfKeywordText(pdfDoc);
    const manifestSignature = getSecurityKeyword(keywordText, 'ATTACHMENT_MANIFEST_SIG');
    const manifestBase64 = getSecurityKeyword(keywordText, 'MANIFEST_JSON');

    if (!manifestSignature && !manifestBase64) {
      return res.json({
        success: true,
        hasAttachments: false,
        message: "Este documento no incluye anexos."
      });
    }

    if (!manifestSignature || !manifestBase64 || manifestBase64.length > 1_400_000) {
      return res.status(400).json({
        success: false,
        reason: 'invalid_manifest_metadata',
        error: 'Los metadatos criptográficos de los anexos están incompletos o son inválidos.'
      });
    }

    let manifestJson;
    let manifest;
    try {
      manifestJson = Buffer.from(manifestBase64, 'base64').toString('utf8');
      manifest = JSON.parse(manifestJson);
    } catch (error) {
      return res.status(400).json({
        success: false,
        reason: 'invalid_manifest',
        error: 'El manifiesto de anexos está dañado.'
      });
    }

    const securityMetadata = extractPdfSecurityMetadata(pdfDoc);
    if (securityMetadata.invalidReason || !securityMetadata.signerUserId) {
      return res.status(400).json({
        success: false,
        reason: 'invalid_signer_metadata',
        error: securityMetadata.invalidReason || 'No se pudo identificar al firmante del manifiesto.'
      });
    }

    const candidateRows = await getPublicKeyCandidates(
      securityMetadata.signerUserId,
      securityMetadata.signingKeyId
    );
    if (candidateRows.length === 0) {
      return res.status(400).json({
        success: false,
        reason: 'signing_key_not_found',
        error: 'No se encontró la llave pública usada para firmar los anexos.'
      });
    }

    const signatureVerification = verifyWithPublicKeyCandidates(
      manifestJson,
      manifestSignature,
      candidateRows
    );
    if (!signatureVerification.verified) {
      return res.status(400).json({
        success: false,
        reason: 'invalid_manifest_signature',
        error: 'La firma criptográfica del manifiesto no es válida.'
      });
    }

    if (manifest.version === '2.0.0') {
      const documentSignature = pdfDoc.getSubject()?.trim();
      const contextIsValid =
        Number(manifest.signer_id) === securityMetadata.signerUserId &&
        Number(manifest.signing_key_id) === signatureVerification.keyId &&
        typeof documentSignature === 'string' &&
        manifest.document_signature_sha256 === generateFileHash(documentSignature);

      if (!contextIsValid) {
        return res.status(400).json({
          success: false,
          reason: 'manifest_context_mismatch',
          error: 'El manifiesto no pertenece a la firma principal de este documento.'
        });
      }
    } else if (manifest.version !== '1.0.0') {
      return res.status(400).json({
        success: false,
        reason: 'unsupported_manifest_version',
        error: 'La versión del manifiesto no es compatible.'
      });
    }

    if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
      return res.status(400).json({
        success: false,
        reason: 'invalid_manifest',
        error: 'La lista de anexos del manifiesto no es válida.'
      });
    }

    const expectedFileNames = Object.keys(manifest.files);
    const expectedFileCount = expectedFileNames.length;
    const uploadedFiles = (req.files.attachments || []).map(file => ({
      name: file.originalname,
      buffer: fs.readFileSync(file.path)
    }));

    if (uploadedFiles.length === 0) {
      return res.json({
        success: true,
        cryptographicallyVerified: true,
        hasAttachments: true,
        statusCode: 'no-attachments-provided',
        expectedFileCount,
        uploadedFileCount: 0,
        manifestFileList: expectedFileNames,
        signingKeyId: signatureVerification.keyId,
        legacyDocument: securityMetadata.isLegacy,
        message: `El manifiesto firmado es válido e incluye ${expectedFileCount} anexo(s). Súbelos para comprobar su contenido.`
      });
    }

    const fileVerification = verifyManifest(uploadedFiles, manifest);
    const issues = [];
    if (fileVerification.filesModified.length > 0) issues.push(`${fileVerification.filesModified.length} modificado(s)`);
    if (fileVerification.filesMissing.length > 0) issues.push(`${fileVerification.filesMissing.length} faltante(s)`);
    if (fileVerification.filesExtra.length > 0) issues.push(`${fileVerification.filesExtra.length} extra(s)`);

    return res.json({
      success: fileVerification.isValid,
      cryptographicallyVerified: true,
      hasAttachments: true,
      expectedFileCount,
      uploadedFileCount: uploadedFiles.length,
      filesMatched: fileVerification.filesMatched,
      filesModified: fileVerification.filesModified,
      filesMissing: fileVerification.filesMissing,
      filesExtra: fileVerification.filesExtra,
      signingKeyId: signatureVerification.keyId,
      legacyDocument: securityMetadata.isLegacy,
      message: fileVerification.isValid
        ? `Los ${uploadedFiles.length} anexo(s) son auténticos y no han sido modificados.`
        : `Se detectaron problemas en los anexos: ${issues.join(', ')}.`
    });

  } catch (error) {
    console.error("Error al verificar anexos:", error);
    res.status(500).json({
      success: false,
      error: "Error interno al verificar los anexos."
    });
  } finally {
    cleanupUploadedFiles(req);
  }
});

// =================== Manejo de errores global ===================
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'El cuerpo JSON de la solicitud no es válido' });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.code === 'LIMIT_FILE_SIZE'
        ? `Cada archivo debe pesar máximo ${maxUploadSizeMb} MB`
        : 'La carga de archivos supera los límites permitidos'
    });
  }

  console.error(err.stack || err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// =================== Manejo de rutas no encontradas ===================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    message: `La ruta ${req.method} ${req.path} no existe`
  });
});

// =================== Inicio del servidor ===================
let server;

async function startServer() {
  try {
    await initializePrivilegedAccounts();
  } catch (error) {
    if (error.code === 'INVALID_INITIAL_PASSWORD') {
      throw error;
    }
    // La página pública y /health siguen disponibles si la base de datos aún
    // no está lista. Al conectarla o importarla, basta reiniciar la aplicación.
    console.warn('No se pudieron preparar las cuentas iniciales:', error.message);
  }

  server = app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log('🚀 Servidor corriendo en:', url);
    console.log('Haz click o copia el enlace para abrir la web.');
  });

  server.on('error', (err) => {
    console.error('Error del servidor:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Puerto ${PORT} ya está en uso`);
    }
    process.exit(1);
  });
}

startServer().catch(error => {
  console.error('No fue posible iniciar el servidor:', error.message);
  process.exit(1);
});

// =================== Manejo de errores no capturados ===================
process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Promesa rechazada no manejada:', reason);
  process.exit(1);
});

// =================== Graceful shutdown ===================
process.on('SIGTERM', () => {
  if (!server) return process.exit(0);
  server.close((err) => {
    if (err) {
      console.error('❌ Error al cerrar servidor:', err);
    } else {
    }
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});

process.on('SIGINT', () => {
  if (!server) return process.exit(0);
  server.close(() => {
    process.exit(0);
  });
});


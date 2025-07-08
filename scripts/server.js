require('dotenv').config();
const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const { PDFDocument, rgb } = require("pdf-lib");
const pool = require('./db/pool');
const authenticate = require('./middlewares/authenticate');
const isAdmin = require('./middlewares/isAdmin');
const isOwner = require('./middlewares/isOwner');
const { encrypt, decrypt, decryptWithPassword, decryptAES, decryptWithType } = require('./utils/crypto');
const PORT = process.env.PORT || 3000;

// Validar variables de entorno críticas
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET no está configurado en las variables de entorno');
  console.error('Por favor, configura JWT_SECRET en Railway');
  process.exit(1);
}

console.log('✅ Variables de entorno validadas correctamente');

// Logging adicional para Railway
console.log('🔧 Configurando aplicación Express...');
console.log(`📊 Memoria inicial: ${JSON.stringify(process.memoryUsage())}`);
console.log(`🆔 Process ID: ${process.pid}`);

// Middlewares globales
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Logging middleware para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Configuración de archivos estáticos ANTES de las rutas
app.use("/css", express.static(path.join(__dirname, "../css"), { maxAge: "1d" }));
app.use("/scripts/frontend", express.static(path.join(__dirname, "./frontend"), { maxAge: "1d" }));
app.use("/scripts/utils", express.static(path.join(__dirname, "./utils"), { maxAge: "1d" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/recursos", express.static(path.join(__dirname, "../recursos")));
// app.use("/downloads", express.static(path.join(__dirname, "../downloads")));

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
    console.log(`Carpeta creada: ${dir}`);
  }
});

// =================== Health checks y rutas básicas ===================
// Health check simple para Railway
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Health check alternativo
app.get("/ping", (req, res) => {
  res.status(200).json({ status: "alive" });
});

// Ruta principal simplificada para Railway health check
app.get("/", (req, res) => {
  try {
    const filePath = path.join(__dirname, "../html/Inicio.html");

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
      } else {
        console.log("Página principal servida correctamente");
      }
    });
  } catch (error) {
    console.error("Error en ruta principal:", error);
    if (!res.headersSent) {
      res.status(200).send("App is running - Exception occurred");
    }
  }
});


// =================== Routers backend ===================
const authRoutes = require('./routes/auth.routes');
const keysRoutes = require('./routes/keys.routes');

app.use(authRoutes);
app.use(keysRoutes);

// =================== Rutas de configuración ===================
const configPath = path.join(__dirname, "../config.json");

app.get("/api/config", (req, res) => {
  if (!fs.existsSync(configPath)) return res.json({});
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  res.json(config);
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
  const keyPassword = req.body.keyPassword; // Asegúrate de recibirla del frontend

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
      // Limpieza de llaves temporales
      fs.unlinkSync(privateKeyPath);

      if (err) {
        console.error("Error al firmar documento:", err);
        return res.status(500).json({ error: "Error al firmar el documento" });
      }
      const signatureBinary = fs.readFileSync(signedFilePath);
      const signatureBase64 = signatureBinary.toString("base64").trim();
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
      page.drawText(`DOCUMENTO AVALADO: ${req.file.originalname}`, { x: 50, y: 300, size: 20 });
      pdfDoc.setSubject(signatureBase64);
      pdfDoc.setTitle("Documento Avalado");
      pdfDoc.setKeywords(["firma digital", "avalado", "documento"]);
      pdfDoc.setCreator("Firmas Digitales FD");
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());
      const pdfBytes = await pdfDoc.save();
      const avaladoFilePath = path.join(__dirname, "../downloads", `avalado_${Date.now()}.pdf`);
      fs.writeFileSync(avaladoFilePath, pdfBytes);
      res.json({ success: true, downloadUrl: `/downloads/${path.basename(avaladoFilePath)}` });
      fs.unlinkSync(documentPath);
      fs.unlinkSync(signedFilePath);
    });
  } catch (err) {
    console.error("Error en el proceso de firma:", err);
    res.status(500).json({ error: "Error en el proceso de firma" });
  }
});

app.get('/api/profesores', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, nombre FROM users WHERE rol IN ('profesor', 'tutor')");
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
  try {
    const { signedFile, originalFile } = req.files;
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
  console.log(`📡 Servidor escuchando en 0.0.0.0:${PORT}`);
  console.log(`✅ Aplicación completamente iniciada y lista para recibir peticiones`);
  console.log(`🔗 Health check disponible en: /health y /ping`);
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
  console.log(`📊 Memoria al cierre: ${JSON.stringify(process.memoryUsage())}`);
  console.log(`⏰ Uptime: ${process.uptime()} segundos`);

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


'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Transform, pipeline } = require('stream');

const DEFAULT_ALLOWED_METHODS = Object.freeze([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS'
]);

const DEFAULT_ALLOWED_HEADERS = Object.freeze([
  'Accept',
  'Authorization',
  'Content-Type',
  'X-Requested-With'
]);

const DEFAULT_EXPOSED_HEADERS = Object.freeze([
  'Content-Disposition',
  'Content-Length'
]);

const DEFAULT_API_BODY_LIMIT = 10 * 1024 * 1024;
const PLACEHOLDER_SECRET_PATTERN =
  /^(?:change-?me|changeme|replace-?me|reemplaza(?:r)?(?:-?esto)?|example|ejemplo|secret|password|test(?:-?only)?)(?:[-_].*)?$/i;
const AGGREGATE_UPLOAD_LIMIT_CODE = 'LIMIT_TOTAL_FILE_SIZE';

// Los scripts y controladores de eventos se sirven desde archivos propios. Los
// estilos conservan una excepción transitoria porque el HTML todavía contiene
// atributos style y varios componentes aplican estilos dinámicos.
const CSP_COMPATIBILITY_NOTE =
  "La CSP bloquea scripts y eventos inline. 'unsafe-inline' permanece " +
  'temporalmente limitado a estilos hasta migrar los atributos style.';

function getEnvironment(value) {
  return String(value || process.env.NODE_ENV || 'development').toLowerCase();
}

function isPlaceholderSecret(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return false;

  return (
    PLACEHOLDER_SECRET_PATTERN.test(normalized) ||
    /(?:reemplaza|replace|change)[-_ ]?(?:me|esto)/i.test(normalized) ||
    /(?:example|ejemplo|test)[-_ ]?(?:only[-_ ])?secret/i.test(normalized)
  );
}

function validateJwtConfiguration(environment = process.env) {
  const secret = String(environment.JWT_SECRET || '');
  const isProduction = getEnvironment(environment.NODE_ENV) === 'production';
  const warnings = [];

  if (!secret.trim()) {
    const error = new Error('JWT_SECRET es obligatorio');
    error.code = 'MISSING_JWT_SECRET';
    throw error;
  }

  if (Buffer.byteLength(secret, 'utf8') < 32) {
    const message = 'JWT_SECRET debe tener al menos 32 bytes';
    if (isProduction) {
      const error = new Error(message);
      error.code = 'WEAK_JWT_SECRET';
      throw error;
    }
    warnings.push(message);
  }

  if (isPlaceholderSecret(secret)) {
    const message = 'JWT_SECRET no puede conservar un valor de ejemplo';
    if (isProduction) {
      const error = new Error(message);
      error.code = 'PLACEHOLDER_JWT_SECRET';
      throw error;
    }
    warnings.push(message);
  }

  return { warnings };
}

function parseOriginList(value = process.env.CORS_ORIGINS || '') {
  const origins = new Set();

  for (const entry of String(value).split(',')) {
    const candidate = entry.trim();
    if (!candidate) continue;

    let parsed;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error(`Origen CORS invalido: ${candidate}`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Protocolo CORS no permitido: ${candidate}`);
    }

    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
      throw new Error(`CORS_ORIGINS solo acepta origenes, no rutas: ${candidate}`);
    }

    origins.add(parsed.origin);
  }

  return origins;
}

function isLocalDevelopmentOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    return (
      ['http:', 'https:'].includes(protocol) &&
      ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

function isSameHostOrigin(req, origin) {
  try {
    const originUrl = new URL(origin);
    const requestHost = String(req.get?.('host') || req.headers?.host || '').toLowerCase();
    return requestHost !== '' && originUrl.host.toLowerCase() === requestHost;
  } catch {
    return false;
  }
}

function appendVary(res, field) {
  if (typeof res.vary === 'function') {
    res.vary(field);
    return;
  }

  const current = String(res.getHeader('Vary') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!current.some((value) => value.toLowerCase() === field.toLowerCase())) {
    current.push(field);
    res.setHeader('Vary', current.join(', '));
  }
}

function normalizeHeaderNames(headers) {
  return new Map(headers.map((header) => [String(header).toLowerCase(), String(header)]));
}

function sendError(res, status, code, message) {
  res.status(status).json({ success: false, code, message });
}

function disablePoweredBy(app) {
  if (!app || typeof app.disable !== 'function') {
    throw new TypeError('disablePoweredBy requiere una aplicacion Express valida');
  }

  app.disable('x-powered-by');
  return app;
}

function buildContentSecurityPolicy({ environment } = {}) {
  const isProduction = getEnvironment(environment) === 'production';
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self'",
    "script-src-elem 'self'",
    "script-src-attr 'none'",
    "style-src 'self'",
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-src 'self' blob:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'"
  ];

  if (isProduction) {
    directives.push('upgrade-insecure-requests');
    directives.push('block-all-mixed-content');
  }

  return directives.join('; ');
}

function createAggregateDiskStorage(options = {}) {
  const rawDestination = String(options.destination || '').trim();
  const maxBytes = Number(options.maxBytes);

  if (!rawDestination || !Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new TypeError('destination y maxBytes positivo son obligatorios');
  }
  const destination = path.resolve(rawDestination);

  function removeTemporaryFile(filePath, callback) {
    const resolvedPath = path.resolve(String(filePath || ''));
    if (!resolvedPath.startsWith(`${destination}${path.sep}`)) {
      return callback?.();
    }
    fs.unlink(resolvedPath, (error) => {
      if (error && error.code !== 'ENOENT') {
        return callback?.(error);
      }
      callback?.();
    });
  }

  return {
    _handleFile(req, file, callback) {
      req.aggregateUploadState ||= { bytes: 0, maxBytes, exceeded: false };
      const state = req.aggregateUploadState;
      const filename = crypto.randomBytes(24).toString('hex');
      const filePath = path.join(destination, filename);
      let bytesWritten = 0;

      const aggregateLimiter = new Transform({
        transform(chunk, encoding, done) {
          state.bytes += chunk.length;
          if (state.bytes > state.maxBytes) {
            state.exceeded = true;
            const error = new Error('La carga total de archivos supera el limite permitido');
            error.name = 'MulterError';
            error.code = AGGREGATE_UPLOAD_LIMIT_CODE;
            error.field = file.fieldname;
            error.limit = state.maxBytes;
            return done(error);
          }
          bytesWritten += chunk.length;
          done(null, chunk);
        }
      });
      const output = fs.createWriteStream(filePath, {
        flags: 'wx',
        mode: 0o600
      });

      pipeline(file.stream, aggregateLimiter, output, (error) => {
        if (error) {
          return removeTemporaryFile(filePath, () => callback(error));
        }
        callback(null, {
          destination,
          filename,
          path: filePath,
          size: bytesWritten
        });
      });
    },

    _removeFile(req, file, callback) {
      removeTemporaryFile(file.path, (error) => {
        delete file.destination;
        delete file.filename;
        delete file.path;
        callback(error);
      });
    }
  };
}

function getHealthPayload(healthy, environment = process.env.NODE_ENV, details = {}) {
  if (getEnvironment(environment) === 'production') {
    return healthy ? { status: 'ok' } : { status: 'unavailable' };
  }

  return healthy
    ? {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        environment: getEnvironment(environment),
        ...details
      }
    : {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'database_unavailable',
        database: 'disconnected',
        ...details
      };
}

function createSecurityHeaders(options = {}) {
  const environment = getEnvironment(options.environment);
  const contentSecurityPolicy =
    options.contentSecurityPolicy || buildContentSecurityPolicy({ environment });

  return function securityHeaders(req, res, next) {
    res.setHeader('Content-Security-Policy', contentSecurityPolicy);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), geolocation=(), microphone=(), payment=(), usb=()'
    );
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    if (environment === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        options.hsts || 'max-age=31536000'
      );
    }

    next();
  };
}

function createCorsMiddleware(options = {}) {
  const environment = getEnvironment(options.environment);
  const configuredOrigins =
    options.origins instanceof Set
      ? new Set(options.origins)
      : Array.isArray(options.origins)
        ? parseOriginList(options.origins.join(','))
        : parseOriginList(options.origins);
  const allowedMethods = (options.allowedMethods || DEFAULT_ALLOWED_METHODS).map((method) =>
    String(method).toUpperCase()
  );
  const allowedHeaders = normalizeHeaderNames(options.allowedHeaders || DEFAULT_ALLOWED_HEADERS);
  const exposedHeaders = options.exposedHeaders || DEFAULT_EXPOSED_HEADERS;
  const allowCredentials = options.allowCredentials === true;
  const allowLocalhost = options.allowLocalhost ?? environment !== 'production';
  const maxAge = Number.isSafeInteger(options.maxAge) ? options.maxAge : 600;

  function isAllowed(req, origin) {
    return (
      configuredOrigins.has(origin) ||
      isSameHostOrigin(req, origin) ||
      (allowLocalhost && isLocalDevelopmentOrigin(origin))
    );
  }

  return function corsAllowlist(req, res, next) {
    const origin = req.get?.('origin') || req.headers?.origin;

    appendVary(res, 'Origin');

    // Clientes del mismo servidor, herramientas CLI y tareas internas normalmente
    // no envian Origin. CORS no sustituye autenticacion, por lo que siguen su ruta.
    if (!origin) {
      return next();
    }

    if (!isAllowed(req, origin)) {
      return sendError(
        res,
        403,
        'CORS_ORIGIN_DENIED',
        'El origen de la solicitud no esta autorizado.'
      );
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    if (allowCredentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }

    if (req.method !== 'OPTIONS') {
      return next();
    }

    const requestedMethod = String(req.get?.('access-control-request-method') || '').toUpperCase();
    if (requestedMethod && !allowedMethods.includes(requestedMethod)) {
      res.setHeader('Allow', allowedMethods.join(', '));
      return sendError(
        res,
        405,
        'CORS_METHOD_DENIED',
        'El metodo solicitado no esta permitido.'
      );
    }

    const requestedHeaderLine = req.get?.('access-control-request-headers') || '';
    const requestedHeaders = requestedHeaderLine
      .split(',')
      .map((header) => header.trim())
      .filter(Boolean);
    const deniedHeader = requestedHeaders.find(
      (header) => !allowedHeaders.has(header.toLowerCase())
    );

    if (deniedHeader) {
      return sendError(
        res,
        403,
        'CORS_HEADER_DENIED',
        `La cabecera ${deniedHeader} no esta permitida.`
      );
    }

    appendVary(res, 'Access-Control-Request-Method');
    appendVary(res, 'Access-Control-Request-Headers');
    res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.setHeader(
      'Access-Control-Allow-Headers',
      requestedHeaders.length > 0
        ? requestedHeaders.map((header) => allowedHeaders.get(header.toLowerCase())).join(', ')
        : [...allowedHeaders.values()].join(', ')
    );
    res.setHeader('Access-Control-Max-Age', String(Math.max(0, maxAge)));
    return res.status(204).end();
  };
}

function apiNoCache(req, res, next) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
}

function createMethodGuard(options = {}) {
  const allowedMethods = (options.allowedMethods || DEFAULT_ALLOWED_METHODS).map((method) =>
    String(method).toUpperCase()
  );

  return function methodGuard(req, res, next) {
    if (allowedMethods.includes(String(req.method).toUpperCase())) {
      return next();
    }

    res.setHeader('Allow', allowedMethods.join(', '));
    return sendError(
      res,
      405,
      'METHOD_NOT_ALLOWED',
      'El metodo HTTP no esta permitido.'
    );
  };
}

function createRequestSizeGuard(options = {}) {
  const maxBytes = Number.isSafeInteger(options.maxBytes)
    ? options.maxBytes
    : DEFAULT_API_BODY_LIMIT;

  if (maxBytes <= 0) {
    throw new RangeError('maxBytes debe ser un entero positivo');
  }

  return function requestSizeGuard(req, res, next) {
    const contentType = String(req.get?.('content-type') || '').toLowerCase();

    // Multer debe controlar multipart con limites por archivo, cantidad y total.
    // Este control protege cuerpos JSON/form; Content-Length no reemplaza el
    // limite del parser para solicitudes transferidas por chunks.
    if (contentType.startsWith('multipart/form-data')) {
      return next();
    }

    const rawLength = req.get?.('content-length');
    if (rawLength === undefined) {
      return next();
    }

    const contentLength = Number(rawLength);
    if (!Number.isSafeInteger(contentLength) || contentLength < 0) {
      return sendError(
        res,
        400,
        'INVALID_CONTENT_LENGTH',
        'La longitud declarada de la solicitud no es valida.'
      );
    }

    if (contentLength > maxBytes) {
      return sendError(
        res,
        413,
        'REQUEST_TOO_LARGE',
        'La solicitud supera el tamano permitido.'
      );
    }

    next();
  };
}

function configureAppSecurity(app, options = {}) {
  disablePoweredBy(app);

  app.use(createSecurityHeaders(options.headers));
  app.use('/api', apiNoCache);
  app.use(createCorsMiddleware(options.cors));
  app.use('/api', createMethodGuard(options.methods));
  app.use('/api', createRequestSizeGuard(options.requestSize));

  return app;
}

module.exports = {
  AGGREGATE_UPLOAD_LIMIT_CODE,
  CSP_COMPATIBILITY_NOTE,
  DEFAULT_ALLOWED_HEADERS,
  DEFAULT_ALLOWED_METHODS,
  DEFAULT_API_BODY_LIMIT,
  apiNoCache,
  buildContentSecurityPolicy,
  configureAppSecurity,
  createAggregateDiskStorage,
  createCorsMiddleware,
  createMethodGuard,
  createRequestSizeGuard,
  createSecurityHeaders,
  disablePoweredBy,
  getHealthPayload,
  isPlaceholderSecret,
  parseOriginList,
  validateJwtConfiguration
};

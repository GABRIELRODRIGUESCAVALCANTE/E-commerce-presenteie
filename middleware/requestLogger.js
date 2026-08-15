const crypto = require('crypto');
const logger = require('../lib/logger');

/**
 * Middleware para identificação de requisição (requestId) e log HTTP estruturado.
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Gera ou utiliza requestId recebido nos headers
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  req.requestId = requestId;

  // Garante que o header de resposta contenha o X-Request-ID para rastreabilidade end-to-end
  res.setHeader('X-Request-ID', requestId);

  // Intercepta a finalização da resposta
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const userAgent = req.get('user-agent') || '';
    const userId = req.user ? req.user.id : null;
    const userEmail = req.user ? req.user.email : null;

    const logPayload = {
      requestId,
      method: req.method,
      endpoint: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      ip,
      userId,
      userEmail,
      userAgent
    };

    if (res.statusCode >= 500) {
      logger.error(logPayload, `HTTP ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`);
    } else if (res.statusCode >= 400) {
      logger.warn(logPayload, `HTTP ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`);
    } else {
      logger.info(logPayload, `HTTP ${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs}ms`);
    }
  });

  next();
}

module.exports = requestLogger;

const logger = require('../lib/logger');

const SENSITIVE_KEYS = [
  'password', 'pass', 'senha', 'token', 'secret', 'authorization',
  'cookie', 'creditcard', 'cardnumber', 'card_number', 'cvv',
  'better_auth_secret', 'email_pass', 'api_secret', 'google_client_secret'
];

/**
 * Sanitiza recursivamente um objeto ou array removendo dados sensíveis.
 */
function sanitizeObject(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Calcula a diferença entre o estado antigo e o novo estado de um recurso.
 * Retorna apenas as chaves efetivamente alteradas.
 */
function computeDiff(oldObj = {}, newObj = {}) {
  const oldSanitized = sanitizeObject(oldObj) || {};
  const newSanitized = sanitizeObject(newObj) || {};

  const oldDiff = {};
  const newDiff = {};
  const changedFields = [];

  const allKeys = new Set([...Object.keys(oldSanitized), ...Object.keys(newSanitized)]);

  for (const key of allKeys) {
    const valOld = oldSanitized[key];
    const valNew = newSanitized[key];

    // Compara como JSON para lidar com objetos/arrays
    if (JSON.stringify(valOld) !== JSON.stringify(valNew)) {
      changedFields.push(key);
      if (valOld !== undefined) oldDiff[key] = valOld;
      if (valNew !== undefined) newDiff[key] = valNew;
    }
  }

  return {
    oldValues: Object.keys(oldDiff).length > 0 ? oldDiff : null,
    newValues: Object.keys(newDiff).length > 0 ? newDiff : null,
    changedFields: changedFields.length > 0 ? changedFields : null
  };
}

/**
 * Registra um evento de auditoria no PostgreSQL.
 * É executado de forma resiliente e não-bloqueante para não interromper a operação comercial.
 */
async function saveAuditLog(dbPool, auditData) {
  try {
    const {
      userId = null,
      userEmail = null,
      action,
      resourceType,
      resourceId = null,
      oldValues = null,
      newValues = null,
      changedFields = null,
      ipAddress = null,
      userAgent = null,
      requestId = null,
      success = true,
      errorMessage = null
    } = auditData;

    const sanitizedOld = oldValues ? JSON.stringify(sanitizeObject(oldValues)) : null;
    const sanitizedNew = newValues ? JSON.stringify(sanitizeObject(newValues)) : null;
    const sanitizedFields = changedFields ? JSON.stringify(changedFields) : null;

    const query = `
      INSERT INTO audit_logs (
        user_id, user_email, action, resource_type, resource_id,
        old_values, new_values, changed_fields, ip_address, user_agent,
        request_id, success, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, created_at;
    `;

    const values = [
      userId,
      userEmail,
      action,
      resourceType,
      resourceId ? String(resourceId) : null,
      sanitizedOld,
      sanitizedNew,
      sanitizedFields,
      ipAddress,
      userAgent,
      requestId,
      success,
      errorMessage
    ];

    const result = await dbPool.query(query, values);

    logger.info({
      auditLogId: result.rows[0].id,
      requestId,
      action,
      resourceType,
      resourceId,
      userId,
      success
    }, `[AUDIT] ${action} em ${resourceType}:${resourceId || '*'} - Sucesso: ${success}`);

    return result.rows[0];
  } catch (error) {
    // Falha na gravação de auditoria não deve derrubar o sistema, mas DEVE ser logada
    logger.error({ err: error, auditData }, '[AUDIT ERROR] Falha ao registrar log de auditoria no PostgreSQL');
    return null;
  }
}

/**
 * Atalho para registrar eventos de segurança (ex: acesso negado, falhas de auth).
 */
function logSecurityEvent(dbPool, req, action, { resourceType = 'security', resourceId = null, success = false, errorMessage = null, details = null }) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
  const userAgent = req.get ? req.get('user-agent') : '';
  const userId = req.user ? req.user.id : null;
  const userEmail = req.user ? req.user.email : null;
  const requestId = req.requestId || req.id || null;

  return saveAuditLog(dbPool, {
    userId,
    userEmail,
    action,
    resourceType,
    resourceId,
    newValues: details ? sanitizeObject(details) : null,
    ipAddress,
    userAgent,
    requestId,
    success,
    errorMessage
  });
}

/**
 * Remove registros de auditoria com idade superior ao limite de retenção configurado.
 */
async function cleanOldAuditLogs(dbPool, retentionDays = 90) {
  try {
    const days = parseInt(retentionDays, 10);
    if (isNaN(days) || days <= 0) return 0;

    const query = `
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '1 day' * $1;
    `;
    const result = await dbPool.query(query, [days]);
    logger.info(`[AUDIT CLEANUP] Removidos ${result.rowCount} registros com mais de ${days} dias.`);
    return result.rowCount;
  } catch (error) {
    logger.error({ err: error }, '[AUDIT CLEANUP ERROR] Erro ao limpar logs antigos');
    return 0;
  }
}

module.exports = {
  saveAuditLog,
  computeDiff,
  sanitizeObject,
  logSecurityEvent,
  cleanOldAuditLogs
};

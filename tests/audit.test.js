const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const auditService = require('../services/auditService');
const logger = require('../lib/logger');
const { app, pool } = require('../server');

describe('Sistema de Audit Logs & Diffing', () => {

  test('computeDiff deve calcular somente os campos alterados', () => {
    const oldValues = { nome: 'Produto A', preco: 100, estoque: 20, categoria: 'presentes' };
    const newValues = { nome: 'Produto A', preco: 120, estoque: 15, categoria: 'presentes' };

    const diff = auditService.computeDiff(oldValues, newValues);

    assert.deepEqual(diff.changedFields, ['preco', 'estoque']);
    assert.deepEqual(diff.oldValues, { preco: 100, estoque: 20 });
    assert.deepEqual(diff.newValues, { preco: 120, estoque: 15 });
  });

  test('sanitizeObject deve ocultar senhas, tokens e segredos', () => {
    const sensitiveData = {
      user: 'joao',
      password: 'SenhaSuperSecreta123',
      creditCard: '1234-5678-9012-3456',
      token: 'jwt.token.val',
      nested: {
        api_secret: 'secret_123',
        safeField: 'visivel'
      }
    };

    const sanitized = auditService.sanitizeObject(sensitiveData);

    assert.equal(sanitized.user, 'joao');
    assert.equal(sanitized.password, '[REDACTED]');
    assert.equal(sanitized.creditCard, '[REDACTED]');
    assert.equal(sanitized.token, '[REDACTED]');
    assert.equal(sanitized.nested.api_secret, '[REDACTED]');
    assert.equal(sanitized.nested.safeField, 'visivel');
  });

  test('saveAuditLog deve registrar e tratar erros sem estourar exceções não tratadas', async () => {
    const mockPool = {
      query: async (query, values) => {
        return { rows: [{ id: 999, created_at: new Date() }] };
      }
    };

    const result = await auditService.saveAuditLog(mockPool, {
      userId: 'user_123',
      userEmail: 'teste@exemplo.com',
      action: 'PRODUCT_CREATED',
      resourceType: 'produto',
      resourceId: '456',
      newValues: { nome: 'Produto Teste' },
      requestId: 'req-uuid-123'
    });

    assert.ok(result);
    assert.equal(result.id, 999);
  });

  test('saveAuditLog em caso de falha de banco deve retornar null e não estourar a aplicação', async () => {
    const failingPool = {
      query: async () => {
        throw new Error('Conexão de banco indisponível');
      }
    };

    const result = await auditService.saveAuditLog(failingPool, {
      action: 'TEST_FAIL',
      resourceType: 'test'
    });

    assert.equal(result, null);
  });
});

describe('Integridade HTTP e Middleware de Segurança', () => {

  test('Todas as requisições HTTP devem conter o cabeçalho X-Request-ID', async () => {
    const res = await request(app).get('/api');
    assert.equal(res.status, 200);
    assert.ok(res.headers['x-request-id']);
  });

  test('Tentativa de acesso não autorizado deve retornar 401 e incluir X-Request-ID', async () => {
    const res = await request(app).get('/api/db-test');
    assert.equal(res.status, 401);
    assert.ok(res.headers['x-request-id']);
  });

  test('Rota de consulta de auditoria deve negar acesso a requisições sem login de admin', async () => {
    const res = await request(app).get('/api/admin/audit-logs');
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { error: 'Não autorizado. Faça login.' });
  });

});

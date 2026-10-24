// Testes de integração da API. Requerem um PostgreSQL acessível com as variáveis DB_* do .env.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const request = require('supertest');

const RUN_ID = Date.now();
process.env.ADMIN_EMAIL = `admin-${RUN_ID}@test.local`;

const { app, pool, transporter } = require('../server');
const runMigrations = require('../scripts/migrate');

const ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';
const CLIENT_EMAIL = `cliente-${RUN_ID}@test.local`;
const PASSWORD = 'senha-segura-123';

async function insertVerifiedCode(email, code = '123456') {
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  await pool.query('DELETE FROM email_verifications WHERE LOWER(email) = $1', [email]);
  await pool.query(
    `INSERT INTO email_verifications (email, code_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
    [email, codeHash]
  );
}

async function signUpVerified(agent, email, name) {
  await insertVerifiedCode(email);
  const verify = await agent.post('/api/auth/verify-code').send({ email, code: '123456' });
  assert.equal(verify.status, 200);
  return agent.post('/api/auth/sign-up/email').set('Origin', ORIGIN).send({ email, password: PASSWORD, name });
}

describe('API — fluxos principais', () => {
  const cliente = request.agent(app);
  const admin = request.agent(app);
  let produtoId;

  before(async () => {
    // E-mails não são enviados durante os testes
    transporter.sendMail = async () => ({ messageId: 'test' });
    await runMigrations(pool);
    const res = await pool.query(
      `INSERT INTO produtos (nome, descricao, preco, estoque, imagem_url, ativo)
       VALUES ($1, 'Produto de teste', 49.90, 2, NULL, true) RETURNING id`,
      [`Caneca Teste ${RUN_ID}`]
    );
    produtoId = res.rows[0].id;
  });

  after(async () => {
    await pool.query(`DELETE FROM itens_pedido WHERE produto_id = $1`, [produtoId]);
    await pool.query(`DELETE FROM pedidos WHERE nome_cliente LIKE 'Cliente Teste%'`);
    await pool.query(`DELETE FROM produtos WHERE nome LIKE $1`, [`%${RUN_ID}`]);
    await pool.query(`DELETE FROM "user" WHERE email LIKE $1`, [`%-${RUN_ID}@test.local`]);
    await pool.end();
  });

  test('cadastro por e-mail sem verificação OTP é recusado pelo servidor', async () => {
    const res = await request(app)
      .post('/api/auth/sign-up/email')
      .set('Origin', ORIGIN)
      .send({ email: `sem-otp-${RUN_ID}@test.local`, password: PASSWORD, name: 'Sem OTP' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /código de verificação/);
  });

  test('cadastro após verificação OTP cria a conta com e-mail verificado', async () => {
    const res = await signUpVerified(cliente, CLIENT_EMAIL, 'Cliente Teste');
    assert.equal(res.status, 200);
    const user = await pool.query('SELECT "emailVerified" FROM "user" WHERE email = $1', [CLIENT_EMAIL]);
    assert.equal(user.rows[0].emailVerified, true);
    const pendentes = await pool.query('SELECT 1 FROM email_verifications WHERE email = $1', [CLIENT_EMAIL]);
    assert.equal(pendentes.rows.length, 0);
  });

  test('/api/me retorna o usuário logado e a permissão de admin', async () => {
    const res = await cliente.get('/api/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, CLIENT_EMAIL);
    assert.equal(res.body.isAdmin, false);
    assert.equal((await request(app).get('/api/me')).status, 401);
  });

  test('consultas de sessão não são bloqueadas pelo limite restrito de login', async () => {
    for (let i = 0; i < 25; i++) {
      const res = await cliente.get('/api/auth/get-session');
      assert.equal(res.status, 200);
    }
  });

  test('listagem de produtos valida parâmetros e limita a paginação', async () => {
    const ok = await request(app).get('/api/produtos?limit=100000&page=-3&ordem=menor_preco');
    assert.equal(ok.status, 200);
    assert.ok(ok.body.produtos.length <= 100);
    assert.equal((await request(app).get('/api/produtos?categoria=abc')).status, 400);
  });

  test('detalhe de produto: inválido, inexistente e existente', async () => {
    assert.equal((await request(app).get('/api/produtos/abc')).status, 400);
    assert.equal((await request(app).get('/api/produtos/99999999')).status, 404);
    const res = await request(app).get(`/api/produtos/${produtoId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, produtoId);
  });

  test('pedido: telefone inválido e estoque insuficiente retornam 400 com mensagem clara', async () => {
    const base = { nome_cliente: 'Cliente Teste', metodo_entrega: 'retirada', metodo_pagamento: 'pix' };
    const tel = await cliente.post('/api/pedidos').send({ ...base, telefone: '123', itens: [{ id: produtoId, quantidade: 1 }] });
    assert.equal(tel.status, 400);
    assert.match(tel.body.error, /telefone/i);

    const estoque = await cliente.post('/api/pedidos').send({ ...base, telefone: '(85) 99999-0000', itens: [{ id: produtoId, quantidade: 3 }] });
    assert.equal(estoque.status, 400);
    assert.match(estoque.body.error, /Estoque insuficiente/);
  });

  test('pedido válido baixa o estoque e aparece em "meus pedidos" com os itens', async () => {
    const res = await cliente.post('/api/pedidos').send({
      nome_cliente: 'Cliente Teste',
      telefone: '(85) 99999-0000',
      metodo_entrega: 'retirada',
      metodo_pagamento: 'pix',
      itens: [{ id: produtoId, quantidade: 2 }]
    });
    assert.equal(res.status, 201);
    assert.ok(res.body.pedidoId);
    assert.equal(res.body.total, 99.8);

    const prod = await pool.query('SELECT estoque FROM produtos WHERE id = $1', [produtoId]);
    assert.equal(prod.rows[0].estoque, 0);

    const me = await cliente.get('/api/me');
    const pedidos = await cliente.get(`/api/meus-pedidos/${me.body.user.id}`);
    assert.equal(pedidos.status, 200);
    const pedido = pedidos.body.find(p => p.id === res.body.pedidoId);
    assert.equal(pedido.itens.length, 1);
    assert.equal(pedido.itens[0].quantidade, 2);
    assert.ok(pedido.itens[0].nome.startsWith('Caneca Teste'));
  });

  test('admin: validação no cadastro de produto e acesso ao painel', async () => {
    const res = await signUpVerified(admin, process.env.ADMIN_EMAIL, 'Admin Teste');
    assert.equal(res.status, 200);
    assert.equal((await admin.get('/api/me')).body.isAdmin, true);

    const invalido = await admin.post('/api/produtos').field('nome', 'Sem preço').field('preco', 'abc').field('estoque', '1');
    assert.equal(invalido.status, 400);
    assert.match(invalido.body.error, /preço/);

    const valido = await admin.post('/api/produtos')
      .field('nome', `Kit Admin ${RUN_ID}`)
      .field('preco', '79,90')
      .field('estoque', '5')
      .field('categoria_id', '');
    assert.equal(valido.status, 201);
    assert.equal(Number(valido.body.preco), 79.9);

    const pedidos = await admin.get('/api/pedidos');
    assert.equal(pedidos.status, 200);
    assert.ok(Array.isArray(pedidos.body));

    assert.equal((await cliente.get('/api/pedidos')).status, 403);
  });

  test('rotas de API inexistentes respondem 404 em JSON', async () => {
    const res = await request(app).get('/api/nao-existe');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Rota não encontrada.' });
  });
});

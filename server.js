require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou GIF.'));
    }
  }
});
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const app = express();

// Middlewares de Segurança Básicos
app.use(helmet());

// Rate Limiting (100 reqs a cada 15 min)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use(limiter);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173', // URL do seu React
  credentials: true // OBRIGATÓRIO para a sessão segura funcionar
}));
app.use(express.json({ limit: '1mb' }));

// Configuração do Banco de Dados
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
const { betterAuth } = require('better-auth');
const { toNodeHandler } = require('better-auth/node');

// Inicializando o Better Auth com a sua conexão Postgres
const auth = betterAuth({
  database: pool, // Usa o pool do Postgres que você já configurou
  emailAndPassword: {
    enabled: true, // Habilita o login tradicional (email e senha)
    minPasswordLength: 8, // Exige senha forte
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await transporter.sendMail({
              from: `"Presenteie" <${process.env.EMAIL_USER}>`,
              to: user.email,
              subject: `Bem-vindo(a) à Presenteie! 🎉`,
              html: `<h1>Olá, ${user.name.split(' ')[0]}!</h1>
                     <p>Ficamos muito felizes em ter você aqui.</p>
                     <p>A <strong>Presenteie</strong> foi criada para te ajudar a encontrar os melhores presentes para quem você ama.</p>
                     <p>Explore nossa vitrine e fique à vontade para entrar em contato se precisar de ajuda!</p>
                     <br><p>Com carinho,<br>Equipe Presenteie</p>`
            });
          } catch (err) {
            console.error("Erro ao enviar e-mail de boas-vindas:", err);
          }
        }
      }
    }
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"], // Permite vincular o login do Google a uma conta existente com o mesmo e-mail
      requireLocalEmailVerified: false // Necessário porque a conta local foi criada sem verificação de e-mail
    }
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BACKEND_URL || "http://localhost:3001",// URL do seu servidor backend
  trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5173"]
});

// Rota de teste para garantir que a API está rodando
app.get('/api', (req, res) => {
  res.json({ mensagem: 'API da Presenteie rodando com sucesso!' });
});


// ==========================================
// MIDDLEWARES DE SEGURANÇA
// ==========================================
const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Não autorizado. Faça login.' });
    }
    req.user = session.user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Não autorizado.' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Não autorizado. Faça login.' });
    }
    // Verifica se o usuário é o administrador (definido por variável de ambiente)
    const adminEmail = process.env.ADMIN_EMAIL || 'teste@gmail.com';
    if (session.user.email.toLowerCase() !== adminEmail.toLowerCase()) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    req.user = session.user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Não autorizado.' });
  }
};

// Rota de teste para checar a conexão com o banco (Protegida)
app.get('/api/db-test', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ sucesso: true, tempo_banco: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ sucesso: false, erro: 'Erro ao conectar no banco de dados' });
  }
});

// Lista produtos cadastrados no banco (com nome da categoria)
app.get('/api/produtos', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const busca = req.query.busca || '';
    const categoria = req.query.categoria || 'todas';
    
    // Verifica admin pela sessão em vez do query parameter inseguro
    let isAdmin = false;
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      const adminEmail = process.env.ADMIN_EMAIL || 'teste@gmail.com';
      isAdmin = session?.user?.email?.toLowerCase() === adminEmail.toLowerCase();
    } catch (err) {}

    let queryStr = `
      SELECT p.*, c.nome AS categoria_nome, count(*) over() as total_count
      FROM produtos p
      LEFT JOIN categorias c ON p.categoria_id = c.id
      WHERE p.ativo = true
    `;
    const values = [];
    let paramIndex = 1;

    if (!isAdmin) {
      queryStr += ` AND p.estoque > 0`;
    }

    if (busca) {
      queryStr += ` AND (p.nome ILIKE $${paramIndex} OR p.descricao ILIKE $${paramIndex})`;
      values.push(`%${busca}%`);
      paramIndex++;
    }

    if (categoria && categoria !== 'todas') {
      queryStr += ` AND p.categoria_id = $${paramIndex}`;
      values.push(categoria);
      paramIndex++;
    }

    queryStr += ` ORDER BY p.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await pool.query(queryStr, values);
    
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    
    const produtos = result.rows.map(row => {
      const { total_count, ...produto } = row;
      return produto;
    });

    res.json({ produtos, totalCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
});

const PORT = process.env.PORT || 3001;
// ==========================================
// ROTAS DE CATEGORIAS
// ==========================================
// O Better Auth vai interceptar e resolver tudo que chegar em /api/auth
// Adicionamos a palavra "path" logo após o asterisco, com rate limit rígido
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Muitas tentativas de login' } });
app.all("/api/auth/*path", authLimiter, toNodeHandler(auth));
// Rota para listar todas as categorias (GET)
app.get('/api/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar categorias' });
  }
});

// Rota para criar uma nova categoria (POST)
app.post('/api/categorias', requireAdmin, async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    const result = await pool.query(
      'INSERT INTO categorias (nome, descricao) VALUES ($1, $2) RETURNING *',
      [nome, descricao]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar categoria' });
  }
});

// ==========================================
// ROTAS DE PRODUTOS (CRIAR)
// ==========================================

// Rota para criar um novo produto (POST)
app.post('/api/produtos', requireAdmin, upload.single('imagem'), async (req, res) => {
  try {
    const { categoria_id, nome, descricao, preco, estoque } = req.body;
    let imagem_url = req.body.imagem_url || null;

    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const cldRes = await cloudinary.uploader.upload(dataURI, {
        resource_type: "auto",
        folder: "presenteie"
      });
      imagem_url = cldRes.secure_url;
    }

    const catId = categoria_id ? categoria_id : null;

    const result = await pool.query(
      'INSERT INTO produtos (categoria_id, nome, descricao, preco, estoque, imagem_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [catId, nome, descricao, preco, estoque, imagem_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao criar produto' });
  }
});
// ==========================================
// ROTA: ATUALIZAR ESTOQUE (Admin)
// ==========================================
app.patch('/api/produtos/:id/estoque', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { estoque } = req.body;

  if (estoque === undefined || isNaN(estoque) || estoque < 0) {
    return res.status(400).json({ error: 'Estoque inválido.' });
  }

  try {
    const result = await pool.query(
      'UPDATE produtos SET estoque = $1 WHERE id = $2 RETURNING *',
      [estoque, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    res.json({ message: 'Estoque atualizado com sucesso!', produto: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar estoque:', error);
    res.status(500).json({ error: 'Erro ao atualizar estoque.' });
  }
});

// ==========================================
// ROTA: EXCLUIR PRODUTO (Admin)
// ==========================================
app.delete('/api/produtos/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Fazemos "soft delete" (desativar) para não quebrar os históricos de pedidos (chave estrangeira em itens_pedido)
    const result = await pool.query('UPDATE produtos SET ativo = false WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json({ message: 'Produto excluído com sucesso', produto: result.rows[0] });
  } catch (err) {
    console.error('Erro ao excluir produto:', err);
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

// ==========================================
// ROTA: FINALIZAR PEDIDO
// ==========================================
app.post('/api/pedidos', requireAuth, async (req, res) => {
  // Ignora usuario_id do body (VULN-02) e total do body (VULN-01)
  const { nome_cliente, email_cliente, endereco, cidade, cep, itens, telefone, metodo_entrega, metodo_pagamento } = req.body;
  const usuario_id = req.user.id;

  const isEntrega = metodo_entrega === 'entrega';
  
  if (!nome_cliente || !telefone || !itens || itens.length === 0) {
    return res.status(400).json({ error: 'Dados inválidos. Preencha todos os campos obrigatórios e adicione itens.' });
  }

  if (isEntrega && (!endereco || !cidade || !cep)) {
    return res.status(400).json({ error: 'Para entrega, preencha o endereço completo.' });
  }

  const client = await pool.connect();
  let totalCalculado = 0;

  try {
    await client.query('BEGIN');

    // 0. Verifica estoque e busca o PREÇO REAL do banco (VULN-01)
    for (let item of itens) {
      const prodRes = await client.query('SELECT estoque, preco FROM produtos WHERE id = $1 FOR UPDATE', [item.id]);
      if (prodRes.rows.length === 0) {
        throw new Error(`Produto #${item.id} não encontrado.`);
      }
      if (prodRes.rows[0].estoque < item.quantidade) {
        throw new Error(`Estoque insuficiente para o presente: ${item.nome}. Disponível: ${prodRes.rows[0].estoque}`);
      }
      // Anexa o preço real ao item para usar depois e soma ao total
      item.precoReal = parseFloat(prodRes.rows[0].preco);
      totalCalculado += item.precoReal * item.quantidade;
    }

    // 1. Grava os dados principais do pedido
    const resultPedido = await client.query(
      `INSERT INTO pedidos (usuario_id, nome_cliente, endereco, cidade, cep, total, telefone, metodo_entrega, metodo_pagamento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [usuario_id, nome_cliente, endereco || 'Retirada', cidade || 'Retirada', cep || '00000-000', totalCalculado, telefone, metodo_entrega, metodo_pagamento || 'não informado']
    );

    const pedidoId = resultPedido.rows[0].id;

    // 2. Grava itens e dá baixa no estoque
    for (let item of itens) {
      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4)`,
        [pedidoId, item.id, item.quantidade, item.precoReal] // Usa o preço real
      );
      await client.query(
        `UPDATE produtos SET estoque = estoque - $1 WHERE id = $2`,
        [item.quantidade, item.id]
      );
    }

    await client.query('COMMIT');

    // 3. Dispara e-mail
    if (email_cliente) {
      try {
        const mensagemLocal = isEntrega 
          ? `<p>Em breve ele será embalado com muito carinho e enviado para:</p><p> ${endereco}, ${cidade} - ${cep}</p>`
          : `<p>Seu pedido estará pronto em breve para <strong>Retirada no Local</strong>.</p>`;

        const adminEmail = process.env.ADMIN_EMAIL || 'teste@gmail.com';
        await transporter.sendMail({
          from: `"Presenteie" <${process.env.EMAIL_USER}>`,
          to: [email_cliente, adminEmail],
          subject: `Pedido #${pedidoId} Confirmado! `,
          html: `<h1>Obrigado por comprar na Presenteie, ${nome_cliente.split(' ')[0]}!</h1>
                 <p>Seu pedido <strong>#${pedidoId}</strong> no valor de <strong>R$ ${totalCalculado.toFixed(2)}</strong> foi confirmado.</p>
                 ${mensagemLocal}`
        });
      } catch (err) {
        console.error("Erro ao enviar email de confirmação:", err);
      }
    }

    res.status(201).json({ message: 'Pedido salvo com sucesso!', pedidoId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Erro ao salvar pedido:", error);
    res.status(400).json({ error: error.message || 'Erro interno ao processar o pedido.' });
  } finally {
    client.release();
  }
});
// ==========================================
// ROTA: LISTAR TODOS OS PEDIDOS (Admin)
// ==========================================
app.get('/api/pedidos', requireAdmin, async (req, res) => {
  try {
    const resultPedidos = await pool.query(
      `SELECT id, nome_cliente, telefone, metodo_entrega, metodo_pagamento, endereco, cidade, cep, total, status, 
              TO_CHAR(data_pedido, 'DD/MM/YYYY HH24:MI') as data_formatada 
       FROM pedidos 
       ORDER BY data_pedido DESC`
    );
    
    const pedidos = resultPedidos.rows;

    for (let pedido of pedidos) {
      // APAGAMOS O p.imagem DAQUI 
      const resultItens = await pool.query(
        `SELECT ip.quantidade, ip.preco_unitario, p.nome 
         FROM itens_pedido ip
         JOIN produtos p ON ip.produto_id = p.id
         WHERE ip.pedido_id = $1`,
        [pedido.id]
      );
      pedido.itens = resultItens.rows;
    }

    res.json(pedidos);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(500).json({ error: 'Erro ao listar pedidos.' });
  }
});
// ==========================================
// ROTA: LISTAR PEDIDOS DO USUÁRIO LOGADO
// ==========================================
app.get('/api/meus-pedidos/:usuarioId', requireAuth, async (req, res) => {
  const { usuarioId } = req.params;

  // Garantir que o usuário só pode ver seus próprios pedidos
  if (req.user.id !== usuarioId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    const resultPedidos = await pool.query(
      `SELECT id, metodo_entrega, metodo_pagamento, endereco, cidade, cep, total, status, 
              TO_CHAR(data_pedido, 'DD/MM/YYYY HH24:MI') as data_formatada 
       FROM pedidos 
       WHERE usuario_id = $1
       ORDER BY data_pedido DESC`,
      [usuarioId]
    );
    
    const pedidos = resultPedidos.rows;

    for (let pedido of pedidos) {
      const resultItens = await pool.query(
        `SELECT ip.quantidade, ip.preco_unitario, p.nome 
         FROM itens_pedido ip
         JOIN produtos p ON ip.produto_id = p.id
         WHERE ip.pedido_id = $1`,
        [pedido.id]
      );
      pedido.itens = resultItens.rows;
    }

    res.json(pedidos);
  } catch (error) {
    console.error("Erro ao buscar pedidos do usuário:", error);
    res.status(500).json({ error: 'Erro ao listar seus pedidos.' });
  }
});

// ==========================================
// ROTA: ATUALIZAR STATUS DO PEDIDO (Admin)
// ==========================================
app.patch('/api/pedidos/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = ['pendente', 'em_separacao', 'enviado', 'entregue'];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  try {
    const result = await pool.query(
      'UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING id, status, usuario_id, nome_cliente',
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const pedido = result.rows[0];

    // Disparar e-mail informando o novo status
    try {
      const userRes = await pool.query('SELECT email FROM "user" WHERE id = $1', [pedido.usuario_id]);
      if (userRes.rows.length > 0) {
        const email = userRes.rows[0].email;
        let subject = '';
        let htmlMessage = '';
        const nomePrimeiro = pedido.nome_cliente.split(' ')[0];

        switch (status) {
          case 'pendente':
            subject = `Atualização do Pedido #${pedido.id} ⏳`;
            htmlMessage = `<h1>Olá, ${nomePrimeiro}!</h1>
                           <p>Seu pedido <strong>#${pedido.id}</strong> está atualmente <strong>Pendente</strong>.</p>
                           <p>Estamos aguardando a confirmação do pagamento ou a liberação para começar a prepará-lo.</p>`;
            break;
          case 'em_separacao':
            subject = `Estamos preparando o seu presente! 🎁 (Pedido #${pedido.id})`;
            htmlMessage = `<h1>Tudo certo, ${nomePrimeiro}!</h1>
                           <p>O seu pedido <strong>#${pedido.id}</strong> entrou em processo de <strong>Separação</strong>.</p>
                           <p>Nossa equipe está embalando tudo com muito carinho.</p>`;
            break;
          case 'enviado':
            subject = `Oba! Seu Pedido #${pedido.id} está a caminho! 🚚`;
            htmlMessage = `<h1>Boas notícias, ${nomePrimeiro}!</h1>
                           <p>Seu pedido <strong>#${pedido.id}</strong> acaba de ser despachado e está a caminho.</p>
                           <p>Fique de olho, em breve você estará com ele em mãos!</p>`;
            break;
          case 'entregue':
            subject = `Seu Pedido #${pedido.id} foi Entregue! 🎉`;
            htmlMessage = `<h1>Eba, ${nomePrimeiro}! O presente chegou!</h1>
                           <p>Seu pedido <strong>#${pedido.id}</strong> consta como <strong>Entregue</strong>.</p>
                           <p>Esperamos que tenha sido uma ótima experiência. Volte sempre!</p>`;
            break;
        }

        if (subject && htmlMessage) {
          await transporter.sendMail({
            from: `"Presenteie" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: subject,
            html: htmlMessage
          });
        }
      }
    } catch (err) {
      console.error("Erro ao enviar e-mail de status:", err);
    }

    res.json({ message: 'Status atualizado com sucesso!', pedido });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status do pedido.' });
  }
});

app.listen(PORT, 'localhost', () => {
  console.log(`Servidor rodando na porta ${PORT} em localhost`);
});
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Módulos de Logging, Middleware e Auditoria
const logger = require('./lib/logger');
const requestLogger = require('./middleware/requestLogger');
const auditService = require('./services/auditService');
const runMigrations = require('./scripts/migrate');

/**
 * Escapa caracteres HTML perigosos para prevenir HTML/Script Injection em e-mails e respostas.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

// Suporte a Proxy Reverso (Nginx, Cloudflare, etc.) para correta identificação de IPs e Rate Limiting
app.set('trust proxy', 1);

// Middlewares de Segurança Básicos
app.use(helmet());

// Logging de requisições HTTP (com requestId e redação de segredos)
app.use(requestLogger);

// Rate Limiting Global da API (300 reqs a cada 15 min)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use(limiter);

// Rate Limiter Específico para criação de pedidos (evita checkout spam / DoS de estoque)
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Muitas tentativas de pedido. Aguarde alguns minutos.' }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Configuração do Banco de Dados com Pool Seguro
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

// Executa migrations do banco de forma automática e não-bloqueante na inicialização
runMigrations(pool).catch(err => {
  logger.error({ err }, 'Erro ao executar migrations automáticas no startup');
});

const { betterAuth } = require('better-auth');
const { toNodeHandler } = require('better-auth/node');

// Inicializando o Better Auth com a sua conexão Postgres
const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
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
            const safeFirstName = escapeHtml(user.name ? user.name.split(' ')[0] : 'Cliente');
            await transporter.sendMail({
              from: `"Presenteie" <${process.env.EMAIL_USER}>`,
              to: user.email,
              subject: `Bem-vindo(a) à Presenteie! 🎉`,
              html: `<h1>Olá, ${safeFirstName}!</h1>
                     <p>Ficamos muito felizes em ter você aqui.</p>
                     <p>A <strong>Presenteie</strong> foi criada para te ajudar a encontrar os melhores presentes para quem você ama.</p>
                     <p>Explore nossa vitrine e fique à vontade para entrar em contato se precisar de ajuda!</p>
                     <br><p>Com carinho,<br>Equipe Presenteie</p>`
            });
          } catch (err) {
            logger.error({ err, userId: user.id }, "Erro ao enviar e-mail de boas-vindas");
          }
        }
      }
    }
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: true
    }
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BACKEND_URL || "http://localhost:3001",
  trustedOrigins: [process.env.FRONTEND_URL || "http://localhost:5173"]
});

// Rota de teste da API
app.get('/api', (req, res) => {
  res.json({ mensagem: 'API da Presenteie rodando com sucesso!' });
});

// ==========================================
// MIDDLEWARES DE SEGURANÇA E AUTENTICAÇÃO
// ==========================================
const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      auditService.logSecurityEvent(pool, req, 'UNAUTHORIZED_ACCESS_ATTEMPT', {
        resourceType: 'auth',
        resourceId: req.originalUrl,
        errorMessage: 'Não autorizado. Faça login.'
      });
      return res.status(401).json({ error: 'Não autorizado. Faça login.' });
    }
    req.user = session.user;
    next();
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Erro na verificação de autenticação');
    auditService.logSecurityEvent(pool, req, 'AUTH_VERIFICATION_ERROR', {
      resourceType: 'auth',
      errorMessage: error.message
    });
    res.status(401).json({ error: 'Não autorizado.' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      auditService.logSecurityEvent(pool, req, 'UNAUTHORIZED_ACCESS_ATTEMPT', {
        resourceType: 'admin',
        resourceId: req.originalUrl,
        errorMessage: 'Não autorizado. Faça login.'
      });
      return res.status(401).json({ error: 'Não autorizado. Faça login.' });
    }
    
    req.user = session.user;
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail.toLowerCase()) {
      auditService.logSecurityEvent(pool, req, 'FORBIDDEN_ACCESS_ATTEMPT', {
        resourceType: 'admin',
        resourceId: req.originalUrl,
        errorMessage: 'Acesso negado. Apenas administradores.'
      });
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
    next();
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Erro na verificação de admin');
    res.status(401).json({ error: 'Não autorizado.' });
  }
};

// Rota de teste para checar a conexão com o banco (Protegida Admin)
app.get('/api/db-test', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ sucesso: true, tempo_banco: result.rows[0].now });
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Erro ao testar banco de dados');
    res.status(500).json({ sucesso: false, erro: 'Erro ao conectar no banco de dados' });
  }
});

// Lista produtos cadastrados no banco
app.get('/api/produtos', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const busca = req.query.busca || '';
    const categoria = req.query.categoria || 'todas';
    
    let isAdmin = false;
    try {
      const session = await auth.api.getSession({ headers: req.headers });
      const adminEmail = process.env.ADMIN_EMAIL;
      isAdmin = Boolean(adminEmail && session?.user?.email?.toLowerCase() === adminEmail.toLowerCase());
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
      const sanitizedBusca = String(busca).replace(/[%_\\]/g, '\\$&');
      queryStr += ` AND (p.nome ILIKE $${paramIndex} OR p.descricao ILIKE $${paramIndex})`;
      values.push(`%${sanitizedBusca}%`);
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
    logger.error({ err, requestId: req.requestId }, 'Erro ao buscar produtos');
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
});

// ==========================================
// ROTAS DE VERIFICAÇÃO DE E-MAIL (OTP)
// ==========================================
const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Muitas solicitações de código. Aguarde alguns minutos.' }
});

app.post('/api/auth/send-verification-code', verificationLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const emailTrimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      return res.status(400).json({ error: 'Formato de e-mail inválido.' });
    }

    // Verificar se já existe conta com este e-mail
    const existingUser = await pool.query('SELECT id FROM "user" WHERE LOWER(email) = $1', [emailTrimmed]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe uma conta com este e-mail. Faça login.' });
    }

    // Verificar cooldown de 60 segundos
    const recent = await pool.query(
      `SELECT created_at FROM email_verifications 
       WHERE LOWER(email) = $1 AND created_at > NOW() - INTERVAL '60 seconds'
       ORDER BY id DESC LIMIT 1`,
      [emailTrimmed]
    );
    if (recent.rows.length > 0) {
      return res.status(429).json({ error: 'Aguarde 60 segundos antes de solicitar um novo código.' });
    }

    // Gerar código numérico de 6 dígitos
    const code = String(crypto.randomInt(100000, 1000000));
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    // Invalida códigos anteriores e insere novo
    await pool.query('DELETE FROM email_verifications WHERE LOWER(email) = $1', [emailTrimmed]);
    await pool.query(
      `INSERT INTO email_verifications (email, code_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [emailTrimmed, codeHash]
    );

    // Enviar e-mail formatado com o código
    await transporter.sendMail({
      from: `"Presenteie" <${process.env.EMAIL_USER}>`,
      to: emailTrimmed,
      subject: `Seu Código de Verificação: ${code} 🎁`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #f0e6e8; border-radius: 12px; background-color: #fff;">
          <h2 style="color: #c94c65; text-align: center; margin-bottom: 8px;">Bem-vindo(a) à Presenteie! 🎉</h2>
          <p style="color: #555; text-align: center; font-size: 15px; margin-bottom: 24px;">
            Para garantir a segurança da sua conta e o envio correto das atualizações dos seus pedidos, confirme seu e-mail usando o código abaixo:
          </p>
          <div style="background: #fff5f7; border: 2px dashed #c94c65; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #c94c65; font-family: monospace;">
              ${code}
            </span>
          </div>
          <p style="color: #777; font-size: 13px; text-align: center; margin-top: 16px;">
            ⏱️ Este código expira em <strong>10 minutos</strong>.<br>
            Se você não solicitou este cadastro, ignore este e-mail.
          </p>
        </div>
      `
    });

    auditService.saveAuditLog(pool, {
      userEmail: emailTrimmed,
      action: 'VERIFICATION_CODE_SENT',
      resourceType: 'auth',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: true
    });

    res.json({ message: 'Código de verificação enviado para seu e-mail!' });
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Erro ao enviar código de verificação');
    res.status(500).json({ error: 'Erro ao enviar código de verificação. Tente novamente.' });
  }
});

app.post('/api/auth/verify-code', verificationLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'E-mail e código são obrigatórios.' });
    }

    const emailTrimmed = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ error: 'O código deve conter 6 dígitos numéricos.' });
    }

    const verificationRecord = await pool.query(
      `SELECT * FROM email_verifications 
       WHERE LOWER(email) = $1 AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [emailTrimmed]
    );

    if (verificationRecord.rows.length === 0) {
      return res.status(400).json({ error: 'Código expirado ou não encontrado. Solicite um novo código.' });
    }

    const record = verificationRecord.rows[0];

    if (record.attempts >= 5) {
      await pool.query('DELETE FROM email_verifications WHERE id = $1', [record.id]);
      return res.status(400).json({ error: 'Número máximo de tentativas excedido. Solicite um novo código.' });
    }

    const inputHash = crypto.createHash('sha256').update(cleanCode).digest('hex');

    if (inputHash !== record.code_hash) {
      await pool.query('UPDATE email_verifications SET attempts = attempts + 1 WHERE id = $1', [record.id]);
      return res.status(400).json({ error: 'Código incorreto. Verifique seu e-mail e tente novamente.' });
    }

    // Sucesso na validação - remove o registro de verificação
    await pool.query('DELETE FROM email_verifications WHERE id = $1', [record.id]);

    auditService.saveAuditLog(pool, {
      userEmail: emailTrimmed,
      action: 'EMAIL_VERIFIED_SUCCESS',
      resourceType: 'auth',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: true
    });

    res.json({ success: true, message: 'E-mail verificado com sucesso!' });
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Erro ao verificar código');
    res.status(500).json({ error: 'Erro ao validar código.' });
  }
});

// ==========================================
// ROTAS DE AUTENTICAÇÃO (Better Auth + Interceptor de Auditoria)
// ==========================================
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Muitas tentativas de login' } });

app.all("/api/auth/*path", authLimiter, (req, res, next) => {
  const pathStr = req.params.path || req.path || '';

  res.on('finish', () => {
    const success = res.statusCode < 400;
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    if (pathStr.includes('sign-in') || pathStr.includes('login')) {
      auditService.saveAuditLog(pool, {
        userId: req.user?.id || null,
        userEmail: req.body?.email || req.user?.email || null,
        action: success ? 'USER_LOGIN' : 'LOGIN_FAILED',
        resourceType: 'auth',
        ipAddress,
        userAgent,
        requestId: req.requestId,
        success,
        errorMessage: success ? null : `HTTP ${res.statusCode}`
      });
    } else if (pathStr.includes('sign-out') || pathStr.includes('logout')) {
      auditService.saveAuditLog(pool, {
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        action: 'USER_LOGOUT',
        resourceType: 'auth',
        ipAddress,
        userAgent,
        requestId: req.requestId,
        success
      });
    } else if (pathStr.includes('sign-up') || pathStr.includes('register')) {
      auditService.saveAuditLog(pool, {
        userId: req.user?.id || null,
        userEmail: req.body?.email || null,
        action: success ? 'USER_REGISTERED' : 'REGISTER_FAILED',
        resourceType: 'user',
        ipAddress,
        userAgent,
        requestId: req.requestId,
        success
      });
    }
  });

  toNodeHandler(auth)(req, res, next);
});

// ==========================================
// ROTAS DE CATEGORIAS
// ==========================================
app.get('/api/categorias', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categorias');
    res.json(result.rows);
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Erro ao buscar categorias');
    res.status(500).json({ erro: 'Erro ao buscar categorias' });
  }
});

app.post('/api/categorias', requireAdmin, async (req, res) => {
  try {
    const { nome, descricao } = req.body;
    const result = await pool.query(
      'INSERT INTO categorias (nome, descricao) VALUES ($1, $2) RETURNING *',
      [nome, descricao]
    );
    const novaCategoria = result.rows[0];

    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'CATEGORY_CREATED',
      resourceType: 'categoria',
      resourceId: novaCategoria.id,
      newValues: { nome: novaCategoria.nome, descricao: novaCategoria.descricao },
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: true
    });

    res.status(201).json(novaCategoria);
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Erro ao criar categoria');
    auditService.saveAuditLog(pool, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'CATEGORY_CREATE_FAILED',
      resourceType: 'categoria',
      newValues: { nome: req.body?.nome },
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: false,
      errorMessage: err.message
    });
    res.status(500).json({ erro: 'Erro ao criar categoria' });
  }
});

// ==========================================
// ROTAS DE PRODUTOS (Criar, Estoque, Excluir)
// ==========================================

app.post('/api/produtos', requireAdmin, upload.single('imagem'), async (req, res) => {
  try {
    const { categoria_id, nome, descricao, preco, estoque } = req.body;
    let imagem_url = null;

    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const cldRes = await cloudinary.uploader.upload(dataURI, {
        resource_type: "image",
        folder: "presenteie"
      });
      imagem_url = cldRes.secure_url;
    } else if (req.body.imagem_url) {
      const urlStr = String(req.body.imagem_url).trim();
      if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        imagem_url = urlStr;
      }
    }

    const catId = categoria_id ? categoria_id : null;

    const result = await pool.query(
      'INSERT INTO produtos (categoria_id, nome, descricao, preco, estoque, imagem_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [catId, nome, descricao, preco, estoque, imagem_url]
    );
    const produto = result.rows[0];

    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'PRODUCT_CREATED',
      resourceType: 'produto',
      resourceId: produto.id,
      newValues: {
        categoria_id: produto.categoria_id,
        nome: produto.nome,
        descricao: produto.descricao,
        preco: produto.preco,
        estoque: produto.estoque,
        imagem_url: produto.imagem_url
      },
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: true
    });

    res.status(201).json(produto);
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Erro ao criar produto');
    auditService.saveAuditLog(pool, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'PRODUCT_CREATE_FAILED',
      resourceType: 'produto',
      newValues: { nome: req.body?.nome },
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: false,
      errorMessage: err.message
    });
    res.status(500).json({ erro: 'Erro ao criar produto' });
  }
});

app.patch('/api/produtos/:id/estoque', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { estoque } = req.body;

  if (estoque === undefined || isNaN(estoque) || estoque < 0) {
    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'STOCK_UPDATE_REJECTED',
      resourceType: 'produto',
      resourceId: id,
      newValues: { estoque },
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: false,
      errorMessage: 'Estoque inválido.'
    });
    return res.status(400).json({ error: 'Estoque inválido.' });
  }

  try {
    const currentProd = await pool.query('SELECT id, estoque, nome FROM produtos WHERE id = $1', [id]);
    if (currentProd.rows.length === 0) {
      auditService.saveAuditLog(pool, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'STOCK_UPDATE_FAILED',
        resourceType: 'produto',
        resourceId: id,
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        requestId: req.requestId,
        success: false,
        errorMessage: 'Produto não encontrado.'
      });
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const oldState = { estoque: currentProd.rows[0].estoque };
    const newState = { estoque: parseInt(estoque, 10) };
    const diff = auditService.computeDiff(oldState, newState);

    const result = await pool.query(
      'UPDATE produtos SET estoque = $1 WHERE id = $2 RETURNING *',
      [estoque, id]
    );

    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'STOCK_UPDATED',
      resourceType: 'produto',
      resourceId: id,
      oldValues: diff.oldValues,
      newValues: diff.newValues,
      changedFields: diff.changedFields,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: true
    });

    res.json({ message: 'Estoque atualizado com sucesso!', produto: result.rows[0] });
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Erro ao atualizar estoque');
    auditService.saveAuditLog(pool, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'STOCK_UPDATE_FAILED',
      resourceType: 'produto',
      resourceId: id,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: false,
      errorMessage: error.message
    });
    res.status(500).json({ error: 'Erro ao atualizar estoque.' });
  }
});

app.delete('/api/produtos/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const currentProd = await pool.query('SELECT id, ativo, nome FROM produtos WHERE id = $1', [id]);
    if (currentProd.rows.length === 0) {
      auditService.saveAuditLog(pool, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'PRODUCT_DELETE_FAILED',
        resourceType: 'produto',
        resourceId: id,
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        requestId: req.requestId,
        success: false,
        errorMessage: 'Produto não encontrado'
      });
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const oldState = { ativo: currentProd.rows[0].ativo };
    const newState = { ativo: false };
    const diff = auditService.computeDiff(oldState, newState);

    const result = await pool.query('UPDATE produtos SET ativo = false WHERE id = $1 RETURNING *', [id]);

    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'PRODUCT_DELETED',
      resourceType: 'produto',
      resourceId: id,
      oldValues: diff.oldValues,
      newValues: diff.newValues,
      changedFields: diff.changedFields,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: true
    });

    res.json({ message: 'Produto excluído com sucesso', produto: result.rows[0] });
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Erro ao excluir produto');
    auditService.saveAuditLog(pool, {
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'PRODUCT_DELETE_FAILED',
      resourceType: 'produto',
      resourceId: id,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: false,
      errorMessage: err.message
    });
    res.status(500).json({ error: 'Erro ao excluir produto' });
  }
});

// ==========================================
// ROTA: FINALIZAR PEDIDO (Auditoria de Pedidos e Baixa de Estoque)
// ==========================================
app.post('/api/pedidos', orderLimiter, requireAuth, async (req, res) => {
  const { nome_cliente, email_cliente, endereco, cidade, cep, itens, telefone, metodo_entrega, metodo_pagamento } = req.body;
  const usuario_id = req.user.id;

  const allowedMetodosEntrega = ['retirada', 'entrega'];
  const entregaTipo = allowedMetodosEntrega.includes(metodo_entrega) ? metodo_entrega : 'retirada';
  const isEntrega = entregaTipo === 'entrega';

  const allowedMetodosPagamento = ['cartão', 'pix', 'espécie', 'não informado'];
  const pagamentoTipo = allowedMetodosPagamento.includes(metodo_pagamento) ? metodo_pagamento : 'não informado';

  if (!nome_cliente || typeof nome_cliente !== 'string' || !nome_cliente.trim() ||
      !telefone || typeof telefone !== 'string' || !telefone.trim() ||
      !Array.isArray(itens) || itens.length === 0 || itens.length > 50) {
    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ORDER_CREATE_REJECTED',
      resourceType: 'pedido',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: false,
      errorMessage: 'Dados de pedido inválidos.'
    });
    return res.status(400).json({ error: 'Dados inválidos. Preencha todos os campos obrigatórios e adicione itens válidos.' });
  }

  if (isEntrega && (!endereco || !cidade || !cep || typeof endereco !== 'string' || typeof cidade !== 'string' || typeof cep !== 'string')) {
    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ORDER_CREATE_REJECTED',
      resourceType: 'pedido',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: false,
      errorMessage: 'Endereço de entrega incompleto.'
    });
    return res.status(400).json({ error: 'Para entrega, preencha o endereço completo.' });
  }

  // Validação estrita de cada item e consolidação de IDs duplicados
  const itemMap = new Map();
  for (const item of itens) {
    if (!item || typeof item !== 'object') {
      return res.status(400).json({ error: 'Item de pedido malformado.' });
    }
    const id = parseInt(item.id, 10);
    const quantidade = parseInt(item.quantidade, 10);

    if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(quantidade) || quantidade <= 0 || quantidade > 100) {
      auditService.saveAuditLog(pool, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'ORDER_CREATE_REJECTED',
        resourceType: 'pedido',
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        requestId: req.requestId,
        success: false,
        errorMessage: `Quantidade ou ID inválido para o item: ${item.id}`
      });
      return res.status(400).json({ error: 'Quantidade de item inválida. Deve ser um número inteiro positivo.' });
    }

    itemMap.set(id, (itemMap.get(id) || 0) + quantidade);
  }

  const client = await pool.connect();
  let totalCalculado = 0;
  const consolidatedItens = [];

  try {
    await client.query('BEGIN');

    for (const [itemId, qtd] of itemMap.entries()) {
      const prodRes = await client.query('SELECT id, nome, estoque, preco, ativo FROM produtos WHERE id = $1 FOR UPDATE', [itemId]);
      if (prodRes.rows.length === 0 || !prodRes.rows[0].ativo) {
        throw new Error(`Produto #${itemId} não encontrado ou inativo.`);
      }
      const prod = prodRes.rows[0];
      if (prod.estoque < qtd) {
        throw new Error(`Estoque insuficiente para o produto: ${prod.nome}. Disponível: ${prod.estoque}, Solicitado: ${qtd}`);
      }
      const precoUnitario = parseFloat(prod.preco);
      totalCalculado += precoUnitario * qtd;
      consolidatedItens.push({
        id: prod.id,
        nome: prod.nome,
        quantidade: qtd,
        precoReal: precoUnitario
      });
    }

    const safeNome = nome_cliente.trim().substring(0, 100);
    const safeTelefone = telefone.trim().substring(0, 30);
    const safeEndereco = isEntrega ? endereco.trim().substring(0, 200) : 'Retirada';
    const safeCidade = isEntrega ? cidade.trim().substring(0, 100) : 'Retirada';
    const safeCep = isEntrega ? cep.trim().substring(0, 20) : '00000-000';

    const resultPedido = await client.query(
      `INSERT INTO pedidos (usuario_id, nome_cliente, endereco, cidade, cep, total, telefone, metodo_entrega, metodo_pagamento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [usuario_id, safeNome, safeEndereco, safeCidade, safeCep, totalCalculado, safeTelefone, entregaTipo, pagamentoTipo]
    );

    const pedidoId = resultPedido.rows[0].id;

    for (const item of consolidatedItens) {
      await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4)`,
        [pedidoId, item.id, item.quantidade, item.precoReal]
      );
      await client.query(
        `UPDATE produtos SET estoque = estoque - $1 WHERE id = $2`,
        [item.quantidade, item.id]
      );
    }

    await client.query('COMMIT');

    // Registrar evento de auditoria para o pedido criado
    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ORDER_CREATED',
      resourceType: 'pedido',
      resourceId: pedidoId,
      newValues: {
        total: totalCalculado,
        metodo_entrega: entregaTipo,
        metodo_pagamento: pagamentoTipo,
        quantidade_itens: consolidatedItens.length
      },
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: true
    });

    if (email_cliente) {
      try {
        const mensagemLocal = isEntrega 
          ? `<p>Em breve ele será embalado com muito carinho e enviado para:</p><p>📍 ${escapeHtml(safeEndereco)}, ${escapeHtml(safeCidade)} - ${escapeHtml(safeCep)}</p>`
          : `<p>Seu pedido estará pronto em breve para <strong>Retirada no Local</strong>.</p>
             <p>📍 <strong>Local para Retirada:</strong> <a href="https://maps.app.goo.gl/bJLVbX5qwyjFf67A9" target="_blank" style="color: #c94c65; font-weight: bold; text-decoration: underline;">Abrir localização no Google Maps ↗</a></p>
             <p style="color: #666; font-size: 0.95em;"><em>Lembramos que o pagamento é realizado presencialmente na retirada.</em></p>`;

        const adminEmail = process.env.ADMIN_EMAIL;
        const recipients = [email_cliente];
        if (adminEmail) recipients.push(adminEmail);

        await transporter.sendMail({
          from: `"Presenteie" <${process.env.EMAIL_USER}>`,
          to: recipients,
          subject: `Pedido #${pedidoId} Confirmado! `,
          html: `<h1>Obrigado por comprar na Presenteie, ${escapeHtml(safeNome.split(' ')[0])}!</h1>
                 <p>Seu pedido <strong>#${pedidoId}</strong> no valor de <strong>R$ ${totalCalculado.toFixed(2)}</strong> foi confirmado.</p>
                 ${mensagemLocal}`
        });
      } catch (err) {
        logger.error({ err, requestId: req.requestId, pedidoId }, "Erro ao enviar email de confirmação");
      }
    }

    res.status(201).json({ message: 'Pedido salvo com sucesso!', pedidoId });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error, requestId: req.requestId }, "Erro ao salvar pedido");

    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ORDER_CREATE_FAILED',
      resourceType: 'pedido',
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: false,
      errorMessage: error.message
    });

    res.status(400).json({ error: error.message || 'Erro interno ao processar o pedido.' });
  } finally {
    client.release();
  }
});

// Listar todos os pedidos (Admin)
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
    logger.error({ err: error, requestId: req.requestId }, "Erro ao buscar pedidos");
    res.status(500).json({ error: 'Erro ao listar pedidos.' });
  }
});

// Listar pedidos do usuário logado
app.get('/api/meus-pedidos/:usuarioId', requireAuth, async (req, res) => {
  const { usuarioId } = req.params;

  if (req.user.id !== usuarioId) {
    auditService.logSecurityEvent(pool, req, 'FORBIDDEN_ACCESS_ATTEMPT', {
      resourceType: 'pedido',
      resourceId: usuarioId,
      errorMessage: 'Tentativa de visualizar pedidos de outro usuário.'
    });
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
    logger.error({ err: error, requestId: req.requestId }, "Erro ao buscar pedidos do usuário");
    res.status(500).json({ error: 'Erro ao listar seus pedidos.' });
  }
});

// Atualizar status do pedido (Admin)
app.patch('/api/pedidos/:id/status', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = ['pendente', 'em_separacao', 'enviado', 'entregue'];
  if (!statusValidos.includes(status)) {
    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ORDER_STATUS_UPDATE_REJECTED',
      resourceType: 'pedido',
      resourceId: id,
      newValues: { status },
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: false,
      errorMessage: 'Status inválido.'
    });
    return res.status(400).json({ error: 'Status inválido.' });
  }

  try {
    const currentOrder = await pool.query('SELECT id, status, usuario_id, nome_cliente FROM pedidos WHERE id = $1', [id]);
    if (currentOrder.rows.length === 0) {
      auditService.saveAuditLog(pool, {
        userId: req.user.id,
        userEmail: req.user.email,
        action: 'ORDER_STATUS_UPDATE_FAILED',
        resourceType: 'pedido',
        resourceId: id,
        ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        requestId: req.requestId,
        success: false,
        errorMessage: 'Pedido não encontrado.'
      });
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }

    const oldState = { status: currentOrder.rows[0].status };
    const newState = { status };
    const diff = auditService.computeDiff(oldState, newState);

    const result = await pool.query(
      'UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING id, status, usuario_id, nome_cliente',
      [status, id]
    );

    const pedido = result.rows[0];

    auditService.saveAuditLog(pool, {
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'ORDER_STATUS_UPDATED',
      resourceType: 'pedido',
      resourceId: id,
      oldValues: diff.oldValues,
      newValues: diff.newValues,
      changedFields: diff.changedFields,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      requestId: req.requestId,
      success: true
    });

    // Disparar e-mail informando o novo status
    try {
      const userRes = await pool.query('SELECT email FROM "user" WHERE id = $1', [pedido.usuario_id]);
      if (userRes.rows.length > 0) {
        const email = userRes.rows[0].email;
        let subject = '';
        let htmlMessage = '';
        const nomePrimeiro = escapeHtml(pedido.nome_cliente ? pedido.nome_cliente.split(' ')[0] : 'Cliente');

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
      logger.error({ err, requestId: req.requestId, pedidoId: id }, "Erro ao enviar e-mail de status");
    }

    res.json({ message: 'Status atualizado com sucesso!', pedido });
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Erro ao atualizar status');
    res.status(500).json({ error: 'Erro ao atualizar status do pedido.' });
  }
});

// ==========================================
// ROTA ADMINISTRATIVA: CONSULTAR AUDITORIA (Restrito Admin)
// ==========================================
app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const { user_id, action, resource_type, resource_id, request_id, success } = req.query;

    let queryStr = `
      SELECT *, count(*) OVER() as total_count
      FROM audit_logs
      WHERE 1=1
    `;
    const values = [];
    let paramIdx = 1;

    if (user_id) {
      queryStr += ` AND user_id = $${paramIdx++}`;
      values.push(user_id);
    }
    if (action) {
      queryStr += ` AND action = $${paramIdx++}`;
      values.push(action);
    }
    if (resource_type) {
      queryStr += ` AND resource_type = $${paramIdx++}`;
      values.push(resource_type);
    }
    if (resource_id) {
      queryStr += ` AND resource_id = $${paramIdx++}`;
      values.push(resource_id);
    }
    if (request_id) {
      queryStr += ` AND request_id = $${paramIdx++}`;
      values.push(request_id);
    }
    if (success !== undefined) {
      queryStr += ` AND success = $${paramIdx++}`;
      values.push(success === 'true');
    }

    queryStr += ` ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    values.push(limit, offset);

    const result = await pool.query(queryStr, values);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;

    const logs = result.rows.map(row => {
      const { total_count, ...log } = row;
      return log;
    });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    logger.error({ err: error, requestId: req.requestId }, 'Erro ao consultar logs de auditoria');
    res.status(500).json({ error: 'Erro ao buscar registros de auditoria.' });
  }
});

// Middleware Global para Tratamento de Erros
app.use((err, req, res, next) => {
  logger.error({ err, requestId: req.requestId, endpoint: req.originalUrl }, 'Erro não tratado capturado pelo middleware global');
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    error: isDev ? (err.message || 'Erro interno do servidor') : 'Erro interno do servidor',
    requestId: req.requestId
  });
});

const PORT = process.env.PORT || 3001;

// Exporta app, pool e utilitários para testes
if (require.main === module) {
  app.listen(PORT, 'localhost', () => {
    logger.info(`Servidor rodando na porta ${PORT} em localhost`);
  });
}

module.exports = { app, pool, escapeHtml };
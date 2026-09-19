require('dotenv').config();
const { betterAuth } = require('better-auth');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8
  }
});

async function setAdminPassword() {
  const newPassword = 'Niar@40610';
  const targetEmails = [
    'presenteie.oficial2@gmail.com',
    'teste@gmail.com'
  ];

  try {
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(newPassword);

    for (const email of targetEmails) {
      // Verifica se usuário existe
      const userRes = await pool.query('SELECT id, name, email FROM "user" WHERE LOWER(email) = LOWER($1)', [email]);

      let userId;
      if (userRes.rows.length === 0) {
        // Cria usuário caso não exista ainda
        userId = crypto.randomBytes(16).toString('hex');
        const now = new Date();
        await pool.query(
          'INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6)',
          [userId, email.split('@')[0], email.toLowerCase(), true, now, now]
        );
        console.log(`[+] Usuário criado: ${email} (ID: ${userId})`);

        // Cria conta de credencial
        const accountId = crypto.randomBytes(16).toString('hex');
        await pool.query(
          'INSERT INTO "account" (id, "accountId", "providerId", "userId", "password", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [accountId, userId, 'credential', userId, hashedPassword, now, now]
        );
        console.log(`[+] Conta com senha configurada para: ${email}`);
      } else {
        userId = userRes.rows[0].id;
        console.log(`[*] Usuário existente encontrado: ${email} (ID: ${userId})`);

        // Verifica se já tem account do tipo credential
        const accRes = await pool.query('SELECT id FROM "account" WHERE "userId" = $1 AND "providerId" = $2', [userId, 'credential']);
        const now = new Date();

        if (accRes.rows.length === 0) {
          const accountId = crypto.randomBytes(16).toString('hex');
          await pool.query(
            'INSERT INTO "account" (id, "accountId", "providerId", "userId", "password", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [accountId, userId, 'credential', userId, hashedPassword, now, now]
          );
          console.log(`[+] Conta de credencial criada para: ${email}`);
        } else {
          await pool.query(
            'UPDATE "account" SET "password" = $1, "updatedAt" = $2 WHERE "userId" = $3 AND "providerId" = $4',
            [hashedPassword, now, userId, 'credential']
          );
          console.log(`[✓] Senha atualizada com sucesso para: ${email}`);
        }
      }

      // Validação do hash com o próprio better-auth
      const checkAcc = await pool.query('SELECT password FROM "account" WHERE "userId" = $1 AND "providerId" = $2', [userId, 'credential']);
      const isValid = await ctx.password.verify({
        hash: checkAcc.rows[0].password,
        password: newPassword
      });
      console.log(`[✓] Teste de verificação de login para ${email}: ${isValid ? 'SUCESSO (Senha válida)' : 'FALHA'}`);
    }

  } catch (error) {
    console.error('Erro ao definir senha:', error);
  } finally {
    await pool.end();
  }
}

setAdminPassword();

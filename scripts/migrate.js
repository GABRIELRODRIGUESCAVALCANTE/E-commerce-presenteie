require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const logger = require('../lib/logger');

async function runMigrations(externalPool) {
  const pool = externalPool || new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });

  const client = await pool.connect();

  try {
    logger.info('Iniciando verificação de migrations...');

    // Garante que a tabela de controle de migrations existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      logger.warn(`Diretório de migrations não encontrado: ${migrationsDir}`);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const res = await client.query('SELECT id FROM schema_migrations WHERE name = $1', [file]);
      if (res.rows.length === 0) {
        logger.info(`Executando migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');

        logger.info(`Migration executada com sucesso: ${file}`);
      } else {
        logger.debug(`Migration já executada anteriormente: ${file}`);
      }
    }

    logger.info('Todas as migrations estão atualizadas.');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Erro ao executar migrations');
    throw error;
  } finally {
    client.release();
    if (!externalPool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Processo de migration finalizado.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Falha fatal na migração do banco.');
      process.exit(1);
    });
}

module.exports = runMigrations;

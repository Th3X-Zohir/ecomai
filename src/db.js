const { Pool } = require('pg');
const config = require('./config');

const isProduction = config.nodeEnv === 'production';

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: isProduction ? 20 : 10,                    // max connections
  idleTimeoutMillis: 30_000,                       // close idle clients after 30s
  connectionTimeoutMillis: 5_000,                  // fail if can't connect in 5s
  statement_timeout: isProduction ? 30_000 : 0,    // kill queries > 30s in prod
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err.message);
});

/** Run a single parameterised query */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const ms = Date.now() - start;
  if (config.nodeEnv === 'development' && ms > 200) {
    console.log(`[DB slow] ${ms}ms — ${text.substring(0, 80)}`);
  }
  return result;
}

/** Run multiple queries inside a single transaction */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Get a raw client (remember to release!) */
async function getClient() {
  return pool.connect();
}

/** Graceful shutdown */
async function close() {
  await pool.end();
}

module.exports = { query, withTransaction, getClient, close, pool };

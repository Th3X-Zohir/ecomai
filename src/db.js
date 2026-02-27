const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({ connectionString: config.databaseUrl });

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

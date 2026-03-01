const app = require('./src/app');
const { port } = require('./src/config');
const db = require('./src/db');

const server = app.listen(port, () => {
  console.log(`Ecomai API listening on :${port}`);
});

// ── Periodic cleanup: purge expired refresh tokens every hour ──
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
setInterval(async () => {
  try {
    const { rowCount } = await db.query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    if (rowCount > 0) console.log(`[CLEANUP] Purged ${rowCount} expired refresh tokens`);
  } catch (err) {
    console.error('[CLEANUP] Refresh token purge failed:', err.message);
  }
}, CLEANUP_INTERVAL);

// ── Graceful shutdown ───────────────────────────────────
const SHUTDOWN_TIMEOUT = 10_000; // 10s hard kill

async function shutdown(signal) {
  console.log(`${signal} received, draining connections...`);

  // Stop accepting new connections
  await new Promise((resolve) => server.close(resolve));
  console.log('HTTP server closed');

  // Close DB pool
  await db.close();
  console.log('DB pool closed — shutdown complete');

  process.exit(0);
}

// Force exit if graceful shutdown hangs
function forceShutdown(signal) {
  shutdown(signal).catch((err) => {
    console.error('Error during shutdown:', err.message);
    process.exit(1);
  });

  setTimeout(() => {
    console.error(`Forced exit after ${SHUTDOWN_TIMEOUT}ms timeout`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT).unref();
}

process.on('SIGTERM', () => forceShutdown('SIGTERM'));
process.on('SIGINT', () => forceShutdown('SIGINT'));

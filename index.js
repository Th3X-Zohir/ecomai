const app = require('./src/app');
const { port } = require('./src/config');
const db = require('./src/db');

// ── Sentry (error tracking) ───────────────────────────────────
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Only trace performance in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    // Don't send errors in test environment
    enabled: process.env.NODE_ENV !== 'test',
    beforeSend(event) {
      // Scrub sensitive fields before sending
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['x-csrf-token'];
      }
      return event;
    },
  });
  console.log('[Sentry] Error tracking initialized');
}

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

// ── Weekly: compute shop metrics snapshots every Monday at 2am ──
let _lastSnapshotDate = null;
setInterval(async () => {
  const now = new Date();
  // Run once per week: Monday (day 1) between 2:00 and 2:59
  if (now.getDay() !== 1) return;
  const todayStr = now.toISOString().slice(0, 10);
  if (_lastSnapshotDate === todayStr) return;
  _lastSnapshotDate = todayStr;
  try {
    const analyticsService = require('./src/services/analytics');
    const result = await analyticsService.computeAllWeeklySnapshots();
    console.log(`[WEEKLY] Shop metrics snapshot completed: ${result.processed} shops, ${result.failed} failed`);
  } catch (err) {
    console.error('[WEEKLY] Shop metrics snapshot failed:', err.message);
  }
  // Also compute product co-occurrence for upsell intelligence
  try {
    const upsellService = require('./src/services/upsell');
    await upsellService.computeCooccurrence();
    console.log('[WEEKLY] Product co-occurrence computed');
  } catch (err) {
    console.error('[WEEKLY] Co-occurrence computation failed:', err.message);
  }
}, 60 * 60 * 1000); // Check every hour

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

/**
 * Cron Worker — Background job processor for Ecomai.
 * Run as a separate process: `bun run src/cron.js`
 *
 * Jobs:
 * - Every 5 minutes:   process settlement auto-releases
 * - Every 10 minutes:  process settlement schedules
 * - Every Monday 2am:   compute weekly analytics snapshots
 * - Every day 3am:     compute product co-occurrence matrix
 * - Every hour:        refresh stale shop balance summaries
 */
const { cron } = require('node-cron');
const settlementsService = require('./services/settlements');
const analyticsService = require('./services/analytics');
const upsellService = require('./services/upsell');
const settlementRepo = require('./repositories/settlements');

let isRunning = false;

async function runSettlementReleases() {
  if (isRunning) return;
  isRunning = true;
  try {
    console.log(`[${new Date().toISOString()}] Processing automatic settlement releases...`);
    const results = await settlementsService.processAutomaticReleases();
    console.log(`[${new Date().toISOString()}] Settlement releases: ${results.processed} processed, ${results.failed} failed`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Settlement release error:`, err.message);
  } finally {
    isRunning = false;
  }
}

async function runRefreshBalances() {
  try {
    console.log(`[${new Date().toISOString()}] Refreshing shop balance summaries...`);
    const balances = await settlementRepo.getAllShopBalances();
    for (const bal of balances) {
      try {
        await settlementRepo.updateShopBalanceSummary(bal.shop_id);
      } catch (_) { /* skip failures */ }
    }
    console.log(`[${new Date().toISOString()}] Refreshed ${balances.length} shop balances`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Balance refresh error:`, err.message);
  }
}

async function runWeeklySnapshots() {
  try {
    console.log(`[${new Date().toISOString()}] Computing weekly analytics snapshots...`);
    await analyticsService.computeAllWeeklySnapshots();
    console.log(`[${new Date().toISOString()}] Weekly snapshots complete`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Weekly snapshot error:`, err.message);
  }
}

async function runCooccurrence() {
  try {
    console.log(`[${new Date().toISOString()}] Computing product co-occurrence...`);
    await upsellService.computeCooccurrence();
    console.log(`[${new Date().toISOString()}] Co-occurrence computation complete`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Co-occurrence error:`, err.message);
  }
}

// ── Schedule Jobs ────────────────────────────────────────────────────────────

// Every 5 minutes: process settlement auto-releases
cron('*/5 * * * *', runSettlementReleases);

// Every hour: refresh shop balance summaries
cron('0 * * * *', runRefreshBalances);

// Every Monday at 2am: weekly analytics snapshots + co-occurrence
cron('0 2 * * 1', async () => {
  await runWeeklySnapshots();
  await runCooccurrence();
});

// Every day at 3am: co-occurrence (backup run)
cron('0 3 * * *', runCooccurrence);

console.log(`[${new Date().toISOString()}] Ecomai cron worker started`);
console.log('Jobs:');
console.log('  */5 * * * *  - Settlement auto-releases');
console.log('  0 * * * *    - Refresh shop balances');
console.log('  0 2 * * 1    - Weekly analytics snapshots (Mondays 2am)');
console.log('  0 3 * * *    - Product co-occurrence (daily 3am)');

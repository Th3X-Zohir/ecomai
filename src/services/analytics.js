/**
 * Analytics Service — Merchant Benchmarking Engine
 * Orchestrates benchmarking data for shop dashboards.
 */
const analyticsRepo = require('../repositories/analytics');
const { DomainError } = require('../errors/domain-error');

/**
 * Get full benchmark report for a shop.
 * Returns KPIs, peer comparison, percentile ranks, and top-level insights.
 */
async function getShopBenchmark(shopId) {
  if (!shopId) throw new DomainError('VALIDATION_ERROR', 'shopId is required', 400);

  const [segment, kpis, insights] = await Promise.all([
    analyticsRepo.getShopSegment(shopId),
    analyticsRepo.getShopKpis(shopId),
    analyticsRepo.generateInsights(shopId),
  ]);

  if (!segment) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);

  // Get peer benchmarks (async — don't block if not enough peers)
  let peerKpis = null;
  let percentileRanks = null;
  try {
    [peerKpis, percentileRanks] = await Promise.all([
      analyticsRepo.getPeerGroupKpis(segment.planTier, segment.ageBand, segment.revBand, 30),
      analyticsRepo.getShopPercentileRank(shopId, segment.planTier, segment.ageBand, segment.revBand, 30),
    ]);
  } catch (_) {
    // Not enough peer data yet — this is fine for new shops
  }

  // Build comparison summary
  const comparison = buildComparison(kpis, peerKpis);

  return {
    shop: {
      planTier: segment.planTier,
      ageBand: segment.ageBand,
      revBand: segment.revBand,
    },
    kpis: {
      period: 'last_30_days',
      orders: kpis.orders,
      revenue: kpis.revenue,
      aov: kpis.aov,
      customers: kpis.customers,
      lifetime: kpis.lifetime,
    },
    comparison: {
      peerCount: percentileRanks?.peerCount || 0,
      hasPeerData: !!peerKpis && Number(peerKpis.peer_count) >= 3,
      kpis: comparison,
      percentiles: percentileRanks
        ? {
            revenue: percentileRanks.revenuePercentile,
            aov: percentileRanks.aovPercentile,
            orders: percentileRanks.ordersPercentile,
          }
        : null,
    },
    insights: insights.slice(0, 5), // Top 5 most relevant insights
    segmentKey: segment.key,
  };
}

/**
 * Build human-readable KPI comparison between shop and peer group.
 */
function buildComparison(kpis, peerKpis) {
  if (!peerKpis || !peerKpis || Number(peerKpis.peer_count) < 3) {
    return null; // Not enough peer data
  }

  const peerAvgOrders = Number(peerKpis.avg_orders) || 0;
  const peerAvgAov = Number(peerKpis.avg_aov) || 0;
  const peerAvgRevenue = Number(peerKpis.avg_revenue) || 0;
  const peerAvgReturningRate = Number(peerKpis.avg_returning_rate) || 0;
  const peerMedianAov = Number(peerKpis.median_aov) || 0;

  return {
    orders: {
      shop: kpis.orders.total,
      peerAvg: Math.round(peerAvgOrders * 10) / 10,
      verdict: verdict(kpis.orders.total, peerAvgOrders),
      label: kpis.orders.total > peerAvgOrders ? 'above' : kpis.orders.total < peerAvgOrders ? 'below' : 'at',
    },
    aov: {
      shop: kpis.aov.current,
      peerAvg: Math.round(peerAvgAov * 100) / 100,
      peerMedian: Math.round(peerMedianAov * 100) / 100,
      verdict: verdict(kpis.aov.current, peerAvgAov),
      label: kpis.aov.current > peerAvgAov ? 'above' : kpis.aov.current < peerAvgAov ? 'below' : 'at',
    },
    revenue: {
      shop: kpis.revenue.total,
      peerAvg: Math.round(peerAvgRevenue * 100) / 100,
      verdict: verdict(kpis.revenue.total, peerAvgRevenue),
      label: kpis.revenue.total > peerAvgRevenue ? 'above' : kpis.revenue.total < peerAvgRevenue ? 'below' : 'at',
    },
    returningRate: {
      shop: kpis.customers.returningRate,
      peerAvg: peerAvgReturningRate,
      verdict: verdict(kpis.customers.returningRate, peerAvgReturningRate, true),
      label: kpis.customers.returningRate > peerAvgReturningRate ? 'above' : 'below',
    },
  };
}

function verdict(shopValue, peerAvg, inverse = false) {
  if (peerAvg === 0) return 'unknown';
  const ratio = shopValue / peerAvg;
  if (ratio >= 1.2) return inverse ? 'needs_attention' : 'strong';
  if (ratio >= 0.9) return 'average';
  if (ratio >= 0.7) return 'below_average';
  return inverse ? 'strong' : 'needs_attention';
}

/**
 * Get customer analytics summary for a shop.
 */
async function getCustomerAnalytics(shopId) {
  if (!shopId) throw new DomainError('VALIDATION_ERROR', 'shopId is required', 400);

  const [segments, topLtv, atRisk] = await Promise.all([
    analyticsRepo.getCustomerSegments(shopId),
    analyticsRepo.getTopCustomersByLtv(shopId, 10),
    analyticsRepo.getAtRiskCustomers(shopId),
  ]);

  return { segments, topLtv, atRisk };
}

/**
 * Get metrics trend for charts.
 */
async function getMetricsTrend(shopId, weeks = 8) {
  if (!shopId) throw new DomainError('VALIDATION_ERROR', 'shopId is required', 400);
  return analyticsRepo.getMetricsTrend(shopId, weeks);
}

/**
 * Update customer metrics after an order is completed.
 * Called by the order service.
 */
async function refreshCustomerMetrics(customerId, shopId) {
  if (!customerId || !shopId) return;
  try {
    return await analyticsRepo.upsertCustomerMetrics(customerId, shopId);
  } catch (_) {
    // Non-critical — don't block payment flow
  }
}

/**
 * Compute weekly snapshot for all active shops.
 * Called by a nightly cron job.
 */
async function computeAllWeeklySnapshots() {
  const { rows: shops } = await require('../db').query(
    `SELECT id FROM shops WHERE status = 'active'`
  );
  // Compute last Monday
  const today = new Date();
  const dayOfWeek = today.getUTCDay(); // 0=Sun
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(today);
  lastMonday.setUTCDate(today.getUTCDate() - daysToMonday);
  const weekStart = lastMonday.toISOString().slice(0, 10);

  let processed = 0;
  let failed = 0;
  for (const shop of shops) {
    try {
      await analyticsRepo.computeWeeklySnapshot(shop.id, weekStart);
      processed++;
    } catch (err) {
      console.error(`[ANALYTICS] Snapshot failed for shop ${shop.id}:`, err.message);
      failed++;
    }
  }
  console.log(`[ANALYTICS] Weekly snapshots: ${processed} succeeded, ${failed} failed`);
  return { processed, failed };
}

module.exports = {
  getShopBenchmark,
  getCustomerAnalytics,
  getMetricsTrend,
  refreshCustomerMetrics,
  computeAllWeeklySnapshots,
};

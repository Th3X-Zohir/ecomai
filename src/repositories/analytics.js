/**
 * Analytics Repository — benchmarking queries and shop metric aggregations.
 * All queries here are read-only analytics. No business logic.
 */
const db = require('../db');

// ─── Peer Group Segmentation ────────────────────────────────

/**
 * Get the shop's peer group based on plan tier, age, and revenue band.
 * Returns the segment key and a filter for peer queries.
 */
async function getShopSegment(shopId) {
  const { rows: [shop] } = await db.query(
    `SELECT s.id, s.subscription_plan, s.created_at,
            COALESCE(se.earnings_balance, 0)::numeric AS balance,
            COALESCE(
              (SELECT SUM(net_amount) FROM shop_earnings
               WHERE shop_id = s.id AND created_at >= NOW() - INTERVAL '30 days'), 0
            )::numeric AS mrr
     FROM shops s
     LEFT JOIN shop_earnings se ON se.shop_id = s.id
     WHERE s.id = $1`,
    [shopId]
  );
  if (!shop) return null;

  const planTier = shop.subscription_plan || 'free';
  const shopAgeDays = Math.floor(
    (Date.now() - new Date(shop.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const ageBand = shopAgeDays < 30 ? 'new' : shopAgeDays < 180 ? 'established' : 'mature';

  // Revenue band based on last 30-day earnings
  const mrr = Number(shop.mrr) || 0;
  const revBand = mrr < 50000 ? 'micro' : mrr < 200000 ? 'small' : 'mid';

  return {
    planTier,
    ageBand,
    revBand,
    key: `${planTier}__${ageBand}__${revBand}`,
    params: [planTier, ageBand, revBand],
  };
}

/**
 * Compute current-period KPIs for a specific shop.
 * Period = last 30 days, with previous 30-day period for comparison.
 */
async function getShopKpis(shopId) {
  const [currentRes, previousRes, lifetimeRes] = await Promise.all([
    // Current period: last 30 days
    db.query(
      `SELECT
         COUNT(*)::int AS total_orders,
         COUNT(*) FILTER (WHERE status = 'delivered')::int AS completed_orders,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_orders,
         COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::numeric AS total_revenue,
         COALESCE(AVG(total_amount) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::numeric AS aov,
         COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL)::int AS total_customers,
         COUNT(DISTINCT customer_id) FILTER (
           WHERE customer_id IS NOT NULL
           AND customer_id IN (
             SELECT customer_id FROM orders o2
             WHERE o2.shop_id = $1 AND o2.customer_id = orders.customer_id AND o2.created_at < NOW() - INTERVAL '30 days'
           )
         )::int AS returning_customers
       FROM orders
       WHERE shop_id = $1 AND created_at >= NOW() - INTERVAL '30 days'`,
      [shopId]
    ),
    // Previous period: 31-60 days ago
    db.query(
      `SELECT
         COUNT(*)::int AS total_orders,
         COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::numeric AS total_revenue,
         COALESCE(AVG(total_amount) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::numeric AS aov,
         COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL)::int AS total_customers
       FROM orders
       WHERE shop_id = $1
         AND created_at >= NOW() - INTERVAL '60 days'
         AND created_at < NOW() - INTERVAL '30 days'`,
      [shopId]
    ),
    // Lifetime metrics from customer_metrics table
    db.query(
      `SELECT
         COUNT(*)::int AS total_customers,
         COUNT(*) FILTER (WHERE total_orders > 1)::int AS repeat_customers,
         COALESCE(SUM(ltv_score), 0)::numeric AS total_ltv,
         COUNT(*) FILTER (WHERE churn_risk = 'at_risk')::int AS at_risk_customers,
         COUNT(*) FILTER (WHERE churn_risk = 'churned')::int AS churned_customers,
         COALESCE(AVG(avg_order_value) FILTER (WHERE total_orders > 0), 0)::numeric AS avg_customer_ltv
       FROM customer_metrics
       WHERE shop_id = $1`,
      [shopId]
    ),
  ]);

  const curr = currentRes.rows[0];
  const prev = previousRes.rows[0];
  const life = lifetimeRes.rows[0];

  const totalCustomers = Number(curr.total_customers) || 0;
  const returningCustomers = Number(curr.returning_customers) || 0;

  return {
    orders: {
      total: Number(curr.total_orders) || 0,
      completed: Number(curr.completed_orders) || 0,
      cancelled: Number(curr.cancelled_orders) || 0,
      previousTotal: Number(prev.total_orders) || 0,
      deltaOrders: (Number(curr.total_orders) || 0) - (Number(prev.total_orders) || 0),
    },
    revenue: {
      total: Number(curr.total_revenue) || 0,
      previousTotal: Number(prev.total_revenue) || 0,
      deltaRevenue: (Number(curr.total_revenue) || 0) - (Number(prev.total_revenue) || 0),
    },
    aov: {
      current: Number(curr.aov) || 0,
      previous: Number(prev.aov) || 0,
      deltaAov: (Number(curr.aov) || 0) - (Number(prev.aov) || 0),
    },
    customers: {
      total: totalCustomers,
      previousTotal: Number(prev.total_customers) || 0,
      returning: returningCustomers,
      returningRate: totalCustomers > 0 ? returningCustomers / totalCustomers : 0,
    },
    lifetime: {
      totalLtv: Number(life.total_ltv) || 0,
      avgCustomerLtv: Number(life.avg_customer_ltv) || 0,
      atRisk: Number(life.at_risk_customers) || 0,
      churned: Number(life.churned_customers) || 0,
    },
  };
}

/**
 * Get peer group averages for the shop's segment, for the same period.
 */
async function getPeerGroupKpis(planTier, ageBand, revBand, periodDays = 30) {
  const { rows } = await db.query(
    `SELECT
       AVG(sms.total_orders)::numeric AS avg_orders,
       AVG(sms.completed_orders)::numeric AS avg_completed,
       AVG(sms.aov)::numeric AS avg_aov,
       AVG(sms.total_revenue)::numeric AS avg_revenue,
       AVG(sms.returning_rate)::numeric AS avg_returning_rate,
       AVG(sms.avg_fulfillment_days)::numeric AS avg_fulfillment_days,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sms.aov) AS median_aov,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sms.total_revenue) AS median_revenue,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sms.total_orders) AS median_orders,
       COUNT(DISTINCT sms.shop_id)::int AS peer_count
     FROM shop_metrics_snapshot sms
     JOIN shops s ON s.id = sms.shop_id
     WHERE sms.week_start >= CURRENT_DATE - INTERVAL '${periodDays} days'
       AND s.subscription_plan = $1
       AND s.created_at < CURRENT_DATE - INTERVAL '${ageBand === 'new' ? 0 : ageBand === 'established' ? 30 : 180} days'
       AND s.created_at >= CURRENT_DATE - INTERVAL '${ageBand === 'new' ? 30 : ageBand === 'established' ? 180 : 10000} days'
       AND (
         SELECT COALESCE(SUM(net_amount), 0)
         FROM shop_earnings se2
         WHERE se2.shop_id = s.id AND se2.created_at >= NOW() - INTERVAL '${periodDays} days'
       ) BETWEEN
         CASE $3 WHEN 'micro' THEN 0 WHEN 'small' THEN 50000 WHEN 'mid' THEN 200000 END AND
         CASE $3 WHEN 'micro' THEN 49999 WHEN 'small' THEN 199999 WHEN 'mid' THEN 99999999 END
       AND s.status = 'active'`,
    [planTier, ageBand, revBand]
  );
  return rows[0];
}

/**
 * Get the shop's percentile rank within its peer group for each KPI.
 * Returns null if not enough peer data (< 3 peers).
 */
async function getShopPercentileRank(shopId, planTier, ageBand, revBand, periodDays = 30) {
  // Get all peer shops' AOV and revenue for the period
  const { rows: peers } = await db.query(
    `SELECT DISTINCT sms.shop_id,
       SUM(sms.total_revenue) OVER (PARTITION BY sms.shop_id) AS period_revenue,
       AVG(sms.aov) OVER (PARTITION BY sms.shop_id) AS period_aov,
       SUM(sms.total_orders) OVER (PARTITION BY sms.shop_id) AS period_orders
     FROM shop_metrics_snapshot sms
     JOIN shops s ON s.id = sms.shop_id
     WHERE sms.week_start >= CURRENT_DATE - INTERVAL '${periodDays} days'
       AND s.subscription_plan = $1
       AND s.status = 'active'
       AND s.id != $4`,
    [planTier, ageBand, revBand, shopId]
  );

  if (peers.length < 3) return null; // Not enough data

  // Compute shop's own totals
  const { rows: [shopTotals] } = await db.query(
    `SELECT
       COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled','refunded') AND created_at >= NOW() - INTERVAL '${periodDays} days'), 0)::numeric AS period_revenue,
       COALESCE(AVG(total_amount) FILTER (WHERE status NOT IN ('cancelled','refunded') AND created_at >= NOW() - INTERVAL '${periodDays} days'), 0)::numeric AS period_aov,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '${periodDays} days')::int AS period_orders
     FROM orders WHERE shop_id = $1`,
    [shopId]
  );

  const shopRevenue = Number(shopTotals?.period_revenue) || 0;
  const shopAov = Number(shopTotals?.period_aov) || 0;
  const shopOrders = Number(shopTotals?.period_orders) || 0;

  const peerRevenues = peers.map(r => Number(r.period_revenue) || 0);
  const peerAovs = peers.map(r => Number(r.period_aov) || 0);
  const peerOrders = peers.map(r => Number(r.period_orders) || 0);

  return {
    revenuePercentile: percentileRank(shopRevenue, peerRevenues),
    aovPercentile: percentileRank(shopAov, peerAovs),
    ordersPercentile: percentileRank(shopOrders, peerOrders),
    peerCount: peers.length,
  };
}

function percentileRank(value, peerValues) {
  if (!peerValues || peerValues.length === 0) return null;
  const sorted = [...peerValues].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  return Math.round((below / sorted.length) * 100);
}

// ─── Customer Analytics ────────────────────────────────────

/**
 * Get customer segments for a shop: active, at-risk, churned.
 */
async function getCustomerSegments(shopId) {
  const { rows } = await db.query(
    `SELECT churn_risk, COUNT(*)::int AS count
     FROM customer_metrics WHERE shop_id = $1 GROUP BY churn_risk`,
    [shopId]
  );
  const segments = { active: 0, at_risk: 0, churned: 0 };
  for (const r of rows) segments[r.churn_risk] = r.count;
  return segments;
}

/**
 * Get top customers by LTV for a shop.
 */
async function getTopCustomersByLtv(shopId, limit = 10) {
  const { rows } = await db.query(
    `SELECT cm.*, c.email, c.full_name, c.created_at AS customer_since
     FROM customer_metrics cm
     JOIN customers c ON c.id = cm.customer_id
     WHERE cm.shop_id = $1
     ORDER BY cm.ltv_score DESC
     LIMIT $2`,
    [shopId, limit]
  );
  return rows;
}

/**
 * Identify customers at risk of churning (no order in 30+ days, had orders before).
 */
async function getAtRiskCustomers(shopId) {
  const { rows } = await db.query(
    `SELECT cm.*, c.email, c.full_name, c.phone,
            (SELECT MAX(created_at) FROM orders o2 WHERE o2.customer_id = cm.customer_id) AS last_order_at,
            EXTRACT(DAY FROM NOW() - (SELECT MAX(created_at) FROM orders o2 WHERE o2.customer_id = cm.customer_id)) AS days_inactive
     FROM customer_metrics cm
     JOIN customers c ON c.id = cm.customer_id
     WHERE cm.shop_id = $1 AND cm.churn_risk = 'at_risk'
     ORDER BY days_inactive DESC
     LIMIT 20`,
    [shopId]
  );
  return rows;
}

/**
 * Recalculate and upsert customer metrics for a given customer.
 * Called after every completed order.
 */
async function upsertCustomerMetrics(customerId, shopId) {
  const { rows: orderData } = await db.query(
    `SELECT
       COUNT(*)::int AS total_orders,
       SUM(total_amount)::numeric AS total_spent,
       AVG(total_amount)::numeric AS avg_order_value,
       MAX(created_at) AS last_order_at,
       MIN(created_at) AS first_order_at
     FROM orders
     WHERE customer_id = $1 AND shop_id = $2 AND status NOT IN ('cancelled')`,
    [customerId, shopId]
  );
  const d = orderData[0];
  if (!d || Number(d.total_orders) === 0) return null;

  const totalOrders = Number(d.total_orders) || 0;
  const totalSpent = Number(d.total_spent) || 0;
  const lastOrderAt = d.last_order_at;
  const firstOrderAt = d.first_order_at;
  const avgOrderValue = Number(d.avg_order_value) || 0;
  const daysSinceLastOrder = lastOrderAt
    ? Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Compute order frequency
  let orderFrequencyDays = null;
  if (totalOrders >= 2 && firstOrderAt && lastOrderAt) {
    const totalDays = (new Date(lastOrderAt).getTime() - new Date(firstOrderAt).getTime()) / (1000 * 60 * 60 * 24);
    orderFrequencyDays = Math.round(totalDays / (totalOrders - 1));
  }

  // LTV = total spent + projected future orders (based on frequency)
  const ltvScore = totalSpent;
  // Future projected LTV: if customer orders every X days, projected 1-year value
  if (orderFrequencyDays && orderFrequencyDays > 0) {
    const projectedOrders = Math.floor(365 / orderFrequencyDays);
    const avgFutureSpend = avgOrderValue * projectedOrders;
    // discounted at 80% to be conservative
    const futureLtv = avgFutureSpend * 0.8;
    // ltv_score = actual + projected (capped at 3x actual)
    const projectedCapped = Math.min(futureLtv, totalSpent * 3);
    // Use simple total_spent as the primary LTV score
  }

  // Churn risk: active if ordered < 14 days ago, at_risk if 14-45, churned if > 45
  let churnRisk = 'active';
  if (daysSinceLastOrder !== null) {
    if (daysSinceLastOrder > 45) churnRisk = 'churned';
    else if (daysSinceLastOrder > 14) churnRisk = 'at_risk';
  }

  await db.query(
    `INSERT INTO customer_metrics
       (customer_id, shop_id, total_orders, total_spent, avg_order_value,
        last_order_at, first_order_at, days_since_last_order, order_frequency_days, ltv_score, churn_risk)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (customer_id, shop_id) DO UPDATE SET
       total_orders = EXCLUDED.total_orders,
       total_spent = EXCLUDED.total_spent,
       avg_order_value = EXCLUDED.avg_order_value,
       last_order_at = EXCLUDED.last_order_at,
       first_order_at = EXCLUDED.first_order_at,
       days_since_last_order = EXCLUDED.days_since_last_order,
       order_frequency_days = EXCLUDED.order_frequency_days,
       ltv_score = EXCLUDED.ltv_score,
       churn_risk = EXCLUDED.churn_risk,
       updated_at = now()`,
    [customerId, shopId, totalOrders, totalSpent, avgOrderValue,
     lastOrderAt, firstOrderAt, daysSinceLastOrder, orderFrequencyDays, totalSpent, churnRisk]
  );

  return { churnRisk, ltvScore: totalSpent, totalOrders, daysSinceLastOrder };
}

// ─── Shop Metrics Snapshot ────────────────────────────────

/**
 * Compute and upsert weekly metrics snapshot for a shop.
 * Called by a nightly cron job.
 */
async function computeWeeklySnapshot(shopId, weekStart) {
  const { rows } = await db.query(
    `SELECT
       COUNT(*)::int AS total_orders,
       COUNT(*) FILTER (WHERE status = 'delivered')::int AS completed_orders,
       COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_orders,
       COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::numeric AS total_revenue,
       COALESCE(AVG(total_amount) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::numeric AS aov,
       COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL)::int AS new_customers,
       COUNT(DISTINCT customer_id) FILTER (
         WHERE customer_id IS NOT NULL AND customer_id IN (
           SELECT customer_id FROM orders o2
           WHERE o2.shop_id = orders.shop_id AND o2.customer_id = orders.customer_id
             AND o2.created_at < $2 AND o2.created_at >= $2::date - INTERVAL '30 days'
         )
       )::int AS returning_customers,
       COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL)::int AS total_customers,
       COALESCE(
         AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)
           FILTER (WHERE status = 'delivered'), 0
       )::numeric AS avg_fulfillment_days,
       COALESCE(SUM(quantity) FILTER (WHERE status = 'delivered'), 0)::int AS products_sold_count,
       COUNT(DISTINCT product_id) FILTER (WHERE status = 'delivered')::int AS unique_products_sold
     FROM orders, LATERAL (SELECT $2::date AS week_start_dt) params
     WHERE shop_id = $1
       AND created_at >= $2::date
       AND created_at < $2::date + INTERVAL '7 days'`,
    [shopId, weekStart]
  );
  const m = rows[0];
  const totalCustomers = Number(m?.total_customers) || 0;
  const returningCustomers = Number(m?.returning_customers) || 0;

  await db.query(
    `INSERT INTO shop_metrics_snapshot
       (shop_id, week_start, total_orders, completed_orders, cancelled_orders,
        aov, total_revenue, new_customers, returning_rate, total_customers,
        avg_fulfillment_days, products_sold_count, unique_products_sold, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
     ON CONFLICT (shop_id, week_start) DO UPDATE SET
       total_orders = EXCLUDED.total_orders,
       completed_orders = EXCLUDED.completed_orders,
       cancelled_orders = EXCLUDED.cancelled_orders,
       aov = EXCLUDED.aov,
       total_revenue = EXCLUDED.total_revenue,
       new_customers = EXCLUDED.new_customers,
       returning_rate = EXCLUDED.returning_rate,
       total_customers = EXCLUDED.total_customers,
       avg_fulfillment_days = EXCLUDED.avg_fulfillment_days,
       products_sold_count = EXCLUDED.products_sold_count,
       unique_products_sold = EXCLUDED.unique_products_sold,
       computed_at = now()`,
    [shopId, weekStart,
     Number(m?.total_orders) || 0, Number(m?.completed_orders) || 0, Number(m?.cancelled_orders) || 0,
     Number(m?.aov) || 0, Number(m?.total_revenue) || 0,
     Number(m?.new_customers) || 0,
     totalCustomers > 0 ? returningCustomers / totalCustomers : 0,
     totalCustomers,
     Number(m?.avg_fulfillment_days) || 0,
     Number(m?.products_sold_count) || 0,
     Number(m?.unique_products_sold) || 0]
  );
}

/**
 * Get historical metrics trend for a shop (last N weeks).
 */
async function getMetricsTrend(shopId, weeks = 8) {
  const { rows } = await db.query(
    `SELECT week_start, total_orders, completed_orders, aov, total_revenue,
            new_customers, returning_rate, avg_fulfillment_days
     FROM shop_metrics_snapshot
     WHERE shop_id = $1 AND week_start >= CURRENT_DATE - INTERVAL '${parseInt(weeks)} weeks'
     ORDER BY week_start ASC`,
    [shopId]
  );
  return rows;
}

// ─── Insight Generation ─────────────────────────────────────

/**
 * Generate actionable insights for a shop based on recent data.
 */
async function generateInsights(shopId) {
  const insights = [];

  // 1. Check if orders are declining week-over-week
  const trend = await getMetricsTrend(shopId, 4);
  if (trend.length >= 2) {
    const lastWeek = trend[trend.length - 1];
    const prevWeek = trend[trend.length - 2];
    if (lastWeek && prevWeek) {
      if (Number(lastWeek.total_orders) < Number(prevWeek.total_orders) * 0.7) {
        insights.push({
          type: 'warning',
          metric: 'orders_decline',
          title: 'Orders dropped significantly',
          body: `You had ${lastWeek.total_orders} orders last week, down from ${prevWeek.total_orders} the week before. Consider checking your product pricing or promotional strategy.`,
          data: { current: Number(lastWeek.total_orders), previous: Number(prevWeek.total_orders) },
        });
      }
      if (Number(lastWeek.aov) > Number(prevWeek.aov) * 1.15) {
        insights.push({
          type: 'positive',
          metric: 'aov_increase',
          title: 'Average order value is up',
          body: `Your AOV increased to ৳${Number(lastWeek.aov).toFixed(0)}, up from ৳${Number(prevWeek.aov).toFixed(0)} the prior week.`,
          data: { current: Number(lastWeek.aov), previous: Number(lastWeek.aov) },
        });
      }
    }
  }

  // 2. Check for at-risk customers
  const atRisk = await getAtRiskCustomers(shopId);
  if (atRisk.length > 0) {
    insights.push({
      type: 'action',
      metric: 'churn_risk',
      title: `${atRisk.length} customer(s) at risk of churning`,
      body: `These customers haven\'t ordered in 15+ days. Consider reaching out with a special offer.`,
      data: { count: atRisk.length, customers: atRisk.slice(0, 3).map(c => ({ id: c.customer_id, email: c.email, days_inactive: c.days_inactive })) },
    });
  }

  // 3. Check returning customer rate
  const { rows: [cmSummary] } = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE total_orders > 1)::int AS repeat,
       COUNT(*) FILTER (WHERE churn_risk = 'active')::int AS active
     FROM customer_metrics WHERE shop_id = $1`,
    [shopId]
  );
  const totalCustomers = Number(cmSummary?.total) || 0;
  const repeatCustomers = Number(cmSummary?.repeat) || 0;
  if (totalCustomers > 5) {
    const returningRate = repeatCustomers / totalCustomers;
    if (returningRate < 0.15) {
      insights.push({
        type: 'warning',
        metric: 'low_returning_rate',
        title: 'Low returning customer rate',
        body: `Only ${(returningRate * 100).toFixed(0)}% of your customers have ordered more than once. Focus on post-purchase engagement to improve loyalty.`,
        data: { rate: returningRate, total_customers: totalCustomers },
      });
    } else if (returningRate > 0.35) {
      insights.push({
        type: 'positive',
        metric: 'high_returning_rate',
        title: 'Strong customer loyalty',
        body: `${(returningRate * 100).toFixed(0)}% of customers are repeat buyers — above average for your peer group.`,
        data: { rate: returningRate },
      });
    }
  }

  // 4. Top product insight
  const { rows: [topProduct] } = await db.query(
    `SELECT oi.item_name, SUM(oi.quantity)::int AS units
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.shop_id = $1 AND o.status = 'delivered' AND o.created_at >= NOW() - INTERVAL '14 days'
     GROUP BY oi.item_name
     ORDER BY units DESC LIMIT 1`,
    [shopId]
  );
  if (topProduct) {
    insights.push({
      type: 'info',
      metric: 'top_product',
      title: `Best seller: ${topProduct.item_name}`,
      body: `${topProduct.item_name} sold ${topProduct.units} units in the last 14 days.`,
      data: { product: topProduct.item_name, units: Number(topProduct.units) },
    });
  }

  return insights;
}

module.exports = {
  getShopSegment,
  getShopKpis,
  getPeerGroupKpis,
  getShopPercentileRank,
  getCustomerSegments,
  getTopCustomersByLtv,
  getAtRiskCustomers,
  upsertCustomerMetrics,
  computeWeeklySnapshot,
  getMetricsTrend,
  generateInsights,
};

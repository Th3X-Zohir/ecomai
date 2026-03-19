/**
 * Operations Service — Merchant and Super Admin operational dashboards
 * Provides actionable, role-specific operational data
 */
const db = require('../db');
const orderRepo = require('../repositories/orders');
const deliveryRepo = require('../repositories/delivery-requests');
const earningsRepo = require('../repositories/earnings');
const refundRepo = require('../repositories/refunds');
const settlementsRepo = require('../repositories/settlements');
const shopRepo = require('../repositories/shops');

/* ════════════════════════════════════════════════════════════════════
   MERCHANT OPERATIONS DASHBOARD
   ════════════════════════════════════════════════════════════════════ */

/**
 * Merchant operations overview — orders needing attention, active fulfillment, delivery status
 */
async function getMerchantOperations(shopId) {
  // Parallel data fetches
  const [
    ordersByStatus,
    deliveriesByStatus,
    refundStats,
    recentOrders,
    balanceSummary,
  ] = await Promise.all([
    db.query(`
      SELECT status, COUNT(*)::int AS count
      FROM orders
      WHERE shop_id = $1 AND deleted_at IS NULL
      GROUP BY status`, [shopId]),
    db.query(`
      SELECT dr.status, COUNT(*)::int AS count
      FROM delivery_requests dr
      WHERE dr.shop_id = $1
      GROUP BY dr.status`, [shopId]),
    refundRepo.getShopRefundStats(shopId),
    orderRepo.listOrders(shopId, { page: 1, limit: 10 }),
    settlementsRepo.getShopBalance(shopId),
  ]);

  // Orders needing attention: pending, confirmed, processing (not shipped/delivered/cancelled)
  const needsAttention = (ordersByStatus.rows || []).reduce((sum, r) => {
    if (['pending', 'confirmed', 'processing'].includes(r.status)) sum += r.count;
    return sum;
  }, 0);

  // Active fulfillments: orders that are confirmed/processing but not yet shipped
  const fulfillmentQueue = (ordersByStatus.rows || []).reduce((sum, r) => {
    if (['confirmed', 'processing'].includes(r.status)) sum += r.count;
    return sum;
  }, 0);

  // Failed deliveries requiring action
  const failedDeliveries = (deliveriesByStatus.rows || []).find(r => r.status === 'failed')?.count || 0;

  // Active deliveries
  const activeDeliveries = (deliveriesByStatus.rows || []).reduce((sum, r) => {
    if (['assigned', 'picked_up', 'in_transit'].includes(r.status)) sum += r.count;
    return sum;
  }, 0);

  return {
    summary: {
      needsAttention: { count: needsAttention, label: 'Needs Attention' },
      fulfillmentQueue: { count: fulfillmentQueue, label: 'Fulfillment Queue' },
      activeDeliveries: { count: activeDeliveries, label: 'Active Deliveries' },
      failedDeliveries: { count: failedDeliveries, label: 'Failed Deliveries' },
    },
    ordersByStatus: ordersByStatus.rows || [],
    deliveriesByStatus: deliveriesByStatus.rows || [],
    refundStats,
    balance: balanceSummary || { held_balance: 0, releasable_balance: 0, available_balance: 0, payouts_processing: 0 },
    recentOrders: recentOrders.items || [],
  };
}

/**
 * Fulfillment queue — all confirmed/processing orders grouped by age
 */
async function getFulfillmentQueue(shopId, opts = {}) {
  const { page = 1, limit = 50, sort = 'oldest' } = opts;
  const orderBy = sort === 'oldest' ? 'created_at ASC' : 'created_at DESC';
  const offset = (page - 1) * limit;

  const { rows: orders, total } = await db.query(
    `SELECT o.*, c.full_name AS customer_name, c.phone AS customer_phone,
            p.status AS payment_status
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'completed'
     WHERE o.shop_id = $1
       AND o.status IN ('confirmed', 'processing')
       AND o.deleted_at IS NULL
     ORDER BY ${orderBy}
     LIMIT $2 OFFSET $3`,
    [shopId, limit, offset]
  );

  // Add delivery status to each order
  const orderIds = orders.map(o => o.id);
  let deliveryMap = {};
  if (orderIds.length > 0) {
    const { rows: deliveries } = await db.query(
      `SELECT order_id, status, assigned_driver_user_id
       FROM delivery_requests
       WHERE order_id = ANY($1)`,
      [orderIds]
    );
    deliveryMap = Object.fromEntries(deliveries.map(d => [d.order_id, d]));
  }

  const items = orders.map(order => ({
    ...order,
    delivery: deliveryMap[order.id] || null,
    ageHours: Math.floor((Date.now() - new Date(order.created_at).getTime()) / 3_600_000),
  }));

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Delivery operations queue — all active deliveries grouped by status
 */
async function getDeliveryQueue(shopId, opts = {}) {
  const { page = 1, limit = 50, status, driverId, fromDate, toDate, scheduledDate } = opts;
  const result = await deliveryRepo.listByShop(shopId, {
    page, limit, status, driverId, fromDate, toDate, scheduledDate,
  });

  // Enrich with order info
  const orderIds = (result.items || []).map(d => d.order_id).filter(Boolean);
  let orderMap = {};
  if (orderIds.length > 0) {
    const { rows } = await db.query(
      `SELECT id, customer_email, total_amount, status AS order_status
       FROM orders WHERE id = ANY($1)`,
      [orderIds]
    );
    orderMap = Object.fromEntries(rows.map(o => [o.id, o]));
  }

  const enriched = (result.items || []).map(d => ({
    ...d,
    order: orderMap[d.order_id] || null,
  }));

  return { ...result, items: enriched };
}

/**
 * Merchant financial operations — balance breakdown, pending payouts, recent transactions
 */
async function getMerchantFinancialOps(shopId, opts = {}) {
  const [balance, ledger, pendingWithdrawals] = await Promise.all([
    settlementsRepo.getShopBalance(shopId),
    settlementsRepo.getLedgerEntries(shopId, { ...opts, limit: 20 }),
    earningsRepo.listWithdrawals(shopId, { status: 'pending' }),
  ]);

  return {
    balance: balance || { held_balance: 0, releasable_balance: 0, available_balance: 0, payouts_processing: 0 },
    recentTransactions: ledger.items || [],
    pendingWithdrawals: pendingWithdrawals.items || [],
  };
}

/* ════════════════════════════════════════════════════════════════════
   SUPER ADMIN PLATFORM OPERATIONS DASHBOARD
   ════════════════════════════════════════════════════════════════════ */

/**
 * Platform-wide operations overview
 */
async function getPlatformOperations() {
  const [
    shopsByStatus,
    ordersByStatus,
    deliveriesByStatus,
    refundRequests,
    platformSummary,
    activeShops,
  ] = await Promise.all([
    db.query(`SELECT status, COUNT(*)::int AS count FROM shops GROUP BY status`),
    db.query(`SELECT status, COUNT(*)::int AS count FROM orders WHERE deleted_at IS NULL GROUP BY status`),
    db.query(`SELECT status, COUNT(*)::int AS count FROM delivery_requests GROUP BY status`),
    db.query(`SELECT status, COUNT(*)::int AS count FROM refund_requests GROUP BY status`),
    earningsRepo.getPlatformSummary(),
    db.query(`SELECT COUNT(*)::int AS count FROM shops WHERE status = 'active'`),
  ]);

  // Get settlement totals across all shops
  const allBalances = await settlementsRepo.getAllShopBalances();
  const totalHeld = allBalances.reduce((s, b) => s + Number(b.held_balance || 0), 0);
  const totalReleasable = allBalances.reduce((s, b) => s + Number(b.releasable_balance || 0), 0);
  const totalAvailable = allBalances.reduce((s, b) => s + Number(b.available_balance || 0), 0);
  const totalProcessing = allBalances.reduce((s, b) => s + Number(b.payouts_processing || 0), 0);

  // SLA breach candidates: orders older than 3 days in processing/confirmed state
  const { rows: slaBreaches } = await db.query(`
    SELECT COUNT(*)::int AS count FROM orders
    WHERE status IN ('confirmed', 'processing')
      AND created_at < NOW() - INTERVAL '3 days'
      AND deleted_at IS NULL`);

  // Failed deliveries older than 1 day
  const { rows: staleFailures } = await db.query(`
    SELECT COUNT(*)::int AS count FROM delivery_requests
    WHERE status = 'failed' AND updated_at < NOW() - INTERVAL '1 day'`);

  // Pending withdrawals (platform-wide)
  const { rows: pendingWithdrawals } = await db.query(`
    SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::numeric AS total_amount
    FROM withdrawal_requests WHERE status = 'pending'`);

  // Shops needing review (suspended or pending)
  const { rows: shopsNeedingReview } = await db.query(`
    SELECT COUNT(*)::int AS count FROM shops WHERE status IN ('suspended', 'pending_payment')`);

  return {
    shops: {
      byStatus: shopsByStatus.rows || [],
      activeCount: activeShops.rows[0]?.count || 0,
      needingReview: shopsNeedingReview[0]?.count || 0,
    },
    orders: {
      byStatus: ordersByStatus.rows || [],
      slaBreaches: slaBreaches[0]?.count || 0,
    },
    deliveries: {
      byStatus: deliveriesByStatus.rows || [],
      staleFailures: staleFailures[0]?.count || 0,
    },
    refunds: {
      byStatus: refundRequests.rows || [],
    },
    withdrawals: {
      pendingCount: pendingWithdrawals[0]?.count || 0,
      pendingTotal: Number(pendingWithdrawals[0]?.total_amount || 0),
    },
    financials: {
      totalHeld,
      totalReleasable,
      totalAvailable,
      totalProcessing,
    },
  };
}

/**
 * Platform exception queue — items requiring admin attention
 */
async function getPlatformExceptionQueue(opts = {}) {
  const { page = 1, limit = 50, type } = opts;

  // Gather exceptions from multiple sources
  const conditions = [];
  const params = [];
  let idx = 1;

  // Stale failed deliveries (> 1 day)
  let staleFailures = [];
  if (!type || type === 'delivery_failure') {
    const result = await db.query(`
      SELECT dr.id, dr.shop_id, dr.order_id, dr.status, dr.updated_at AS created_at,
             dr.failure_reason, 'delivery_failure' AS exception_type,
             s.name AS shop_name
      FROM delivery_requests dr
      JOIN shops s ON s.id = dr.shop_id
      WHERE dr.status = 'failed' AND dr.updated_at < NOW() - INTERVAL '1 day'
      ORDER BY dr.updated_at ASC LIMIT 100`);
    staleFailures = result.rows || [];
  }

  // SLA breaches
  const { rows: slaBreaches } = await db.query(`
    SELECT o.id, o.shop_id, o.id AS order_id, o.status, o.created_at,
           'SLA breach: order unfulfilled for 3+ days' AS failure_reason,
           'sla_breach' AS exception_type,
           s.name AS shop_name
    FROM orders o
    JOIN shops s ON s.id = o.shop_id
    WHERE o.status IN ('confirmed', 'processing')
      AND o.created_at < NOW() - INTERVAL '3 days'
      AND o.deleted_at IS NULL
    ORDER BY o.created_at ASC LIMIT 50`);

  // Pending refunds > 3 days old
  const { rows: staleRefunds } = await db.query(`
    SELECT rr.id, rr.shop_id, rr.order_id, rr.status, rr.created_at,
           rr.reason AS failure_reason, 'stale_refund' AS exception_type,
           s.name AS shop_name
    FROM refund_requests rr
    JOIN shops s ON s.id = rr.shop_id
    WHERE rr.status = 'pending' AND rr.created_at < NOW() - INTERVAL '3 days'
    ORDER BY rr.created_at ASC LIMIT 50`);

  // Pending withdrawals > 2 days old
  const { rows: staleWithdrawals } = await db.query(`
    SELECT wr.id, wr.shop_id, NULL AS order_id, wr.status, wr.created_at,
           'Pending withdrawal request' AS failure_reason, 'stale_withdrawal' AS exception_type,
           s.name AS shop_name
    FROM withdrawal_requests wr
    JOIN shops s ON s.id = wr.shop_id
    WHERE wr.status = 'pending' AND wr.created_at < NOW() - INTERVAL '2 days'
    ORDER BY wr.created_at ASC LIMIT 50`);

  // Combine all exceptions
  const allExceptions = [
    ...(staleFailures || []),
    ...(slaBreaches || []),
    ...(staleRefunds || []),
    ...(staleWithdrawals || []),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const total = allExceptions.length;
  const offset = (page - 1) * limit;
  const items = allExceptions.slice(offset, offset + limit);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Platform delivery oversight — all active deliveries across shops
 */
async function getPlatformDeliveryOversight(opts = {}) {
  const { page = 1, limit = 50, status, fromDate, toDate } = opts;
  const conditions = ['dr.status IS NOT NULL'];
  const params = [];
  let idx = 1;

  if (status) { conditions.push(`dr.status = $${idx++}`); params.push(status); }
  if (fromDate) { conditions.push(`dr.created_at >= $${idx++}`); params.push(fromDate); }
  if (toDate) { conditions.push(`dr.created_at <= $${idx++}`); params.push(toDate); }

  const where = 'WHERE ' + conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const { rows: totalRows } = await db.query(
    `SELECT COUNT(*)::int FROM delivery_requests dr ${where}`, params
  );
  const total = totalRows[0]?.count || 0;

  const { rows: deliveries } = await db.query(
    `SELECT dr.*, s.name AS shop_name, s.slug AS shop_slug,
            o.customer_email, o.total_amount AS order_amount,
            u.full_name AS driver_name
     FROM delivery_requests dr
     JOIN shops s ON s.id = dr.shop_id
     LEFT JOIN orders o ON o.id = dr.order_id
     LEFT JOIN users u ON u.id = dr.assigned_driver_user_id
     ${where}
     ORDER BY dr.updated_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return { items: deliveries, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = {
  // Merchant
  getMerchantOperations,
  getFulfillmentQueue,
  getDeliveryQueue,
  getMerchantFinancialOps,
  // Platform
  getPlatformOperations,
  getPlatformExceptionQueue,
  getPlatformDeliveryOversight,
};

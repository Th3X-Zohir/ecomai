const db = require('../db');

/**
 * Dashboard analytics service — provides aggregated stats for shop admin dashboard.
 */

async function getShopDashboard(shopId) {
  // If no shopId, return aggregated data across all shops (super admin without shop context)
  const shopFilter = shopId ? 'WHERE shop_id = $1' : '';
  const shopFilterAnd = shopId ? 'AND oi.shop_id = $1' : '';
  const shopParams = shopId ? [shopId] : [];

  const [ordersRes, revenueRes, customersRes, productsRes, recentOrdersRes, topProductsRes] = await Promise.all([
    // Order counts by status
    db.query(
      `SELECT status, COUNT(*)::int AS count FROM orders ${shopFilter} GROUP BY status`,
      shopParams
    ),
    // Revenue (completed payments)
    db.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total_revenue,
              COUNT(*)::int AS payment_count
       FROM payments ${shopFilter ? shopFilter + " AND status = 'completed'" : "WHERE status = 'completed'"}`,
      shopParams
    ),
    // Customer count
    db.query(
      `SELECT COUNT(*)::int AS total FROM customers ${shopFilter}`,
      shopParams
    ),
    // Product count
    db.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'active')::int AS active
       FROM products ${shopFilter}`,
      shopParams
    ),
    // Recent orders (last 10)
    db.query(
      `SELECT id, customer_email, status, total_amount, payment_status, created_at
       FROM orders ${shopFilter} ORDER BY created_at DESC LIMIT 10`,
      shopParams
    ),
    // Top selling products
    db.query(
      `SELECT oi.product_id, p.name, SUM(oi.quantity)::int AS units_sold,
              SUM(oi.line_total)::numeric AS revenue
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       ${shopId ? 'WHERE oi.shop_id = $1' : ''}
       GROUP BY oi.product_id, p.name
       ORDER BY units_sold DESC LIMIT 5`,
      shopParams
    ),
  ]);

  const ordersByStatus = {};
  let totalOrders = 0;
  for (const row of ordersRes.rows) {
    ordersByStatus[row.status] = row.count;
    totalOrders += row.count;
  }

  return {
    orders: {
      total: totalOrders,
      byStatus: ordersByStatus,
    },
    revenue: {
      total: Number(revenueRes.rows[0].total_revenue),
      paymentCount: revenueRes.rows[0].payment_count,
    },
    customers: {
      total: customersRes.rows[0].total,
    },
    products: {
      total: productsRes.rows[0].total,
      active: productsRes.rows[0].active,
    },
    recentOrders: recentOrdersRes.rows,
    topProducts: topProductsRes.rows,
  };
}

async function getRevenueTimeline(shopId, { days = 30 } = {}) {
  if (shopId) {
    const res = await db.query(
      `SELECT DATE(created_at) AS date, SUM(amount)::numeric AS revenue, COUNT(*)::int AS count
       FROM payments
       WHERE shop_id = $1 AND status = 'completed' AND created_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(created_at) ORDER BY date`,
      [shopId, days]
    );
    return res.rows;
  }
  const res = await db.query(
    `SELECT DATE(created_at) AS date, SUM(amount)::numeric AS revenue, COUNT(*)::int AS count
     FROM payments
     WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '1 day' * $1
     GROUP BY DATE(created_at) ORDER BY date`,
    [days]
  );
  return res.rows;
}

async function getSuperAdminDashboard() {
  const [shopsRes, usersRes, ordersRes, revenueRes] = await Promise.all([
    db.query(`SELECT status, COUNT(*)::int AS count FROM shops GROUP BY status`),
    db.query(`SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`),
    db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'pending')::int AS pending FROM orders`),
    db.query(`SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payments WHERE status = 'completed'`),
  ]);

  const shopsByStatus = {};
  for (const r of shopsRes.rows) shopsByStatus[r.status] = r.count;
  const usersByRole = {};
  for (const r of usersRes.rows) usersByRole[r.role] = r.count;

  return {
    shops: shopsByStatus,
    users: usersByRole,
    orders: { total: ordersRes.rows[0].total, pending: ordersRes.rows[0].pending },
    revenue: { total: Number(revenueRes.rows[0].total) },
  };
}

module.exports = { getShopDashboard, getRevenueTimeline, getSuperAdminDashboard };

const db = require('../db');

// ── Subscription Plans CRUD ──────────────────────────────

async function listPlans({ includeInactive = false } = {}) {
  const where = includeInactive ? '' : 'WHERE is_active = true';
  const res = await db.query(`SELECT * FROM subscription_plans ${where} ORDER BY price_monthly ASC`);
  return res.rows;
}

async function findPlanById(id) {
  const res = await db.query('SELECT * FROM subscription_plans WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function findPlanBySlug(slug) {
  const res = await db.query('SELECT * FROM subscription_plans WHERE slug = $1', [slug]);
  return res.rows[0] || null;
}

async function createPlan(data) {
  const res = await db.query(
    `INSERT INTO subscription_plans (name, slug, price_monthly, price_yearly, product_limit, order_limit, features, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.name, data.slug, data.price_monthly || 0, data.price_yearly || 0,
     data.product_limit || 10, data.order_limit || 50,
     JSON.stringify(data.features || []), data.is_active !== false]
  );
  return res.rows[0];
}

async function updatePlan(id, patch) {
  const allowed = ['name', 'slug', 'price_monthly', 'price_yearly', 'product_limit', 'order_limit', 'features', 'is_active'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(k === 'features' ? JSON.stringify(patch[k]) : patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findPlanById(id);
  params.push(id);
  const res = await db.query(
    `UPDATE subscription_plans SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function deletePlan(id) {
  const res = await db.query('DELETE FROM subscription_plans WHERE id = $1 RETURNING *', [id]);
  return res.rows[0] || null;
}

// ── Shop subscriptions overview ──────────────────────────

async function listShopSubscriptions({ page = 1, limit = 50, plan, status, search } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (plan) { conditions.push(`s.subscription_plan = $${idx}`); params.push(plan); idx++; }
  if (status) { conditions.push(`s.status = $${idx}`); params.push(status); idx++; }
  if (search) { conditions.push(`(s.name ILIKE $${idx} OR s.slug ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await db.query(`SELECT COUNT(*) FROM shops s ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;

  const res = await db.query(
    `SELECT s.id, s.name, s.slug, s.status, s.subscription_plan, s.created_at, s.updated_at,
            (SELECT COUNT(*) FROM orders o WHERE o.shop_id = s.id) AS order_count,
            (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id) AS product_count,
            (SELECT u.email FROM users u WHERE u.id = s.owner_user_id) AS owner_email
     FROM shops s ${where}
     ORDER BY s.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function updateShopSubscription(shopId, plan) {
  const res = await db.query(
    `UPDATE shops SET subscription_plan = $1, updated_at = now() WHERE id = $2 RETURNING id, name, slug, status, subscription_plan, updated_at`,
    [plan, shopId]
  );
  return res.rows[0] || null;
}

// ── Subscription Payments ────────────────────────────────

async function listPayments({ page = 1, limit = 50, status, shopId, search } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (shopId) { conditions.push(`sp.shop_id = $${idx}`); params.push(shopId); idx++; }
  if (status) { conditions.push(`sp.status = $${idx}`); params.push(status); idx++; }
  if (search) { conditions.push(`(s.name ILIKE $${idx} OR sp.plan_slug ILIKE $${idx} OR sp.gateway_tran_id ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await db.query(
    `SELECT COUNT(*) FROM subscription_payments sp LEFT JOIN shops s ON s.id = sp.shop_id ${where}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;

  const res = await db.query(
    `SELECT sp.*, s.name AS shop_name, s.slug AS shop_slug, u.email AS user_email
     FROM subscription_payments sp
     LEFT JOIN shops s ON s.id = sp.shop_id
     LEFT JOIN users u ON u.id = sp.user_id
     ${where}
     ORDER BY sp.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function findPaymentById(id) {
  const res = await db.query(
    `SELECT sp.*, s.name AS shop_name, u.email AS user_email
     FROM subscription_payments sp
     LEFT JOIN shops s ON s.id = sp.shop_id
     LEFT JOIN users u ON u.id = sp.user_id
     WHERE sp.id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

async function updatePayment(id, patch) {
  const allowed = ['status', 'gateway_tran_id'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findPaymentById(id);
  sets.push(`updated_at = now()`);
  params.push(id);
  const res = await db.query(
    `UPDATE subscription_payments SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function deletePayment(id) {
  const res = await db.query('DELETE FROM subscription_payments WHERE id = $1 RETURNING *', [id]);
  return res.rows[0] || null;
}

// ── Dashboard stats ──────────────────────────────────────

async function getStats() {
  const [planDist, shopStatuses, totalRevenue, recentPayments, monthlyCounts] = await Promise.all([
    db.query(`SELECT subscription_plan AS plan, COUNT(*)::int AS count FROM shops GROUP BY subscription_plan ORDER BY count DESC`),
    db.query(`SELECT status, COUNT(*)::int AS count FROM shops GROUP BY status`),
    db.query(`SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count FROM subscription_payments WHERE status = 'completed'`),
    db.query(`SELECT sp.*, s.name AS shop_name FROM subscription_payments sp LEFT JOIN shops s ON s.id = sp.shop_id ORDER BY sp.created_at DESC LIMIT 5`),
    db.query(`SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*)::int AS count, COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)::numeric AS revenue
              FROM subscription_payments
              WHERE created_at > now() - interval '12 months'
              GROUP BY month ORDER BY month`),
  ]);
  return {
    planDistribution: planDist.rows,
    shopStatuses: shopStatuses.rows,
    totalRevenue: totalRevenue.rows[0],
    recentPayments: recentPayments.rows,
    monthlyTrend: monthlyCounts.rows,
  };
}

module.exports = {
  listPlans, findPlanById, findPlanBySlug, createPlan, updatePlan, deletePlan,
  listShopSubscriptions, updateShopSubscription,
  listPayments, findPaymentById, updatePayment, deletePayment,
  getStats,
};

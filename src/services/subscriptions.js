const subRepo = require('../repositories/subscriptions');
const engine = require('./subscription-engine');
const { DomainError } = require('../errors/domain-error');

// ── Plans ────────────────────────────────────────────────

async function listPlans(includeInactive = false) {
  return subRepo.listPlans({ includeInactive });
}

async function createPlan(data) {
  if (!data.name || !data.slug) {
    throw new DomainError('VALIDATION_ERROR', 'name and slug are required', 400);
  }
  const existing = await subRepo.findPlanBySlug(data.slug);
  if (existing) {
    throw new DomainError('PLAN_EXISTS', `Plan with slug "${data.slug}" already exists`, 409);
  }
  const plan = await subRepo.createPlan(data);
  engine.invalidatePlanCache();
  return plan;
}

async function updatePlan(id, patch) {
  const plan = await subRepo.findPlanById(id);
  if (!plan) throw new DomainError('PLAN_NOT_FOUND', 'Subscription plan not found', 404);
  if (patch.slug && patch.slug !== plan.slug) {
    const existing = await subRepo.findPlanBySlug(patch.slug);
    if (existing) throw new DomainError('PLAN_EXISTS', `Plan with slug "${patch.slug}" already exists`, 409);
  }
  const updated = await subRepo.updatePlan(id, patch);
  engine.invalidatePlanCache();
  return updated;
}

async function deletePlan(id) {
  const plan = await subRepo.findPlanById(id);
  if (!plan) throw new DomainError('PLAN_NOT_FOUND', 'Subscription plan not found', 404);
  // Prevent deleting a plan that has active subscriptions
  const db = require('../db');
  const activeRes = await db.query(
    `SELECT COUNT(*)::int AS count FROM shop_subscriptions ss
     WHERE ss.plan_id = $1 AND ss.status IN ('active', 'trialing')`, [id]);
  if (activeRes.rows[0]?.count > 0) {
    throw new DomainError('PLAN_IN_USE', `Cannot delete plan — ${activeRes.rows[0].count} shop(s) have active subscriptions on it`, 400);
  }
  // Soft delete: set is_active = false instead of removing from DB
  const result = await subRepo.updatePlan(id, { is_active: false });
  engine.invalidatePlanCache();
  return result;
}

// ── Shop Subscriptions ───────────────────────────────────

async function listShopSubscriptions(opts) {
  return subRepo.listShopSubscriptions(opts);
}

async function updateShopSubscription(shopId, plan) {
  if (!plan) throw new DomainError('VALIDATION_ERROR', 'plan is required', 400);
  // Validate plan slug exists
  const planObj = await engine.getPlanBySlug(plan);
  if (!planObj) throw new DomainError('PLAN_NOT_FOUND', `Plan "${plan}" does not exist`, 400);
  const result = await subRepo.updateShopSubscription(shopId, plan);
  if (!result) throw new DomainError('SHOP_NOT_FOUND', 'Shop not found', 404);
  return result;
}

// ── Subscription Payments ────────────────────────────────

async function listPayments(opts) {
  return subRepo.listPayments(opts);
}

async function getPayment(id) {
  const payment = await subRepo.findPaymentById(id);
  if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'Subscription payment not found', 404);
  return payment;
}

async function updatePayment(id, patch) {
  const payment = await subRepo.findPaymentById(id);
  if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'Subscription payment not found', 404);
  return subRepo.updatePayment(id, patch);
}

async function deletePayment(id) {
  const payment = await subRepo.findPaymentById(id);
  if (!payment) throw new DomainError('PAYMENT_NOT_FOUND', 'Subscription payment not found', 404);
  return subRepo.deletePayment(id);
}

// ── Stats ────────────────────────────────────────────────

async function getStats() {
  return subRepo.getStats();
}

async function getAuditLog({ page = 1, limit = 50, shopId } = {}) {
  const db = require('../db');
  const conditions = [];
  const params = [];
  let idx = 1;
  if (shopId) { conditions.push(`sal.shop_id = $${idx}`); params.push(shopId); idx++; }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const countRes = await db.query(`SELECT COUNT(*) FROM subscription_audit_log sal ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;

  const res = await db.query(
    `SELECT sal.*, s.name AS shop_name, u.email AS actor_email
     FROM subscription_audit_log sal
     LEFT JOIN shops s ON s.id = sal.shop_id
     LEFT JOIN users u ON u.id = sal.actor_id
     ${where}
     ORDER BY sal.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = {
  listPlans, createPlan, updatePlan, deletePlan,
  listShopSubscriptions, updateShopSubscription,
  listPayments, getPayment, updatePayment, deletePayment,
  getStats, getAuditLog,
};

const subRepo = require('../repositories/subscriptions');
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
  return subRepo.createPlan(data);
}

async function updatePlan(id, patch) {
  const plan = await subRepo.findPlanById(id);
  if (!plan) throw new DomainError('PLAN_NOT_FOUND', 'Subscription plan not found', 404);
  if (patch.slug && patch.slug !== plan.slug) {
    const existing = await subRepo.findPlanBySlug(patch.slug);
    if (existing) throw new DomainError('PLAN_EXISTS', `Plan with slug "${patch.slug}" already exists`, 409);
  }
  return subRepo.updatePlan(id, patch);
}

async function deletePlan(id) {
  const plan = await subRepo.findPlanById(id);
  if (!plan) throw new DomainError('PLAN_NOT_FOUND', 'Subscription plan not found', 404);
  return subRepo.deletePlan(id);
}

// ── Shop Subscriptions ───────────────────────────────────

async function listShopSubscriptions(opts) {
  return subRepo.listShopSubscriptions(opts);
}

async function updateShopSubscription(shopId, plan) {
  if (!plan) throw new DomainError('VALIDATION_ERROR', 'plan is required', 400);
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

module.exports = {
  listPlans, createPlan, updatePlan, deletePlan,
  listShopSubscriptions, updateShopSubscription,
  listPayments, getPayment, updatePayment, deletePayment,
  getStats,
};

const db = require('../db');
const earningsRepo = require('../repositories/earnings');
const { DomainError } = require('../errors/domain-error');

/**
 * Record earnings when an online payment is completed.
 * Called from payment service after SSLCommerz validation.
 * Cash-on-delivery is NOT tracked here (shop handles directly).
 */
async function recordSaleEarning({ shopId, paymentId, orderId, grossAmount, currency }, client) {
  const settings = await earningsRepo.getCommissionSettings(shopId);
  const rate = Number(settings.commission_rate);
  const gross = Number(grossAmount);
  const commission = Number((gross * rate).toFixed(2));
  const net = Number((gross - commission).toFixed(2));

  return earningsRepo.createEarning({
    shop_id: shopId,
    payment_id: paymentId,
    order_id: orderId,
    type: 'sale',
    gross_amount: gross,
    commission_rate: rate,
    commission_amount: commission,
    net_amount: net,
    currency: currency || 'BDT',
    description: `Online payment for order ${orderId ? orderId.slice(0, 8) : ''}`,
  }, client);
}

/**
 * Record a refund deduction from shop earnings.
 */
async function recordRefundDeduction({ shopId, paymentId, orderId, amount, currency }) {
  return earningsRepo.createEarning({
    shop_id: shopId,
    payment_id: paymentId,
    order_id: orderId,
    type: 'refund',
    gross_amount: 0,
    commission_rate: 0,
    commission_amount: 0,
    net_amount: -Math.abs(Number(amount)),
    currency: currency || 'BDT',
    description: `Refund for order ${orderId ? orderId.slice(0, 8) : ''}`,
  });
}

/**
 * Super admin manual adjustment (bonus, correction, etc.)
 */
async function recordAdjustment({ shopId, amount, description, createdBy }) {
  return earningsRepo.createEarning({
    shop_id: shopId,
    type: 'adjustment',
    gross_amount: 0,
    commission_rate: 0,
    commission_amount: 0,
    net_amount: Number(amount),
    description: description || 'Manual adjustment',
  });
}

/* ── Earnings queries ── */

async function getShopEarnings(shopId) {
  return earningsRepo.getEarningsSummary(shopId);
}

async function getShopBalance(shopId) {
  return earningsRepo.getBalance(shopId);
}

async function listShopEarnings(shopId, opts) {
  return earningsRepo.listEarnings(shopId, opts);
}

async function listAllEarnings(opts) {
  return earningsRepo.listAllEarnings(opts);
}

async function getPlatformSummary() {
  return earningsRepo.getPlatformSummary();
}

async function getShopBalances(opts) {
  return earningsRepo.getShopBalances(opts);
}

/* ── Withdrawal requests ── */

async function requestWithdrawal({ shopId, requestedBy, amount, paymentMethod, accountDetails }) {
  const normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new DomainError('VALIDATION_ERROR', 'Amount must be greater than 0', 400);
  }

  const settings = await earningsRepo.getCommissionSettings(shopId);
  if (normalizedAmount < Number(settings.min_withdrawal)) {
    throw new DomainError('BELOW_MINIMUM', `Minimum withdrawal is ৳${settings.min_withdrawal}`, 400);
  }

  const balance = await earningsRepo.getBalance(shopId);
  if (normalizedAmount > balance) {
    throw new DomainError('INSUFFICIENT_BALANCE', `Available balance is ৳${balance.toFixed(2)}`, 400);
  }

  // Check for existing pending/processing withdrawals
  const pending = await earningsRepo.listWithdrawals(shopId, { status: 'pending' });
  const processing = await earningsRepo.listWithdrawals(shopId, { status: 'processing' });
  if (pending.total > 0 || processing.total > 0) {
    throw new DomainError('PENDING_WITHDRAWAL', 'You already have a pending withdrawal request', 400);
  }

  return earningsRepo.createWithdrawal({
    shop_id: shopId,
    requested_by: requestedBy,
    amount: normalizedAmount,
    payment_method: paymentMethod || 'bank_transfer',
    account_details: accountDetails || null,
  });
}

async function listShopWithdrawals(shopId, opts) {
  return earningsRepo.listWithdrawals(shopId, opts);
}

async function listAllWithdrawals(opts) {
  return earningsRepo.listAllWithdrawals(opts);
}

async function getWithdrawal(shopId, withdrawalId) {
  const w = await earningsRepo.findWithdrawalById(withdrawalId, shopId);
  if (!w) throw new DomainError('NOT_FOUND', 'Withdrawal request not found', 404);
  return w;
}

/**
 * Super admin approves a withdrawal request.
 */
async function approveWithdrawal(withdrawalId, { reviewedBy, notes }) {
  const w = await earningsRepo.findWithdrawalById(withdrawalId);
  if (!w) throw new DomainError('NOT_FOUND', 'Withdrawal request not found', 404);
  if (w.status !== 'pending') {
    throw new DomainError('INVALID_STATUS', `Cannot approve a ${w.status} withdrawal`, 400);
  }

  // Verify balance is still sufficient
  const balance = await earningsRepo.getBalance(w.shop_id);
  if (Number(w.amount) > balance) {
    throw new DomainError('INSUFFICIENT_BALANCE', 'Shop balance is insufficient for this withdrawal', 400);
  }

  return earningsRepo.updateWithdrawal(withdrawalId, {
    status: 'approved',
    reviewed_by: reviewedBy,
    reviewed_at: new Date(),
    admin_notes: notes || null,
  });
}

/**
 * Super admin rejects a withdrawal request.
 */
async function rejectWithdrawal(withdrawalId, { reviewedBy, notes }) {
  const w = await earningsRepo.findWithdrawalById(withdrawalId);
  if (!w) throw new DomainError('NOT_FOUND', 'Withdrawal request not found', 404);
  if (w.status !== 'pending') {
    throw new DomainError('INVALID_STATUS', `Cannot reject a ${w.status} withdrawal`, 400);
  }

  return earningsRepo.updateWithdrawal(withdrawalId, {
    status: 'rejected',
    reviewed_by: reviewedBy,
    reviewed_at: new Date(),
    admin_notes: notes || null,
  });
}

/**
 * Super admin marks withdrawal as processing (payout initiated).
 */
async function markProcessing(withdrawalId, { referenceId, notes }) {
  const w = await earningsRepo.findWithdrawalById(withdrawalId);
  if (!w) throw new DomainError('NOT_FOUND', 'Withdrawal not found', 404);
  if (w.status !== 'approved') {
    throw new DomainError('INVALID_STATUS', 'Withdrawal must be approved first', 400);
  }

  return earningsRepo.updateWithdrawal(withdrawalId, {
    status: 'processing',
    processed_at: new Date(),
    reference_id: referenceId || null,
    admin_notes: notes || w.admin_notes,
  });
}

/**
 * Super admin completes withdrawal — deducts from shop balance.
 */
async function completeWithdrawal(withdrawalId, { referenceId, notes }) {
  const w = await earningsRepo.findWithdrawalById(withdrawalId);
  if (!w) throw new DomainError('NOT_FOUND', 'Withdrawal not found', 404);
  if (!['approved', 'processing'].includes(w.status)) {
    throw new DomainError('INVALID_STATUS', 'Withdrawal must be approved/processing', 400);
  }

  // Deduct from balance
  await earningsRepo.createEarning({
    shop_id: w.shop_id,
    type: 'withdrawal',
    gross_amount: 0,
    commission_rate: 0,
    commission_amount: 0,
    net_amount: -Math.abs(Number(w.amount)),
    description: `Withdrawal #${w.id.slice(0, 8)} completed`,
  });

  return earningsRepo.updateWithdrawal(withdrawalId, {
    status: 'completed',
    completed_at: new Date(),
    reference_id: referenceId || w.reference_id || null,
    admin_notes: notes || w.admin_notes,
  });
}

/* ── Commission Settings ── */

async function getCommissionSettings(shopId) {
  return earningsRepo.getCommissionSettings(shopId);
}

async function updateCommissionSettings(shopId, data) {
  return earningsRepo.upsertCommissionSettings(shopId, data);
}

module.exports = {
  recordSaleEarning, recordRefundDeduction, recordAdjustment,
  getShopEarnings, getShopBalance, listShopEarnings, listAllEarnings,
  getPlatformSummary, getShopBalances,
  requestWithdrawal, listShopWithdrawals, listAllWithdrawals, getWithdrawal,
  approveWithdrawal, rejectWithdrawal, markProcessing, completeWithdrawal,
  getCommissionSettings, updateCommissionSettings,
};

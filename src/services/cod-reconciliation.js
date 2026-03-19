/**
 * COD Reconciliation Service
 * Cash-on-Delivery collection tracking and driver settlements
 */
const codRepo = require('../repositories/cod-reconciliation');
const deliveryRepo = require('../repositories/delivery-requests');
const orderRepo = require('../repositories/orders');
const paymentRepo = require('../repositories/payments');
const { DomainError } = require('../errors/domain-error');

/* ── Record COD Collection ──────────────────────────────────────────── */

async function recordCollection({ deliveryRequestId, shopId, orderId, driverUserId, collectedAmount, proofImageUrl, notes }) {
  // Verify the delivery exists and belongs to this driver
  const delivery = await deliveryRepo.findById(deliveryRequestId);
  if (!delivery) throw new DomainError('NOT_FOUND', 'Delivery request not found', 404);
  if (delivery.assigned_driver_user_id !== driverUserId) {
    throw new DomainError('FORBIDDEN', 'This delivery is not assigned to you', 403);
  }
  if (delivery.shop_id !== shopId) {
    throw new DomainError('FORBIDDEN', 'Delivery does not belong to this shop', 403);
  }

  // Verify the order is eligible for COD collection
  const payments = await paymentRepo.listByOrder(orderId);
  const codPayment = payments.find(p => p.method === 'cod' && p.status === 'completed');
  if (!codPayment) {
    throw new DomainError('INVALID_STATE', 'No completed COD payment found for this order', 400);
  }

  // Check if already collected
  const existing = await codRepo.getCollectionByDeliveryRequest(deliveryRequestId);
  if (existing) {
    throw new DomainError('DUPLICATE', 'COD collection already recorded for this delivery', 400);
  }

  // Get customer info
  const order = await orderRepo.findById(orderId);
  const customer = order ? await require('../repositories/customers').findById(order.customer_id) : null;

  return codRepo.recordCodCollection({
    deliveryRequestId,
    shopId,
    orderId,
    driverUserId,
    collectedAmount,
    proofImageUrl: proofImageUrl || null,
    customerName: customer?.full_name || null,
    customerPhone: customer?.phone || null,
    notes: notes || null,
  });
}

/* ── Submit Settlement (driver submits their cash to shop) ─────────── */

async function submitSettlement({ shopId, driverUserId, periodStart, periodEnd, collectionIds, notes }) {
  // Get all un-settled collections for this driver in the period
  const { rows: collections } = await require('../db').query(
    `SELECT cc.* FROM cod_collections cc
     WHERE cc.driver_user_id = $1
       AND cc.shop_id = $2
       AND cc.collected_at >= $3
       AND cc.collected_at <= $4
       AND cc.id NOT IN (
         SELECT csi.collection_id FROM cod_settlement_items csi
         JOIN cod_settlements cs ON cs.id = csi.settlement_id
         WHERE cs.status != 'rejected'
       )`,
    [driverUserId, shopId, periodStart, periodEnd]
  );

  const totalCollected = collections.reduce((s, c) => s + Number(c.collected_amount), 0);
  const ids = collectionIds && collectionIds.length > 0 ? collectionIds : collections.map(c => c.id);

  const settlement = await codRepo.createCodSettlement({
    shopId,
    driverUserId,
    periodStart,
    periodEnd,
    totalCollected,
    totalRemitted: 0,
    balanceDue: totalCollected, // driver owes this amount
  });

  await codRepo.addSettlementItems(settlement.id, ids);
  await codRepo.updateSettlementStatus(settlement.id, { status: 'submitted' });

  return codRepo.getSettlementById(settlement.id);
}

/* ── Approve / Reject Settlement ─────────────────────────────────── */

async function reviewSettlement(settlementId, { shopId, reviewedBy, action, reviewNotes, bankReference }) {
  // action: 'approve' | 'reject' | 'settle'
  if (!['approve', 'reject', 'settle'].includes(action)) {
    throw new DomainError('VALIDATION_ERROR', 'action must be approve, reject, or settle', 400);
  }

  const settlement = await codRepo.getSettlementById(settlementId);
  if (!settlement) throw new DomainError('NOT_FOUND', 'Settlement not found', 404);
  if (shopId && settlement.shop_id !== shopId) throw new DomainError('FORBIDDEN', 'Settlement does not belong to this shop', 403);

  const statusMap = { approve: 'approved', reject: 'rejected', settle: 'settled' };
  const newStatus = statusMap[action];

  const updated = await codRepo.updateSettlementStatus(settlementId, {
    status: newStatus,
    reviewedBy,
    reviewNotes,
    bankReference,
  });

  return updated;
}

/* ── Get COD Summary for Shop ─────────────────────────────────────── */

async function getShopCodSummary(shopId, { fromDate, toDate } = {}) {
  return codRepo.getCodSummaryByShop(shopId, { fromDate, toDate });
}

/* ── Get Uncollected Orders ────────────────────────────────────────── */

async function getUncollectedOrders(shopId) {
  return codRepo.getUncollectedCodOrders(shopId);
}

/* ── List Collections ─────────────────────────────────────────────── */

async function listCollections(shopId, opts = {}) {
  return codRepo.listCollectionsByShop(shopId, opts);
}

async function listDriverCollections(driverUserId, opts = {}) {
  return codRepo.listCollectionsByDriver(driverUserId, opts);
}

/* ── List Settlements ──────────────────────────────────────────────── */

async function listSettlements(shopId, opts = {}) {
  return codRepo.listSettlementsByShop(shopId, opts);
}

async function listDriverSettlements(driverUserId) {
  return codRepo.listSettlementsByDriver(driverUserId);
}

/* ── Driver Summary ───────────────────────────────────────────────── */

async function getDriverSummary(driverUserId, { fromDate, toDate } = {}) {
  const summary = await codRepo.getDriverCodSummary(driverUserId, { fromDate, toDate });
  const pending = await codRepo.listSettlementsByDriver(driverUserId);
  const pendingSettlements = pending.filter(s => ['pending', 'submitted'].includes(s.status));
  return {
    ...summary,
    pendingSayoutCount: pendingSettlements.length,
    pendingAmount: pendingSettlements.reduce((s, p) => s + Number(p.balance_due), 0),
  };
}

/* ── List Drivers ─────────────────────────────────────────────────── */

async function listShopDrivers(shopId) {
  return codRepo.listDriversForCod(shopId);
}

module.exports = {
  recordCollection,
  submitSettlement,
  reviewSettlement,
  getShopCodSummary,
  getUncollectedOrders,
  listCollections,
  listDriverCollections,
  listSettlements,
  listDriverSettlements,
  getDriverSummary,
  listShopDrivers,
};

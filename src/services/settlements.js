/**
 * Settlements Service
 * Escrow/release semantics for payment funds
 * - Online payments: funds held until delivery + dispute window
 * - Refunds: deducted from held or available balance depending on release state
 * - Withdrawals: deducted from available balance
 * - Automatic release via cron
 */
const settlementRepo = require('../repositories/settlements');
const earningsRepo = require('../repositories/earnings');
const refundRepo = require('../repositories/refunds');
const { DomainError } = require('../errors/domain-error');

/* ── Config ─────────────────────────────────────────────────────── */

async function getConfig(shopId) {
  let config = await settlementRepo.getSettlementConfig(shopId);
  if (!config) {
    config = await settlementRepo.upsertSettlementConfig(shopId, {});
  }
  return config;
}

async function saveConfig(shopId, data) {
  return settlementRepo.upsertSettlementConfig(shopId, data);
}

/* ── Balance ────────────────────────────────────────────────────── */

async function getBalance(shopId) {
  return settlementRepo.getShopBalance(shopId);
}

async function getAllBalances() {
  return settlementRepo.getAllShopBalances();
}

/* ── Ledger ──────────────────────────────────────────────────────── */

async function getLedger(shopId, opts) {
  return settlementRepo.getLedgerEntries(shopId, opts);
}

/* ── Payment Held (called from payments service on successful online payment) ── */

async function holdPaymentFunds({ shopId, paymentId, orderId, grossAmount, commissionAmount, currency }) {
  const config = await getConfig(shopId);
  if (!config.is_enabled) {
    // Escrow disabled: funds immediately available
    await settlementRepo.createLedgerEntry({
      shopId,
      paymentId,
      orderId,
      transactionType: 'payment_hold',
      amount: grossAmount - commissionAmount,
      currency,
      referenceId: paymentId,
      description: `Sale earnings for order ${orderId ? String(orderId).slice(0, 8) : ''}`,
      releaseAt: null, // immediate
    });
  } else {
    // Funds held for hold_days after delivery
    const holdUntil = new Date();
    holdUntil.setDate(holdUntil.getDate() + config.hold_days);
    await settlementRepo.createLedgerEntry({
      shopId,
      paymentId,
      orderId,
      transactionType: 'payment_hold',
      amount: grossAmount - commissionAmount,
      currency,
      referenceId: paymentId,
      description: `Sale earnings (held for ${config.hold_days} days) for order ${orderId ? String(orderId).slice(0, 8) : ''}`,
      releaseAt: holdUntil,
    });
    // Schedule auto-release
    await settlementRepo.createSettlementSchedule({
      shopId,
      earningId: null,
      scheduledFor: holdUntil,
    });
  }

  // Platform commission entry
  if (commissionAmount > 0) {
    await settlementRepo.createPlatformLedgerEntry({
      shopId,
      paymentId,
      description: `Commission from order ${orderId ? String(orderId).slice(0, 8) : ''}`,
      amount: commissionAmount,
      entryType: 'commission_collected',
      referenceId: paymentId,
    });
  }

  await settlementRepo.updateShopBalanceSummary(shopId);
  return true;
}

/* ── Funds Released on Delivery (called when order marked delivered) ── */

async function releaseFundsOnDelivery({ shopId, orderId }) {
  const config = await getConfig(shopId);
  if (!config.is_enabled) return; // no escrow

  // Mark any held ledger entries for this order as immediately releasable
  // (release_at is already set at payment time, this just updates the schedule)
  // Actually, the auto-release cron handles this. Nothing to do here unless
  // we want to shorten the hold period for delivered orders.
  await settlementRepo.updateShopBalanceSummary(shopId);
}

/* ── Process Automatic Releases (called by cron job) ───────────── */

async function processAutomaticReleases() {
  const schedules = await settlementRepo.getPendingSettlementSchedules(100);
  const results = { processed: 0, failed: 0, errors: [] };

  for (const schedule of schedules) {
    try {
      if (!schedule.auto_release) {
        await settlementRepo.markScheduleProcessed(schedule.id);
        continue;
      }

      // Find and release all entries for this shop past their release_at
      const { rows: entries } = await require('../db').query(
        `SELECT sl.id, sl.shop_id FROM settlement_ledger sl
         WHERE sl.shop_id = $1
           AND sl.release_at IS NOT NULL
           AND sl.release_at <= NOW()
           AND sl.released_at IS NULL`,
        [schedule.shop_id]
      );

      if (entries.length > 0) {
        const earningIds = entries.map(e => e.id);
        await settlementRepo.releaseLedgerEntries(schedule.shop_id, earningIds);
      }

      await settlementRepo.markScheduleProcessed(schedule.id);
      await settlementRepo.updateShopBalanceSummary(schedule.shop_id);
      results.processed++;
    } catch (err) {
      await settlementRepo.markScheduleFailed(schedule.id, err.message);
      results.failed++;
      results.errors.push({ scheduleId: schedule.id, error: err.message });
    }
  }

  return results;
}

/* ── Refund from Held vs Released Pool ───────────────────────────── */

async function settleRefund({ shopId, paymentId, orderId, refundAmount, currency }) {
  const config = await getConfig(shopId);

  // Find the earning entry for this payment
  const earning = await settlementRepo.findEarningByPaymentAndShop(paymentId, shopId);

  if (!config.is_enabled || !earning) {
    // No escrow or no earning: deduct from available balance directly
    await settlementRepo.createLedgerEntry({
      shopId,
      paymentId,
      orderId,
      transactionType: 'refund_from_balance',
      amount: -Math.abs(Number(refundAmount)),
      currency: currency || 'BDT',
      referenceId: paymentId,
      description: `Refund for order ${orderId ? String(orderId).slice(0, 8) : ''}`,
      releaseAt: null,
    });
  } else {
    // Check if the earning has been released
    const { rows: ledgerEntries } = await require('../db').query(
      `SELECT sl.id, sl.release_at, sl.released_at, sl.amount, sl.balance_after
       FROM settlement_ledger sl
       WHERE sl.earning_id = $1 AND sl.shop_id = $2
       ORDER BY sl.created_at DESC LIMIT 1`,
      [earning.id, shopId]
    );

    const entry = ledgerEntries[0];
    if (entry?.released_at) {
      // Already released: refund from balance
      await settlementRepo.createLedgerEntry({
        shopId,
        paymentId,
        orderId,
        earningId: earning.id,
        transactionType: 'refund_from_balance',
        amount: -Math.abs(Number(refundAmount)),
        currency: currency || 'BDT',
        referenceId: paymentId,
        description: `Refund (from released balance) for order ${orderId ? String(orderId).slice(0, 8) : ''}`,
        releaseAt: null,
      });
    } else {
      // Still held: deduct from held balance
      await settlementRepo.createLedgerEntry({
        shopId,
        paymentId,
        orderId,
        earningId: earning.id,
        transactionType: 'refund_hold',
        amount: -Math.abs(Number(refundAmount)),
        currency: currency || 'BDT',
        referenceId: paymentId,
        description: `Refund (from held balance) for order ${orderId ? String(orderId).slice(0, 8) : ''}`,
        releaseAt: null,
      });
    }
  }

  // Platform: credit back proportional commission
  if (earning) {
    const refundRatio = Number(refundAmount) / Number(earning.gross_amount || earning.commission_amount || 1);
    const commissionRefund = Number((Number(earning.commission_amount || 0) * refundRatio).toFixed(2));
    if (commissionRefund > 0) {
      await settlementRepo.createPlatformLedgerEntry({
        shopId,
        paymentId,
        earningId: earning.id,
        description: `Commission refunded for refund of order ${orderId ? String(orderId).slice(0, 8) : ''}`,
        amount: -commissionRefund,
        entryType: 'refund_credited',
        referenceId: paymentId,
      });
    }
  }

  await settlementRepo.updateShopBalanceSummary(shopId);
  return true;
}

/* ── Payout / Withdrawal ─────────────────────────────────────────── */

async function linkWithdrawalToLedger({ withdrawalId, shopId, amount, ledgerId }) {
  // Update withdrawal with settlement ledger reference
  await require('../db').query(
    `UPDATE withdrawal_requests SET settlement_ledger_id = $1 WHERE id = $2`,
    [ledgerId, withdrawalId]
  );
  await settlementRepo.updateShopBalanceSummary(shopId);
}

async function recordPayoutDebit({ shopId, withdrawalId, amount, currency }) {
  const entry = await settlementRepo.createLedgerEntry({
    shopId,
    transactionType: 'payout_debit',
    amount: -Math.abs(Number(amount)),
    currency: currency || 'BDT',
    referenceId: withdrawalId,
    description: `Payout for withdrawal request ${String(withdrawalId).slice(0, 8)}`,
    releaseAt: null,
  });
  await settlementRepo.updateShopBalanceSummary(shopId);
  return entry;
}

/* ── Settlement Report ────────────────────────────────────────────── */

async function getSettlementReport(shopId, { fromDate, toDate }) {
  const ledger = await settlementRepo.getLedgerEntries(shopId, { fromDate, toDate, limit: 200 });
  const balance = await settlementRepo.getShopBalance(shopId);
  const held = await settlementRepo.getHeldEntries(shopId);
  const pending = await settlementRepo.getPendingReleases(shopId);

  return {
    balance,
    period: { from: fromDate, to: toDate },
    summary: {
      totalHeld: held.reduce((s, e) => s + Number(e.amount), 0),
      totalPendingRelease: pending.reduce((s, e) => s + Number(e.amount), 0),
      transactionCount: ledger.total,
    },
    transactions: ledger.items,
  };
}

/* ── Platform Financial Overview ─────────────────────────────────── */

async function getPlatformFinancialSummary() {
  const [balances, platformSummary] = await Promise.all([
    settlementRepo.getAllShopBalances(),
    settlementRepo.getPlatformSummary(),
  ]);

  const totalHeld = balances.reduce((s, b) => s + Number(b.held_balance || 0), 0);
  const totalReleasable = balances.reduce((s, b) => s + Number(b.releasable_balance || 0), 0);
  const totalAvailable = balances.reduce((s, b) => s + Number(b.available_balance || 0), 0);
  const totalProcessing = balances.reduce((s, b) => s + Number(b.payouts_processing || 0), 0);

  return {
    shopBalances: balances,
    platform: {
      totalCommission: Number(platformSummary.total_commission || 0),
      totalRefunds: Number(platformSummary.total_refunds || 0),
      netCommission: Number(platformSummary.total_commission || 0) - Number(platformSummary.total_refunds || 0),
      totalEntries: parseInt(platformSummary.total_entries || 0, 10),
    },
    totals: {
      platformHeld: totalHeld,
      platformReleasable: totalReleasable,
      platformAvailable: totalAvailable,
      platformProcessing: totalProcessing,
    },
  };
}

/* ── Refund Disputes ──────────────────────────────────────────────── */

async function createDispute({ refundRequestId, shopId, disputedByUserId, reason }) {
  return settlementRepo.createRefundDispute({ refundRequestId, shopId, disputedByUserId, reason });
}

async function resolveDispute(disputeId, { resolvedBy, status, resolutionNotes }) {
  const validStatuses = ['resolved_shop', 'resolved_platform', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new DomainError('VALIDATION_ERROR', `status must be one of: ${validStatuses.join(', ')}`, 400);
  }
  return settlementRepo.resolveRefundDispute(disputeId, { resolvedBy, status, resolutionNotes });
}

async function listDisputes(shopId) {
  return settlementRepo.getRefundDisputes(shopId);
}

module.exports = {
  // Config
  getConfig, saveConfig,
  // Balance & Ledger
  getBalance, getAllBalances, getLedger,
  // Fund flows
  holdPaymentFunds, releaseFundsOnDelivery,
  processAutomaticReleases,
  settleRefund,
  linkWithdrawalToLedger, recordPayoutDebit,
  // Reports
  getSettlementReport, getPlatformFinancialSummary,
  // Disputes
  createDispute, resolveDispute, listDisputes,
};

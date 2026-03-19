/**
 * Affiliates Service — referral and affiliate program business logic.
 */
const affiliateRepo = require('../repositories/affiliates');
const earningsRepo = require('../repositories/earnings');
const { DomainError } = require('../errors/domain-error');

// ─── Program Management ──────────────────────────────────────

async function getProgram(shopId) {
  const program = await affiliateRepo.getProgram(shopId);
  return program;
}

async function updateProgram(shopId, data) {
  // Validate commission
  if (data.commission_value !== undefined) {
    const val = Number(data.commission_value);
    if (!Number.isFinite(val) || val < 0) {
      throw new DomainError('VALIDATION_ERROR', 'commission_value must be a non-negative number', 400);
    }
    if (data.commission_type === 'percentage' && val > 100) {
      throw new DomainError('VALIDATION_ERROR', 'percentage commission cannot exceed 100', 400);
    }
  }
  if (data.min_payout !== undefined) {
    const val = Number(data.min_payout);
    if (!Number.isFinite(val) || val < 0) {
      throw new DomainError('VALIDATION_ERROR', 'min_payout must be non-negative', 400);
    }
  }
  return affiliateRepo.upsertProgram(shopId, data);
}

// ─── Affiliate Management ────────────────────────────────────

/**
 * Register the authenticated customer as an affiliate for the shop.
 */
async function registerAsAffiliate(shopId, customerId, email, displayName) {
  // Check if program exists and is active
  const program = await affiliateRepo.getProgram(shopId);
  if (!program) {
    throw new DomainError('PROGRAM_NOT_FOUND', 'Affiliate program not found for this shop', 404);
  }
  if (!program.is_active) {
    throw new DomainError('PROGRAM_INACTIVE', 'Affiliate program is not active', 400);
  }

  // Check if already an affiliate
  const existing = await affiliateRepo.findByCustomer(shopId, customerId);
  if (existing) return existing;

  return affiliateRepo.createAffiliate({
    shopId, customerId, email, displayName,
  });
}

/**
 * Get affiliate profile for a customer at a shop.
 */
async function getMyAffiliateProfile(shopId, customerId) {
  const affiliate = await affiliateRepo.findByCustomer(shopId, customerId);
  if (!affiliate) return null;
  return affiliateRepo.getAffiliate(affiliate.id, shopId);
}

/**
 * Get affiliate stats (dashboard view).
 */
async function getAffiliateDashboard(shopId, affiliateId) {
  const affiliate = await affiliateRepo.getAffiliate(affiliateId, shopId);
  if (!affiliate) throw new DomainError('NOT_FOUND', 'Affiliate not found', 404);

  const [referrals, stats] = await Promise.all([
    affiliateRepo.listReferrals(affiliateId, { limit: 20 }),
    affiliateRepo.getShopAffiliateStats(shopId),
  ]);

  return { affiliate, referrals, platformStats: stats };
}

/**
 * Look up affiliate by referral code.
 */
async function findAffiliateByCode(shopId, referralCode) {
  return affiliateRepo.findByCode(shopId, referralCode);
}

// ─── Referral Tracking ──────────────────────────────────────

/**
 * Track a referral when an order is placed with a referral code.
 * Called during checkout after order is created.
 */
async function trackReferral({ shopId, referralCode, referredCustomerId, orderId, orderAmount }) {
  if (!referralCode || !orderId || !orderAmount) return null;

  const affiliate = await affiliateRepo.findByCode(shopId, referralCode);
  if (!affiliate) return null;

  // Don't allow self-referral
  if (affiliate.customer_id === referredCustomerId) return null;

  return affiliateRepo.createReferral({
    affiliateId: affiliate.id,
    shopId,
    referredCustomerId,
    orderId,
    orderAmount,
  });
}

// ─── Merchant Affiliate Management ──────────────────────────

/**
 * List all affiliates for a shop (merchant view).
 */
async function listAffiliates(shopId, opts) {
  return affiliateRepo.listByShop(shopId, opts);
}

/**
 * Get affiliate details for a merchant.
 */
async function getAffiliateForMerchant(shopId, affiliateId) {
  const affiliate = await affiliateRepo.getAffiliate(affiliateId, shopId);
  if (!affiliate) throw new DomainError('NOT_FOUND', 'Affiliate not found', 404);
  return affiliate;
}

/**
 * Get referrals for an affiliate (merchant view).
 */
async function getAffiliateReferrals(shopId, affiliateId, opts) {
  // Verify affiliate belongs to shop
  const affiliate = await affiliateRepo.getAffiliate(affiliateId, shopId);
  if (!affiliate) throw new DomainError('NOT_FOUND', 'Affiliate not found', 404);
  return affiliateRepo.listReferrals(affiliateId, opts);
}

/**
 * Approve a pending referral.
 */
async function approveReferral(shopId, referralId) {
  const referral = await affiliateRepo.approveReferral(referralId, shopId);
  if (!referral) throw new DomainError('NOT_FOUND', 'Referral not found', 404);
  return referral;
}

/**
 * Cancel a pending referral.
 */
async function cancelReferral(shopId, referralId) {
  const referral = await affiliateRepo.cancelReferral(referralId, shopId);
  if (!referral) throw new DomainError('NOT_FOUND', 'Referral not found', 404);
  return referral;
}

/**
 * Get affiliate stats summary for merchant dashboard.
 */
async function getMerchantAffiliateStats(shopId) {
  return affiliateRepo.getShopAffiliateStats(shopId);
}

/**
 * Get top affiliates for merchant.
 */
async function getTopAffiliates(shopId) {
  return affiliateRepo.getTopAffiliates(shopId);
}

/**
 * Pay out an affiliate's earnings and create a withdrawal record.
 * The earnings are deducted from the shop's balance.
 */
async function payOutAffiliate({ shopId, affiliateId, requestedBy }) {
  const affiliate = await affiliateRepo.getAffiliate(affiliateId, shopId);
  if (!affiliate) throw new DomainError('NOT_FOUND', 'Affiliate not found', 404);

  const unpaid = Number(affiliate.unpaid_earnings) || 0;
  if (unpaid <= 0) {
    throw new DomainError('NO_UNPAID_EARNINGS', 'No unpaid earnings to withdraw', 400);
  }

  // Get program for min payout
  const program = await affiliateRepo.getProgram(shopId);
  if (program && unpaid < Number(program.min_payout)) {
    throw new DomainError('BELOW_MIN_PAYOUT', `Minimum payout is ৳${program.min_payout}`, 400);
  }

  // Create earnings deduction record (negative = debit from affiliate)
  const earning = await earningsRepo.createEarning({
    shop_id: shopId,
    type: 'affiliate_payout',
    gross_amount: 0,
    commission_rate: 0,
    commission_amount: 0,
    net_amount: -Math.abs(unpaid),
    description: `Affiliate payout for ${affiliate.email}`,
  });

  // Mark all pending/approved referrals as paid
  await affiliateRepo.markReferralPaid(affiliateId);

  // Reset unpaid earnings
  await require('../db').query(
    `UPDATE affiliates SET unpaid_earnings = 0 WHERE id = $1`,
    [affiliateId]
  );

  return { paidAmount: unpaid, earningId: earning?.id };
}

module.exports = {
  getProgram, updateProgram,
  registerAsAffiliate, getMyAffiliateProfile, getAffiliateDashboard, findAffiliateByCode,
  trackReferral,
  listAffiliates, getAffiliateForMerchant, getAffiliateReferrals,
  approveReferral, cancelReferral,
  getMerchantAffiliateStats, getTopAffiliates, payOutAffiliate,
};

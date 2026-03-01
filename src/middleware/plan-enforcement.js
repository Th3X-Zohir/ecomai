/**
 * Plan Enforcement Middleware
 *
 * Express middleware functions that check subscription plan limits
 * and feature access before allowing route handlers to proceed.
 *
 * Usage in route files:
 *   const { checkPlanLimit, checkFeatureAccess } = require('../middleware/plan-enforcement');
 *
 *   router.post('/', checkPlanLimit('products'), asyncHandler(...));
 *   router.post('/', checkFeatureAccess('marketing_tools'), asyncHandler(...));
 */

const engine = require('../services/subscription-engine');

/**
 * Middleware factory: check that the shop hasn't exceeded a plan limit.
 *
 * @param {string} metric - 'products' | 'orders_monthly' | 'staff' | 'images_per_product'
 * @returns {Function} Express middleware
 */
function checkPlanLimit(metric) {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all plan limits
      if (req.auth?.role === 'super_admin') return next();

      const shopId = req.tenantShopId;
      if (!shopId) return next(); // No shop context = skip (shouldn't happen after requireTenantContext)

      const result = await engine.checkLimit(shopId, metric);

      if (!result.allowed) {
        return res.status(403).json({
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `You've reached your ${metric.replace('_', ' ')} limit (${result.current}/${result.limit}). Upgrade your plan to add more.`,
          limit: result.limit,
          current: result.current,
          plan: result.plan,
          metric,
        });
      }

      // Attach plan info to request for downstream use
      req.planLimit = result;
      return next();
    } catch (err) {
      console.error('[plan-enforcement] checkPlanLimit error:', err.message);
      return res.status(500).json({ code: 'PLAN_CHECK_FAILED', message: 'Unable to verify plan limits. Please try again.' });
    }
  };
}

/**
 * Middleware factory: check that the shop's plan includes a specific feature.
 *
 * @param {string} feature - e.g. 'custom_domain', 'api_access', 'marketing_tools'
 * @returns {Function} Express middleware
 */
function checkFeatureAccess(feature) {
  return async (req, res, next) => {
    try {
      if (req.auth?.role === 'super_admin') return next();

      const shopId = req.tenantShopId;
      if (!shopId) return next();

      const result = await engine.checkFeature(shopId, feature);

      if (!result.allowed) {
        return res.status(403).json({
          code: 'FEATURE_NOT_AVAILABLE',
          message: `The "${feature.replace(/_/g, ' ')}" feature is not available on your ${result.plan} plan. Please upgrade.`,
          feature,
          plan: result.plan,
        });
      }

      return next();
    } catch (err) {
      console.error('[plan-enforcement] checkFeatureAccess error:', err.message);
      return res.status(500).json({ code: 'FEATURE_CHECK_FAILED', message: 'Unable to verify feature access. Please try again.' });
    }
  };
}

/**
 * Middleware factory: check image limit per product.
 * Needs productId from req.params.
 *
 * @returns {Function} Express middleware
 */
function checkImageLimit() {
  return async (req, res, next) => {
    try {
      if (req.auth?.role === 'super_admin') return next();

      const shopId = req.tenantShopId;
      if (!shopId) return next();

      const { plan } = await engine.resolveShopPlan(shopId);
      const limit = plan.image_limit_per_product;

      if (limit === -1) return next(); // unlimited

      const db = require('../db');
      const productId = req.params.productId;
      const countRes = await db.query(
        'SELECT COUNT(*)::int AS count FROM product_images WHERE product_id = $1 AND shop_id = $2',
        [productId, shopId]
      );
      const current = countRes.rows[0]?.count || 0;

      if (current >= limit) {
        return res.status(403).json({
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `Image limit reached (${current}/${limit}). Upgrade your plan for more images per product.`,
          limit,
          current,
          plan: plan.slug,
          metric: 'images_per_product',
        });
      }

      return next();
    } catch (err) {
      console.error('[plan-enforcement] checkImageLimit error:', err.message);
      return res.status(500).json({ code: 'PLAN_CHECK_FAILED', message: 'Unable to verify image limits. Please try again.' });
    }
  };
}

module.exports = { checkPlanLimit, checkFeatureAccess, checkImageLimit };

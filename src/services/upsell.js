/**
 * Upsell Service — automated upsell & cross-sell suggestions.
 * Two layers: shop-defined rules + platform co-occurrence intelligence.
 */
const db = require('../db');
const { DomainError } = require('../errors/domain-error');

// ─── Shop-configured Rules ──────────────────────────────────

/**
 * Create an upsell rule.
 */
async function createRule({ shopId, triggerProductId, triggerType, upsellProductId, upsellType, discountType, discountValue, displayText, priority = 0 }) {
  if (triggerType === 'bought' && !triggerProductId) {
    throw new DomainError('VALIDATION_ERROR', 'trigger_product_id is required for bought trigger', 400);
  }
  if (upsellType === 'product' && !upsellProductId) {
    throw new DomainError('VALIDATION_ERROR', 'upsell_product_id is required for product upsell', 400);
  }

  const { rows } = await db.query(
    `INSERT INTO upsell_rules
       (shop_id, trigger_product_id, trigger_type, upsell_product_id, upsell_type,
        discount_type, discount_value, display_text, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [shopId, triggerProductId || null, triggerType || 'bought', upsellProductId || null,
     upsellType || 'product', discountType || null, discountValue || null,
     displayText || null, priority || 0]
  );
  return rows[0];
}

/**
 * List upsell rules for a shop.
 */
async function listRules(shopId, { page = 1, limit = 50, isActive } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (isActive !== undefined) { conditions.push(`is_active = $${idx}`); params.push(isActive); idx++; }

  const countRes = await db.query(
    `SELECT COUNT(*) FROM upsell_rules WHERE ${conditions.join(' AND ')}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT ur.*,
       tp.name AS trigger_product_name, up.name AS upsell_product_name
     FROM upsell_rules ur
     LEFT JOIN products tp ON tp.id = ur.trigger_product_id
     LEFT JOIN products up ON up.id = ur.upsell_product_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY ur.priority DESC, ur.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Update an upsell rule.
 */
async function updateRule(shopId, ruleId, patch) {
  const allowed = ['is_active', 'discount_type', 'discount_value', 'display_text', 'priority'];
  const sets = [];
  const params = [ruleId, shopId];
  let idx = 3;
  for (const k of allowed) {
    if (patch[k] !== undefined) {
      sets.push(`${k} = $${idx}`);
      params.push(patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) {
    const { rows } = await db.query('SELECT * FROM upsell_rules WHERE id = $1 AND shop_id = $2', [ruleId, shopId]);
    return rows[0] || null;
  }
  sets.push('updated_at = now()');
  const { rows } = await db.query(
    `UPDATE upsell_rules SET ${sets.join(', ')} WHERE id = $1 AND shop_id = $2 RETURNING *`,
    params
  );
  return rows[0] || null;
}

/**
 * Delete an upsell rule.
 */
async function deleteRule(shopId, ruleId) {
  const { rowCount } = await db.query(
    'DELETE FROM upsell_rules WHERE id = $1 AND shop_id = $2',
    [ruleId, shopId]
  );
  return rowCount > 0;
}

// ─── Upsell Suggestions ─────────────────────────────────────

/**
 * Get upsell suggestions for a list of product IDs in cart.
 * Combines shop rules with platform co-occurrence data.
 */
async function getSuggestions({ shopId, productIds, limit = 3 }) {
  if (!productIds || productIds.length === 0) return [];

  // 1. Get shop-defined rule-based upsells
  const { rows: ruleUpsells } = await db.query(
    `SELECT ur.*, p.name, p.base_price, p.slug,
            p.id AS upsell_product_id,
            COALESCE(p.stock_quantity, 0)::int AS stock_quantity
     FROM upsell_rules ur
     JOIN products p ON p.id = ur.upsell_product_id
     WHERE ur.shop_id = $1
       AND ur.is_active = true
       AND ur.trigger_product_id = ANY($2)
       AND p.status = 'active'
       AND p.deleted_at IS NULL
       AND COALESCE(p.stock_quantity, 0) > 0
     ORDER BY ur.priority DESC, ur.created_at DESC
     LIMIT $3`,
    [shopId, productIds, limit]
  );

  // 2. Get platform co-occurrence upsells for products not covered by rules
  const ruleProductIds = ruleUpsells.map(r => r.upsell_product_id);
  const remainingSlots = limit - ruleUpsells.length;
  let cooccurrenceUpsells = [];

  if (remainingSlots > 0) {
    const excludeIds = [...productIds, ...ruleProductIds];
    const { rows: cooc } = await db.query(
      `SELECT pc.product_b_id AS upsell_product_id,
              pc.coorder_count, pc.confidence,
              p.name, p.base_price, p.slug,
              COALESCE(p.stock_quantity, 0)::int AS stock_quantity
       FROM product_cooccurrence pc
       JOIN products p ON p.id = pc.product_b_id
       WHERE pc.product_a_id = ANY($1)
         AND p.shop_id = $2
         AND p.status = 'active'
         AND p.deleted_at IS NULL
         AND COALESCE(p.stock_quantity, 0) > 0
         AND pc.product_b_id != ALL($3)
       ORDER BY pc.coorder_count DESC, pc.confidence DESC
       LIMIT $4`,
      [productIds, shopId, excludeIds.length > 0 ? excludeIds : [null], remainingSlots]
    );
    cooccurrenceUpsells = cooc;
  }

  // Combine and format suggestions
  const suggestions = [
    ...ruleUpsells.map(r => ({
      type: 'rule',
      rule_id: r.id,
      product_id: r.upsell_product_id,
      name: r.name,
      base_price: Number(r.base_price),
      slug: r.slug,
      stock_quantity: r.stock_quantity,
      discount_type: r.discount_type,
      discount_value: r.discount_value ? Number(r.discount_value) : null,
      display_text: r.display_text || `Add ${r.name} to your order`,
    })),
    ...cooccurrenceUpsells.map(c => ({
      type: 'cooccurrence',
      product_id: c.upsell_product_id,
      name: c.name,
      base_price: Number(c.base_price),
      slug: c.slug,
      stock_quantity: c.stock_quantity,
      coorder_count: Number(c.coorder_count),
      confidence: Number(c.confidence),
      display_text: `Frequently bought together with your order`,
    })),
  ];

  return suggestions.slice(0, limit);
}

// ─── Co-occurrence Computation ──────────────────────────────

/**
 * Compute product co-occurrence data from recent orders.
 * Called by a nightly cron job. Anonymized — only counts, no shop-specific data.
 */
async function computeCooccurrence() {
  // Find product pairs that appear together in the same order
  // (only consider completed/delivered orders from the last 90 days)
  await db.query(`
    INSERT INTO product_cooccurrence (product_a_id, product_b_id, coorder_count, confidence, refreshed_at)
    WITH pair_counts AS (
      SELECT DISTINCT
        oi1.product_id AS product_a_id,
        oi2.product_id AS product_b_id,
        COUNT(DISTINCT oi1.order_id)::int AS coorder_count
      FROM order_items oi1
      JOIN order_items oi2 ON oi2.order_id = oi1.order_id
        AND oi2.product_id != oi1.product_id
      JOIN orders o ON o.id = oi1.order_id
      WHERE o.status IN ('delivered', 'confirmed')
        AND o.created_at >= NOW() - INTERVAL '90 days'
      GROUP BY oi1.product_id, oi2.product_id
      HAVING COUNT(DISTINCT oi1.order_id) >= 3
    )
    SELECT
      pc.product_a_id,
      pc.product_b_id,
      pc.coorder_count,
      CASE WHEN total_orders.total > 0
        THEN LEAST((pc.coorder_count::numeric / total_orders.total), 1.0)
        ELSE 0
      END AS confidence,
      now() AS refreshed_at
    FROM pair_counts pc
    CROSS JOIN LATERAL (
      SELECT COUNT(DISTINCT order_id) AS total
      FROM order_items oi3 WHERE oi3.product_id = pc.product_a_id
        AND oi3.order_id IN (
          SELECT DISTINCT oi4.order_id FROM order_items oi4
          JOIN orders o2 ON o2.id = oi4.order_id
          WHERE o2.status IN ('delivered', 'confirmed')
            AND o2.created_at >= NOW() - INTERVAL '90 days'
        )
    ) total_orders
    ON CONFLICT (product_a_id, product_b_id) DO UPDATE SET
      coorder_count = EXCLUDED.coorder_count,
      confidence = EXCLUDED.confidence,
      refreshed_at = EXCLUDED.refreshed_at
  `);
}

module.exports = {
  createRule, listRules, updateRule, deleteRule,
  getSuggestions,
  computeCooccurrence,
};

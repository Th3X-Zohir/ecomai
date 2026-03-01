const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const { checkPlanLimit } = require('../middleware/plan-enforcement');
const productService = require('../services/products');
const db = require('../db');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

// ── Static paths MUST come before /:productId param routes ──

// ── CSV Export ──────────────────────────────────────────
router.get('/export/csv', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' && req.query.all === 'true' ? null : req.tenantShopId;
  const statusFilter = req.query.status;
  let query = `SELECT p.id, p.name, p.slug, p.base_price, p.compare_at_price, p.status,
    p.inventory_qty, p.sku, p.category, p.description, p.created_at,
    (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id)::int AS variant_count
    FROM products p`;
  const params = [];
  const where = [];
  if (shopId) { params.push(shopId); where.push(`p.shop_id = $${params.length}`); }
  if (statusFilter) { params.push(statusFilter); where.push(`p.status = $${params.length}`); }
  if (where.length) query += ' WHERE ' + where.join(' AND ');
  query += ' ORDER BY p.created_at DESC LIMIT 5000';

  const { rows } = await db.query(query, params);

  const header = 'Product ID,Name,Slug,Price,Compare At,Status,Stock,SKU,Category,Variants,Description,Created\n';
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = header + rows.map(r =>
    [r.id, r.name, r.slug, r.base_price, r.compare_at_price, r.status,
     r.inventory_qty, r.sku, r.category, r.variant_count, r.description,
     r.created_at?.toISOString?.() || r.created_at].map(esc).join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="products-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
}));

// ── Product stats ───────────────────────────────────────
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const shopFilter = shopId ? 'WHERE shop_id = $1' : '';
  const params = shopId ? [shopId] : [];

  const { rows } = await db.query(`
    SELECT
      COUNT(*)::int AS total_products,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
      COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
      COUNT(*) FILTER (WHERE inventory_qty = 0 AND status = 'active')::int AS out_of_stock,
      COUNT(*) FILTER (WHERE inventory_qty > 0 AND inventory_qty <= 5 AND status = 'active')::int AS low_stock,
      COALESCE(AVG(base_price), 0)::float AS avg_price,
      COALESCE(SUM(inventory_qty), 0)::int AS total_inventory
    FROM products ${shopFilter}
  `, params);

  res.json(rows[0]);
}));

// ── Standard CRUD routes ────────────────────────────────

router.get('/', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.auth.role === 'super_admin';
  const opts = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    search: req.query.search,
    category: req.query.category,
    status: req.query.status,
  };
  if (isSuperAdmin && req.query.all === 'true') {
    const result = await productService.listProducts(null, opts);
    return res.json(result);
  }
  const result = await productService.listProducts(req.tenantShopId, opts);
  res.json(result);
}));

router.get('/:productId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const product = await productService.getProduct(shopId, req.params.productId);
  res.json(product);
}));

router.post('/', checkPlanLimit('products'), validateBody({
  name: { required: true, type: 'string', minLength: 1 },
  slug: { required: true, type: 'string', minLength: 1 },
  base_price: { required: true, type: 'number', min: 0 },
}), asyncHandler(async (req, res) => {
  const product = await productService.createProduct({ shopId: req.tenantShopId, ...req.body });
  res.status(201).json(product);
}));

router.patch('/:productId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const product = await productService.updateProduct(shopId, req.params.productId, req.body);
  res.json(product);
}));

router.delete('/:productId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const result = await productService.deleteProduct(shopId, req.params.productId);
  res.json(result);
}));

module.exports = router;
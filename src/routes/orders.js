const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const { checkPlanLimit } = require('../middleware/plan-enforcement');
const orderService = require('../services/orders');
const deliveryService = require('../services/delivery-requests');
const paymentService = require('../services/payments');
const config = require('../config');
const db = require('../db');

const router = express.Router();

router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

// ── Static paths MUST come before /:orderId param routes ──

// ── CSV Export ──────────────────────────────────────────
router.get('/export/csv', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' && req.query.all === 'true' ? null : req.tenantShopId;
  const statusFilter = req.query.status;
  let query = `SELECT o.id, o.customer_email, o.status, o.payment_status, o.subtotal, o.discount_amount,
    o.total_amount, o.shipping_address, o.notes, o.created_at,
    (SELECT string_agg(oi.item_name || ' x' || oi.quantity, '; ') FROM order_items oi WHERE oi.order_id = o.id) AS items_summary
    FROM orders o`;
  const params = [];
  const where = [];
  if (shopId) { params.push(shopId); where.push(`o.shop_id = $${params.length}`); }
  if (statusFilter) { params.push(statusFilter); where.push(`o.status = $${params.length}`); }
  if (where.length) query += ' WHERE ' + where.join(' AND ');
  query += ' ORDER BY o.created_at DESC LIMIT 5000';

  const { rows } = await db.query(query, params);

  const header = 'Order ID,Email,Status,Payment,Subtotal,Discount,Total,Items,Notes,Created\n';
  const esc = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
  const csv = header + rows.map(r =>
    [r.id, r.customer_email, r.status, r.payment_status, r.subtotal, r.discount_amount,
     r.total_amount, r.items_summary, r.notes, r.created_at?.toISOString?.() || r.created_at].map(esc).join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
}));

// ── Bulk status update ──────────────────────────────────
router.post('/bulk/status', validateBody({
  order_ids: { required: true, type: 'array' },
  status: { required: true, type: 'string', oneOf: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] },
}), asyncHandler(async (req, res) => {
  const { order_ids, status } = req.body;
  if (order_ids.length > 50) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Maximum 50 orders per batch' });
  }
  const results = { success: [], failed: [] };
  for (const orderId of order_ids) {
    try {
      await orderService.updateOrderStatus(req.tenantShopId, orderId, status);
      results.success.push(orderId);
    } catch (err) {
      results.failed.push({ id: orderId, error: err.message });
    }
  }
  res.json(results);
}));

// ── Order stats ─────────────────────────────────────────
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const shopFilter = shopId ? 'WHERE shop_id = $1' : '';
  const params = shopId ? [shopId] : [];

  const { rows } = await db.query(`
    SELECT
      COUNT(*)::int AS total_orders,
      COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
      COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
      COUNT(*) FILTER (WHERE status = 'shipped')::int AS shipped,
      COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
      COALESCE(SUM(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'refunded')), 0)::float AS total_revenue,
      COALESCE(AVG(total_amount) FILTER (WHERE status NOT IN ('cancelled', 'refunded')), 0)::float AS avg_order_value,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::int AS orders_last_24h,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS orders_last_7d
    FROM orders ${shopFilter}
  `, params);

  res.json(rows[0]);
}));

// ── Standard CRUD routes (param routes AFTER static routes) ──

router.get('/', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.auth.role === 'super_admin';
  const opts = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
    search: req.query.search,
  };
  if (isSuperAdmin && req.query.all === 'true') {
    const result = await orderService.listOrdersByShop(null, opts);
    return res.json(result);
  }
  const result = await orderService.listOrdersByShop(req.tenantShopId, opts);
  res.json(result);
}));

router.get('/:orderId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const order = await orderService.getOrder(shopId, req.params.orderId);
  res.json(order);
}));

router.post('/', checkPlanLimit('orders_monthly'), validateBody({
  customer_email: { required: true, type: 'email' },
  items: { required: true, type: 'array' },
}), asyncHandler(async (req, res) => {
  const order = await orderService.createOrder({
    shopId: req.tenantShopId,
    customer_email: req.body.customer_email,
    customer_id: req.body.customer_id,
    items: req.body.items,
    shipping_address: req.body.shipping_address,
  });
  res.status(201).json(order);
}));

router.patch('/:orderId/status', validateBody({
  status: { required: true, type: 'string', oneOf: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] },
}), asyncHandler(async (req, res) => {
  const previousStatus = req.body.previous_status;
  const order = await orderService.updateOrderStatus(req.tenantShopId, req.params.orderId, req.body.status);
  res.json(order);

  // Send "order shipped" email when status transitions to 'shipped'
  if (req.body.status === 'shipped' && order.customer_email) {
    const emailService = require('../services/email');
    const shopRepo = require('../repositories/shops');
    const shop = await shopRepo.findById(req.tenantShopId);
    emailService.sendOrderShipped({
      to: order.customer_email,
      order,
      shopName: shop?.name || 'the shop',
      shopUrl: `${config.appUrl}/shops/${shop?.slug || ''}`,
      trackingInfo: req.body.tracking_info || null,
    }).catch(() => {});
  }
}));

router.patch('/:orderId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const order = await orderService.updateOrder(shopId, req.params.orderId, req.body);
  res.json(order);
}));

router.delete('/:orderId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  await orderService.deleteOrder(shopId, req.params.orderId);
  res.json({ message: 'Order deleted' });
}));

router.post('/:orderId/delivery-requests', asyncHandler(async (req, res) => {
  const delivery = await deliveryService.createDeliveryRequest({
    shopId: req.tenantShopId, orderId: req.params.orderId,
    pickup_address: req.body.pickup_address, delivery_address: req.body.delivery_address,
    notes: req.body.notes,
  });
  res.status(201).json(delivery);
}));

router.post('/:orderId/payments', asyncHandler(async (req, res) => {
  const payment = await paymentService.createManualPayment({
    shopId: req.tenantShopId, orderId: req.params.orderId,
    amount: req.body.amount, currency: req.body.currency, method: req.body.method,
  });
  res.status(201).json(payment);
}));

module.exports = router;
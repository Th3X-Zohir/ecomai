const express = require('express');
const { authRequired, requireRoles, resolveTenant } = require('../middleware/auth');
const { requireTenantContext } = require('../middleware/tenant');
const { asyncHandler } = require('../middleware/async-handler');
const { validateBody } = require('../middleware/validate');
const invoiceService = require('../services/invoices');

const router = express.Router();

// All routes require auth + tenant (except super_admin cross-shop)
router.use(authRequired, requireRoles(['super_admin', 'shop_admin', 'shop_user']), resolveTenant, requireTenantContext);

// List invoices (super_admin can see all via ?all=true)
router.get('/', asyncHandler(async (req, res) => {
  const isSuperAdmin = req.auth.role === 'super_admin';
  const opts = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 50,
    status: req.query.status,
    search: req.query.search,
  };
  if (isSuperAdmin && req.query.all === 'true') {
    const result = await invoiceService.listAllInvoices(opts);
    return res.json(result);
  }
  const result = await invoiceService.listInvoices(req.tenantShopId, opts);
  res.json(result);
}));

// Get single invoice
router.get('/:invoiceId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const invoice = await invoiceService.getInvoice(shopId, req.params.invoiceId);
  res.json(invoice);
}));

// Create invoice from scratch
router.post('/', validateBody({
  items: { required: true, type: 'array' },
}), asyncHandler(async (req, res) => {
  const invoice = await invoiceService.createInvoice({
    shopId: req.tenantShopId,
    orderId: req.body.order_id,
    customerId: req.body.customer_id,
    items: req.body.items,
    dueDate: req.body.due_date,
    notes: req.body.notes,
    footerText: req.body.footer_text,
    paymentTerms: req.body.payment_terms,
    currency: req.body.currency,
    billingAddress: req.body.billing_address,
    shippingAddress: req.body.shipping_address,
    customerEmail: req.body.customer_email,
    customerName: req.body.customer_name,
    customerPhone: req.body.customer_phone,
    discountAmount: req.body.discount_amount,
    shippingAmount: req.body.shipping_amount,
    taxAmount: req.body.tax_amount,
    createdBy: req.auth.sub,
  });
  res.status(201).json(invoice);
}));

// Generate invoice from an order
router.post('/from-order/:orderId', asyncHandler(async (req, res) => {
  const invoice = await invoiceService.generateFromOrder(req.tenantShopId, req.params.orderId, {
    createdBy: req.auth.sub,
    dueDate: req.body.due_date,
    notes: req.body.notes,
    footerText: req.body.footer_text,
    paymentTerms: req.body.payment_terms,
  });
  res.status(201).json(invoice);
}));

// Update invoice (general)
router.patch('/:invoiceId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const invoice = await invoiceService.updateInvoice(shopId, req.params.invoiceId, req.body);
  res.json(invoice);
}));

// Update invoice status
router.patch('/:invoiceId/status', validateBody({
  status: { required: true, type: 'string', oneOf: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'] },
}), asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const invoice = await invoiceService.updateStatus(shopId, req.params.invoiceId, req.body.status);
  res.json(invoice);
}));

// Record a payment against an invoice
router.post('/:invoiceId/record-payment', validateBody({
  amount: { required: true, type: 'number', min: 0.01 },
}), asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  const invoice = await invoiceService.recordPayment(shopId, req.params.invoiceId, req.body.amount);
  res.json(invoice);
}));

// Delete invoice (draft/cancelled only)
router.delete('/:invoiceId', asyncHandler(async (req, res) => {
  const shopId = req.auth.role === 'super_admin' ? null : req.tenantShopId;
  await invoiceService.deleteInvoice(shopId, req.params.invoiceId);
  res.json({ message: 'Invoice deleted' });
}));

module.exports = router;

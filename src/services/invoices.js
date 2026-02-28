const db = require('../db');
const invoiceRepo = require('../repositories/invoices');
const orderRepo = require('../repositories/orders');
const customerRepo = require('../repositories/customers');
const { DomainError } = require('../errors/domain-error');

const STATUSES = ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'];

const TRANSITIONS = {
  draft:          ['sent', 'cancelled'],
  sent:           ['paid', 'partially_paid', 'overdue', 'cancelled'],
  partially_paid: ['paid', 'overdue', 'cancelled'],
  overdue:        ['paid', 'partially_paid', 'cancelled'],
  paid:           ['refunded'],
  cancelled:      [],
  refunded:       [],
};

function validateTransition(current, next) {
  const allowed = TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new DomainError('INVALID_TRANSITION', `Cannot transition invoice from '${current}' to '${next}'. Allowed: ${allowed.join(', ') || 'none'}`, 400);
  }
}

function computeTotals(items) {
  let subtotal = 0;
  for (const it of items) {
    const lt = Number(it.quantity) * Number(it.unit_price);
    it.line_total = Number(lt.toFixed(2));
    subtotal += it.line_total;
  }
  return Number(subtotal.toFixed(2));
}

async function createInvoice({ shopId, orderId, customerId, items, dueDate, notes, footerText, paymentTerms, currency, billingAddress, shippingAddress, customerEmail, customerName, customerPhone, discountAmount, shippingAmount, taxAmount, createdBy }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new DomainError('VALIDATION_ERROR', 'Invoice must have at least one item', 400);
  }
  for (const it of items) {
    if (!it.description || it.quantity == null || it.unit_price == null) {
      throw new DomainError('VALIDATION_ERROR', 'Each item needs description, quantity and unit_price', 400);
    }
  }

  const subtotal = computeTotals(items);
  const tax = Number(taxAmount || 0);
  const discount = Number(discountAmount || 0);
  const shipping = Number(shippingAmount || 0);
  const total = Number((subtotal + tax + shipping - discount).toFixed(2));

  const invoiceNumber = await invoiceRepo.generateInvoiceNumber(shopId);

  return db.withTransaction(async (client) => {
    const invoice = await invoiceRepo.create({
      shop_id: shopId,
      order_id: orderId || null,
      customer_id: customerId || null,
      invoice_number: invoiceNumber,
      status: 'draft',
      issue_date: new Date(),
      due_date: dueDate || null,
      subtotal,
      tax_amount: tax,
      discount_amount: discount,
      shipping_amount: shipping,
      total_amount: total,
      amount_paid: 0,
      currency: currency || 'BDT',
      customer_email: customerEmail || null,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      billing_address: billingAddress || null,
      shipping_address: shippingAddress || null,
      items,
      notes: notes || null,
      footer_text: footerText || null,
      payment_terms: paymentTerms || null,
      created_by: createdBy || null,
    }, client);

    const savedItems = await invoiceRepo.createItems(invoice.id, shopId, items, client);
    return { ...invoice, line_items: savedItems };
  });
}

async function generateFromOrder(shopId, orderId, { createdBy, dueDate, notes, footerText, paymentTerms } = {}) {
  const order = await orderRepo.findById(orderId);
  if (!order || (shopId && order.shop_id !== shopId)) {
    throw new DomainError('ORDER_NOT_FOUND', 'Order not found', 404);
  }

  // Check if invoice already exists
  const existing = await invoiceRepo.findByOrderId(orderId, shopId);
  if (existing.length > 0) {
    throw new DomainError('INVOICE_EXISTS', 'An invoice already exists for this order', 409);
  }

  const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

  // Get customer info
  let customer = null;
  if (order.customer_id) {
    customer = await customerRepo.findByIdAndShop(order.customer_id, shopId);
  }

  const invoiceItems = itemsRes.rows.map(oi => ({
    product_id: oi.product_id || null,
    description: oi.item_name || 'Product',
    quantity: oi.quantity,
    unit_price: Number(oi.unit_price),
    tax_rate: 0,
    line_total: Number(oi.line_total),
  }));

  return createInvoice({
    shopId,
    orderId,
    customerId: order.customer_id,
    items: invoiceItems,
    dueDate: dueDate || null,
    notes: notes || null,
    footerText: footerText || null,
    paymentTerms: paymentTerms || 'Due on receipt',
    currency: 'BDT',
    customerEmail: order.customer_email || customer?.email,
    customerName: customer?.full_name || null,
    customerPhone: customer?.phone || null,
    shippingAddress: order.shipping_address || null,
    discountAmount: order.discount_amount || 0,
    shippingAmount: order.shipping_amount || 0,
    taxAmount: order.tax_amount || 0,
    createdBy,
  });
}

async function getInvoice(shopId, invoiceId) {
  const invoice = await invoiceRepo.findById(invoiceId, shopId);
  if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found', 404);
  const lineItems = await invoiceRepo.listItemsByInvoice(invoiceId);
  return { ...invoice, line_items: lineItems };
}

async function listInvoices(shopId, opts) {
  return invoiceRepo.listByShop(shopId, opts);
}

async function listAllInvoices(opts) {
  return invoiceRepo.listAll(opts);
}

async function listCustomerInvoices(customerId, opts) {
  return invoiceRepo.listByCustomer(customerId, opts);
}

async function updateInvoice(shopId, invoiceId, patch) {
  const invoice = await invoiceRepo.findById(invoiceId, shopId);
  if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found', 404);

  // Only draft invoices can be freely edited
  if (invoice.status !== 'draft' && patch.items) {
    throw new DomainError('INVOICE_LOCKED', 'Cannot edit items on a non-draft invoice', 400);
  }

  // Recalculate totals if items changed
  if (patch.items && Array.isArray(patch.items)) {
    const subtotal = computeTotals(patch.items);
    patch.subtotal = subtotal;
    patch.total_amount = Number((subtotal + Number(patch.tax_amount || invoice.tax_amount || 0) + Number(patch.shipping_amount || invoice.shipping_amount || 0) - Number(patch.discount_amount || invoice.discount_amount || 0)).toFixed(2));
  }

  const updated = await invoiceRepo.update(invoiceId, shopId, patch);
  if (!updated) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found', 404);
  return updated;
}

async function updateStatus(shopId, invoiceId, newStatus) {
  if (!STATUSES.includes(newStatus)) {
    throw new DomainError('INVALID_STATUS', `Invalid status: ${newStatus}`, 400);
  }
  const invoice = await invoiceRepo.findById(invoiceId, shopId);
  if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found', 404);

  validateTransition(invoice.status, newStatus);

  const patch = { status: newStatus };
  if (newStatus === 'sent' && !invoice.sent_at) patch.sent_at = new Date();
  if (newStatus === 'paid') {
    patch.paid_at = new Date();
    patch.amount_paid = invoice.total_amount;
  }

  return invoiceRepo.update(invoiceId, shopId, patch);
}

async function recordPayment(shopId, invoiceId, amount) {
  const invoice = await invoiceRepo.findById(invoiceId, shopId);
  if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found', 404);

  if (['cancelled', 'refunded'].includes(invoice.status)) {
    throw new DomainError('INVOICE_CLOSED', 'Cannot record payment on a cancelled/refunded invoice', 400);
  }

  const newPaid = Number((Number(invoice.amount_paid) + Number(amount)).toFixed(2));
  const total = Number(invoice.total_amount);
  const patch = { amount_paid: newPaid };

  if (newPaid >= total) {
    patch.status = 'paid';
    patch.paid_at = new Date();
    patch.amount_paid = total;
  } else if (newPaid > 0) {
    patch.status = 'partially_paid';
  }

  return invoiceRepo.update(invoiceId, shopId, patch);
}

async function deleteInvoice(shopId, invoiceId) {
  const invoice = await invoiceRepo.findById(invoiceId, shopId);
  if (!invoice) throw new DomainError('INVOICE_NOT_FOUND', 'Invoice not found', 404);
  if (!['draft', 'cancelled'].includes(invoice.status)) {
    throw new DomainError('CANNOT_DELETE', 'Only draft or cancelled invoices can be deleted', 400);
  }
  return invoiceRepo.delete(invoiceId, shopId);
}

module.exports = {
  createInvoice,
  generateFromOrder,
  getInvoice,
  listInvoices,
  listAllInvoices,
  listCustomerInvoices,
  updateInvoice,
  updateStatus,
  recordPayment,
  deleteInvoice,
};

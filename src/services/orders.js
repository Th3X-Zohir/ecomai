const db = require('../db');
const orderRepo = require('../repositories/orders');
const productRepo = require('../repositories/products');
const variantRepo = require('../repositories/product-variants');
const inventoryRepo = require('../repositories/inventory-movements');
const couponService = require('../services/coupons');
const engine = require('./subscription-engine');
const analyticsService = require('./analytics');
const { DomainError } = require('../errors/domain-error');

function calculateTotals(items, discountAmount = 0) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.line_total), 0);
  const discount = Math.min(discountAmount, subtotal);
  return { subtotal, tax_amount: 0, shipping_amount: 0, discount_amount: discount, total_amount: Number((subtotal - discount).toFixed(2)) };
}

async function ensureOrderExists(shopId, orderId) {
  const order = await orderRepo.findById(orderId);
  if (!order || (shopId && order.shop_id !== shopId)) {
    throw new DomainError('ORDER_NOT_FOUND', 'Order not found', 404);
  }
  return order;
}

async function getOrder(shopId, orderId) {
  const order = await ensureOrderExists(shopId, orderId);
  const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
  return { ...order, items: itemsRes.rows };
}

async function updateOrderStatus(shopId, orderId, status) {
  const order = await ensureOrderExists(shopId, orderId);
  const VALID = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
  if (!VALID.includes(status)) {
    throw new DomainError('INVALID_STATUS', `status must be one of: ${VALID.join(', ')}`, 400);
  }

  // Order state machine — enforce valid transitions
  const TRANSITIONS = {
    pending:    ['confirmed', 'cancelled'],
    confirmed:  ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped:    ['delivered'],
    delivered:  ['refunded'],
    cancelled:  [],
    refunded:   [],
  };
  const allowed = TRANSITIONS[order.status] || [];
  if (!allowed.includes(status)) {
    throw new DomainError('INVALID_TRANSITION', `Cannot transition from '${order.status}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`, 400);
  }

  // Refresh customer metrics when order is delivered (cash collection for COD, delivery confirmation for online)
  if (status === 'delivered' && order.customer_id) {
    try {
      await analyticsService.refreshCustomerMetrics(order.customer_id, shopId);
    } catch (_e) { /* non-critical */ }
  }

  // If cancelling, restore inventory + decrement order usage
  if (status === 'cancelled') {
    const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    const result = await db.withTransaction(async (client) => {
      for (const item of itemsRes.rows) {
        if (item.variant_id) {
          await variantRepo.incrementInventory(item.variant_id, item.quantity, client);
          await inventoryRepo.createMovement({
            shop_id: shopId, variant_id: item.variant_id, product_id: item.product_id,
            type: 'return', quantity: item.quantity,
            reason: `Order ${orderId} cancelled`, reference_id: orderId,
          }, client);
        } else if (item.product_id) {
          await productRepo.incrementStock(item.product_id, shopId, item.quantity, client);
          await inventoryRepo.createMovement({
            shop_id: shopId, variant_id: null, product_id: item.product_id,
            type: 'return', quantity: item.quantity,
            reason: `Order ${orderId} cancelled`, reference_id: orderId,
          }, client);
        }
      }
      return orderRepo.updateOrder(orderId, shopId, { status }, client);
    });

    // Decrement monthly order usage counter
    try { await engine.incrementUsage(shopId, 'orders_monthly', -1); } catch (_e) { /* non-blocking */ }

    // Cancel any pending affiliate referral for this cancelled order (non-blocking)
    try {
      const affiliateRepo = require('../repositories/affiliates');
      await affiliateRepo.cancelReferralByOrderId(orderId);
    } catch (_e) { /* non-critical */ }

    return result;
  }

  return orderRepo.updateOrder(orderId, shopId, { status });
}

async function createOrder({ shopId, customer_email, customer_id, items, shipping_address, notes, coupon_code }) {
  if (!customer_email || !Array.isArray(items) || items.length === 0) {
    throw new DomainError('VALIDATION_ERROR', 'customer_email and non-empty items are required', 400);
  }

  // Pre-validate items have correct shape before entering transaction
  for (const item of items) {
    if (!item.product_id && !item.variant_id) {
      throw new DomainError('VALIDATION_ERROR', 'Each item must have product_id or variant_id', 400);
    }
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 1) {
      throw new DomainError('VALIDATION_ERROR', 'Each item must have a valid quantity >= 1', 400);
    }
  }

  // Use transaction for the entire flow: price lookup + order + items + inventory
  // This prevents TOCTOU issues (price changes between lookup and order creation)
  const result = await db.withTransaction(async (client) => {
    // Resolve items inside transaction for consistent pricing
    const resolvedItems = [];
    for (const item of items) {
      let unitPrice, itemName, variantId = null;

      if (item.variant_id) {
        // Lock variant row to prevent concurrent price changes
        const vRes = await client.query(
          'SELECT * FROM product_variants WHERE id = $1 FOR UPDATE', [item.variant_id]
        );
        const variant = vRes.rows[0];
        if (!variant || (variant.shop_id && variant.shop_id !== shopId)) {
          throw new DomainError('VARIANT_NOT_FOUND', `Unknown variant: ${item.variant_id}`, 400);
        }
        unitPrice = Number(variant.price);
        itemName = variant.title;
        variantId = variant.id;
      } else if (item.product_id) {
        // Lock product row to prevent concurrent price changes
        const pRes = await client.query(
          'SELECT * FROM products WHERE id = $1 AND shop_id = $2 FOR UPDATE', [item.product_id, shopId]
        );
        const product = pRes.rows[0];
        if (!product) throw new DomainError('PRODUCT_NOT_FOUND', `Unknown product: ${item.product_id}`, 400);
        unitPrice = Number(product.base_price);
        itemName = product.name;
      }

      const quantity = Math.max(1, Math.floor(Number(item.quantity || 1)));
      resolvedItems.push({
        product_id: item.product_id || null,
        variant_id: variantId,
        item_name: itemName,
        quantity,
        unit_price: unitPrice,
        line_total: Number((quantity * unitPrice).toFixed(2)),
      });
    }

    const tempTotals = calculateTotals(resolvedItems);

    // Apply coupon if provided
    let couponResult = null;
    let discountAmount = 0;
    if (coupon_code) {
      couponResult = await couponService.validateCoupon(shopId, coupon_code, tempTotals.subtotal);
      discountAmount = couponResult.discount;
    }

    const totals = calculateTotals(resolvedItems, discountAmount);

    const order = await orderRepo.createOrder({
      shop_id: shopId,
      customer_email,
      customer_id: customer_id || null,
      status: 'pending',
      ...totals,
      shipping_address: shipping_address || null,
      notes: notes || null,
    }, client);

    const savedItems = [];
    for (const ri of resolvedItems) {
      const itemRows = await orderRepo.addOrderItems([{
        shop_id: shopId,
        order_id: order.id,
        ...ri,
      }], client);
      savedItems.push(...itemRows);

      // Decrement inventory for variants
      if (ri.variant_id) {
        const updated = await variantRepo.decrementInventory(ri.variant_id, ri.quantity, client);
        if (!updated) throw new DomainError('INSUFFICIENT_STOCK', `Insufficient stock for variant: ${ri.item_name}`, 400);
        await inventoryRepo.createMovement({
          shop_id: shopId,
          variant_id: ri.variant_id,
          product_id: ri.product_id,
          type: 'sale',
          quantity: -ri.quantity,
          reason: `Order ${order.id}`,
          reference_id: order.id,
        }, client);
      } else if (ri.product_id) {
        // Decrement stock for non-variant products
        const updated = await productRepo.decrementStock(ri.product_id, shopId, ri.quantity, client);
        if (!updated) throw new DomainError('INSUFFICIENT_STOCK', `Insufficient stock for product: ${ri.item_name}`, 400);
        await inventoryRepo.createMovement({
          shop_id: shopId,
          variant_id: null,
          product_id: ri.product_id,
          type: 'sale',
          quantity: -ri.quantity,
          reason: `Order ${order.id}`,
          reference_id: order.id,
        }, client);
      }
    }

    // Increment coupon usage if coupon was applied
    if (couponResult) {
      await couponService.applyCoupon(couponResult.coupon.id, client);
    }

    return { ...order, items: savedItems, coupon: couponResult ? { code: coupon_code, discount: discountAmount } : null };
  });

  // Track monthly order usage (inside try/catch for resilience)
  try { await engine.incrementUsage(shopId, 'orders_monthly', 1); } catch (_e) { /* non-blocking */ }

  return result;
}

async function listOrdersByShop(shopId, opts) {
  return orderRepo.listByShop(shopId, opts);
}

async function updateOrder(shopId, orderId, patch) {
  await ensureOrderExists(shopId, orderId);
  // Only allow safe fields
  const safePatch = {};
  const ALLOWED = ['notes', 'shipping_address', 'payment_status'];
  for (const k of ALLOWED) {
    if (patch[k] !== undefined) safePatch[k] = patch[k];
  }
  return orderRepo.updateOrder(orderId, shopId, safePatch);
}

async function deleteOrder(shopId, orderId) {
  const order = await ensureOrderExists(shopId, orderId);
  if (!['pending', 'cancelled'].includes(order.status)) {
    throw new DomainError('INVALID_STATE', 'can only delete pending or cancelled orders', 400);
  }
  return orderRepo.deleteOrder(orderId);
}

async function listOrdersByCustomer(customerId, opts) {
  return orderRepo.listByCustomer(customerId, opts);
}

module.exports = { createOrder, listOrdersByShop, listOrdersByCustomer, ensureOrderExists, getOrder, updateOrderStatus, updateOrder, deleteOrder };
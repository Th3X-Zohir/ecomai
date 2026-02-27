const db = require('../db');
const orderRepo = require('../repositories/orders');
const productRepo = require('../repositories/products');
const variantRepo = require('../repositories/product-variants');
const inventoryRepo = require('../repositories/inventory-movements');
const { DomainError } = require('../errors/domain-error');

function calculateTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.line_total), 0);
  return { subtotal, tax_amount: 0, shipping_amount: 0, discount_amount: 0, total_amount: subtotal };
}

async function ensureOrderExists(shopId, orderId) {
  const order = await orderRepo.findById(orderId);
  if (!order || order.shop_id !== shopId) {
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
  await ensureOrderExists(shopId, orderId);
  const VALID = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!VALID.includes(status)) {
    throw new DomainError('INVALID_STATUS', `status must be one of: ${VALID.join(', ')}`, 400);
  }
  return orderRepo.updateOrder(orderId, shopId, { status });
}

async function createOrder({ shopId, customer_email, customer_id, items, shipping_address }) {
  if (!customer_email || !Array.isArray(items) || items.length === 0) {
    throw new DomainError('VALIDATION_ERROR', 'customer_email and non-empty items are required', 400);
  }

  // Resolve items: look up products/variants for pricing
  const resolvedItems = [];
  for (const item of items) {
    let unitPrice, itemName, variantId = null;

    if (item.variant_id) {
      const variant = await variantRepo.findByIdAndShop(item.variant_id, shopId);
      if (!variant) throw new DomainError('VARIANT_NOT_FOUND', `Unknown variant: ${item.variant_id}`, 400);
      unitPrice = Number(variant.price);
      itemName = variant.title;
      variantId = variant.id;
    } else if (item.product_id) {
      const product = await productRepo.findByIdAndShop(item.product_id, shopId);
      if (!product) throw new DomainError('PRODUCT_NOT_FOUND', `Unknown product: ${item.product_id}`, 400);
      unitPrice = Number(product.base_price);
      itemName = product.name;
    } else {
      throw new DomainError('VALIDATION_ERROR', 'Each item must have product_id or variant_id', 400);
    }

    const quantity = Number(item.quantity || 1);
    resolvedItems.push({
      product_id: item.product_id || null,
      variant_id: variantId,
      item_name: itemName,
      quantity,
      unit_price: unitPrice,
      line_total: Number((quantity * unitPrice).toFixed(2)),
    });
  }

  const totals = calculateTotals(resolvedItems);

  // Use transaction for order + items + inventory
  return db.withTransaction(async (client) => {
    const order = await orderRepo.createOrder({
      shop_id: shopId,
      customer_email,
      customer_id: customer_id || null,
      status: 'pending',
      ...totals,
      shipping_address: shipping_address || null,
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
        await variantRepo.decrementInventory(ri.variant_id, ri.quantity, client);
        await inventoryRepo.createMovement({
          shop_id: shopId,
          variant_id: ri.variant_id,
          product_id: ri.product_id,
          type: 'sale',
          quantity: -ri.quantity,
          reason: `Order ${order.id}`,
          reference_id: order.id,
        }, client);
      }
    }

    return { ...order, items: savedItems };
  });
}

async function listOrdersByShop(shopId, opts) {
  return orderRepo.listByShop(shopId, opts);
}

async function listOrdersByCustomer(customerId, opts) {
  return orderRepo.listByCustomer(customerId, opts);
}

module.exports = { createOrder, listOrdersByShop, listOrdersByCustomer, ensureOrderExists, getOrder, updateOrderStatus };
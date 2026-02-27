const { inventoryMovements, createId } = require('../store');

function createMovement({ shop_id, product_variant_id, order_id, movement_type, quantity_delta, note }) {
  const movement = {
    id: createId('mov'),
    shop_id,
    product_variant_id,
    order_id: order_id || null,
    movement_type,
    quantity_delta,
    note: note || null,
    created_at: new Date().toISOString(),
  };
  inventoryMovements.push(movement);
  return movement;
}

function listByShop(shopId) {
  return inventoryMovements.filter((entry) => entry.shop_id === shopId);
}

function listByVariant(shopId, variantId) {
  return inventoryMovements.filter((entry) => entry.shop_id === shopId && entry.product_variant_id === variantId);
}

module.exports = { createMovement, listByShop, listByVariant };

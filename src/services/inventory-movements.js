const movementRepo = require('../repositories/inventory-movements');

async function listMovements(shopId, opts) {
  return movementRepo.listByShop(shopId, opts);
}

async function listByVariant(variantId, opts) {
  return movementRepo.listByVariant(variantId, opts);
}

async function listByProduct(productId, opts) {
  return movementRepo.listByProduct(productId, opts);
}

async function createMovement(data) {
  return movementRepo.createMovement(data);
}

module.exports = { listMovements, listByVariant, listByProduct, createMovement };
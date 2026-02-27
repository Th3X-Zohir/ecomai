const movementRepo = require('../repositories/inventory-movements');

function listMovements(shopId, variantId) {
  if (variantId) {
    return movementRepo.listByVariant(shopId, variantId);
  }
  return movementRepo.listByShop(shopId);
}

module.exports = { listMovements };

const catReqRepo = require('../repositories/category-requests');
const categoryRepo = require('../repositories/categories');
const { DomainError } = require('../errors/domain-error');

async function listRequests(shopId, opts = {}) {
  return catReqRepo.listByShop(shopId, opts);
}

async function submitRequest({ shopId, customerId, name, reason }) {
  if (!name || name.trim().length < 2) {
    throw new DomainError('VALIDATION_ERROR', 'Category name is required (min 2 chars)', 400);
  }
  return catReqRepo.create({ shop_id: shopId, customer_id: customerId || null, name: name.trim(), reason });
}

async function approveRequest(shopId, requestId, { admin_notes, createSlug } = {}) {
  const req = await catReqRepo.findById(requestId, shopId);
  if (!req) throw new DomainError('NOT_FOUND', 'Category request not found', 404);
  if (req.status !== 'pending') throw new DomainError('INVALID_STATE', 'Request already processed', 400);

  // Auto-create the category
  const slug = createSlug || req.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const existing = await categoryRepo.findBySlug(slug, shopId);
  let category = existing;
  if (!existing) {
    category = await categoryRepo.create({ shop_id: shopId, name: req.name, slug });
  }

  await catReqRepo.updateStatus(requestId, shopId, { status: 'approved', admin_notes });
  return { request: await catReqRepo.findById(requestId, shopId), category };
}

async function rejectRequest(shopId, requestId, { admin_notes } = {}) {
  const req = await catReqRepo.findById(requestId, shopId);
  if (!req) throw new DomainError('NOT_FOUND', 'Category request not found', 404);
  if (req.status !== 'pending') throw new DomainError('INVALID_STATE', 'Request already processed', 400);
  return catReqRepo.updateStatus(requestId, shopId, { status: 'rejected', admin_notes });
}

async function countPending(shopId) {
  return catReqRepo.countPending(shopId);
}

module.exports = { listRequests, submitRequest, approveRequest, rejectRequest, countPending };

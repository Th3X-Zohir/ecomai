const categoryRepo = require('../repositories/categories');
const { DomainError } = require('../errors/domain-error');

async function listCategories(shopId, opts = {}) {
  return categoryRepo.listByShop(shopId, opts);
}

async function getCategory(shopId, categoryId) {
  const cat = await categoryRepo.findById(categoryId, shopId);
  if (!cat) throw new DomainError('CATEGORY_NOT_FOUND', 'Category not found', 404);
  return cat;
}

async function createCategory({ shopId, name, slug, description, image_url, parent_id, sort_order }) {
  if (!name || !slug) {
    throw new DomainError('VALIDATION_ERROR', 'name and slug are required', 400);
  }
  const existing = await categoryRepo.findBySlug(slug, shopId);
  if (existing) {
    throw new DomainError('DUPLICATE_SLUG', 'Category slug must be unique per shop', 409);
  }
  if (parent_id) {
    const parent = await categoryRepo.findById(parent_id, shopId);
    if (!parent) throw new DomainError('PARENT_NOT_FOUND', 'Parent category not found', 404);
  }
  return categoryRepo.create({
    shop_id: shopId, name, slug, description, image_url, parent_id, sort_order,
  });
}

async function updateCategory(shopId, categoryId, patch) {
  await getCategory(shopId, categoryId);
  if (patch.slug) {
    const existing = await categoryRepo.findBySlug(patch.slug, shopId);
    if (existing && existing.id !== categoryId) {
      throw new DomainError('DUPLICATE_SLUG', 'Category slug must be unique per shop', 409);
    }
  }
  if (patch.parent_id) {
    if (patch.parent_id === categoryId) throw new DomainError('VALIDATION_ERROR', 'Category cannot be its own parent', 400);
    const parent = await categoryRepo.findById(patch.parent_id, shopId);
    if (!parent) throw new DomainError('PARENT_NOT_FOUND', 'Parent category not found', 404);
  }
  return categoryRepo.update(categoryId, shopId, patch);
}

async function deleteCategory(shopId, categoryId) {
  await getCategory(shopId, categoryId);
  await categoryRepo.remove(categoryId, shopId);
  return { success: true };
}

async function getCategoriesWithCounts(shopId) {
  return categoryRepo.getProductCounts(shopId);
}

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory, getCategoriesWithCounts };

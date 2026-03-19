const repo = require('../repositories/admin-templates');

async function getTemplates({ activeOnly } = {}) {
  return repo.list({ activeOnly });
}

async function getTemplate(id) {
  return repo.getById(id);
}

async function createTemplate(data) {
  if (!data.template_id || !data.name) {
    throw new Error('template_id and name are required');
  }
  const existing = await repo.getByTemplateId(data.template_id);
  if (existing) throw new Error(`Template '${data.template_id}' already exists`);
  return repo.create(data);
}

async function updateTemplate(id, patch) {
  const existing = await repo.getById(id);
  if (!existing) throw new Error('Template not found');
  return repo.update(id, patch);
}

async function deleteTemplate(id) {
  const existing = await repo.getById(id);
  if (!existing) throw new Error('Template not found');
  return repo.remove(id);
}

async function getHomepageSections(opts) {
  return repo.listHomepageSections(opts);
}

async function updateHomepageSection(sectionKey, patch) {
  const existing = await repo.getHomepageSection(sectionKey);
  if (!existing) throw new Error(`Section '${sectionKey}' not found`);
  return repo.updateHomepageSection(sectionKey, patch);
}

module.exports = {
  getTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
  getHomepageSections, updateHomepageSection,
};

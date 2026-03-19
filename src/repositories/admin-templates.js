const db = require('../db');

async function list({ activeOnly = true } = {}) {
  const where = activeOnly ? 'WHERE is_active = true' : '';
  const res = await db.query(
    `SELECT * FROM admin_templates ${where} ORDER BY sort_order ASC`
  );
  return res.rows;
}

async function getById(id) {
  const res = await db.query('SELECT * FROM admin_templates WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function getByTemplateId(templateId) {
  const res = await db.query('SELECT * FROM admin_templates WHERE template_id = $1', [templateId]);
  return res.rows[0] || null;
}

async function create(data) {
  const {
    template_id, name, description, preview_url,
    default_tokens, locks, available_plans, is_active, is_featured, sort_order,
  } = data;
  const res = await db.query(
    `INSERT INTO admin_templates (template_id, name, description, preview_url, default_tokens, locks, available_plans, is_active, is_featured, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      template_id, name, description || null, preview_url || null,
      JSON.stringify(default_tokens || {}),
      JSON.stringify(locks || {}),
      available_plans || ['free', 'starter', 'growth', 'enterprise'],
      is_active !== undefined ? is_active : true,
      is_featured || false,
      sort_order || 0,
    ]
  );
  return res.rows[0];
}

async function update(id, patch) {
  const allowed = ['name', 'description', 'preview_url', 'default_tokens', 'locks',
    'available_plans', 'is_active', 'is_featured', 'sort_order'];
  const jsonCols = ['default_tokens', 'locks'];
  const sets = [];
  const params = [];
  let idx = 1;

  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(jsonCols.includes(k) ? JSON.stringify(patch[k]) : patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return getById(id);
  sets.push('updated_at = now()');
  params.push(id);

  const res = await db.query(
    `UPDATE admin_templates SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function remove(id) {
  // Soft-delete by setting is_active = false
  const res = await db.query(
    `UPDATE admin_templates SET is_active = false, updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
  return res.rows[0] || null;
}

async function incrementUsage(templateId) {
  await db.query(
    `UPDATE admin_templates SET usage_count = usage_count + 1 WHERE template_id = $1`,
    [templateId]
  );
}

async function decrementUsage(templateId) {
  await db.query(
    `UPDATE admin_templates SET usage_count = GREATEST(usage_count - 1, 0) WHERE template_id = $1`,
    [templateId]
  );
}

async function listHomepageSections({ activeOnly = true } = {}) {
  const where = activeOnly ? 'WHERE is_active = true' : '';
  const res = await db.query(
    `SELECT * FROM homepage_sections ${where} ORDER BY sort_order ASC`
  );
  return res.rows;
}

async function getHomepageSection(sectionKey) {
  const res = await db.query(
    'SELECT * FROM homepage_sections WHERE section_key = $1',
    [sectionKey]
  );
  return res.rows[0] || null;
}

async function updateHomepageSection(sectionKey, patch) {
  const allowed = ['name', 'description', 'icon', 'is_active', 'sort_order', 'schema'];
  const sets = [];
  const params = [];
  let idx = 1;

  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(k === 'schema' ? JSON.stringify(patch[k]) : patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return getHomepageSection(sectionKey);
  sets.push('updated_at = now()');
  params.push(sectionKey);

  const res = await db.query(
    `UPDATE homepage_sections SET ${sets.join(', ')} WHERE section_key = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

module.exports = {
  list, getById, getByTemplateId, create, update, remove,
  incrementUsage, decrementUsage,
  listHomepageSections, getHomepageSection, updateHomepageSection,
};

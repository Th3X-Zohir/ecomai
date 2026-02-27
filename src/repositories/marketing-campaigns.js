const db = require('../db');

async function createCampaign(data) {
  const res = await db.query(
    `INSERT INTO marketing_campaigns (shop_id, name, type, status, subject, content, audience_filter, scheduled_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [data.shop_id, data.name, data.type || 'email', data.status || 'draft',
     data.subject || null, data.content ? JSON.stringify(data.content) : '{}',
     JSON.stringify(data.audience_filter || {}),
     data.scheduled_at || null]
  );
  return res.rows[0];
}

async function findById(campaignId) {
  const res = await db.query('SELECT * FROM marketing_campaigns WHERE id = $1', [campaignId]);
  return res.rows[0] || null;
}

async function findByIdAndShop(campaignId, shopId) {
  const res = await db.query('SELECT * FROM marketing_campaigns WHERE id = $1 AND shop_id = $2', [campaignId, shopId]);
  return res.rows[0] || null;
}

async function updateCampaign(campaignId, patch) {
  const allowed = ['name', 'type', 'status', 'subject', 'content', 'audience_filter', 'scheduled_at', 'sent_at', 'performance'];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      params.push(['audience_filter', 'performance'].includes(k) ? JSON.stringify(patch[k]) : patch[k]);
      idx++;
    }
  }
  if (sets.length === 0) return findById(campaignId);
  sets.push(`updated_at = now()`);
  params.push(campaignId);
  const res = await db.query(
    `UPDATE marketing_campaigns SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function listByShop(shopId, { page = 1, limit = 50, status, type } = {}) {
  const conditions = ['shop_id = $1'];
  const params = [shopId];
  let idx = 2;
  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }
  if (type) { conditions.push(`type = $${idx}`); params.push(type); idx++; }
  const where = 'WHERE ' + conditions.join(' AND ');
  const countRes = await db.query(`SELECT COUNT(*) FROM marketing_campaigns ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM marketing_campaigns ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = { createCampaign, findById, findByIdAndShop, updateCampaign, listByShop };


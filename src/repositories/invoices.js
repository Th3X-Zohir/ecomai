const db = require('../db');

async function generateInvoiceNumber(shopId) {
  const res = await db.query(
    `SELECT COUNT(*)::int AS cnt FROM invoices WHERE shop_id = $1`,
    [shopId]
  );
  const next = (res.rows[0].cnt || 0) + 1;
  return `INV-${String(next).padStart(5, '0')}`;
}

async function create(data, client) {
  const q = client || db;
  const res = await q.query(
    `INSERT INTO invoices (
      shop_id, order_id, customer_id, invoice_number, status,
      issue_date, due_date, subtotal, tax_amount, discount_amount,
      shipping_amount, total_amount, amount_paid, currency,
      customer_email, customer_name, customer_phone,
      billing_address, shipping_address, items, notes,
      footer_text, payment_terms, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24
    ) RETURNING *`,
    [
      data.shop_id,
      data.order_id || null,
      data.customer_id || null,
      data.invoice_number,
      data.status || 'draft',
      data.issue_date || new Date(),
      data.due_date || null,
      data.subtotal || 0,
      data.tax_amount || 0,
      data.discount_amount || 0,
      data.shipping_amount || 0,
      data.total_amount || 0,
      data.amount_paid || 0,
      data.currency || 'BDT',
      data.customer_email || null,
      data.customer_name || null,
      data.customer_phone || null,
      data.billing_address ? JSON.stringify(data.billing_address) : null,
      data.shipping_address ? JSON.stringify(data.shipping_address) : null,
      JSON.stringify(data.items || []),
      data.notes || null,
      data.footer_text || null,
      data.payment_terms || null,
      data.created_by || null,
    ]
  );
  return res.rows[0];
}

async function createItems(invoiceId, shopId, items, client) {
  const q = client || db;
  const rows = [];
  for (const it of items) {
    const res = await q.query(
      `INSERT INTO invoice_items (invoice_id, shop_id, product_id, description, quantity, unit_price, tax_rate, line_total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [invoiceId, shopId, it.product_id || null, it.description, it.quantity, it.unit_price, it.tax_rate || 0, it.line_total]
    );
    rows.push(res.rows[0]);
  }
  return rows;
}

async function findById(id, shopId) {
  const conditions = ['id = $1'];
  const params = [id];
  if (shopId) { conditions.push('shop_id = $2'); params.push(shopId); }
  const res = await db.query(`SELECT * FROM invoices WHERE ${conditions.join(' AND ')}`, params);
  return res.rows[0] || null;
}

async function findByOrderId(orderId, shopId) {
  const conditions = ['order_id = $1'];
  const params = [orderId];
  if (shopId) { conditions.push('shop_id = $2'); params.push(shopId); }
  const res = await db.query(`SELECT * FROM invoices WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`, params);
  return res.rows;
}

async function listItemsByInvoice(invoiceId) {
  const res = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at', [invoiceId]);
  return res.rows;
}

async function listByShop(shopId, { page = 1, limit = 50, status, search } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (shopId) { conditions.push(`shop_id = $${idx}`); params.push(shopId); idx++; }
  if (status) { conditions.push(`status = $${idx}`); params.push(status); idx++; }
  if (search) {
    conditions.push(`(invoice_number ILIKE $${idx} OR customer_email ILIKE $${idx} OR customer_name ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRes = await db.query(`SELECT COUNT(*) FROM invoices ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM invoices ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function listByCustomer(customerId, { page = 1, limit = 20 } = {}) {
  const countRes = await db.query(`SELECT COUNT(*) FROM invoices WHERE customer_id = $1`, [customerId]);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT * FROM invoices WHERE customer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [customerId, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function listAll({ page = 1, limit = 50, status, search } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (status) { conditions.push(`i.status = $${idx}`); params.push(status); idx++; }
  if (search) {
    conditions.push(`(i.invoice_number ILIKE $${idx} OR i.customer_email ILIKE $${idx} OR i.customer_name ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const countRes = await db.query(`SELECT COUNT(*) FROM invoices i ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);
  const offset = (page - 1) * limit;
  const res = await db.query(
    `SELECT i.*, s.name AS shop_name, s.slug AS shop_slug
     FROM invoices i LEFT JOIN shops s ON s.id = i.shop_id
     ${where} ORDER BY i.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );
  return { items: res.rows, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function update(id, shopId, patch) {
  const allowed = [
    'status', 'issue_date', 'due_date', 'subtotal', 'tax_amount',
    'discount_amount', 'shipping_amount', 'total_amount', 'amount_paid',
    'currency', 'customer_email', 'customer_name', 'customer_phone',
    'billing_address', 'shipping_address', 'items', 'notes',
    'footer_text', 'payment_terms', 'sent_at', 'paid_at',
  ];
  const sets = [];
  const params = [];
  let idx = 1;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      sets.push(`${k} = $${idx}`);
      const val = ['billing_address', 'shipping_address', 'items'].includes(k) ? JSON.stringify(patch[k]) : patch[k];
      params.push(val);
      idx++;
    }
  }
  if (sets.length === 0) return findById(id, shopId);
  sets.push('updated_at = now()');
  params.push(id);
  if (shopId) {
    params.push(shopId);
    const res = await db.query(
      `UPDATE invoices SET ${sets.join(', ')} WHERE id = $${idx} AND shop_id = $${idx + 1} RETURNING *`,
      params
    );
    return res.rows[0] || null;
  }
  const res = await db.query(
    `UPDATE invoices SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

async function deleteInvoice(id, shopId) {
  if (shopId) {
    const res = await db.query('DELETE FROM invoices WHERE id = $1 AND shop_id = $2 RETURNING *', [id, shopId]);
    return res.rows[0] || null;
  }
  const res = await db.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);
  return res.rows[0] || null;
}

module.exports = {
  generateInvoiceNumber,
  create,
  createItems,
  findById,
  findByOrderId,
  listItemsByInvoice,
  listByShop,
  listByCustomer,
  listAll,
  update,
  delete: deleteInvoice,
};

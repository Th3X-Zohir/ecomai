const db = require('../db');

async function getByShop(shopId) {
  const res = await db.query('SELECT * FROM website_settings WHERE shop_id = $1', [shopId]);
  return res.rows[0] || null;
}

async function createDefault(shopId) {
  const defaults = {
    template: 'starter',
    theme: { primaryColor: '#6366f1', fontFamily: 'Inter' },
    header: { logo: null, nav: [] },
    footer: { text: '', links: [] },
    homepage: { hero: { title: 'Welcome', subtitle: '' }, sections: [] },
    customCss: '',
    customJs: '',
    seoDefaults: { title: '', description: '' },
  };
  const res = await db.query(
    `INSERT INTO website_settings (shop_id, template, theme, header, footer, homepage, custom_css, custom_js, seo_defaults)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [shopId, defaults.template, JSON.stringify(defaults.theme), JSON.stringify(defaults.header),
     JSON.stringify(defaults.footer), JSON.stringify(defaults.homepage),
     defaults.customCss, defaults.customJs, JSON.stringify(defaults.seoDefaults)]
  );
  return res.rows[0];
}

async function updateForShop(shopId, patch) {
  const allowed = ['template', 'theme', 'header', 'footer', 'homepage', 'custom_css', 'custom_js', 'seo_defaults',
                    'social_links', 'business_info', 'store_policies', 'announcement', 'trust_badges'];
  const jsonCols = ['theme', 'header', 'footer', 'homepage', 'seo_defaults', 'social_links', 'business_info', 'store_policies', 'announcement', 'trust_badges'];
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
  if (sets.length === 0) return getByShop(shopId);
  sets.push(`updated_at = now()`);
  params.push(shopId);
  const res = await db.query(
    `UPDATE website_settings SET ${sets.join(', ')} WHERE shop_id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

module.exports = { getByShop, createDefault, updateForShop };


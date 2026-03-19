const db = require('../db');

async function getByShop(shopId) {
  if (shopId) {
    const res = await db.query('SELECT * FROM website_settings WHERE shop_id = $1', [shopId]);
    return res.rows[0] || null;
  }
  // Super admin with no shop — return first available settings
  const res = await db.query('SELECT * FROM website_settings ORDER BY created_at LIMIT 1');
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
    currencyConfig: { symbol: '৳', code: 'BDT', position: 'before', decimals: 2 },
  };
  const res = await db.query(
    `INSERT INTO website_settings (shop_id, template, theme, header, footer, homepage, custom_css, custom_js, seo_defaults, currency_config)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [shopId, defaults.template, JSON.stringify(defaults.theme), JSON.stringify(defaults.header),
     JSON.stringify(defaults.footer), JSON.stringify(defaults.homepage),
     defaults.customCss, defaults.customJs, JSON.stringify(defaults.seoDefaults),
     JSON.stringify(defaults.currencyConfig)]
  );
  return res.rows[0];
}

async function updateForShop(shopId, patch) {
  const allowed = ['template', 'theme', 'header', 'footer', 'homepage', 'custom_css', 'custom_js', 'seo_defaults',
                    'social_links', 'business_info', 'store_policies', 'announcement', 'trust_badges',
                    'currency_config', 'store_config', 'analytics', 'popup_config', 'countdown'];
  const jsonCols = ['theme', 'header', 'footer', 'homepage', 'seo_defaults', 'social_links', 'business_info',
                    'store_policies', 'announcement', 'trust_badges',
                    'currency_config', 'store_config', 'analytics', 'popup_config', 'countdown'];
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

// Save as draft — merges patch into draft_settings JSONB
async function saveDraft(shopId, patch) {
  const existing = await getByShop(shopId);
  if (!existing) throw new Error('No settings found for shop');

  // Get current merged settings (published + any existing draft)
  const currentDraft = existing.draft_settings || {};
  const mergedDraft = { ...currentDraft, ...patch };

  const res = await db.query(
    `UPDATE website_settings
     SET draft_settings = $1, settings_status = 'draft', updated_at = now()
     WHERE shop_id = $2
     RETURNING *`,
    [JSON.stringify(mergedDraft), shopId]
  );
  return res.rows[0] || null;
}

// Update draft settings (when status is already 'draft')
async function updateDraftSettings(shopId, patch) {
  const existing = await getByShop(shopId);
  if (!existing) throw new Error('No settings found');

  const currentDraft = existing.draft_settings || {};
  const mergedDraft = { ...currentDraft, ...patch };

  const res = await db.query(
    `UPDATE website_settings
     SET draft_settings = $1, updated_at = now()
     WHERE shop_id = $2
     RETURNING *`,
    [JSON.stringify(mergedDraft), shopId]
  );
  return res.rows[0] || null;
}

// Publish draft — apply draft_settings to main columns, clear draft
async function publishDraft(shopId, publishedData) {
  const jsonCols = ['theme', 'header', 'footer', 'homepage', 'seo_defaults', 'social_links', 'business_info',
                    'store_policies', 'announcement', 'trust_badges',
                    'currency_config', 'store_config', 'analytics', 'popup_config', 'countdown'];

  const sets = ['draft_settings = NULL', "settings_status = 'published'", 'published_at = now()', 'updated_at = now()'];
  const params = [];
  let idx = 1;

  for (const k of Object.keys(publishedData)) {
    if (jsonCols.includes(k) && publishedData[k] !== undefined) {
      sets.push(`${k} = $${idx}`);
      params.push(JSON.stringify(publishedData[k]));
      idx++;
    } else if (k === 'template' && publishedData[k] !== undefined) {
      sets.push(`template = $${idx}`);
      params.push(publishedData[k]);
      idx++;
    } else if (k === 'custom_css' && publishedData[k] !== undefined) {
      sets.push(`custom_css = $${idx}`);
      params.push(publishedData[k]);
      idx++;
    }
  }

  params.push(shopId);
  const res = await db.query(
    `UPDATE website_settings SET ${sets.join(', ')} WHERE shop_id = $${idx} RETURNING *`,
    params
  );
  return res.rows[0] || null;
}

// Restore from published_settings snapshot (rollback)
async function restorePublished(shopId) {
  const res = await db.query(
    `UPDATE website_settings
     SET settings_status = 'published',
         draft_settings = NULL,
         theme = COALESCE(published_settings->'theme', theme),
         header = COALESCE(published_settings->'header', header),
         footer = COALESCE(published_settings->'footer', footer),
         homepage = COALESCE(published_settings->'homepage', homepage),
         template = COALESCE(published_settings->'template', template),
         updated_at = now()
     WHERE shop_id = $1
     RETURNING *`,
    [shopId]
  );
  return res.rows[0] || null;
}

// Clear draft and revert to published
async function clearDraft(shopId) {
  const res = await db.query(
    `UPDATE website_settings
     SET draft_settings = NULL, settings_status = 'published', updated_at = now()
     WHERE shop_id = $1
     RETURNING *`,
    [shopId]
  );
  return res.rows[0] || null;
}

module.exports = {
  getByShop,
  createDefault,
  updateForShop,
  saveDraft,
  updateDraftSettings,
  publishDraft,
  restorePublished,
  clearDraft,
};


-- Migration: Website Settings v2
-- Adds: draft/publish workflow, section content editors, section order/visibility

-- 1. Draft/Publish workflow columns
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS settings_status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS draft_settings JSONB; -- stores unPUBLISHED draft
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 2. Section content editor columns (FAQ, Testimonials, How It Works, Brand Values)
-- These are stored in homepage JSONB but we add explicit columns for structured access
-- homepage column already accepts full JSONB, so content flows through existing channels

-- 3. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_website_settings_status ON website_settings(settings_status);
CREATE INDEX IF NOT EXISTS idx_website_settings_shop_status ON website_settings(shop_id, settings_status);

-- 4. Section order and visibility defaults (populate from existing data if empty)
-- This is handled by the service layer: first load from homepage JSONB, then store separately

-- 5. Homepage sections reference table (for super admin template management)
CREATE TABLE IF NOT EXISTS homepage_sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key   TEXT NOT NULL UNIQUE,           -- e.g. 'faq', 'testimonials', 'hero'
  name          TEXT NOT NULL,                   -- Display name
  description   TEXT,                           -- What this section does
  icon          TEXT,                           -- Emoji or icon identifier
  is_core       BOOLEAN NOT NULL DEFAULT false, -- Core = cannot be removed
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  schema        JSONB,                           -- Field schema for the section editor
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Seed default homepage sections
INSERT INTO homepage_sections (section_key, name, description, icon, is_core, sort_order, schema) VALUES
  ('hero', 'Hero Banner', 'Main banner with headline, image, and CTA', '🖼️', true, 1,
   '{"type":"object","fields":["headline","subtitle","cta","cta_link","image_url","overlay_opacity","overlay_color"]}'::jsonb),
  ('brand_promise', 'Brand Promise Bar', 'Value proposition bar (shipping, payment, returns, support)', '✨', true, 2, NULL),
  ('social_proof', 'Social Proof', 'Animated counters showing customers, orders, ratings', '📊', false, 3, NULL),
  ('categories', 'Category Grid', 'Shop by category links', '📁', false, 4, NULL),
  ('promo_banner', 'Promo Banners', 'Promotional banner strips', '🎯', false, 5, NULL),
  ('featured', 'Featured Products', 'Highlighted products grid', '⭐', true, 6,
   '{"type":"object","fields":["title","subtitle","product_ids"]}'::jsonb),
  ('how_it_works', 'How It Works', 'Step-by-step process explanation', '📋', false, 7,
   '{"type":"array","item_schema":{"type":"object","fields":["step","icon","title","description"]}}'::jsonb),
  ('brand_values', 'Brand Values', 'Core brand values with guarantee section', '🏆', false, 8,
   '{"type":"array","item_schema":{"type":"object","fields":["emoji","text"]}}'::jsonb),
  ('trust_badges', 'Trust Badges', 'Trust badges (secure checkout, warranty, etc.)', '🛡️', true, 9, NULL),
  ('testimonials', 'Testimonials', 'Customer reviews and testimonials', '💬', false, 10,
   '{"type":"array","item_schema":{"type":"object","fields":["name","text","rating","image_url"]}}'::jsonb),
  ('guarantee', 'Satisfaction Guarantee', 'Money-back guarantee section', '✅', false, 11, NULL),
  ('faq', 'FAQ', 'Frequently asked questions accordion', '❓', false, 12,
   '{"type":"array","item_schema":{"type":"object","fields":["q","a"]}}'::jsonb),
  ('credibility', 'Credibility Bar', 'Trust indicators and ratings', '⭐', false, 13, NULL),
  ('newsletter', 'Newsletter Signup', 'Email subscription section', '✉️', true, 14,
   '{"type":"object","fields":["headline","subtitle"]}'::jsonb),
  ('final_cta', 'Final CTA', 'Last call-to-action before footer', '🎯', false, 15, NULL)
ON CONFLICT (section_key) DO NOTHING;

-- 7. Admin templates table (for super admin template management)
CREATE TABLE IF NOT EXISTS admin_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      TEXT NOT NULL UNIQUE,           -- matches templates.js id (e.g. 'classic')
  name             TEXT NOT NULL,
  description      TEXT,
  preview_url      TEXT,
  default_tokens   JSONB NOT NULL DEFAULT '{}',
  locks            JSONB NOT NULL DEFAULT '{}',    -- which elements are locked
  available_plans  TEXT[] NOT NULL DEFAULT '{free,starter,growth,enterprise}',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  usage_count      INTEGER NOT NULL DEFAULT 0,     -- how many shops use this template
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Seed admin templates from existing templates.js data
INSERT INTO admin_templates (template_id, name, description, is_active, sort_order, usage_count) VALUES
  ('classic', 'Classic Store', 'Clean, traditional e-commerce layout with blue accents', true, 1, 0),
  ('modern_luxe', 'Modern Luxe', 'Elegant dark theme with gold accents for premium brands', true, 2, 0),
  ('fresh_organic', 'Fresh & Organic', 'Nature-inspired green palette for food, health, eco brands', true, 3, 0),
  ('bold_pop', 'Bold & Pop', 'Vibrant colorful design for trendy brands', true, 4, 0),
  ('minimal_mono', 'Minimal Mono', 'Ultra-clean monochrome design', true, 5, 0),
  ('artisan_craft', 'Artisan Craft', 'Warm handmade aesthetic with earthy tones', true, 6, 0),
  ('tech_neon', 'Tech Neon', 'Dark futuristic theme with neon accents', true, 7, 0),
  ('soft_pastel', 'Soft Pastel', 'Gentle pastels for baby, beauty, fashion brands', true, 8, 0)
ON CONFLICT (template_id) DO NOTHING;

-- 9. Index
CREATE INDEX IF NOT EXISTS idx_admin_templates_active ON admin_templates(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_homepage_sections_active ON homepage_sections(is_active, sort_order);

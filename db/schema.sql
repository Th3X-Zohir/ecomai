-- ============================================================
-- Ecomai SaaS E-Commerce Platform — Full PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Subscription Plans ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly  NUMERIC(10,2) NOT NULL DEFAULT 0,
  product_limit INT NOT NULL DEFAULT 10,
  order_limit   INT NOT NULL DEFAULT 50,
  features      JSONB NOT NULL DEFAULT '[]',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Shops ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shops (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  industry              TEXT,
  subscription_plan     TEXT NOT NULL DEFAULT 'free',
  logo_url              TEXT,
  sslcommerz_store_id   TEXT,
  sslcommerz_store_pass TEXT,
  owner_user_id         UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Users (shop admins, staff, drivers, super_admin) ───────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID REFERENCES shops(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT,
  phone         TEXT,
  role          TEXT NOT NULL CHECK (role IN ('super_admin','shop_admin','shop_user','delivery_agent')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shops DROP CONSTRAINT IF EXISTS fk_shops_owner;
ALTER TABLE shops ADD CONSTRAINT fk_shops_owner
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
  ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- ── Customers (storefront shoppers, per-shop) ──────────────
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  password_hash TEXT,
  full_name     TEXT,
  phone         TEXT,
  is_registered BOOLEAN NOT NULL DEFAULT FALSE,
  addresses     JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, email)
);

-- ── Products ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  base_price      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
  description     TEXT,
  category        TEXT,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  image_url       TEXT,
  stock_quantity  INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shop_id, slug)
);

-- ── Product Variants ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku             TEXT,
  title           TEXT NOT NULL,
  attributes      JSONB NOT NULL DEFAULT '{}',
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  inventory_qty   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Orders ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_email   TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','pending_payment','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','pending','paid','failed','refunded')),
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_address JSONB,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Order Items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id  UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  item_name   TEXT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Payments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'BDT',
  method            TEXT NOT NULL DEFAULT 'sslcommerz',
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','cancelled','refunded')),
  gateway_tran_id   TEXT,
  gateway_response  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Refunds ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  payment_id        UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount            NUMERIC(10,2) NOT NULL,
  reason            TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  gateway_response  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Delivery Requests ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                 UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id                UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  assigned_driver_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider                TEXT NOT NULL DEFAULT 'internal',
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','picked_up','in_transit','delivered','failed','cancelled')),
  pickup_address          JSONB,
  dropoff_address         JSONB,
  location_updates        JSONB NOT NULL DEFAULT '[]',
  estimated_delivery      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Marketing Campaigns ────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'email',
  subject          TEXT,
  content          JSONB NOT NULL DEFAULT '{}',
  audience_filter  JSONB NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','completed','cancelled')),
  performance      JSONB NOT NULL DEFAULT '{}',
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Inventory Movements ────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  variant_id    UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_id    UUID REFERENCES products(id) ON DELETE SET NULL,
  type          TEXT NOT NULL CHECK (type IN ('sale','restock','adjustment','return','initial')),
  quantity      INT NOT NULL,
  reason        TEXT,
  reference_id  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Website Settings ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS website_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  template      TEXT NOT NULL DEFAULT 'starter',
  theme         JSONB NOT NULL DEFAULT '{}',
  header        JSONB NOT NULL DEFAULT '{}',
  footer        JSONB NOT NULL DEFAULT '{}',
  homepage      JSONB NOT NULL DEFAULT '{}',
  custom_css    TEXT,
  custom_js     TEXT,
  seo_defaults  JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Refresh Tokens ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Audit Log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_shop          ON users(shop_id);
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_customers_shop      ON customers(shop_id);
CREATE INDEX IF NOT EXISTS idx_customers_email     ON customers(shop_id, email);
CREATE INDEX IF NOT EXISTS idx_products_shop       ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_status     ON products(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_variants_product    ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop         ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer     ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order      ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_tran_id    ON payments(gateway_tran_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment     ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_shop       ON delivery_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_delivery_driver     ON delivery_requests(assigned_driver_user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_shop      ON marketing_campaigns(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shop      ON inventory_movements(shop_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant   ON inventory_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_website_shop        ON website_settings(shop_id);
CREATE INDEX IF NOT EXISTS idx_refresh_user        ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_hash        ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_audit_shop          ON audit_log(shop_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity        ON audit_log(entity_type, entity_id);

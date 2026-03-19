-- Migration 010: COD Reconciliation System
-- Cash-on-Delivery collection tracking, driver accountability, and shop settlements
-- COD orders: customer pays cash to driver at door. Driver must remit to shop.

BEGIN;

-- ── COD Collections ──────────────────────────────────────────────────────────
-- Records when a driver collects cash from a customer for a COD order
CREATE TABLE IF NOT EXISTS cod_collections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_request_id  UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  shop_id              UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id             UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_user_id      UUID NOT NULL REFERENCES users(id),
  collected_amount     DECIMAL(12,2) NOT NULL,
  collected_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proof_image_url     TEXT,          -- photo of receipt or collection proof
  customer_name       TEXT,
  customer_phone      TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COD Settlements ────────────────────────────────────────────────────────────
-- When a driver settles their collected COD cash with the shop
CREATE TABLE IF NOT EXISTS cod_settlements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  driver_user_id  UUID NOT NULL REFERENCES users(id),
  period_start    DATE NOT NULL,   -- settlement period (e.g. week start)
  period_end      DATE NOT NULL,   -- week end
  total_collected DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_remitted  DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_due     DECIMAL(12,2) NOT NULL DEFAULT 0,  -- amount driver owes shop
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'settled')),
  submitted_at    TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  settled_at      TIMESTAMPTZ,
  bank_reference  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COD Settlement Line Items ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cod_settlement_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id     UUID NOT NULL REFERENCES cod_settlements(id) ON DELETE CASCADE,
  collection_id     UUID NOT NULL REFERENCES cod_collections(id) ON DELETE CASCADE,
  collected_amount  DECIMAL(12,2) NOT NULL,
  UNIQUE(settlement_id, collection_id)
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cod_collections_shop ON cod_collections(shop_id);
CREATE INDEX IF NOT EXISTS idx_cod_collections_driver ON cod_collections(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_cod_collections_delivery ON cod_collections(delivery_request_id);
CREATE INDEX IF NOT EXISTS idx_cod_collections_order ON cod_collections(order_id);
CREATE INDEX IF NOT EXISTS idx_cod_collections_collected_at ON cod_collections(collected_at);
CREATE INDEX IF NOT EXISTS idx_cod_settlements_shop ON cod_settlements(shop_id);
CREATE INDEX IF NOT EXISTS idx_cod_settlements_driver ON cod_settlements(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_cod_settlements_status ON cod_settlements(status);
CREATE INDEX IF NOT EXISTS idx_cod_settlement_items_settlement ON cod_settlement_items(settlement_id);

COMMIT;

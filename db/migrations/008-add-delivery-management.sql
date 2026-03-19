-- Migration 008: Delivery Management System
-- Supports: delivery zones, charge rules, SLA configuration, shop delivery modes,
-- delivery request enhancements, failure handling, and COD collection tracking

BEGIN;

-- ── Delivery Zones ────────────────────────────────────────────────────────────
-- Areas/regions that a shop delivers to, with base charges and estimated days
CREATE TABLE IF NOT EXISTS delivery_zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,                    -- e.g. "Dhaka Metro", "Chittagong", "Outside Dhaka"
  description TEXT,
  base_charge  DECIMAL(10,2) NOT NULL DEFAULT 0,  -- base delivery charge for this zone
  min_delivery_days INTEGER DEFAULT 1,
  max_delivery_days INTEGER DEFAULT 5,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

-- Area codes within zones (for more granular control / third-party provider mapping)
CREATE TABLE IF NOT EXISTS delivery_area_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id    UUID NOT NULL REFERENCES delivery_zones(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,   -- e.g. "DHK-10", "CTG-02"
  name       TEXT NOT NULL,   -- e.g. "Uttara", "Mirpur"
  UNIQUE(zone_id, code)
);

-- ── Delivery Charge Rules ────────────────────────────────────────────────────
-- Weight-based and order-amount-based surcharge rules per zone
CREATE TABLE IF NOT EXISTS delivery_charge_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  zone_id           UUID REFERENCES delivery_zones(id) ON DELETE CASCADE,  -- NULL = applies to all zones
  name              TEXT NOT NULL,
  rule_type         TEXT NOT NULL CHECK (rule_type IN ('weight', 'order_amount', 'item_count')),
  min_value         DECIMAL(10,2) NOT NULL DEFAULT 0,   -- min weight (kg) or order amount
  max_value         DECIMAL(10,2),                      -- NULL = no upper limit
  charge            DECIMAL(10,2) NOT NULL DEFAULT 0,   -- additional charge for this bracket
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, zone_id, rule_type, min_value)
);

-- ── Delivery Settings (per-shop) ─────────────────────────────────────────────
-- Controls delivery mode, SLA defaults, free-shipping thresholds, etc.
CREATE TABLE IF NOT EXISTS delivery_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                     UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  delivery_mode               TEXT NOT NULL DEFAULT 'merchant_managed'
                                CHECK (delivery_mode IN ('merchant_managed', 'platform_managed', 'hybrid', 'none')),
  is_delivery_enabled         BOOLEAN NOT NULL DEFAULT true,
  free_shipping_threshold     DECIMAL(10,2),                    -- order amount for free shipping (NULL = disabled)
  default_packaging_charge    DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_delivery_days_default   INTEGER NOT NULL DEFAULT 7,
  min_delivery_days_default   INTEGER NOT NULL DEFAULT 1,
  auto_assign_driver          BOOLEAN NOT NULL DEFAULT false,
  allow_schedule_delivery     BOOLEAN NOT NULL DEFAULT true,
  allow_same_day_delivery     BOOLEAN NOT NULL DEFAULT false,
  cod_handling_fee_percent    DECIMAL(5,2) DEFAULT 0,           -- extra fee % for COD orders
  notify_customer_on_dispatch BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Delivery SLA Profiles ─────────────────────────────────────────────────────
-- Named delivery speed profiles a shop can configure
CREATE TABLE IF NOT EXISTS delivery_sla_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,   -- e.g. "Standard", "Express", "Next Day"
  min_days         INTEGER NOT NULL DEFAULT 1,
  max_days         INTEGER NOT NULL DEFAULT 3,
  additional_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_default       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, name)
);

-- ── Enhanced Delivery Requests ───────────────────────────────────────────────
-- Add columns to existing delivery_requests table via ALTER
ALTER TABLE delivery_requests
  ADD COLUMN IF NOT EXISTS zone_id             UUID REFERENCES delivery_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS area_code           TEXT,
  ADD COLUMN IF NOT EXISTS package_weight       DECIMAL(8,2),                    -- weight in kg
  ADD COLUMN IF NOT EXISTS package_contents    TEXT,                            -- package description
  ADD COLUMN IF NOT EXISTS sla_profile_id      UUID REFERENCES delivery_sla_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scheduled_date      DATE,                            -- customer-selected delivery date
  ADD COLUMN IF NOT EXISTS scheduled_time_slot TEXT,                            -- e.g. "10:00-14:00", "14:00-18:00"
  ADD COLUMN IF NOT EXISTS failure_reason      TEXT,
  ADD COLUMN IF NOT EXISTS failure_code         TEXT,                           -- e.g. 'customer_unavailable', 'wrong_address', 'refused'
  ADD COLUMN IF NOT EXISTS attempt_count        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proof_of_delivery    TEXT,                           -- base64 image or URL after successful delivery
  ADD COLUMN IF NOT EXISTS delivery_charge      DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS packaging_charge    DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cod_amount          DECIMAL(10,2),                   -- cash collected for COD (populated at pickup)
  ADD COLUMN IF NOT EXISTS collected_at        TIMESTAMPTZ,                     -- when cash was collected from customer
  ADD COLUMN IF NOT EXISTS returned_at         TIMESTAMPTZ,                     -- when package returned to merchant
  ADD COLUMN IF NOT EXISTS return_reason       TEXT,
  ADD COLUMN IF NOT EXISTS customer_notes      TEXT;                            -- delivery instructions from customer

-- ── Delivery Exception Log ───────────────────────────────────────────────────
-- Tracks all delivery exceptions for auditing and operations
CREATE TABLE IF NOT EXISTS delivery_exceptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_request_id UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  exception_type      TEXT NOT NULL,   -- 'failed_attempt', 'return_initiated', 'return_completed', 'damaged', 'lost'
  reason_code         TEXT,
  reason_description  TEXT,
  recorded_by_user_id  UUID REFERENCES users(id),
  resolution          TEXT,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Driver Fleet (for platform-managed/hybrid mode) ───────────────────────────
CREATE TABLE IF NOT EXISTS driver_fleet (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID REFERENCES shops(id) ON DELETE CASCADE,  -- NULL = platform-level fleet
  user_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type TEXT,  -- 'bike', 'van', 'car', 'cycle'
  vehicle_plate TEXT,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  max_weight_kg  DECIMAL(8,2),
  zones_covered UUID[] DEFAULT '{}',  -- array of delivery_zone IDs
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_delivery_zones_shop_id ON delivery_zones(shop_id);
CREATE INDEX IF NOT EXISTS idx_delivery_area_codes_zone_id ON delivery_area_codes(zone_id);
CREATE INDEX IF NOT EXISTS idx_delivery_charge_rules_shop_id ON delivery_charge_rules(shop_id);
CREATE INDEX IF NOT EXISTS idx_delivery_charge_rules_zone_id ON delivery_charge_rules(zone_id) WHERE zone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_requests_zone_id ON delivery_requests(zone_id) WHERE zone_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_requests_scheduled_date ON delivery_requests(scheduled_date) WHERE scheduled_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_requests_status ON delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_shop_status ON delivery_requests(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_requests_driver ON delivery_requests(assigned_driver_user_id) WHERE assigned_driver_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_exceptions_request_id ON delivery_exceptions(delivery_request_id);
CREATE INDEX IF NOT EXISTS idx_driver_fleet_shop_id ON driver_fleet(shop_id) WHERE shop_id IS NOT NULL;

COMMIT;

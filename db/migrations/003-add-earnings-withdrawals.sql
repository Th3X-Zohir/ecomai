-- Migration: 003 - Shop Earnings & Withdrawal System
-- Tracks online payment earnings for shops and withdrawal requests

-- ── Shop Earnings (running balance per shop) ──────────────
CREATE TABLE IF NOT EXISTS shop_earnings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  payment_id      UUID REFERENCES payments(id) ON DELETE SET NULL,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  type            TEXT NOT NULL CHECK (type IN ('sale', 'refund', 'adjustment', 'withdrawal', 'commission')),
  gross_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'BDT',
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Withdrawal Requests ────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'BDT',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
  payment_method  TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'bkash', 'nagad', 'rocket')),
  account_details JSONB,
  admin_notes     TEXT,
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  processed_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  reference_id    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Platform Commission Settings (global + per-shop override) ──
CREATE TABLE IF NOT EXISTS commission_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID REFERENCES shops(id) ON DELETE CASCADE,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  min_withdrawal  NUMERIC(12,2) NOT NULL DEFAULT 500,
  payout_cycle    TEXT NOT NULL DEFAULT 'on_request' CHECK (payout_cycle IN ('on_request', 'weekly', 'biweekly', 'monthly')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id)
);

-- Insert global default (shop_id = NULL means global)
INSERT INTO commission_settings (shop_id, commission_rate, min_withdrawal, payout_cycle)
VALUES (NULL, 0.05, 500, 'on_request')
ON CONFLICT DO NOTHING;

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_shop_earnings_shop ON shop_earnings(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_earnings_payment ON shop_earnings(payment_id);
CREATE INDEX IF NOT EXISTS idx_shop_earnings_type ON shop_earnings(type);
CREATE INDEX IF NOT EXISTS idx_shop_earnings_created ON shop_earnings(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_shop ON withdrawal_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_reviewed ON withdrawal_requests(reviewed_by);

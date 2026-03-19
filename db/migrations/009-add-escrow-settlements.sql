-- Migration 009: Escrow / Settlement System
-- Payment states: pending → held → releasable → released
-- Supports automatic time-based release after delivery + dispute window
-- Supports partial refund from held/releasable pools

BEGIN;

-- ── Settlement Configuration (per-shop) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlement_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id              UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  is_enabled           BOOLEAN NOT NULL DEFAULT true,
  hold_days            INTEGER NOT NULL DEFAULT 3,    -- days after delivery before release
  auto_release         BOOLEAN NOT NULL DEFAULT true,  -- auto-release after hold_days
  payout_schedule      TEXT NOT NULL DEFAULT 'on_demand'
                        CHECK (payout_schedule IN ('on_demand', 'daily', 'weekly', 'biweekly', 'monthly')),
  min_payout_threshold DECIMAL(12,2) DEFAULT 500,
  preferred_method     TEXT DEFAULT 'bank_transfer',
  account_details      JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Settlement Ledger (immutable financial record) ───────────────────────────
CREATE TABLE IF NOT EXISTS settlement_ledger (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  payment_id        UUID REFERENCES payments(id),          -- link to original payment
  order_id          UUID REFERENCES orders(id),
  earning_id        UUID REFERENCES shop_earnings(id),    -- link to original earning entry
  transaction_type  TEXT NOT NULL
                      CHECK (transaction_type IN (
                        'payment_hold',      -- payment received, funds entering escrow
                        'payment_release',   -- funds released to shop balance
                        'refund_hold',       -- refund initiated, funds withheld
                        'refund_release',    -- refund processed, funds deducted from escrow
                        'refund_from_balance', -- refund from already-released balance
                        'payout_debit',      -- payout processed
                        'adjustment_credit', -- manual adjustment credit
                        'adjustment_debit',  -- manual adjustment debit
                        'chargeback_debit'   -- chargeback or reversals
                      )),
  amount            DECIMAL(12,2) NOT NULL,   -- positive = credit to shop, negative = debit
  currency          TEXT NOT NULL DEFAULT 'BDT',
  balance_after     DECIMAL(12,2) NOT NULL,   -- running balance after this transaction
  reference_id      TEXT,                      -- external ref (payment_id, earning_id, withdrawal_id)
  description       TEXT,
  release_at        TIMESTAMPTZ,              -- when this amount becomes releasable (NULL = immediate)
  released_at       TIMESTAMPTZ,              -- when it was actually released
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Shop Balance Summary (materialized/cached view for fast balance reads) ───
CREATE TABLE IF NOT EXISTS shop_balance_summary (
  shop_id              UUID PRIMARY KEY REFERENCES shops(id) ON DELETE CASCADE,
  held_balance         DECIMAL(12,2) NOT NULL DEFAULT 0,
  releasable_balance   DECIMAL(12,2) NOT NULL DEFAULT 0,
  available_balance    DECIMAL(12,2) NOT NULL DEFAULT 0,  -- released - payouts_processing
  payouts_processing   DECIMAL(12,2) NOT NULL DEFAULT 0,  -- withdrawal requests in processing
  last_updated         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Automatic Settlement Jobs Queue ─────────────────────────────────────────
-- Track scheduled automatic settlement releases
CREATE TABLE IF NOT EXISTS settlement_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  earning_id      UUID REFERENCES shop_earnings(id),
  scheduled_for   TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processed', 'cancelled', 'failed')),
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Payout Records (enhanced from simple withdrawal) ─────────────────────────
-- Links withdrawals to settlement ledger entries
ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS settlement_ledger_id  UUID REFERENCES settlement_ledger(id),
  ADD COLUMN IF NOT EXISTS payout_batch_id        TEXT,
  ADD COLUMN IF NOT EXISTS payout_reference       TEXT;

-- ── Platform Commission Ledger (separate from shop earnings) ─────────────────
CREATE TABLE IF NOT EXISTS platform_ledger (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           UUID REFERENCES shops(id) ON DELETE SET NULL,
  payment_id        UUID REFERENCES payments(id),
  earning_id        UUID REFERENCES shop_earnings(id),
  description       TEXT,
  amount            DECIMAL(12,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'BDT',
  entry_type        TEXT NOT NULL
                      CHECK (entry_type IN ('commission_collected', 'refund_credited', 'payout_processed', 'adjustment')),
  reference_id      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Refund Dispute Window ────────────────────────────────────────────────────
-- Allows shops to dispute a refund within the hold period
CREATE TABLE IF NOT EXISTS refund_disputes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id UUID NOT NULL REFERENCES refund_requests(id) ON DELETE CASCADE,
  shop_id          UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  disputed_by_user_id UUID NOT NULL REFERENCES users(id),
  reason           TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'resolved_shop', 'resolved_platform', 'rejected')),
  resolution_notes TEXT,
  resolved_by      UUID REFERENCES users(id),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_settlement_config_shop_id ON settlement_config(shop_id);
CREATE INDEX IF NOT EXISTS idx_settlement_ledger_shop_id ON settlement_ledger(shop_id);
CREATE INDEX IF NOT EXISTS idx_settlement_ledger_payment_id ON settlement_ledger(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_settlement_ledger_order_id ON settlement_ledger(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_settlement_ledger_release_at ON settlement_ledger(release_at) WHERE release_at IS NOT NULL AND released_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_settlement_ledger_type ON settlement_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_settlement_schedules_scheduled ON settlement_schedules(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_settlement_schedules_shop ON settlement_schedules(shop_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_settlement ON withdrawal_requests(settlement_ledger_id) WHERE settlement_ledger_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_ledger_shop_id ON platform_ledger(shop_id) WHERE shop_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_ledger_entry_type ON platform_ledger(entry_type);
CREATE INDEX IF NOT EXISTS idx_refund_disputes_refund_id ON refund_disputes(refund_request_id);
CREATE INDEX IF NOT EXISTS idx_refund_disputes_shop_id ON refund_disputes(shop_id);

COMMIT;

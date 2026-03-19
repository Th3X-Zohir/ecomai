-- Migration 006: Refund Request Workflow
-- Enables structured refund requests with approval/rejection lifecycle

CREATE TABLE IF NOT EXISTS refund_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_id      UUID REFERENCES payments(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  requested_by    UUID,  -- user_id if merchant-initiated, customer_id if customer-initiated
  reason          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled')),
  refund_amount   NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'BDT',
  admin_notes     TEXT,
  merchant_notes  TEXT,
  approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  rejected_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  processed_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  gateway_refund_id TEXT,  -- SSLCommerz refund transaction ID
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refund_requests_shop ON refund_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_order ON refund_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(shop_id, status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_customer ON refund_requests(customer_id);

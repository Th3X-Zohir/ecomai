-- Migration 007: Admin Notifications
-- In-app and email notifications for merchants

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL for shop-wide
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  data            JSONB DEFAULT '{}',
  is_read         BOOLEAN NOT NULL DEFAULT false,
  delivery_method TEXT NOT NULL DEFAULT 'in_app'
                  CHECK (delivery_method IN ('in_app', 'email', 'both')),
  email_sent_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_shop ON notifications(shop_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_shop_unread ON notifications(shop_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL for shop-wide defaults
  notify_new_order BOOLEAN NOT NULL DEFAULT true,
  notify_order_shipped BOOLEAN NOT NULL DEFAULT true,
  notify_refund_request BOOLEAN NOT NULL DEFAULT true,
  notify_refund_approved BOOLEAN NOT NULL DEFAULT true,
  notify_withdrawal_request BOOLEAN NOT NULL DEFAULT true,
  notify_low_stock BOOLEAN NOT NULL DEFAULT true,
  notify_new_customer BOOLEAN NOT NULL DEFAULT false,
  notify_affiliate_signup BOOLEAN NOT NULL DEFAULT false,
  notify_email_order BOOLEAN NOT NULL DEFAULT true,
  notify_email_refund BOOLEAN NOT NULL DEFAULT true,
  notify_email_withdrawal BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);

# Ecomai — Launch Readiness Guide

## Overview

This document covers all operational requirements for deploying Ecomai to staging or production.
It is the authoritative checklist for the current implementation cycle.

---

## 1. Required Migrations

Run these migrations **in order** on every environment before starting the application.

```bash
psql $DATABASE_URL -f db/migrations/001-add-coupons-and-audit-log.sql
psql $DATABASE_URL -f db/migrations/002-add-invoices.sql
psql $DATABASE_URL -f db/migrations/003-add-earnings-withdrawals.sql
psql $DATABASE_URL -f db/migrations/004-add-password-changed-at-and-indexes.sql
psql $DATABASE_URL -f db/migrations/005-add-analytics-tables.sql
psql $DATABASE_URL -f db/migrations/006-add-refund-requests.sql
psql $DATABASE_URL -f db/migrations/007-add-admin-notifications.sql
psql $DATABASE_URL -f db/migrations/008-add-delivery-management.sql
psql $DATABASE_URL -f db/migrations/009-add-escrow-settlements.sql
psql $DATABASE_URL -f db/migrations/010-add-cod-reconciliation.sql
```

**Also apply any pending hardening migrations:**

```bash
psql $DATABASE_URL -f db/migrate-production-hardening.sql   # if exists
psql $DATABASE_URL -f db/migrate-dashboard-indexes.sql     # if exists
```

After running migrations, verify the schema:

```bash
psql $DATABASE_URL -c "\d settlement_config"
psql $DATABASE_URL -c "\d settlement_ledger"
psql $DATABASE_URL -c "\d settlement_schedules"
psql $DATABASE_URL -c "\d cod_collections"
psql $DATABASE_URL -c "\d cod_settlements"
psql $DATABASE_URL -c "\d shop_balance_summary"
```

---

## 2. Environment Variables

Copy `.env.example` to `.env` and set all required values.

```bash
cp .env.example .env
```

**Critical variables for production:**

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | 64-char random string. **Change from example.** |
| `SSLCOMMERZ_STORE_ID` | Yes (BD) | Your SSLCommerz store ID |
| `SSLCOMMERZ_STORE_PASSWD` | Yes (BD) | Your SSLCommerz store password |
| `SSLCOMMERZ_IS_LIVE` | Yes | `false` for sandbox, `true` for production |
| `APP_URL` | Yes | Public frontend URL (for callback redirects) |
| `API_URL` | Yes | Public backend URL (for callback URLs) |
| `NODE_ENV` | Yes | `production` for production |
| `SENTRY_DSN` | Recommended | Sentry error tracking |
| `EMAIL_PROVIDER` | Recommended | `resend` recommended for production |

---

## 3. Cron Worker

The cron worker **must run as a separate process** from the Express app.
It is NOT started automatically by `npm start`.

```bash
# Start the cron worker (background)
bun run src/cron.js

# Or with PM2
pm2 start src/cron.js --name ecomai-cron
pm2 save
```

**Cron jobs running:**

| Schedule | Job | Description |
|---|---|---|
| `*/5 * * * *` | Settlement auto-releases | Releases escrow-held funds after hold period |
| `0 * * * *` | Refresh shop balances | Recomputes balance summaries for all shops |
| `0 2 * * 1` | Weekly analytics | Computes weekly snapshots + co-occurrence |
| `0 3 * * *` | Co-occurrence backup | Daily co-occurrence matrix recompute |

**Monitoring:** Cron logs to stdout. In production, pipe to your log aggregator.
Each run logs start/end with timestamps and counts.

---

## 4. SSLCommerz Payment Gateway — Sandbox Testing

### Callback URLs (set in SSLCommerz dashboard)

```
Success:  https://your-api.example.com/v1/payments/sslcommerz/success
Fail:     https://your-api.example.com/v1/payments/sslcommerz/fail
Cancel:   https://your-api.example.com/v1/payments/sslcommerz/cancel
IPN:      https://your-api.example.com/v1/payments/sslcommerz/ipn
```

### Sandbox Verification Checklist

1. Set `SSLCOMMERZ_IS_LIVE=false` in `.env`
2. Create a test order in the storefront
3. Complete checkout — you should be redirected to SSLCommerz sandbox
4. Use sandbox test card credentials (available in SSLCommerz sandbox docs)
5. After payment, verify:
   - Payment record shows `status = 'completed'` in DB
   - Order shows `payment_status = 'paid'`
   - `settlement_ledger` has a `payment_hold` entry
   - `shop_earnings` has a record for the sale
6. Verify the IPN endpoint returns HTTP 200

### Production Checklist for SSLCommerz

- [ ] Switch `SSLCOMMERZ_IS_LIVE=true`
- [ ] Whitelist your server IP in SSLCommerz dashboard
- [ ] Verify the IPN callback URL is publicly reachable (not behind firewall)
- [ ] Test a live payment with a small amount
- [ ] Verify escrow release after hold period

---

## 5. Escrow / Settlement — Operational Notes

### Default Hold Period

New shops start with `is_enabled = true` and `hold_days = 3`.
Funds are released automatically 3 days after delivery confirmation.

### Disabling Escrow

When a shop disables escrow (`is_enabled = false`):
- All **pending settlement schedules** for that shop are automatically cancelled
- New payments go directly to available balance (no hold)
- Existing held funds are NOT automatically released — they remain in the ledger until their original `release_at` date (but the schedule is cancelled so no automatic release will occur)

### Manual Override

To manually trigger a release for a specific shop before the hold period:

```sql
-- Mark ledger entries as released immediately
UPDATE settlement_ledger
SET released_at = NOW()
WHERE shop_id = 'your-shop-id'
  AND released_at IS NULL
  AND release_at IS NOT NULL;

-- Then refresh the balance summary
UPDATE shop_balance_summary
SET releasable_balance = (
  SELECT COALESCE(SUM(amount), 0) FROM settlement_ledger
  WHERE shop_id = 'your-shop-id' AND amount > 0
    AND release_at IS NOT NULL AND release_at <= NOW() AND released_at IS NULL
),
available_balance = (
  SELECT COALESCE(SUM(amount), 0) FROM settlement_ledger
  WHERE shop_id = 'your-shop-id' AND released_at IS NOT NULL
)
WHERE shop_id = 'your-shop-id';
```

---

## 6. COD Reconciliation — Operational Workflow

### Standard COD Flow

1. Customer places COD order → payment status `pending_cod`
2. Delivery confirmed → payment status `completed`, order status `delivered`
3. Driver collects cash → `cod_collections` record created
4. Driver submits settlement → `cod_settlements` record created with status `submitted`
5. Shop owner approves/rejects → status becomes `approved`/`rejected`
6. If approved, shop owner marks as `settled` after receiving cash

### COD Aging Alerts

The merchant operations dashboard (`GET /v1/operations/merchant/overview`) now surfaces:
- **`uncollectedCod.count`** — Total delivered COD orders with no collection recorded
- **`uncollectedCod.overdue`** — Those 3+ days overdue
- **`cashReconciliation.count`** — Returns initiated for orders where COD was already collected

These are visible under `summary.uncollectedCod` and `summary.cashReconciliation`.

### Cash Reconciliation Required

When a delivery is returned but COD was already collected:
- A `cash_reconciliation` exception is logged automatically
- Appears in the super admin platform exception queue (`GET /v1/operations/platform/exceptions?type=cash_reconciliation`)
- Appears in merchant operations under `summary.cashReconciliation`

**Manual action required:** Shop owner must coordinate with the driver to return the collected cash, then record the reversal in COD reconciliation.

---

## 7. Manual Test Checklist (Staging)

### Buyer Flows
- [ ] Place a COD order through storefront
- [ ] Place a prepaid (SSLCommerz) order through storefront
- [ ] Verify order appears in merchant order list
- [ ] Verify order tracking works with order ID + email

### Merchant Operations
- [ ] Verify merchant dashboard loads without errors
- [ ] Verify uncollected COD count appears in operations overview
- [ ] Process a delivery: assign driver, driver picks up, driver marks delivered
- [ ] Verify delivery status updates correctly in DB

### Settlement / Escrow
- [ ] With escrow enabled: complete a payment, verify `settlement_ledger` has a `payment_hold` entry with `release_at` set
- [ ] Wait for cron auto-release (or manually trigger)
- [ ] Verify ledger entry has `released_at` set and balance updated

### COD Reconciliation
- [ ] Complete a COD delivery, record collection via driver app
- [ ] Submit a COD settlement from driver portal
- [ ] Approve settlement from merchant COD reconciliation page
- [ ] Verify `cod_settlements` status transitions correctly

### Super Admin
- [ ] Login as super admin, access platform operations
- [ ] View exception queue — verify cash reconciliation items appear
- [ ] Verify super admin can view all shops' data (no cross-shop leak)

### Race Condition Guards
- [ ] Rapidly click "Confirm Delivery" twice — verify second attempt returns HTTP 409 Conflict
- [ ] Simultaneously reschedule and confirm the same delivery — one should succeed, one should get 409

---

## 8. Operational Monitoring Points

### Key Metrics to Watch (Production)

| Metric | Normal Range | Alert Threshold |
|---|---|---|
| Settlement ledger `balance_after` negative | Never | Any occurrence |
| `payment_hold` entries with no corresponding `released_at` after hold_days × 2 | < 5% | > 5% of held entries |
| COD uncollected orders 7+ days overdue | 0 | Any |
| Settlement schedules stuck in `pending` for > hold_days × 2 | 0 | Any |
| Refund requests pending > 3 days | 0 | > 5 requests |

### Log Patterns to Alert On

```bash
# Settlement release errors
grep "Settlement release error" logs/cron.log

# Failed automatic releases
grep "failed.*settlement" logs/app.log

# Payment validation failures
grep "Gateway validation unreachable" logs/app.log
```

---

## 9. Deployment Notes

### Process Architecture

```
┌─────────────────┐      ┌─────────────────┐
│   Express API   │      │   Cron Worker   │
│   (npm start)   │      │ (bun run src/   │
│   Port 3000     │      │    cron.js)     │
└────────┬────────┘      └────────┬────────┘
         │                        │
         └──────────┬─────────────┘
                    │
              ┌─────┴─────┐
              │ PostgreSQL │
              └───────────┘
```

Both processes share the same database. The cron worker is stateless
and can be scaled horizontally by running multiple instances with the
same `processAutomaticReleases()` logic (idempotent by design).

### Super Admin Deployment

- Deploy `npm start` behind a load balancer with sticky sessions or
  JWT validation (stateless)
- The cron worker should run on **one instance only** (or use a
  distributed lock if running multiple cron instances)
- Run `cron` as a systemd service or PM2 process with auto-restart

### Nginx Configuration (Example)

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

SSLCommerz IPN callbacks must be accessible from the public internet.
Do not put the IPN endpoint behind a WAF rule that requires cookies
or authentication — SSLCommerz sends a raw POST with no session.

---

## 10. Rollback Considerations

### If a Problem is Found After Migration

Migrations 009 and 010 add financial tables (`settlement_*`, `cod_*`).
Rolling back these migrations requires careful handling of existing data.

**Do NOT drop `settlement_ledger`, `shop_earnings`, or `cod_collections`
without a full financial audit.**

If you need to disable the escrow feature after go-live:
1. Set `is_enabled = false` for all shops via `saveConfig`
2. This cancels pending schedules but does NOT affect completed ledger entries
3. New payments will bypass escrow (immediate availability)
4. Existing held funds remain in `held_balance` — manual intervention required to release

---

## 11. Remaining Open Risks (Known, Acceptable)

| Risk | Severity | Status | Mitigation |
|---|---|---|---|
| Driver delivery routes not independently audited | Low | Acknowledged | Driver ownership checks are in place; full route audit recommended before driver app launch |
| Settlement schedule orphaning if escrow disabled | Low | Fixed | Pending schedules are cancelled when escrow is disabled |
| Refund ratio precision | Negligible | Acceptable | Uses `toFixed(2)` — max error < 0.01 BDT per refund |
| Stale delivery request race | Low | Fixed | Optimistic locking added to all critical status transitions |
| COD return reversal | Medium | Guarded | `cash_reconciliation` exception created; manual operator action required |
| Automated COD uncollected alerts | Low | Fixed | Aging counter added; ops dashboard shows overdue count |

---

*Last updated: 2026-03-20 (Production hardening pass)*

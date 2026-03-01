# Ecomai — Multi-Tenant SaaS E-Commerce Platform

A production-grade, multi-tenant e-commerce SaaS platform built with Express.js, React 18, PostgreSQL 16, and SSLCommerz payments. Fully Dockerized — zero local dependencies.

## Features

### Core Commerce
- **Multi-Tenant Architecture** — Every data query scoped by `shop_id`; zero cross-tenant leakage
- **Self-Service Onboarding** — Visitors pick a plan, register, and get a fully-functional admin dashboard in one click
- **Product Management** — Full CRUD with variants (SKU, price, inventory, JSONB attributes), compare-at pricing, CSV export, stats summary
- **Order Lifecycle** — Create → Confirm → Process → Ship → Deliver with auto-inventory decrements, race-condition-safe stock via `SELECT FOR UPDATE`
- **Bulk Operations** — Bulk order status updates (up to 50 per batch), CSV exports for orders and products
- **Soft Delete** — Products, orders, and customers use `deleted_at` timestamps for safe recoverability instead of permanent deletion

### Payments & Checkout
- **SSLCommerz Payments** — Full redirect + IPN callback flow (sandbox) with fail-closed webhook verification and amount validation
- **Cash on Delivery** — COD payment option with dedicated UI selector in storefront checkout
- **Refund Support** — Partial/full refunds with cumulative validation against payment amount
- **Manual Payments** — Cash/bank recording for offline transactions

### Storefront
- **Customer Storefront** — Public API per shop slug: catalog, customer auth, checkout, order history, wishlists
- **Website Customizer** — Template, theme colors, header/footer, homepage sections, custom CSS/JS (sandboxed), SEO, validated analytics IDs (GA4, FB Pixel, GTM)
- **Product Reviews** — Customer review submission with admin moderation (approve/reject/delete) and stats

### Operations
- **Delivery Tracking** — Create requests, assign drivers, real-time GPS posting, status updates
- **Driver Mobile API** — Login, view assignments, post GPS coordinates, update delivery status
- **Marketing Campaigns** — CRUD for email, SMS, Facebook, Instagram, TikTok, Google Ads campaigns with AI draft generation
- **Newsletter Management** — Subscriber collection, admin management with CSV export, bulk unsubscribe
- **Inventory Management** — Movement tracking with automatic stock adjustments on order events

### Subscriptions & Billing
- **Dynamic Subscription Engine** — Single source of truth for plan logic with 1-min TTL cache
- **4 Subscription Plans** — Free, Starter (৳999/mo), Growth (৳2,499/mo), Enterprise (custom)
- **Usage Tracking** — Atomic counters for products, orders, storage per plan limits
- **Plan Enforcement** — Middleware factories that check limits before resource creation
- **Earnings & Commissions** — Platform commission tracking, shop earnings, withdrawal requests with approval workflow

### Admin Dashboard
- **Order Stats** — Aggregated counts by status, revenue, avg order value, 24h/7d trends
- **Product Stats** — Active/draft/archived counts, out-of-stock and low-stock alerts
- **CSV Exports** — One-click download for orders and products with status filtering
- **Reviews Admin** — Moderate customer reviews with approval workflow and rating stats
- **Newsletter Admin** — Subscriber management with CSV export and bulk operations
- **Role-Based Access Control** — `super_admin`, `shop_admin`, `shop_user`, `delivery_agent`

### Security & Production Hardening
- **JWT Auth** — Access tokens (15min) + refresh tokens (7 days) with rotation and periodic cleanup
- **Rate Limiting** — 300 req/15min API, 20/15min auth, 15/15min customer, 10/15min write endpoints
- **Input Validation** — `validateBody` middleware on all public and write endpoints with type/pattern/oneOf support
- **Request Correlation** — `x-request-id` header on every request for distributed tracing
- **Structured Logging** — JSON request logs with timing, status, user/shop context, and correlation IDs
- **Error Boundary** — React class component catches render errors with retry/home buttons
- **Compression** — gzip/brotli response compression via `compression` middleware
- **File Upload Security** — Extension whitelist + magic byte (MIME) validation, 5MB limit
- **XSS Protection** — Custom JS sandboxed in try/catch with 10KB size limit; analytics IDs regex-validated
- **Webhook Security** — SSLCommerz callbacks fail-closed on unreachable validation, with amount verification (±1 BDT tolerance)
- **Graceful Shutdown** — Proper connection draining with 10s force-kill timeout
- **Non-Root Container** — Dockerfile runs as `appuser` (least privilege)
- **DB Pool Tuning** — Connection limits (20 prod), idle timeout (30s), connection timeout (5s), statement timeout (30s prod)
- **Docker Hardening** — Env var interpolation for secrets, backend healthcheck, resource limits (512M backend, 256M frontend)

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun 1.1](https://bun.sh) (Alpine container) |
| Backend | Express.js 4 (REST API) |
| Frontend | React 18 + Vite 7.3 + Tailwind CSS v4 + React Router v6 |
| Database | PostgreSQL 16 (32 tables, UUIDs, JSONB, CHECK constraints) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` (salt rounds: 10) |
| Payments | SSLCommerz sandbox (`sslcommerz-lts`) + COD |
| Security | Helmet, CORS, express-rate-limit, compression, request-id |
| Containers | Docker Compose (4 services) |

## Quick Start

> **Requirement:** Docker & Docker Compose installed. Nothing else.

```bash
# Clone and start everything
git clone <repo-url> && cd Ecomai
docker compose up --build
```

| Service | URL | Container |
|---|---|---|
| Frontend | http://localhost:5173 | `ecomai_web` |
| Backend API | http://localhost:3000 | `ecomai_api` |
| PostgreSQL | localhost:5432 | `ecomai_pg` |

The `migrate` container automatically creates all 32 tables and seeds demo data on first boot.

### Demo Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | `super@ecomai.dev` | `password123` |
| Shop Admin (Demo Coffee) | `admin@coffee.dev` | `password123` |
| Shop Staff | `staff@coffee.dev` | `password123` |
| Shop Admin (Fashion Hub) | `admin@fashion.dev` | `password123` |

### Stop / Reset

```bash
# Stop containers (keeps data)
docker compose down

# Full reset (destroys database)
docker compose down -v
docker compose up --build
```

## Project Structure

```
Ecomai/
├── docker-compose.yml          # 4-service orchestration (env vars, healthchecks, resource limits)
├── Dockerfile                  # Backend image (non-root user, layer-cached deps)
├── index.js                    # Express server + graceful shutdown + token cleanup job
├── package.json
├── db/
│   ├── schema.sql              # 32-table DDL with indexes & constraints
│   ├── seed.sql                # Demo plans, shops, users, products
│   ├── migrate.js              # Auto-migration script (runs in container)
│   ├── migrate-settings.sql    # Website settings migration
│   ├── migrate-soft-delete.sql # Soft delete columns + partial indexes
│   └── migrate-dashboard-indexes.sql  # 8 composite performance indexes
├── src/
│   ├── app.js                  # Express setup (helmet, cors, compression, rate-limit, routes)
│   ├── config.js               # Environment configuration
│   ├── db.js                   # PostgreSQL pool (tuned: max, timeouts, statement_timeout)
│   ├── store.js                # Legacy pool alias
│   ├── errors/
│   │   └── domain-error.js     # Business logic error class
│   ├── middleware/
│   │   ├── auth.js             # JWT verify, role guard, tenant resolver
│   │   ├── tenant.js           # Tenant context enforcement
│   │   ├── async-handler.js    # Async route error wrapper
│   │   ├── error-handler.js    # Structured JSON error logging with request-id
│   │   ├── request-logger.js   # Structured JSON request logging with timing
│   │   ├── upload.js           # Multer + magic byte MIME validation
│   │   ├── validate.js         # validateBody middleware (type/required/pattern/oneOf)
│   │   └── plan-enforcement.js # Subscription limit checking middleware
│   ├── repositories/           # Data access layer (parameterized SQL, soft delete)
│   │   ├── categories.js
│   │   ├── category-requests.js
│   │   ├── customers.js        # Soft delete (deleted_at)
│   │   ├── delivery-requests.js
│   │   ├── inventory-movements.js
│   │   ├── marketing-campaigns.js
│   │   ├── orders.js           # Soft delete (deleted_at)
│   │   ├── payments.js
│   │   ├── product-images.js
│   │   ├── product-variants.js
│   │   ├── products.js         # Soft delete (deleted_at)
│   │   ├── shops.js
│   │   ├── users.js
│   │   └── website-settings.js
│   ├── routes/                 # HTTP route handlers
│   │   ├── auth.js             # Login, refresh, logout
│   │   ├── categories.js
│   │   ├── customers.js
│   │   ├── delivery-requests.js
│   │   ├── driver.js           # Driver mobile API
│   │   ├── inventory-movements.js
│   │   ├── marketing-campaigns.js
│   │   ├── newsletter.js       # Newsletter subscriber management
│   │   ├── orders.js           # CRUD + CSV export + bulk status + stats
│   │   ├── payments.js         # SSLCommerz callbacks + manual payments
│   │   ├── product-images.js   # Image upload with MIME validation
│   │   ├── product-variants.js
│   │   ├── products.js         # CRUD + CSV export + stats
│   │   ├── public.js           # Storefront API (validated inputs)
│   │   ├── register.js         # Shop registration with slug validation
│   │   ├── reviews.js          # Review moderation (approve/reject/delete)
│   │   ├── shops.js
│   │   ├── users.js
│   │   └── website-settings.js
│   └── services/               # Business logic layer
│       ├── auth.js
│       ├── categories.js
│       ├── category-requests.js
│       ├── customers.js
│       ├── delivery-requests.js
│       ├── inventory-movements.js
│       ├── marketing-campaigns.js
│       ├── orders.js           # Transaction-safe with SELECT FOR UPDATE
│       ├── payments.js
│       ├── product-images.js
│       ├── product-variants.js
│       ├── products.js
│       ├── shops.js
│       ├── subscription-payments.js  # SSLCommerz with fail-closed verification
│       ├── users.js
│       └── website-settings.js
├── frontend/                   # React SPA
│   ├── Dockerfile              # Frontend build image
│   ├── src/
│   │   ├── App.jsx             # Router (public + /admin/* + /store/*)
│   │   ├── api.js              # API client with token refresh + download helper
│   │   ├── api-public.js       # Public storefront API client
│   │   ├── main.jsx            # Entry point (wrapped in ErrorBoundary)
│   │   ├── components/
│   │   │   ├── Layout.jsx      # Admin sidebar with all nav sections
│   │   │   ├── UI.jsx          # Shared UI components
│   │   │   └── ErrorBoundary.jsx  # React error boundary with retry
│   │   ├── contexts/           # Auth, Admin, Cart, Toast contexts
│   │   ├── pages/              # 29 admin pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Orders.jsx      # Stats cards, CSV export, bulk status, status filter
│   │   │   ├── Products.jsx    # Stats cards, CSV export
│   │   │   ├── Reviews.jsx     # Review moderation UI
│   │   │   ├── Newsletter.jsx  # Subscriber management UI
│   │   │   ├── Pricing.jsx     # Plan comparison with error handling
│   │   │   └── ... (23 more)
│   │   ├── storefront/         # Customer-facing shop pages
│   │   │   └── pages/
│   │   │       └── StoreCheckout.jsx  # Online + COD payment selector
│   │   └── utils/
│   └── vite.config.js          # Vite + API proxy to backend
├── tests/                      # 81 tests across 16 files
│   ├── auth-service.test.js           # 3 tests: login, wrong password, token refresh
│   ├── customer-service.test.js       # 10 tests: register, login, profile, password
│   ├── order-service.test.js          # 1 test: order creation with totals
│   ├── order-status-service.test.js   # 3 tests: status transitions
│   ├── order-stock-status.test.js     # 7 tests: stock decrement, race conditions
│   ├── payment-service.test.js        # 2 tests: manual payment, refund
│   ├── product-service.test.js        # 4 tests: CRUD + listing
│   ├── product-variant-service.test.js # 4 tests: variant CRUD
│   ├── subscription-engine.test.js    # 28 tests: plans, usage, limits, features
│   ├── shop-user-service.test.js      # 3 tests: shop/user creation
│   ├── tenant-scope.test.js           # 2 tests: auth middleware
│   ├── marketing-campaign-*.test.js   # 3 tests: campaign lifecycle
│   ├── inventory-order-flow.test.js   # 1 test: inventory movement
│   ├── delivery-driver-service.test.js # 3 tests: delivery workflow
│   ├── website-settings-service.test.js # 2 tests: settings CRUD
│   └── helpers/setup.js               # Test database setup utilities
├── scripts/
│   ├── smoke-test.js           # 31-endpoint smoke test
│   └── fix-passwords.js        # Password hash repair utility
├── uploads/products/           # Uploaded product images
└── docs/
    ├── improvement-plan.md
    ├── platform-architecture-plan.md
    └── system-flow-audit.md
```

## API Overview (~70+ endpoints)

### Public — No Auth Required
| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check (DB connectivity + uptime) |
| `GET /v1/register/plans` | List subscription plans |
| `POST /v1/register` | Create shop + owner account (validated: slug, email, password, billing) |
| `GET /v1/public/shops/:slug` | Shop info (safe fields only) |
| `GET /v1/public/shops/:slug/settings` | Theme & template |
| `GET /v1/public/shops/:slug/products` | Product catalog (active only) |
| `GET /v1/public/shops/:slug/products/:productSlug` | Product detail + variants |
| `POST /v1/public/shops/:slug/auth/register` | Customer registration (validated) |
| `POST /v1/public/shops/:slug/auth/login` | Customer login (validated) |
| `POST /v1/public/shops/:slug/checkout` | Create order + payment (validated, rate-limited) |
| `POST /v1/public/shops/:slug/auth/forgot-password` | Password reset request (validated) |
| `POST /v1/public/shops/:slug/auth/reset-password` | Password reset (validated) |
| `POST /v1/public/shops/:slug/newsletter` | Newsletter subscription (rate-limited) |
| `POST /v1/public/shops/:slug/reviews` | Submit product review (rate-limited) |

### Auth
| Endpoint | Purpose |
|---|---|
| `POST /v1/auth/login` | Admin/staff login |
| `POST /v1/auth/refresh` | Rotate token pair |
| `POST /v1/auth/logout` | Revoke refresh token |

### Admin — Orders (Requires Bearer Token)
| Endpoint | Purpose |
|---|---|
| `GET /v1/orders` | List orders (paginated, search, status filter) |
| `GET /v1/orders/export/csv` | Download orders as CSV (status filter, 5000 limit) |
| `GET /v1/orders/stats/summary` | Aggregated order stats (counts, revenue, trends) |
| `POST /v1/orders/bulk/status` | Bulk status update (up to 50 orders) |
| `GET /v1/orders/:id` | Order detail with items |
| `POST /v1/orders` | Create order (plan limit enforced) |
| `PATCH /v1/orders/:id/status` | Update order status (state machine validated) |
| `DELETE /v1/orders/:id` | Soft delete order |

### Admin — Products
| Endpoint | Purpose |
|---|---|
| `GET /v1/products` | List products (paginated, search, status filter) |
| `GET /v1/products/export/csv` | Download products as CSV |
| `GET /v1/products/stats/summary` | Product stats (active, draft, out-of-stock, low-stock) |
| `POST /v1/products` | Create product (plan limit enforced) |
| `PATCH /v1/products/:id` | Update product |
| `DELETE /v1/products/:id` | Soft delete product |

### Admin — Reviews & Newsletter
| Endpoint | Purpose |
|---|---|
| `GET /v1/reviews` | List reviews with filters |
| `GET /v1/reviews/stats` | Review rating stats |
| `PATCH /v1/reviews/:id/approve` | Approve review |
| `PATCH /v1/reviews/:id/reject` | Reject review |
| `DELETE /v1/reviews/:id` | Delete review |
| `GET /v1/newsletter` | List subscribers |
| `GET /v1/newsletter/stats` | Subscriber stats |
| `GET /v1/newsletter/export` | Export subscribers as CSV |
| `PATCH /v1/newsletter/:id/unsubscribe` | Unsubscribe |
| `DELETE /v1/newsletter/:id` | Delete subscriber |

### Admin — Other
Products, Customers, Payments (manual + refunds), Deliveries, Campaigns, Inventory, Website Settings, Shops, Users, Categories, Subscriptions, Earnings — see [full matrix in system-flow-audit.md](docs/system-flow-audit.md#5-api-endpoint-matrix).

### Driver
| Endpoint | Purpose |
|---|---|
| `POST /v1/driver/auth/login` | Driver login |
| `GET /v1/driver/assignments` | My assigned deliveries |
| `POST /v1/driver/assignments/:id/location` | Post GPS coordinates |
| `PATCH /v1/driver/assignments/:id/status` | Update delivery status |

## Database

32 PostgreSQL tables with UUIDs, JSONB columns, CHECK constraints, foreign keys, soft delete columns, and composite performance indexes:

**Core:** `shops` · `users` · `customers` · `products` · `product_variants` · `product_images` · `categories` · `category_requests`

**Orders:** `orders` · `order_items` · `payments` · `refunds` · `delivery_requests` · `inventory_movements`

**Subscriptions:** `subscription_plans` · `shop_subscriptions` · `subscription_payments` · `subscription_usage` · `subscription_audit_log`

**Engagement:** `marketing_campaigns` · `product_reviews` · `newsletter_subscribers` · `wishlists`

**Platform:** `website_settings` · `refresh_tokens` · `audit_log` · `coupons` · `invoices` · `earnings_transactions` · `earnings_withdrawals` · `shop_earnings`

Full schema: [`db/schema.sql`](db/schema.sql)

## Testing

```bash
# Run all 81 tests (inside the backend container)
docker exec ecomai_api bun test
```

Expected output: **81 passed, 0 failed across 16 test files**

Test coverage includes:
- Authentication (login, token refresh, wrong password)
- Customer lifecycle (register, login, profile, password change)
- Order lifecycle (creation, stock decrement, insufficient stock, state machine, cancellation)
- Product CRUD and variant management
- Payment processing and refunds
- Subscription engine (28 tests: plans, usage, limits, features, activation, cancellation)
- Tenant isolation and middleware
- Marketing campaigns, deliveries, inventory flows, website settings

### Smoke Test

```bash
docker cp scripts/smoke-test.js ecomai_api:/app/smoke-test.js
docker exec ecomai_api bun run /app/smoke-test.js
```

Expected output: **31 passed, 0 failed out of 31**

## Documentation

- [System Flow Audit](docs/system-flow-audit.md) — Click-by-click user flows with exact backend logic and DB changes for every action
- [Platform Architecture Plan](docs/platform-architecture-plan.md) — Original architecture design document
- [Improvement Plan](docs/improvement-plan.md) — Ongoing improvement roadmap

## Environment Variables

All environment variables support `${VAR:-default}` interpolation via `.env` file or Docker Compose:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://ecomai:ecomai_secret@postgres:5432/ecomai` | PostgreSQL connection |
| `JWT_SECRET` | `ecomai_jwt_secret_2025` | JWT signing key (**must override in production**) |
| `JWT_ACCESS_EXPIRES` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh token lifetime |
| `SSLCOMMERZ_STORE_ID` | `neege6997413bb22cd` | SSLCommerz sandbox store |
| `SSLCOMMERZ_STORE_PASSWD` | *(set in docker-compose)* | SSLCommerz sandbox password |
| `SSLCOMMERZ_IS_LIVE` | `false` | Use production SSLCommerz |
| `APP_URL` | `http://localhost:5173` | Frontend URL (for callbacks) |
| `API_URL` | `http://localhost:3000` | Backend URL |
| `NODE_ENV` | `development` | Environment (`production` enables stricter settings) |

## Production Checklist

- [ ] Set `JWT_SECRET` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Set `SSLCOMMERZ_IS_LIVE=true` with production credentials
- [ ] Configure `APP_URL` and `API_URL` to your domain
- [ ] Set up SSL/TLS termination (nginx or cloud load balancer)
- [ ] Configure database backups
- [ ] Set up log aggregation (structured JSON logs are ready)
- [ ] Review resource limits in `docker-compose.yml`

## License

Private — All rights reserved.

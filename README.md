# Ecomai — Multi-Tenant SaaS E-Commerce Platform

A production-ready, multi-tenant e-commerce SaaS platform built with Express.js, React 19, PostgreSQL 16, and SSLCommerz payments. Fully Dockerized — zero local dependencies.

## Features

- **Multi-Tenant Architecture** — Every data query scoped by `shop_id`; zero cross-tenant leakage
- **Self-Service Onboarding** — Visitors pick a plan, register, and get a fully-functional admin dashboard in one click
- **Product Management** — Full CRUD with variants (SKU, price, inventory, JSONB attributes)
- **Order Lifecycle** — Create → Confirm → Process → Ship → Deliver with auto-inventory decrements
- **SSLCommerz Payments** — Full redirect + IPN callback flow (sandbox), plus manual cash/bank recording
- **Refund Support** — Partial/full refunds with cumulative validation against payment amount
- **Customer Storefront** — Public API per shop slug: catalog, customer auth, checkout, order history
- **Delivery Tracking** — Create requests, assign drivers, real-time GPS posting, status updates
- **Driver Mobile API** — Login, view assignments, post GPS coordinates, update delivery status
- **Marketing Campaigns** — CRUD for email, SMS, Facebook, Instagram, TikTok, Google Ads campaigns
- **Website Customizer** — Template, theme colors, header/footer, homepage sections, custom CSS/JS, SEO
- **Role-Based Access Control** — `super_admin`, `shop_admin`, `shop_user`, `delivery_agent`
- **JWT Auth** — Access tokens (15min) + refresh tokens (7 days) with rotation
- **4 Subscription Plans** — Free, Starter (৳999), Growth (৳2,499), Enterprise (custom)

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun 1.1](https://bun.sh) (Alpine container) |
| Backend | Express.js 4 (REST API) |
| Frontend | React 19 + Vite 7.3 + Tailwind CSS v4 + React Router v7 |
| Database | PostgreSQL 16 (16 tables, UUIDs, JSONB, CHECK constraints) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` (salt rounds: 10) |
| Payments | SSLCommerz sandbox (`sslcommerz-lts`) |
| Security | Helmet, express-rate-limit (300/15min API, 20/15min auth) |
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

The `migrate` container automatically creates all 16 tables and seeds demo data on first boot.

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
├── docker-compose.yml          # 4-service orchestration
├── index.js                    # Express server entrypoint
├── package.json
├── db/
│   ├── schema.sql              # 16-table DDL with indexes & constraints
│   ├── seed.sql                # Demo plans, shops, users, products
│   └── migrate.js              # Auto-migration script (runs in container)
├── src/
│   ├── app.js                  # Express setup (helmet, cors, rate-limit, routes)
│   ├── config.js               # Environment configuration
│   ├── store.js                # PostgreSQL connection pool
│   ├── errors/
│   │   └── domain-error.js     # Business logic error class
│   ├── middleware/
│   │   ├── auth.js             # JWT verify, role guard, tenant resolver
│   │   └── tenant.js           # Tenant context enforcement
│   ├── repositories/           # Data access layer (parameterized SQL)
│   │   ├── customers.js
│   │   ├── delivery-requests.js
│   │   ├── inventory-movements.js
│   │   ├── marketing-campaigns.js
│   │   ├── orders.js
│   │   ├── payments.js
│   │   ├── product-variants.js
│   │   ├── products.js
│   │   ├── shops.js
│   │   ├── users.js
│   │   └── website-settings.js
│   ├── routes/                 # HTTP route handlers
│   │   ├── auth.js             # Login, refresh, logout
│   │   ├── customers.js
│   │   ├── delivery-requests.js
│   │   ├── driver.js           # Driver mobile API
│   │   ├── inventory-movements.js
│   │   ├── marketing-campaigns.js
│   │   ├── orders.js
│   │   ├── payments.js         # SSLCommerz callbacks + manual payments
│   │   ├── product-variants.js
│   │   ├── products.js
│   │   ├── shops.js
│   │   ├── users.js
│   │   └── website-settings.js
│   └── services/               # Business logic layer
│       ├── auth.js
│       ├── customers.js
│       ├── delivery-requests.js
│       ├── inventory-movements.js
│       ├── marketing-campaigns.js
│       ├── orders.js
│       ├── payments.js
│       ├── product-variants.js
│       ├── products.js
│       ├── shops.js
│       ├── users.js
│       └── website-settings.js
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── App.jsx             # Router (public + /admin/* + /store/*)
│   │   ├── pages/              # Landing, Pricing, Signup, Login, Admin pages, Storefront
│   │   └── lib/                # API client, auth context, cart context
│   └── vite.config.js          # Vite + API proxy to backend
├── tests/                      # 13 test files
│   ├── auth-service.test.js
│   ├── order-service.test.js
│   ├── payment-service.test.js
│   └── ... (10 more)
├── scripts/
│   └── smoke-test.js           # 31-endpoint smoke test (runs inside container)
└── docs/
    ├── platform-architecture-plan.md
    └── system-flow-audit.md    # Complete click-by-click user flows & DB changes
```

## API Overview (~53 endpoints)

### Public — No Auth Required
| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check |
| `GET /v1/register/plans` | List subscription plans |
| `POST /v1/register` | Create shop + owner account |
| `GET /v1/public/shops/:slug` | Shop info (safe fields only) |
| `GET /v1/public/shops/:slug/settings` | Theme & template |
| `GET /v1/public/shops/:slug/products` | Product catalog (active only) |
| `GET /v1/public/shops/:slug/products/:productSlug` | Product detail + variants |
| `POST /v1/public/shops/:slug/auth/register` | Customer registration |
| `POST /v1/public/shops/:slug/auth/login` | Customer login |
| `POST /v1/public/shops/:slug/checkout` | Create order + SSLCommerz payment |

### Auth
| Endpoint | Purpose |
|---|---|
| `POST /v1/auth/login` | Admin/staff login |
| `POST /v1/auth/refresh` | Rotate token pair |
| `POST /v1/auth/logout` | Revoke refresh token |

### Admin (Requires Bearer Token)
Products, Orders, Customers, Payments (manual + refunds), Deliveries, Campaigns, Inventory, Website Settings, Shops, Users — see [full matrix in system-flow-audit.md](docs/system-flow-audit.md#5-api-endpoint-matrix).

### Driver
| Endpoint | Purpose |
|---|---|
| `POST /v1/driver/auth/login` | Driver login |
| `GET /v1/driver/assignments` | My assigned deliveries |
| `POST /v1/driver/assignments/:id/location` | Post GPS coordinates |
| `PATCH /v1/driver/assignments/:id/status` | Update delivery status |

## Database

16 PostgreSQL tables with UUIDs, JSONB columns, CHECK constraints, and foreign keys:

`subscription_plans` · `shops` · `users` · `customers` · `products` · `product_variants` · `orders` · `order_items` · `payments` · `refunds` · `delivery_requests` · `marketing_campaigns` · `inventory_movements` · `website_settings` · `refresh_tokens` · `audit_log`

Full schema: [`db/schema.sql`](db/schema.sql)

## Running the Smoke Test

```bash
# Copy smoke test into the backend container and run it
docker cp scripts/smoke-test.js ecomai_api:/app/smoke-test.js
docker exec ecomai_api bun run /app/smoke-test.js
```

Expected output: **31 passed, 0 failed out of 31**

## Documentation

- [System Flow Audit](docs/system-flow-audit.md) — Click-by-click user flows with exact backend logic and DB changes for every action
- [Platform Architecture Plan](docs/platform-architecture-plan.md) — Original architecture design document

## Environment Variables

All environment variables are set directly in `docker-compose.yml` for Docker isolation:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://ecomai:ecomai_secret@postgres:5432/ecomai` | PostgreSQL connection |
| `JWT_SECRET` | `ecomai_jwt_secret_2025` | JWT signing key |
| `JWT_ACCESS_EXPIRES` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh token lifetime |
| `SSLCOMMERZ_STORE_ID` | `neege6997413bb22cd` | SSLCommerz sandbox store |
| `SSLCOMMERZ_STORE_PASSWORD` | *(set in docker-compose)* | SSLCommerz sandbox password |
| `SSLCOMMERZ_SANDBOX` | `true` | Use sandbox mode |
| `APP_URL` | `http://localhost:5173` | Frontend URL (for callbacks) |
| `API_URL` | `http://localhost:3000` | Backend URL |

## License

Private — All rights reserved.

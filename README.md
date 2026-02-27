# Ecomai Project

Ecomai is a **multi-tenant e-commerce backend scaffold** built with **Node.js + Express**.
It is designed around a **fixed backend contract + flexible frontend** model, where all tenant-scoped data is isolated by `shop_id` and consumed through a stable API surface.

---

## Table of Contents
- [1) What this repo is](#1-what-this-repo-is)
- [2) Current architecture](#2-current-architecture)
- [3) Tenant isolation model](#3-tenant-isolation-model)
- [4) Project structure](#4-project-structure)
- [5) Quick start](#5-quick-start)
- [6) Demo users](#6-demo-users)
- [7) Environment variables](#7-environment-variables)
- [8) API surface](#8-api-surface)
- [9) Typical end-to-end flow](#9-typical-end-to-end-flow)
- [10) Testing](#10-testing)
- [11) Database schema](#11-database-schema)
- [12) What is implemented vs next](#12-what-is-implemented-vs-next)

---

## 1) What this repo is

This codebase provides:
- Multi-tenant API scaffolding with role-aware authorization
- Domain modules for catalog, orders, delivery, marketing, and storefront settings
- In-memory repositories that mimic persistence boundaries
- A PostgreSQL schema file (`db/schema.sql`) to support migration to DB-backed repositories
- A growing test suite using `node:test`

This repo is intended to be the execution base for the platform architecture documented in:
- `docs/platform-architecture-plan.md`

---

## 2) Current architecture

The backend is split by responsibility:

- **routes/**: HTTP transport (request/response mapping, status codes)
- **services/**: domain/business rules and validation
- **repositories/**: persistence abstraction boundary
- **middleware/**: auth, roles, and tenant context extraction
- **errors/**: shared typed/domain errors
- **store.js**: in-memory data for fast local iteration

This keeps route contracts stable while enabling a repository swap from in-memory to PostgreSQL.

---

## 3) Tenant isolation model

Tenant isolation is enforced by design:

1. Authentication token carries `shop_id` for non-super-admin users.
2. `resolveTenant` middleware derives `req.tenantShopId`.
3. `requireTenantContext` ensures tenant scope is present where required.
4. Services/repositories only operate on records constrained by tenant scope.
5. Super admins can scope requests via `x-shop-id` where applicable.

---

## 4) Project structure

```text
src/
  app.js
  config.js
  errors/
  middleware/
  repositories/
  routes/
  services/
  store.js

db/
  schema.sql

docs/
  platform-architecture-plan.md

tests/
  *.test.js
```

---

## 5) Quick start

```bash
npm install
npm run start
```

Development mode:

```bash
npm run dev
```

Build check:

```bash
npm run build
```

Test suite:

```bash
npm test
```

---

## 6) Demo users

- `super@ecomai.dev` / `password123` → `super_admin`
- `admin@coffee.dev` / `password123` → `shop_admin` (`shop_1`)
- `staff@coffee.dev` / `password123` → `shop_user` (`shop_1`)
- `driver@coffee.dev` / `password123` → `delivery_agent` (`shop_1`)

---

## 7) Environment variables

- `PORT` (default: `3000`)
- `JWT_SECRET` (default fallback is set for local/dev only)

Create a `.env` if needed:

```env
PORT=3000
JWT_SECRET=dev-secret-change-me
```

---

## 8) API surface

### Health
- `GET /health`

### Auth
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`

### Users
- `GET /v1/users/me`
- `POST /v1/users`

### Shops
- `GET /v1/shops/me`
- `GET /v1/shops`
- `POST /v1/shops`
- `GET /v1/shops/:shopId`
- `PATCH /v1/shops/:shopId`
- `GET /v1/shops/:shopId/settings`

### Customers
- `GET /v1/customers`
- `POST /v1/customers`

### Products
- `GET /v1/products`
- `GET /v1/products/:productId`
- `POST /v1/products`
- `PATCH /v1/products/:productId`
- `DELETE /v1/products/:productId`

### Product variants
- `GET /v1/products/:productId/variants`
- `POST /v1/products/:productId/variants`
- `GET /v1/product-variants/:variantId`
- `PATCH /v1/product-variants/:variantId`
- `DELETE /v1/product-variants/:variantId`

### Inventory
- `GET /v1/inventory-movements` (`?variantId=` optional)

### Orders
- `GET /v1/orders`
- `GET /v1/orders/:orderId`
- `POST /v1/orders`
- `PATCH /v1/orders/:orderId/status`
- `POST /v1/orders/:orderId/cancel`
- `POST /v1/orders/:orderId/payments`
- `POST /v1/orders/:orderId/delivery-requests`

### Payments / refunds
- `GET /v1/payments`
- `GET /v1/payments/:paymentId`
- `POST /v1/payments/:paymentId/refunds`

### Delivery admin
- `GET /v1/delivery-requests`
- `GET /v1/delivery-requests/:deliveryRequestId`
- `PATCH /v1/delivery-requests/:deliveryRequestId/status`
- `PATCH /v1/delivery-requests/:deliveryRequestId/assign-driver`

### Driver mobile API
- `POST /v1/driver/auth/login`
- `GET /v1/driver/assignments`
- `POST /v1/driver/assignments/:id/location`
- `PATCH /v1/driver/assignments/:id/status`

### Marketing campaigns
- `GET /v1/marketing-campaigns`
- `GET /v1/marketing-campaigns/:campaignId`
- `POST /v1/marketing-campaigns`
- `POST /v1/marketing-campaigns/generate-draft`
- `PATCH /v1/marketing-campaigns/:campaignId/status`
- `POST /v1/marketing-campaigns/:campaignId/performance`

### Website settings
- `GET /v1/website-settings/me`
- `PATCH /v1/website-settings/me`

---

## 9) Typical end-to-end flow

1. Login as shop admin (`/v1/auth/login`)
2. Create product (`/v1/products`)
3. Create variant (`/v1/products/:id/variants`)
4. Place order with `product_variant_id` (`/v1/orders`)
5. System deducts variant stock + records inventory movement
6. Capture payment (`/v1/orders/:orderId/payments`)
7. Create delivery request (`/v1/orders/:orderId/delivery-requests`)
8. Assign driver (`/v1/delivery-requests/:id/assign-driver`)
9. Driver updates status/location (`/v1/driver/...`)
10. Generate/launch campaign and ingest performance (`/v1/marketing-campaigns/...`)

---

## 10) Testing

Tests are under `tests/*.test.js` and cover:
- auth token lifecycle
- tenant middleware behavior
- product + variant lifecycle
- order lifecycle and status transitions
- inventory deduction + movement logging
- payment + refund validations
- delivery admin + driver flows
- marketing draft + lifecycle + performance ingestion
- shop/user flows
- website settings

Run:

```bash
npm test
```

---

## 11) Database schema

`db/schema.sql` includes tenant-aware tables for:
- `shops`, `users`, `customers`
- `products`, `product_variants`
- `orders`, `order_items`
- `inventory_movements`
- `payments`, `refunds`
- `delivery_requests`
- `marketing_campaigns`
- `website_settings`

All business-critical tenant-scoped entities include `shop_id`.

---

## 12) What is implemented vs next

### Implemented now
- Broad API surface for core e-commerce operations
- Tenant-aware auth and RBAC pattern
- Inventory-aware order allocations
- Payment/refund and delivery workflows
- Marketing lifecycle + feedback ingestion

### Next high-value steps
- Replace in-memory repositories with PostgreSQL-backed implementations
- Add pagination/filters/DTO validation consistently
- Add idempotency keys for financial/delivery writes
- Add audit logs + webhook/event outbox
- Add observability (structured logging, metrics, tracing)
- Harden auth (refresh token hashing/storage, key rotation/JWKS)

---

For product/architecture context, see:
- `docs/platform-architecture-plan.md`

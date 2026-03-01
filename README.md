
<div align="center">

```
 ███████╗ ██████╗ ██████╗ ███╗   ███╗ █████╗ ██╗
 ██╔════╝██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║
 █████╗  ██║     ██║   ██║██╔████╔██║███████║██║
 ██╔══╝  ██║     ██║   ██║██║╚██╔╝██║██╔══██║██║
 ███████╗╚██████╗╚██████╔╝██║ ╚═╝ ██║██║  ██║██║
 ╚══════╝ ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝
```

### Multi-Tenant SaaS E-Commerce Platform

[![Tests](https://img.shields.io/badge/tests-81_passed-brightgreen)](#testing)
[![Tables](https://img.shields.io/badge/database-32_tables-blue)](#database-schema)
[![Endpoints](https://img.shields.io/badge/API-70%2B_endpoints-orange)](#api-overview-70-endpoints)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED)](#quick-start)

**Production-grade** · **Fully Dockerized** · **Zero Config** · **One-Command Deploy**

</div>

---

## What is Ecomai?

Ecomai is a **complete multi-tenant SaaS e-commerce platform** — like Shopify, but open-source and self-hosted. Any merchant signs up, picks a subscription plan, and gets a fully-functional online store with admin dashboard, customer storefront, payment processing, delivery tracking, and marketing tools — all in under 60 seconds.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐       │
│   │  Coffee   │   │  Fashion  │   │  Grocery  │   │   Tech   │  ... │
│   │   Shop    │   │   Hub     │   │  Basket   │   │  Gadgets │      │
│   │  ┌────┐  │   │  ┌────┐  │   │  ┌────┐  │   │  ┌────┐  │      │
│   │  │Shop│  │   │  │Shop│  │   │  │Shop│  │   │  │Shop│  │      │
│   │  │Admin│  │   │  │Admin│  │   │  │Admin│  │   │  │Admin│  │      │
│   │  └────┘  │   │  └────┘  │   │  └────┘  │   │  └────┘  │      │
│   │  ┌────┐  │   │  ┌────┐  │   │  ┌────┐  │   │  ┌────┐  │      │
│   │  │Store│  │   │  │Store│  │   │  │Store│  │   │  │Store│  │      │
│   │  │front│  │   │  │front│  │   │  │front│  │   │  │front│  │      │
│   │  └────┘  │   │  └────┘  │   │  └────┘  │   │  └────┘  │      │
│   └──────────┘   └──────────┘   └──────────┘   └──────────┘       │
│         │              │              │              │               │
│         └──────────────┴──────────────┴──────────────┘               │
│                                │                                     │
│                    ┌───────────▼───────────┐                        │
│                    │   Ecomai SaaS Engine  │                        │
│                    │  One Codebase • N shops│                        │
│                    └───────────────────────┘                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Platform at a Glance

```
╔══════════════════════════════════════════════════════════════╗
║                     ECOMAI — BY THE NUMBERS                 ║
╠══════════════════╦══════════════════╦════════════════════════╣
║  70+ REST APIs   ║  32 DB Tables    ║  81 Automated Tests   ║
║  4 User Roles    ║  4 Sub Plans     ║  31 Smoke Tests       ║
║  29 Admin Pages  ║  14 Middlewares  ║  Zero-Config Docker   ║
╚══════════════════╩══════════════════╩════════════════════════╝
```

---

## System Architecture

```
                           ┌─────────────────────┐
                           │     Internet /       │
                           │     Mobile App       │
                           └──────────┬──────────┘
                                      │
                           ┌──────────▼──────────┐
                           │   Docker Network     │
                           │   (ecomai_network)   │
                           └──────────┬──────────┘
                                      │
               ┌──────────────────────┼──────────────────────┐
               │                      │                      │
    ┌──────────▼──────────┐ ┌────────▼─────────┐ ┌─────────▼─────────┐
    │   ecomai_web :5173  │ │ ecomai_api :3000 │ │  ecomai_pg :5432  │
    │                     │ │                  │ │                   │
    │  ┌───────────────┐  │ │ ┌──────────────┐ │ │  ┌─────────────┐ │
    │  │  React 18     │  │ │ │  Express.js  │ │ │  │ PostgreSQL  │ │
    │  │  + Vite 7.3   │  │ │ │  + Bun 1.1   │ │ │  │    16       │ │
    │  │  + Tailwind v4│  │ │ │              │ │ │  │             │ │
    │  │  + Router v6  │  │ │ │  14 middle-  │ │ │  │  32 tables  │ │
    │  └───────────────┘  │ │ │  wares       │ │ │  │  UUIDs      │ │
    │                     │ │ │              │ │ │  │  JSONB       │ │
    │  ┌───────────────┐  │ │ │  17 route    │ │ │  │  Indexes    │ │
    │  │  Admin Panel  │──┤ │ │  modules     │ │ │  │  Soft Del.  │ │
    │  │  29 pages     │  │ │ │              │ │ │  └─────────────┘ │
    │  └───────────────┘  │ │ │  15 service  │ │ │                   │
    │                     │ │ │  modules     │ │ │  ┌─────────────┐ │
    │  ┌───────────────┐  │ │ │              │ │ │  │  Pool:      │ │
    │  │  Storefront   │──┤ │ │  15 repos    │ │ │  │  max: 20    │ │
    │  │  Per-shop     │  │ │ └──────┬───────┘ │ │  │  idle: 30s  │ │
    │  └───────────────┘  │ │        │         │ │  │  stmt: 30s  │ │
    └─────────────────────┘ │        │         │ │  └─────────────┘ │
                            └────────┼─────────┘ └─────────────────┘
                                     │                    ▲
                                     └────────────────────┘
                                      Parameterized SQL
                                      + Connection Pool
```

---

## Request Lifecycle

Every HTTP request flows through a hardened pipeline of 14 middleware layers:

```
  Client Request
       │
       ▼
  ┌─────────────┐
  │   Helmet     │  Security headers (CSP, HSTS, X-Frame)
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │    CORS      │  Origin whitelist
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ Compression  │  gzip / brotli
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ Rate Limiter │  300/15min API, 20/15min auth, 10/15min write
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │ Correlation  │  x-request-id (UUID v4) on every request
  │     ID       │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  Request     │  JSON structured log { method, url, ms, requestId }
  │  Logger      │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  Body Parse  │  JSON 10kb / URL-encoded 100kb limits
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  JWT Auth    │  Verify token → { sub, role, shop_id }
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  Tenant      │  Enforce shop_id scoping on every query
  │  Resolver    │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  Validate    │  Body schema (type, required, pattern, oneOf)
  │  Body        │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │  Plan Limit  │  Check subscription usage before creation
  │  Enforcer    │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │   Route      │  Business logic (Service → Repository → DB)
  │  Handler     │
  └──────┬──────┘
         ▼
  ┌─────────────┐
  │   Error      │  Structured JSON error + requestId + stack (dev)
  │  Handler     │
  └──────┬──────┘
         ▼
    JSON Response
```

---

## Multi-Tenant Data Isolation

Every database query is scoped by `shop_id` — guaranteed at the middleware layer. Zero cross-tenant leakage by design:

```
  ┌─────────────────────────────────────────────────────────┐
  │                    SINGLE DATABASE                       │
  │                                                         │
  │   ┌───────────────────────────────────────────────┐     │
  │   │  products  WHERE shop_id = $1                 │     │
  │   ├───────────────────────────────────────────────┤     │
  │   │ shop_id=AAA │ shop_id=BBB │ shop_id=CCC │ ...│     │
  │   │ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │   │     │
  │   │ │ Latte   │ │ │ T-Shirt │ │ │ Apples  │ │   │     │
  │   │ │ Mocha   │ │ │ Jeans   │ │ │ Bread   │ │   │     │
  │   │ │ Beans   │ │ │ Hoodie  │ │ │ Milk    │ │   │     │
  │   │ └─────────┘ │ └─────────┘ │ └─────────┘ │   │     │
  │   └───────────────────────────────────────────────┘     │
  │                                                         │
  │   ┌───────────────────────────────────────────────┐     │
  │   │  orders   WHERE shop_id = $1                  │     │
  │   ├───────────────────────────────────────────────┤     │
  │   │ shop_id=AAA │ shop_id=BBB │ shop_id=CCC │    │     │
  │   │  12 orders  │  45 orders  │   3 orders  │    │     │
  │   └───────────────────────────────────────────────┘     │
  │                                                         │
  │   Same pattern for: customers, payments, reviews,       │
  │   deliveries, campaigns, settings, images, variants...  │
  └─────────────────────────────────────────────────────────┘

  Request: GET /v1/products
  Token:   { sub: "user-123", role: "shop_admin", shop_id: "AAA" }
                                                        │
           ┌────────────────────────────────────────────┘
           ▼
  SQL:  SELECT * FROM products
        WHERE shop_id = 'AAA'          ◄── Injected by tenant middleware
        AND deleted_at IS NULL         ◄── Soft delete filter
        ORDER BY created_at DESC
        LIMIT 20 OFFSET 0
```

---

## Features

<table>
<tr><td>

### Core Commerce
- **Multi-Tenant Architecture** — Every query scoped by `shop_id`
- **Self-Service Onboarding** — Pick plan → register → live store
- **Product Management** — CRUD + variants + CSV export + stats
- **Order Lifecycle** — State machine with inventory decrements
- **Bulk Operations** — Batch status updates (50/batch) + CSV
- **Soft Delete** — `deleted_at` timestamps, never lose data

</td><td>

### Payments & Checkout
- **SSLCommerz** — Redirect + IPN, fail-closed webhook
- **Cash on Delivery** — COD with dedicated UI selector
- **Refunds** — Partial/full with cumulative validation
- **Manual Payments** — Cash/bank recording
- **Plan Billing** — SSLCommerz subscription payments
- **Earnings** — Commission tracking + withdrawal workflow

</td></tr>
<tr><td>

### Storefront
- **Public API** — Per-shop catalog, auth, checkout, wishlists
- **Website Customizer** — Template, theme, SEO, analytics
- **Product Reviews** — Submit + admin moderation + stats
- **Custom CSS/JS** — Sandboxed, size-limited, validated
- **Customer Auth** — Register, login, forgot/reset password
- **Order History** — Full order tracking per customer

</td><td>

### Operations
- **Delivery Tracking** — Create, assign, GPS, status
- **Driver Mobile API** — Login, assignments, GPS posting
- **Marketing Campaigns** — Email, SMS, social, Google Ads
- **Newsletter** — Subscriber collection + CSV export
- **Inventory** — Movement tracking + auto adjustments
- **Categories** — Hierarchical product categorization

</td></tr>
</table>

---

## Order Lifecycle State Machine

Orders follow a strict state machine — only valid transitions are allowed:

```
                         ┌──────────────────────────────────────────┐
                         │         ORDER STATE MACHINE               │
                         └──────────────────────────────────────────┘

   ┌──────────┐     ┌───────────┐     ┌────────────┐     ┌──────────┐     ┌───────────┐
   │          │     │           │     │            │     │          │     │           │
   │ PENDING  ├────►│ CONFIRMED ├────►│ PROCESSING ├────►│ SHIPPED  ├────►│ DELIVERED │
   │          │     │           │     │            │     │          │     │           │
   └────┬─────┘     └─────┬─────┘     └─────┬──────┘     └──────────┘     └───────────┘
        │                 │                  │
        │                 │                  │
        ▼                 ▼                  ▼
   ┌──────────┐     ┌───────────┐     ┌────────────┐
   │CANCELLED │     │ CANCELLED │     │ CANCELLED  │
   └──────────┘     └───────────┘     └────────────┘

   On each transition:
   ┌──────────────────────────────────────────────────────┐
   │  ✓ Validate state machine (reject invalid jumps)     │
   │  ✓ SELECT FOR UPDATE (prevent race conditions)       │
   │  ✓ Decrement inventory (on confirmed)                │
   │  ✓ Restore inventory (on cancelled)                  │
   │  ✓ Record inventory movement log                     │
   │  ✓ All inside a DB transaction (atomic)              │
   └──────────────────────────────────────────────────────┘
```

---

## Subscription Engine

```
  ╔═════════════════════════════════════════════════════════════════════╗
  ║                    SUBSCRIPTION PLANS                              ║
  ╠════════════════╦════════════════╦════════════════╦═════════════════╣
  ║    FREE        ║    STARTER     ║    GROWTH      ║   ENTERPRISE    ║
  ║    ৳0/mo       ║    ৳999/mo     ║    ৳2,499/mo   ║    Custom       ║
  ╠════════════════╬════════════════╬════════════════╬═════════════════╣
  ║  10 products   ║  100 products  ║  1000 products ║  Unlimited      ║
  ║  50 orders/mo  ║  500 orders/mo ║  5000 orders   ║  Unlimited      ║
  ║  100MB storage ║  1GB storage   ║  10GB storage  ║  Unlimited      ║
  ║  ── ── ── ──   ║  ── ── ── ──   ║  ── ── ── ──  ║  ── ── ── ──   ║
  ║  Basic store   ║  CSV exports   ║  All features  ║  Priority       ║
  ║  Email support ║  Priority      ║  API access    ║  Dedicated      ║
  ║                ║  support       ║  Bulk ops      ║  support        ║
  ╚════════════════╩════════════════╩════════════════╩═════════════════╝

  Enforcement Flow:
  ┌──────────┐    ┌───────────────┐    ┌─────────────┐    ┌──────────┐
  │  Create  │───►│ Plan Limit    │───►│ Usage Check  │───►│ Allowed  │
  │  Product │    │ Middleware    │    │ (atomic SQL) │    │  ✓ 201   │
  └──────────┘    └───────┬───────┘    └──────┬───────┘    └──────────┘
                          │                   │
                          │    Over Limit     │
                          │                   ▼
                          │            ┌──────────────┐
                          └───────────►│  Rejected    │
                                       │  ✗ 403      │
                                       │  "Plan limit │
                                       │   reached"   │
                                       └──────────────┘
```

---

## Payment Flow

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                    PAYMENT PROCESSING                            │
  └──────────────────────────────────────────────────────────────────┘

  Option A: SSLCommerz (Online Payment)
  ═══════════════════════════════════════

  Customer                 Ecomai API              SSLCommerz
     │                        │                        │
     │  POST /checkout        │                        │
     │  {items, payment:      │                        │
     │   "sslcommerz"}        │                        │
     ├───────────────────────►│                        │
     │                        │  Init Payment Session  │
     │                        ├───────────────────────►│
     │                        │                        │
     │                        │  ◄── Gateway URL ──────┤
     │  ◄── Redirect ─────── │                        │
     │                        │                        │
     │  ────────── Pay on SSLCommerz Gateway ────────► │
     │                        │                        │
     │                        │  IPN Callback (POST)   │
     │                        │◄───────────────────────┤
     │                        │                        │
     │                        │  ┌──────────────────┐  │
     │                        │  │ VERIFY:           │  │
     │                        │  │ 1. Call validate  │  │
     │                        │  │ 2. Check amount   │  │
     │                        │  │    (±1 BDT tol.)  │  │
     │                        │  │ 3. Fail-closed on │  │
     │                        │  │    network error  │  │
     │                        │  └──────────────────┘  │
     │                        │                        │
     │  ◄── Order Confirmed ──│                        │
     │                        │                        │

  Option B: Cash on Delivery (COD)
  ═════════════════════════════════

  Customer                 Ecomai API
     │                        │
     │  POST /checkout        │
     │  {items, payment:      │
     │   "cod"}               │
     ├───────────────────────►│
     │                        │  ┌──────────────────┐
     │                        │  │ 1. Create order   │
     │                        │  │ 2. Record COD     │
     │                        │  │    payment record │
     │                        │  │ 3. Status: pending│
     │                        │  └──────────────────┘
     │  ◄── Order Created ────│
     │      (awaiting COD)    │

  Option C: Manual Payment (Admin)
  ═════════════════════════════════

  Admin records cash/bank payments manually via dashboard
  Supports: cash, bank_transfer, mobile_banking
```

---

## Security Architecture

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                   SECURITY LAYERS                                │
  ├──────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  LAYER 1 — NETWORK                                               │
  │  ┌─────────────────────────────────────────────────────────────┐ │
  │  │  Helmet (14 HTTP security headers)                          │ │
  │  │  CORS origin whitelist                                      │ │
  │  │  Rate limiting (4 tiers: API / auth / customer / write)     │ │
  │  │  Body size limits (JSON 10kb, URL-encoded 100kb)            │ │
  │  │  Response compression (gzip / brotli)                       │ │
  │  └─────────────────────────────────────────────────────────────┘ │
  │                                                                  │
  │  LAYER 2 — AUTHENTICATION                                       │
  │  ┌─────────────────────────────────────────────────────────────┐ │
  │  │  JWT RS256 with 15min access + 7d refresh tokens            │ │
  │  │  Token rotation on every refresh (old token revoked)        │ │
  │  │  Hourly cleanup of expired refresh tokens                   │ │
  │  │  bcrypt password hashing (salt rounds: 10)                  │ │
  │  │  Role-based access: super_admin, shop_admin, shop_user,     │ │
  │  │                      delivery_agent                         │ │
  │  └─────────────────────────────────────────────────────────────┘ │
  │                                                                  │
  │  LAYER 3 — DATA INTEGRITY                                       │
  │  ┌─────────────────────────────────────────────────────────────┐ │
  │  │  Tenant isolation (shop_id on every query, middleware-level) │ │
  │  │  Input validation (type, required, pattern, oneOf, length)  │ │
  │  │  Parameterized SQL (zero SQL injection surface)             │ │
  │  │  Soft delete (data never permanently lost)                  │ │
  │  │  SELECT FOR UPDATE (race-condition-safe stock decrements)   │ │
  │  └─────────────────────────────────────────────────────────────┘ │
  │                                                                  │
  │  LAYER 4 — FILE & CONTENT                                       │
  │  ┌─────────────────────────────────────────────────────────────┐ │
  │  │  File upload: extension whitelist + magic byte MIME check   │ │
  │  │  Image formats: JPEG (FF D8 FF), PNG (89 50 4E 47),        │ │
  │  │                 GIF (47 49 46 38), WebP (RIFF...WEBP)       │ │
  │  │  Max file size: 5MB per image                               │ │
  │  │  Custom JS sandboxed in try/catch (10KB limit)              │ │
  │  │  Analytics IDs regex-validated (GA4, FB Pixel, GTM)         │ │
  │  └─────────────────────────────────────────────────────────────┘ │
  │                                                                  │
  │  LAYER 5 — INFRASTRUCTURE                                       │
  │  ┌─────────────────────────────────────────────────────────────┐ │
  │  │  Non-root container (appuser — least privilege)             │ │
  │  │  Graceful shutdown with connection draining (10s timeout)   │ │
  │  │  DB pool tuning (max:20, idle:30s, conn:5s, stmt:30s)      │ │
  │  │  Request correlation IDs (x-request-id UUID v4)             │ │
  │  │  Structured JSON logging (timing + context + request-id)    │ │
  │  │  Docker resource limits (512M backend, 256M frontend)       │ │
  │  │  Env var interpolation (no hardcoded secrets)               │ │
  │  └─────────────────────────────────────────────────────────────┘ │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

32 PostgreSQL tables organized into 5 domains:

```
  ┌────────────────────────────────────────────────────────────────────────────┐
  │                         DATABASE ENTITY MAP                                │
  │                         PostgreSQL 16 · 32 Tables · UUIDs                  │
  ├────────────────────────────────────────────────────────────────────────────┤
  │                                                                            │
  │   CORE                          ORDERS & PAYMENTS                          │
  │   ┌──────────────┐              ┌──────────────┐                           │
  │   │    shops     │──┐      ┌───►│   orders     │◄── soft delete            │
  │   └──────────────┘  │      │    └──────┬───────┘                           │
  │   ┌──────────────┐  │      │           │                                   │
  │   │    users     │◄─┤      │    ┌──────▼───────┐                           │
  │   └──────────────┘  │      │    │ order_items  │                           │
  │   ┌──────────────┐  │      │    └──────────────┘                           │
  │   │  customers   │◄─┤──────┘    ┌──────────────┐                           │
  │   └──────────────┘  │          │  payments    │                           │
  │     ◄── soft del.   │          └──────────────┘                           │
  │   ┌──────────────┐  │          ┌──────────────┐                           │
  │   │  products    │◄─┤          │   refunds    │                           │
  │   └──────┬───────┘  │          └──────────────┘                           │
  │     ◄── soft del.   │          ┌──────────────┐                           │
  │          │          │          │  delivery_   │                           │
  │   ┌──────▼───────┐  │          │  requests    │                           │
  │   │  product_    │  │          └──────────────┘                           │
  │   │  variants    │  │          ┌──────────────┐                           │
  │   └──────────────┘  │          │  inventory_  │                           │
  │   ┌──────────────┐  │          │  movements   │                           │
  │   │  product_    │  │          └──────────────┘                           │
  │   │  images      │  │                                                      │
  │   └──────────────┘  │   SUBSCRIPTIONS                                      │
  │   ┌──────────────┐  │   ┌──────────────────┐                               │
  │   │  categories  │  │   │ subscription_    │                               │
  │   └──────────────┘  │   │ plans            │                               │
  │   ┌──────────────┐  │   └──────────────────┘                               │
  │   │  category_   │  │   ┌──────────────────┐                               │
  │   │  requests    │  │   │ shop_            │                               │
  │   └──────────────┘  │   │ subscriptions    │                               │
  │                      │   └──────────────────┘                               │
  │                      │   ┌──────────────────┐                               │
  │   ENGAGEMENT         │   │ subscription_    │                               │
  │   ┌──────────────┐  │   │ payments         │                               │
  │   │  marketing_  │◄─┤   └──────────────────┘                               │
  │   │  campaigns   │  │   ┌──────────────────┐                               │
  │   └──────────────┘  │   │ subscription_    │                               │
  │   ┌──────────────┐  │   │ usage            │                               │
  │   │  product_    │◄─┤   └──────────────────┘                               │
  │   │  reviews     │  │   ┌──────────────────┐                               │
  │   └──────────────┘  │   │ subscription_    │                               │
  │   ┌──────────────┐  │   │ audit_log        │                               │
  │   │  newsletter_ │◄─┤   └──────────────────┘                               │
  │   │  subscribers │  │                                                      │
  │   └──────────────┘  │   PLATFORM                                           │
  │   ┌──────────────┐  │   ┌──────────────────┐                               │
  │   │  wishlists   │◄─┘   │ website_settings │                               │
  │   └──────────────┘      └──────────────────┘                               │
  │                          ┌──────────────────┐                               │
  │                          │ refresh_tokens   │                               │
  │                          └──────────────────┘                               │
  │                          ┌──────────────────┐                               │
  │                          │ audit_log        │                               │
  │                          └──────────────────┘                               │
  │                          ┌──────────────────┐                               │
  │                          │ coupons          │                               │
  │                          └──────────────────┘                               │
  │                          ┌──────────────────┐                               │
  │                          │ invoices         │                               │
  │                          └──────────────────┘                               │
  │                          ┌──────────────────┐                               │
  │                          │ earnings_*       │  (transactions,               │
  │                          │ shop_earnings    │   withdrawals)                │
  │                          └──────────────────┘                               │
  │                                                                            │
  └────────────────────────────────────────────────────────────────────────────┘
```

Full schema: [`db/schema.sql`](db/schema.sql)

---

## Tech Stack

```
  ┌──────────────────────────────────────────────────────────────┐
  │                        TECH STACK                            │
  ├──────────┬───────────────────────────────────────────────────┤
  │ Runtime  │  Bun 1.1 (Alpine container) — 2–5x faster Node   │
  ├──────────┼───────────────────────────────────────────────────┤
  │ Backend  │  Express.js 4 — REST API, 17 route modules        │
  ├──────────┼───────────────────────────────────────────────────┤
  │ Frontend │  React 18 + Vite 7.3 + Tailwind CSS v4            │
  │          │  React Router v6 · 29 admin pages · storefront    │
  ├──────────┼───────────────────────────────────────────────────┤
  │ Database │  PostgreSQL 16 — 32 tables, UUIDs, JSONB,         │
  │          │  CHECK constraints, composite indexes, soft del.  │
  ├──────────┼───────────────────────────────────────────────────┤
  │ Auth     │  JWT (jsonwebtoken) + bcryptjs (salt: 10)         │
  │          │  Access 15m + Refresh 7d with rotation            │
  ├──────────┼───────────────────────────────────────────────────┤
  │ Payments │  SSLCommerz sandbox + COD + Manual recording      │
  ├──────────┼───────────────────────────────────────────────────┤
  │ Security │  Helmet · CORS · Rate-limit · Compression ·      │
  │          │  Request-ID · MIME validation · Input validation   │
  ├──────────┼───────────────────────────────────────────────────┤
  │ Docker   │  4-service Compose (web, api, pg, migrate)        │
  │          │  Healthchecks · Resource limits · Non-root         │
  └──────────┴───────────────────────────────────────────────────┘
```

---

## Quick Start

> **Requirement:** Docker & Docker Compose installed. Nothing else needed.

```bash
# Clone and start everything (one command)
git clone <repo-url> && cd Ecomai
docker compose up --build
```

```
  ┌─────────────────────────────────────────────────────────────┐
  │                    RUNNING SERVICES                          │
  ├─────────────────┬──────────────────┬────────────────────────┤
  │  Service        │  URL             │  Container             │
  ├─────────────────┼──────────────────┼────────────────────────┤
  │  Frontend       │  localhost:5173  │  ecomai_web            │
  │  Backend API    │  localhost:3000  │  ecomai_api            │
  │  PostgreSQL     │  localhost:5432  │  ecomai_pg             │
  │  Auto-Migrate   │  (runs & exits)  │  ecomai_migrate        │
  └─────────────────┴──────────────────┴────────────────────────┘
```

The migrate container automatically creates all 32 tables and seeds demo data on first boot.

### Demo Credentials

```
  ┌────────────────────┬─────────────────────┬──────────────┐
  │  Role              │  Email              │  Password    │
  ├────────────────────┼─────────────────────┼──────────────┤
  │  Super Admin       │  super@ecomai.dev   │  password123 │
  │  Shop Admin        │  admin@coffee.dev   │  password123 │
  │  Shop Staff        │  staff@coffee.dev   │  password123 │
  │  Shop Admin #2     │  admin@fashion.dev  │  password123 │
  └────────────────────┴─────────────────────┴──────────────┘
```

### Stop / Reset

```bash
docker compose down          # Stop (keeps data)
docker compose down -v       # Full reset (destroys database)
docker compose up --build    # Rebuild from scratch
```

---

## Docker Container Topology

```
  ┌──────────────────────── docker-compose.yml ────────────────────────┐
  │                                                                     │
  │   ┌─────────────────────────────────────────────────────────────┐   │
  │   │                    ecomai_network (bridge)                  │   │
  │   └───────┬───────────────┬───────────────┬────────────────────┘   │
  │           │               │               │                        │
  │   ┌───────▼──────┐ ┌─────▼──────┐ ┌──────▼──────┐                 │
  │   │  ecomai_web  │ │ ecomai_api │ │  ecomai_pg  │                 │
  │   │              │ │            │ │             │                 │
  │   │  Vite Dev    │ │ Bun +      │ │ PostgreSQL  │                 │
  │   │  Server      │ │ Express    │ │   16        │                 │
  │   │              │ │            │ │             │                 │
  │   │  Port: 5173  │ │ Port: 3000 │ │ Port: 5432  │                 │
  │   │  Mem: 256M   │ │ Mem: 512M  │ │ Vol: pgdata │                 │
  │   │              │ │ User: app  │ │             │                 │
  │   │  Hot Reload  │ │ Healthchk  │ │ Persistent  │                 │
  │   └──────────────┘ └─────┬──────┘ └──────▲──────┘                 │
  │                          │               │                        │
  │                          └───────────────┘                        │
  │                        Parameterized SQL                          │
  │                        (Pool: max 20)                             │
  │                                                                     │
  │   ┌──────────────┐                                                  │
  │   │ecomai_migrate│  Runs schema.sql + seed.sql on boot,            │
  │   │  (run-once)  │  then exits. Auto-creates 32 tables.            │
  │   └──────────────┘                                                  │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## Merchant Onboarding Flow

```
  Visitor                    Ecomai Platform                    Database
     │                            │                                │
     │  1. Browse /pricing        │                                │
     │  ┌──────────────────────┐  │                                │
     │  │  Compare 4 plans:    │  │                                │
     │  │  Free / Starter /    │  │                                │
     │  │  Growth / Enterprise │  │                                │
     │  └──────────────────────┘  │                                │
     │                            │                                │
     │  2. POST /v1/register      │                                │
     │  {shop_name, slug, email,  │                                │
     │   password, plan_id}       │                                │
     ├───────────────────────────►│                                │
     │                            │  ┌──────────────────────────┐  │
     │                            │  │ Validate: slug unique,   │  │
     │                            │  │ email format, password   │  │
     │                            │  │ strength, plan exists    │  │
     │                            │  └──────────────────────────┘  │
     │                            │                                │
     │                            │  BEGIN TRANSACTION             │
     │                            ├───────────────────────────────►│
     │                            │  INSERT shop                   │
     │                            │  INSERT user (shop_admin)      │
     │                            │  INSERT shop_subscription      │
     │                            │  INSERT subscription_usage     │
     │                            │  INSERT website_settings       │
     │                            │  COMMIT                        │
     │                            │◄───────────────────────────────┤
     │                            │                                │
     │  ◄── { token, shop }  ─────│                                │
     │                            │                                │
     │  3. Redirect to /admin     │                                │
     │  ┌──────────────────────┐  │                                │
     │  │  Full admin dashboard│  │                                │
     │  │  ready in < 60 sec   │  │                                │
     │  └──────────────────────┘  │                                │
     │                            │                                │
```

---

## Admin Dashboard Overview

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  ECOMAI ADMIN DASHBOARD                                    admin@shop   │
  ├───────────────┬──────────────────────────────────────────────────────────┤
  │               │                                                         │
  │  ┌─────────┐  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
  │  │Dashboard│  │  │ Orders   │ │ Revenue  │ │ Products │ │  Avg     │  │
  │  │         │  │  │   127    │ │ ৳45,600  │ │    42    │ │ ৳359/ord │  │
  │  ├─────────┤  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
  │  │Products │  │                                                         │
  │  │         │  │  ┌──────────────────────────────────────────────────┐   │
  │  ├─────────┤  │  │         ORDERS BY STATUS                         │   │
  │  │Orders   │  │  │                                                  │   │
  │  │         │  │  │  Pending     ████████████░░░░░░░  32             │   │
  │  ├─────────┤  │  │  Confirmed   ██████████░░░░░░░░░  28             │   │
  │  │Customers│  │  │  Processing  ████████░░░░░░░░░░░  22             │   │
  │  │         │  │  │  Shipped     ██████░░░░░░░░░░░░░  18             │   │
  │  ├─────────┤  │  │  Delivered   ████████████████████  45             │   │
  │  │Payments │  │  │                                                  │   │
  │  │         │  │  └──────────────────────────────────────────────────┘   │
  │  ├─────────┤  │                                                         │
  │  │Delivery │  │  ┌─────────────────────── ──────────────────────────┐   │
  │  │         │  │  │  QUICK ACTIONS                                   │   │
  │  ├─────────┤  │  │                                                  │   │
  │  │Campaigns│  │  │  [📥 Export CSV]  [⚡ Bulk Update]  [➕ New]     │   │
  │  │         │  │  │                                                  │   │
  │  ├─────────┤  │  └──────────────────────────────────────────────────┘   │
  │  │Reviews  │  │                                                         │
  │  │         │  │  ┌──────────────────────────────────────────────────┐   │
  │  ├─────────┤  │  │  RECENT ORDERS                                   │   │
  │  │Newsletter│  │  │  #1042  Karim Ahmed     ৳1,200   Shipped  ▸     │   │
  │  │         │  │  │  #1041  Fatema Akter    ৳3,450   Pending   ▸     │   │
  │  ├─────────┤  │  │  #1040  Rahim Khan      ৳890     Confirmed ▸     │   │
  │  │Settings │  │  │  #1039  Nusrat Jahan    ৳2,100   Delivered ▸     │   │
  │  │         │  │  └──────────────────────────────────────────────────┘   │
  │  └─────────┘  │                                                         │
  └───────────────┴──────────────────────────────────────────────────────────┘
```

---

## API Overview (~70+ endpoints)

```
  ┌──────────────────────────────────────────────────────────────┐
  │                       API ROUTE MAP                          │
  ├──────────────────────────────────────────────────────────────┤
  │                                                              │
  │  /health ─────────────────────────── GET  (public)           │
  │                                                              │
  │  /v1/register ────────────────────── GET plans │ POST create │
  │                                                              │
  │  /v1/auth ────────────── POST login │ refresh │ logout       │
  │                                                              │
  │  /v1/public/shops/:slug                                      │
  │    ├── / ────────────────────────── GET shop info             │
  │    ├── /settings ────────────────── GET theme                 │
  │    ├── /products ────────────────── GET catalog               │
  │    ├── /products/:slug ──────────── GET detail                │
  │    ├── /auth/register ───────────── POST customer reg         │
  │    ├── /auth/login ──────────────── POST customer login       │
  │    ├── /auth/forgot-password ────── POST reset request        │
  │    ├── /auth/reset-password ─────── POST reset confirm        │
  │    ├── /checkout ────────────────── POST create order         │
  │    ├── /newsletter ──────────────── POST subscribe            │
  │    └── /reviews ─────────────────── POST submit review        │
  │                                                              │
  │  /v1/products ──── GET list │ POST create │ PATCH │ DELETE   │
  │    ├── /export/csv ──────── GET download CSV                  │
  │    └── /stats/summary ───── GET stats                         │
  │                                                              │
  │  /v1/orders ────── GET list │ POST create │ PATCH │ DELETE   │
  │    ├── /export/csv ──────── GET download CSV                  │
  │    ├── /stats/summary ───── GET stats                         │
  │    └── /bulk/status ─────── POST batch update                 │
  │                                                              │
  │  /v1/customers ──── GET │ POST │ PATCH │ DELETE              │
  │  /v1/payments ───── GET │ POST manual │ POST refund          │
  │  /v1/categories ─── GET │ POST │ PATCH │ DELETE              │
  │  /v1/product-variants ── GET │ POST │ PATCH │ DELETE         │
  │  /v1/product-images ──── GET │ POST (multipart) │ DELETE     │
  │  /v1/website-settings ── GET │ PATCH                         │
  │  /v1/inventory ──── GET movements                             │
  │  /v1/delivery-requests ── GET │ POST │ PATCH status          │
  │  /v1/marketing-campaigns ─ GET │ POST │ PATCH │ DELETE       │
  │  /v1/shops ──────── GET │ PATCH                              │
  │  /v1/users ──────── GET │ POST │ PATCH │ DELETE              │
  │                                                              │
  │  /v1/reviews ──── GET list │ GET stats │ PATCH approve/      │
  │                    reject │ DELETE                            │
  │                                                              │
  │  /v1/newsletter ── GET list │ GET stats │ GET export │       │
  │                    PATCH unsubscribe │ DELETE                 │
  │                                                              │
  │  /v1/driver                                                  │
  │    ├── /auth/login ──────── POST driver login                 │
  │    ├── /assignments ─────── GET my deliveries                 │
  │    ├── /assignments/:id/location ── POST GPS                  │
  │    └── /assignments/:id/status ──── PATCH update              │
  │                                                              │
  └──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Ecomai/
├── docker-compose.yml          # 4-service orchestration (env vars, healthchecks, resource limits)
├── Dockerfile                  # Backend image (non-root user, layer-cached deps)
├── index.js                    # Express server + graceful shutdown + token cleanup job
├── package.json
│
├── db/
│   ├── schema.sql              # 32-table DDL with indexes & constraints
│   ├── seed.sql                # Demo plans, shops, users, products
│   ├── migrate.js              # Auto-migration script (runs in container)
│   ├── migrate-settings.sql    # Website settings migration
│   ├── migrate-soft-delete.sql # Soft delete columns + partial indexes
│   └── migrate-dashboard-indexes.sql  # 8 composite performance indexes
│
├── src/
│   ├── app.js                  # Express setup (helmet, cors, compression, rate-limit, routes)
│   ├── config.js               # Environment configuration
│   ├── db.js                   # PostgreSQL pool (tuned: max, timeouts, statement_timeout)
│   ├── store.js                # Legacy pool alias
│   │
│   ├── errors/
│   │   └── domain-error.js     # Business logic error class
│   │
│   ├── middleware/              # ── 8 middleware modules ──
│   │   ├── auth.js             # JWT verify, role guard, tenant resolver
│   │   ├── tenant.js           # Tenant context enforcement
│   │   ├── async-handler.js    # Async route error wrapper
│   │   ├── error-handler.js    # Structured JSON error logging with request-id
│   │   ├── request-logger.js   # Structured JSON request logging with timing
│   │   ├── upload.js           # Multer + magic byte MIME validation
│   │   ├── validate.js         # validateBody middleware (type/required/pattern/oneOf)
│   │   └── plan-enforcement.js # Subscription limit checking middleware
│   │
│   ├── repositories/           # ── 15 data access modules (parameterized SQL) ──
│   │   ├── categories.js       ├── customers.js ◄─ soft delete
│   │   ├── category-requests.js├── orders.js ◄─ soft delete
│   │   ├── delivery-requests.js├── products.js ◄─ soft delete
│   │   ├── inventory-movements.js├── payments.js
│   │   ├── marketing-campaigns.js├── product-images.js
│   │   ├── product-variants.js ├── shops.js
│   │   ├── users.js            └── website-settings.js
│   │
│   ├── routes/                 # ── 17 route modules ──
│   │   ├── auth.js             ├── newsletter.js
│   │   ├── categories.js       ├── orders.js (CSV, bulk, stats)
│   │   ├── customers.js        ├── payments.js (SSLCommerz + manual)
│   │   ├── delivery-requests.js├── product-images.js (MIME check)
│   │   ├── driver.js           ├── product-variants.js
│   │   ├── inventory-movements.js ├── products.js (CSV, stats)
│   │   ├── marketing-campaigns.js ├── public.js (validated)
│   │   ├── register.js         ├── reviews.js
│   │   ├── shops.js            ├── users.js
│   │   └── website-settings.js
│   │
│   └── services/               # ── 15 business logic modules ──
│       ├── auth.js             ├── orders.js (SELECT FOR UPDATE)
│       ├── categories.js       ├── payments.js
│       ├── category-requests.js├── product-images.js
│       ├── customers.js        ├── product-variants.js
│       ├── delivery-requests.js├── products.js
│       ├── inventory-movements.js├── shops.js
│       ├── marketing-campaigns.js├── subscription-payments.js
│       ├── users.js            └── website-settings.js
│
├── frontend/                   # ── React SPA ──
│   ├── Dockerfile
│   └── src/
│       ├── App.jsx              # Router (public + /admin/* + /store/*)
│       ├── api.js               # API client with token refresh + CSV download
│       ├── api-public.js        # Public storefront API client
│       ├── main.jsx             # Entry point (wrapped in ErrorBoundary)
│       ├── components/
│       │   ├── Layout.jsx       # Admin sidebar with all nav sections
│       │   ├── UI.jsx           # Shared UI components
│       │   └── ErrorBoundary.jsx# React error boundary with retry
│       ├── contexts/            # Auth, Admin, Cart, Toast contexts
│       ├── pages/               # 29 admin pages (Orders, Products, Reviews...)
│       └── storefront/          # Customer-facing shop pages
│
├── tests/                      # ── 81 tests across 16 files ──
│   ├── auth-service.test.js            (3 tests)
│   ├── customer-service.test.js        (10 tests)
│   ├── order-service.test.js           (1 test)
│   ├── order-status-service.test.js    (3 tests)
│   ├── order-stock-status.test.js      (7 tests)
│   ├── payment-service.test.js         (2 tests)
│   ├── product-service.test.js         (4 tests)
│   ├── product-variant-service.test.js (4 tests)
│   ├── subscription-engine.test.js     (28 tests)
│   ├── shop-user-service.test.js       (3 tests)
│   ├── tenant-scope.test.js            (2 tests)
│   ├── marketing-campaign-*.test.js    (3 tests)
│   ├── inventory-order-flow.test.js    (1 test)
│   ├── delivery-driver-service.test.js (3 tests)
│   ├── website-settings-service.test.js(2 tests)
│   └── helpers/setup.js
│
├── scripts/
│   ├── smoke-test.js           # 31-endpoint smoke test
│   └── fix-passwords.js        # Password hash repair utility
│
├── uploads/products/           # Uploaded product images
└── docs/
    ├── improvement-plan.md
    ├── platform-architecture-plan.md
    └── system-flow-audit.md
```

---

## Testing

```
  ┌─────────────────────────────────────────────────────────────┐
  │                     TEST RESULTS                            │
  ├─────────────────────────────────────────────────────────────┤
  │                                                             │
  │  $ docker exec ecomai_api bun test                          │
  │                                                             │
  │  ✓ auth-service ·················· 3 passed                 │
  │  ✓ customer-service ·············· 10 passed                │
  │  ✓ order-service ················· 1 passed                 │
  │  ✓ order-status-service ·········· 3 passed                 │
  │  ✓ order-stock-status ············ 7 passed                 │
  │  ✓ payment-service ··············· 2 passed                 │
  │  ✓ product-service ··············· 4 passed                 │
  │  ✓ product-variant-service ······· 4 passed                 │
  │  ✓ subscription-engine ··········· 28 passed                │
  │  ✓ shop-user-service ············· 3 passed                 │
  │  ✓ tenant-scope ·················· 2 passed                 │
  │  ✓ marketing-campaign ············ 3 passed                 │
  │  ✓ inventory-order-flow ·········· 1 passed                 │
  │  ✓ delivery-driver-service ······· 3 passed                 │
  │  ✓ website-settings-service ······ 2 passed                 │
  │                                                             │
  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
  │  Total: 81 passed · 0 failed · 16 test files               │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
```

```
  Test Coverage Map:
  ┌────────────────────────┬───────┬──────────────────────────────┐
  │  Domain                │ Tests │  What's Tested               │
  ├────────────────────────┼───────┼──────────────────────────────┤
  │  Authentication        │   3   │  Login, wrong pw, refresh    │
  │  Customer Lifecycle    │  10   │  Register, login, profile    │
  │  Order Processing      │  11   │  Create, stock, states, race │
  │  Payments & Refunds    │   2   │  Manual pay, partial refund  │
  │  Products & Variants   │   8   │  CRUD, listing, variant ops  │
  │  Subscription Engine   │  28   │  Plans, usage, limits, audit │
  │  Tenant Isolation      │   2   │  Auth middleware, scope      │
  │  Operations            │   7   │  Campaigns, delivery, inv.   │
  │  Settings              │   2   │  Website settings CRUD       │
  │  Shop Management       │   3   │  Shop/user creation          │
  ├────────────────────────┼───────┼──────────────────────────────┤
  │  SMOKE TEST            │  31   │  All endpoints E2E           │
  └────────────────────────┴───────┴──────────────────────────────┘
```

### Running Smoke Tests

```bash
docker cp scripts/smoke-test.js ecomai_api:/app/smoke-test.js
docker exec ecomai_api bun run /app/smoke-test.js
# Expected: 31 passed, 0 failed
```

---

## Delivery & Driver Flow

```
  Shop Admin                  Ecomai API                Driver App
     │                            │                         │
     │  POST delivery-request     │                         │
     │  {order_id, address}       │                         │
     ├───────────────────────────►│                         │
     │                            │                         │
     │  PATCH assign driver       │                         │
     │  {driver_id}               │                         │
     ├───────────────────────────►│                         │
     │                            │  ── notification ──────►│
     │                            │                         │
     │                            │  GET /driver/assignments│
     │                            │◄────────────────────────┤
     │                            │                         │
     │                            │  POST /:id/location     │
     │                            │  {lat, lng}             │
     │                            │◄────────────────────────┤
     │                            │  (real-time GPS)        │
     │                            │                         │
     │                            │  PATCH /:id/status      │
     │                            │  {status: "delivered"}  │
     │                            │◄────────────────────────┤
     │                            │                         │
     │  ◄── Order auto-updated ───│                         │
     │      to "delivered"        │                         │
```

---

## Environment Variables

```
  ┌────────────────────────────┬────────────────────────────────────────┐
  │  Variable                  │  Purpose                              │
  ├────────────────────────────┼────────────────────────────────────────┤
  │  DATABASE_URL              │  PostgreSQL connection string          │
  │  JWT_SECRET                │  JWT signing key (override in prod!)  │
  │  JWT_ACCESS_EXPIRES        │  Access token TTL (default: 15m)      │
  │  JWT_REFRESH_EXPIRES       │  Refresh token TTL (default: 7d)      │
  │  SSLCOMMERZ_STORE_ID       │  Payment gateway store ID             │
  │  SSLCOMMERZ_STORE_PASSWD   │  Payment gateway password             │
  │  SSLCOMMERZ_IS_LIVE        │  false = sandbox, true = production   │
  │  APP_URL                   │  Frontend URL (for payment callbacks) │
  │  API_URL                   │  Backend URL                          │
  │  NODE_ENV                  │  development │ production             │
  └────────────────────────────┴────────────────────────────────────────┘
```

---

## Production Checklist

```
  ┌──────────────────────────────────────────────────────────────────┐
  │                    PRODUCTION DEPLOY CHECKLIST                   │
  ├──────────────────────────────────────────────────────────────────┤
  │                                                                  │
  │  [ ] Set JWT_SECRET to a strong random value (64+ chars)         │
  │  [ ] Set NODE_ENV=production                                     │
  │  [ ] Set SSLCOMMERZ_IS_LIVE=true with production credentials     │
  │  [ ] Configure APP_URL and API_URL to your domain                │
  │  [ ] Set up SSL/TLS termination (nginx / cloud LB)               │
  │  [ ] Configure automated database backups                        │
  │  [ ] Set up log aggregation (structured JSON logs are ready)     │
  │  [ ] Review resource limits in docker-compose.yml                │
  │  [ ] Run full test suite: docker exec ecomai_api bun test        │
  │  [ ] Run smoke test against production endpoints                 │
  │  [ ] Set up uptime monitoring on /health endpoint                │
  │  [ ] Configure CORS origins for your domain(s)                   │
  │                                                                  │
  └──────────────────────────────────────────────────────────────────┘
```

---

## Documentation

```
  docs/
  ├── system-flow-audit.md         Complete click-by-click user flows
  │                                with exact backend logic & DB changes
  │
  ├── platform-architecture-plan.md  Original architecture design doc
  │
  └── improvement-plan.md           Ongoing improvement roadmap
```

---

<div align="center">

```
  Built with ❤️ for the Bangladeshi e-commerce ecosystem
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Express.js · React · PostgreSQL · Docker · Bun
```

**[View System Flow Audit](docs/system-flow-audit.md)** · **[Architecture Plan](docs/platform-architecture-plan.md)** · **[Improvement Roadmap](docs/improvement-plan.md)**

</div>

## License

Private — All rights reserved.

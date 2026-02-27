# Ecomai Project

Multi-tenant AI e-commerce backend scaffold (Node.js + Express) with tenant-aware auth and product APIs.

## Implemented
- JWT login endpoint (`/v1/auth/login`)
- Tenant + role aware product endpoints (`/v1/products`)
- Auth/RBAC/tenant middleware
- Initial SQL schema (`db/schema.sql`)
- Architecture plan (`docs/platform-architecture-plan.md`)

## Quick start
```bash
npm install
npm run start
```

Demo users:
- `super@ecomai.dev` / `password123` (super_admin)
- `admin@coffee.dev` / `password123` (shop_admin for `shop_1`)

This repository contains the architecture and execution plan for a multi-tenant AI-powered e-commerce SaaS platform.

- Full master plan: `docs/platform-architecture-plan.md`

# Ecomai Project

Multi-tenant AI e-commerce backend scaffold (Node.js + Express) with tenant-aware auth and domain modules.

## Recently completed missing features
From the platform plan, the next missing API capabilities were implemented:
- Auth token lifecycle endpoints: refresh and logout
- User management endpoints: create user and get current user
- Shop management endpoints: create, detail, update, and shop settings by shop id

## Implemented slices (architecture-first)
- Auth: `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`
- Users: `GET /v1/users/me`, `POST /v1/users`
- Shops: `GET /v1/shops/me`, `GET /v1/shops`, `POST /v1/shops`, `GET /v1/shops/:shopId`, `PATCH /v1/shops/:shopId`, `GET /v1/shops/:shopId/settings`
- Customers: `GET /v1/customers`, `POST /v1/customers`
- Products: `GET /v1/products`, `GET /v1/products/:productId`, `POST /v1/products`, `PATCH /v1/products/:productId`, `DELETE /v1/products/:productId`
- Orders: `GET /v1/orders`, `GET /v1/orders/:orderId`, `POST /v1/orders`, `PATCH /v1/orders/:orderId/status`, `POST /v1/orders/:orderId/cancel`
- Delivery: `POST /v1/orders/:orderId/delivery-requests`, `GET /v1/delivery-requests`, `PATCH /v1/delivery-requests/:deliveryRequestId/status`
- Marketing campaigns: `GET /v1/marketing-campaigns`, `POST /v1/marketing-campaigns`, `POST /v1/marketing-campaigns/generate-draft`
- Website settings: `GET /v1/website-settings/me`, `PATCH /v1/website-settings/me`

## Architecture approach
Implemented by layers to align with the platform plan:
- `routes/` for HTTP concerns
- `services/` for domain rules
- `repositories/` for persistence abstraction (currently in-memory store)
- `errors/` for structured domain errors

This allows swapping in PostgreSQL-backed repositories without changing route contracts.

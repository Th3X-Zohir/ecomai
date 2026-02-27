# Ecomai Project

Multi-tenant AI e-commerce backend scaffold (Node.js + Express) with tenant-aware auth and domain modules.

## Recently completed missing features
From the platform plan and backlog, the next missing marketing capability implemented now is:
- Campaign lifecycle + performance feedback loop (status transitions, performance ingest)

## Implemented slices (architecture-first)
- Auth: `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`
- Users: `GET /v1/users/me`, `POST /v1/users`
- Shops: `GET /v1/shops/me`, `GET /v1/shops`, `POST /v1/shops`, `GET /v1/shops/:shopId`, `PATCH /v1/shops/:shopId`, `GET /v1/shops/:shopId/settings`
- Customers: `GET /v1/customers`, `POST /v1/customers`
- Products: `GET /v1/products`, `GET /v1/products/:productId`, `POST /v1/products`, `PATCH /v1/products/:productId`, `DELETE /v1/products/:productId`
- Product variants: `GET /v1/products/:productId/variants`, `POST /v1/products/:productId/variants`, `GET /v1/product-variants/:variantId`, `PATCH /v1/product-variants/:variantId`, `DELETE /v1/product-variants/:variantId`
- Orders: `GET /v1/orders`, `GET /v1/orders/:orderId`, `POST /v1/orders`, `PATCH /v1/orders/:orderId/status`, `POST /v1/orders/:orderId/cancel`, `POST /v1/orders/:orderId/payments`
- Payments: `GET /v1/payments`, `GET /v1/payments/:paymentId`, `POST /v1/payments/:paymentId/refunds`
- Delivery admin: `POST /v1/orders/:orderId/delivery-requests`, `GET /v1/delivery-requests`, `GET /v1/delivery-requests/:deliveryRequestId`, `PATCH /v1/delivery-requests/:deliveryRequestId/status`, `PATCH /v1/delivery-requests/:deliveryRequestId/assign-driver`
- Driver mobile API: `POST /v1/driver/auth/login`, `GET /v1/driver/assignments`, `POST /v1/driver/assignments/:id/location`, `PATCH /v1/driver/assignments/:id/status`
- Marketing campaigns: `GET /v1/marketing-campaigns`, `GET /v1/marketing-campaigns/:campaignId`, `POST /v1/marketing-campaigns`, `POST /v1/marketing-campaigns/generate-draft`, `PATCH /v1/marketing-campaigns/:campaignId/status`, `POST /v1/marketing-campaigns/:campaignId/performance`
- Website settings: `GET /v1/website-settings/me`, `PATCH /v1/website-settings/me`

## Architecture approach
Implemented by layers to align with the platform plan:
- `routes/` for HTTP concerns
- `services/` for domain rules
- `repositories/` for persistence abstraction (currently in-memory store)
- `errors/` for structured domain errors

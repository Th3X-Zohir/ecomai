# Ecomai SaaS Platform Master Architecture Plan

## Phase 0: Kickoff & Understanding

### Understanding Confirmation
- **Core idea:** Build a multi-tenant SaaS platform for startups that combines storefront creation, e-commerce operations, AI marketing, and optional delivery workflows.
- **Core constraint:** **Fixed backend + flexible frontend**.
  - Backend data model, APIs, and service contracts remain standardized.
  - Frontend design is AI-generated and highly customizable, but only through configuration/themes/components consuming the same backend APIs.
- **Key components:**
  - AI website builder
  - E-commerce core (catalog, cart/order, customer)
  - AI marketing campaigns
  - Delivery orchestration
  - JWT + RBAC (super_admin, shop_admin, shop_user, plus delivery role)
  - Strong logical isolation via `shop_id` in all tenant-scoped data.

### Assumptions
- Cloud: **AWS**
- Backend: **Node.js (NestJS)**
- Frontend: **React (Next.js recommended for storefront/admin portal split)**
- Database: **PostgreSQL (RDS)**

### High-Level Architecture Sketch

```text
                           +---------------------+
                           |   Shop Owner/Admin  |
                           +----------+----------+
                                      |
                           +----------v----------+
                           |   Web Apps (React)  |
                           | Storefront + Admin  |
                           +----------+----------+
                                      |
                           +----------v----------+
                           | API Gateway / ALB   |
                           +----------+----------+
                                      |
        +-----------------------------+-------------------------------+
        |             Service Mesh / Internal VPC Networking          |
        |                                                             |
+-------v------+ +------------v---------+ +-----------v-----------+  |
| Auth Service | | Shop/User Mgmt Svc   | | Product Catalog Svc   |  |
+-------+------+ +------------+---------+ +-----------+-----------+  |
        |                     |                       |              |
+-------v------+ +------------v---------+ +-----------v-----------+  |
| Order Service| | Marketing AI Service | | Delivery Service      |  |
+-------+------+ +------------+---------+ +-----------+-----------+  |
        |                     |                       |              |
        +---------------------+-----------+-----------+--------------+
                                      |
                             +--------v--------+
                             | PostgreSQL (RDS)|
                             +--------+--------+
                                      |
                      +---------------+----------------+
                      |                                |
             +--------v---------+              +-------v--------+
             | Object Store S3  |              | AI Providers    |
             | assets/media     |              | (LLM/CV APIs)   |
             +------------------+              +-----------------+
```

---

## Phase 1: Backend & Database Foundation

### Step 1.1 Database Schema Design (PostgreSQL)

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------
-- shops (tenants)
-- ------------------------------------------------------------------
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  industry VARCHAR(80),
  subscription_plan VARCHAR(40) NOT NULL DEFAULT 'starter',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- users
-- ------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NULL REFERENCES shops(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin','shop_admin','shop_user','delivery_agent')),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_shop_required_for_non_super_admin
    CHECK (
      (role = 'super_admin' AND shop_id IS NULL)
      OR (role <> 'super_admin' AND shop_id IS NOT NULL)
    )
);

CREATE INDEX idx_users_shop_id_role ON users(shop_id, role);

-- ------------------------------------------------------------------
-- customers
-- ------------------------------------------------------------------
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(160),
  phone VARCHAR(40),
  segment VARCHAR(80),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, email)
);

CREATE INDEX idx_customers_shop_id ON customers(shop_id);

-- ------------------------------------------------------------------
-- products
-- ------------------------------------------------------------------
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, slug)
);

CREATE INDEX idx_products_shop_id_status ON products(shop_id, status);

-- ------------------------------------------------------------------
-- product_variants
-- ------------------------------------------------------------------
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  compare_at_price NUMERIC(12,2),
  inventory_qty INT NOT NULL DEFAULT 0 CHECK (inventory_qty >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, sku)
);

CREATE INDEX idx_variants_shop_product ON product_variants(shop_id, product_id);

-- ------------------------------------------------------------------
-- orders
-- ------------------------------------------------------------------
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  order_number BIGSERIAL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'unfulfilled',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  placed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_shop_created ON orders(shop_id, created_at DESC);
CREATE INDEX idx_orders_shop_status ON orders(shop_id, status);

-- ------------------------------------------------------------------
-- order_items
-- ------------------------------------------------------------------
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  item_name VARCHAR(200) NOT NULL,
  sku VARCHAR(80),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_shop_order ON order_items(shop_id, order_id);

-- ------------------------------------------------------------------
-- marketing_campaigns
-- ------------------------------------------------------------------
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  campaign_name VARCHAR(200) NOT NULL,
  channel VARCHAR(40) NOT NULL CHECK (channel IN ('email','facebook','instagram','tiktok','google_ads','sms')),
  objective VARCHAR(80),
  content JSONB NOT NULL,
  targeting JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  launched_at TIMESTAMPTZ,
  performance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_shop_status ON marketing_campaigns(shop_id, status);

-- ------------------------------------------------------------------
-- website_settings
-- ------------------------------------------------------------------
CREATE TABLE website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL UNIQUE REFERENCES shops(id) ON DELETE CASCADE,
  theme_name VARCHAR(120) NOT NULL DEFAULT 'default',
  design_tokens JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  navigation_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  homepage_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  custom_css TEXT,
  published_version INT NOT NULL DEFAULT 1,
  draft_version INT NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- delivery_requests
-- ------------------------------------------------------------------
CREATE TABLE delivery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL DEFAULT 'internal',
  provider_reference VARCHAR(120),
  assigned_driver_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'requested',
  pickup_address JSONB NOT NULL,
  dropoff_address JSONB NOT NULL,
  estimated_pickup_at TIMESTAMPTZ,
  estimated_dropoff_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  tracking_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id, order_id)
);

CREATE INDEX idx_delivery_shop_status ON delivery_requests(shop_id, status);
```

#### Table Purpose & Key Relationships
- `shops`: root tenant entity.
- `users`: identity + role assignments; non-super admins bound to one `shop_id`.
- `customers`: tenant-bound end customers.
- `products` / `product_variants`: catalog model scoped by `shop_id`.
- `orders` / `order_items`: transactional commerce entities, all tenant-scoped.
- `marketing_campaigns`: AI-generated and manually curated campaign records.
- `website_settings`: design/system config consumed by storefront renderer.
- `delivery_requests`: links order fulfillment to internal/external logistics.

#### Self-Evaluation (Step 1.1)
- Schema is normalized for core entities and supports growth via JSONB for flexible metadata.
- Every tenant-scoped table has `shop_id`.
- Missing entities to add in next iteration:
  - `payments`, `refunds`
  - `inventory_movements`
  - `discounts/coupons`
  - `audit_logs`, `webhooks`, `events_outbox`

### Step 1.2 Backend API Architecture & Core Services

#### Microservices Overview
- **Auth Service**: login, refresh, token issuance, user identity.
- **Shop Management Service**: tenant onboarding, plan/status, shop settings ownership.
- **Catalog Service**: products, variants, inventory.
- **Order Service**: checkout/order lifecycle.
- **Delivery Service**: delivery orchestration, driver assignment, status tracking.
- **Marketing Service**: AI draft generation, campaign lifecycle, performance ingest.
- **Website Config Service**: theme/layout JSON + publishing.

```text
[Client Apps]
     |
[API Gateway]
  |    |     |      |      |
Auth Shop Catalog Order Delivery Marketing WebsiteConfig
           \      /        |
            \    /         |
         [Event Bus / Queue]
                 |
             [PostgreSQL]
```

#### Core API Endpoints (Representative)

**Authentication / User Admin**
- `POST /v1/auth/login` – issue access/refresh tokens.
- `POST /v1/auth/refresh` – rotate access token.
- `POST /v1/auth/logout` – revoke refresh token.
- `POST /v1/users` – create user (super_admin or shop_admin).
- `GET /v1/users/me` – current user profile.

**Shop Creation / Management**
- `POST /v1/shops` – create new shop (super_admin only).
- `GET /v1/shops/:shopId` – shop details.
- `PATCH /v1/shops/:shopId` – update shop metadata/status.
- `GET /v1/shops/:shopId/settings` – website/shop settings.

**Product CRUD**
- `POST /v1/products` – create product for authenticated shop.
- `GET /v1/products` – list products by shop scope.
- `GET /v1/products/:productId` – product details.
- `PATCH /v1/products/:productId` – update product.
- `DELETE /v1/products/:productId` – soft delete/archive product.

**Order Management**
- `POST /v1/orders` – create order (storefront checkout).
- `GET /v1/orders` – list orders for shop.
- `GET /v1/orders/:orderId` – order detail.
- `PATCH /v1/orders/:orderId/status` – update order state.
- `POST /v1/orders/:orderId/cancel` – cancel workflow.

#### `shop_id` Propagation & Enforcement
- **Primary source:** JWT claim `shop_id` (for shop roles).
- **Optional path param/header:**
  - `X-Shop-Id` allowed only for `super_admin` impersonation and must be audited.
- **Enforcement rules:**
  1. Middleware extracts identity and role.
  2. Resolver sets `request.tenant.shopId` from token (`shop_admin`, `shop_user`).
  3. For `super_admin`, `request.tenant.shopId` may come from validated `X-Shop-Id`.
  4. Repositories always include `WHERE shop_id = request.tenant.shopId`.

#### Self-Evaluation (Step 1.2)
- Services are separated by domain boundaries.
- Single-tenant query guards prevent accidental cross-tenant reads/writes.
- Potential bottlenecks:
  - synchronous calls between Order and Delivery/Marketing,
  - heavy campaign generation latency.
  - Mitigation: event-driven async jobs + queue workers.

### Step 1.3 Authentication & Authorization (RBAC)

#### JWT Authentication Outline
- Login validates credentials and issues:
  - short-lived access token (15m)
  - longer refresh token (7–30d, hashed at rest)
- JWT claims:
  - `sub` (user id)
  - `role`
  - `shop_id` (nullable only for super_admin)
  - `permissions_version`

#### Authorization Middleware (Pseudo-code)

```ts
function authGuard(req, res, next) {
  const token = extractBearerToken(req.headers.authorization);
  const payload = verifyJwt(token);

  req.auth = {
    userId: payload.sub,
    role: payload.role,
    shopId: payload.shop_id ?? null,
  };
  next();
}

function rbacGuard(allowedRoles: string[]) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

function tenantScopeGuard(req, res, next) {
  if (req.auth.role === 'super_admin') {
    req.tenantShopId = req.headers['x-shop-id'] || null;
  } else {
    req.tenantShopId = req.auth.shopId;
  }

  if (!req.tenantShopId && req.auth.role !== 'super_admin') {
    return res.status(400).json({ message: 'Missing tenant scope' });
  }
  next();
}
```

#### Product Create Endpoint Example (Pseudo-code)

```ts
@Post('/v1/products')
@UseGuards(authGuard, rbacGuard(['shop_admin', 'shop_user', 'super_admin']), tenantScopeGuard)
async createProduct(@Req() req, @Body() dto: CreateProductDto) {
  const shopId = req.tenantShopId;

  // Critical: never accept shop_id from request body for shop users.
  return this.productService.create({
    shop_id: shopId,
    name: dto.name,
    slug: dto.slug,
    base_price: dto.basePrice,
    description: dto.description,
  });
}
```

#### Self-Evaluation (Step 1.3)
- Strong pattern: derive tenant context from token, not payload body.
- Additions for production:
  - rotating signing keys (JWKS)
  - refresh token reuse detection
  - per-tenant rate limits and anomaly detection

---

## Phase 2: AI-Powered Frontend Builder & E-commerce Integration

### Step 2.1 Frontend Core Structure & API Consumption

#### Rendering Strategy
- Core frontend is a **rendering engine** + **component registry**.
- Engine reads `website_settings` JSON and maps sections to components.
- Components fetch from standard APIs; themes only alter styling/layout.

```text
website_settings JSON -> Renderer -> Component Registry
                                      |-> HeroBlock
                                      |-> ProductGrid
                                      |-> Testimonials
                                      |-> CTAFooter
```

#### React Pseudo-code: Product Grid

```tsx
function ProductGrid() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch('/api/v1/products?status=active', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setProducts(data.items));
  }, [token]);

  return (
    <section className="product-grid">
      {products.map((p) => (
        <article key={p.id} className="product-card">
          <h3>{p.name}</h3>
          <p>{p.description}</p>
          <strong>${p.base_price}</strong>
        </article>
      ))}
    </section>
  );
}
```

#### Theme Separation
- Data fetching hooks remain unchanged.
- Theme differences are implemented in:
  - design tokens (color, radius, spacing, typography)
  - layout config (section order, columns, paddings)
  - component variants (`ProductCardClassic`, `ProductCardMinimal`)

#### Self-Evaluation (Step 2.1)
- High flexibility with controlled API contracts.
- Prevent template drift by versioning JSON schema for `website_settings`.

### Step 2.2 AI Website Design Generation Logic

#### Shop Owner Inputs
- Industry
- Brand style (minimal/luxury/playful/etc.)
- Primary products and price range
- Target audience
- Preferred conversion goal (sales, leads, subscriptions)

#### AI Generation Pipeline
1. Convert input into a **design brief**.
2. Select palette/font/layout from approved design system knowledge base.
3. Map required page blocks (hero, featured products, proof, CTA, footer).
4. Choose component variants from registry.
5. Generate design tokens and section config JSON.
6. Generate optional CSS overrides and placeholder copy/media prompts.

#### Config Example (Conceptual)

```json
{
  "theme_name": "modern_luxe",
  "design_tokens": { "primary": "#121212", "accent": "#e3b341" },
  "layout_config": {
    "home_sections": ["hero", "featured_products", "social_proof", "cta"]
  },
  "homepage_config": {
    "hero": { "variant": "split_image", "headline": "Crafted for Daily Rituals" }
  }
}
```

#### Self-Evaluation (Step 2.2)
- Feasible if constrained to vetted components/tokens.
- Quality risk addressed via:
  - schema validation,
  - design lint rules,
  - preview + human approval before publish.

---

## Phase 3: AI Marketing Campaigns & Delivery Integration

### Step 3.1 AI Marketing Campaign Generator

#### Data Inputs per Shop
- Catalog + price data
- Order and customer segmentation
- Traffic/events analytics
- Historical campaign performance

#### Campaign Types
- Social captions + hashtags
- Email subject/body variants
- Paid ad copy (headline/body/CTA)
- Seasonal promo recommendations

#### NLP Model Suggestion
- Start with a high-quality hosted LLM (e.g., GPT-class model) + retrieval context.
- Add lightweight fine-tuning or adapters later for brand tone and channel style.

#### Feedback Loop
1. Campaign launched with tracked identifiers.
2. Performance ingested (impressions, CTR, CVR, ROAS).
3. Signals stored in `marketing_campaigns.performance` + analytics store.
4. Prompt builder uses top-performing historical patterns per tenant.

#### Self-Evaluation (Step 3.1)
- Tenant data isolation is critical in prompt/context construction.
- Avoid leaking cross-tenant benchmarks unless anonymized/aggregated.

### Step 3.2 Delivery Service Integration

#### Delivery Endpoints
- `POST /v1/orders/:orderId/delivery-requests` – request delivery.
- `GET /v1/delivery-requests` – list deliveries.
- `GET /v1/delivery-requests/:id` – detail/tracking.
- `PATCH /v1/delivery-requests/:id/status` – internal status update.

#### Internal vs Third-Party Logic
- **Internal:** assign `delivery_agent` user, store route/status updates.
- **Third-party:** adapter pattern per provider (`createShipment`, `getTracking`, `cancelShipment`).

#### Delivery Storage Linkage
- `delivery_requests` contains `shop_id + order_id`, ensuring tenant linkage.
- Status machine example: `requested -> assigned -> picked_up -> in_transit -> delivered`.

#### Driver Mobile API (Conceptual)
- `POST /v1/driver/auth/login`
- `GET /v1/driver/assignments`
- `POST /v1/driver/assignments/:id/location`
- `PATCH /v1/driver/assignments/:id/status`

#### Self-Evaluation (Step 3.2)
- Real-time tracking and route optimization are non-trivial.
- Start with polling/webhook updates before full live-map stack.

---

## Phase 4: Deployment, Monitoring & Iteration Strategy

### Step 4.1 AWS Deployment Strategy

#### Core AWS Stack
- **Compute:** ECS Fargate (fast path) or EKS (advanced control).
- **API ingress:** API Gateway + ALB.
- **Database:** RDS PostgreSQL (Multi-AZ).
- **Cache/session:** ElastiCache Redis.
- **Storage/CDN:** S3 + CloudFront.
- **Async:** SQS/SNS + EventBridge.
- **Secrets:** AWS Secrets Manager.
- **Observability:** CloudWatch + OpenTelemetry + X-Ray.

#### CI/CD
- GitHub Actions pipeline:
  1. lint/test
  2. build container images
  3. security scan
  4. push to ECR
  5. deploy to staging/prod via IaC (Terraform/CDK)

#### Self-Evaluation (Step 4.1)
- Scalable and resilient with managed services.
- Cost can be controlled by:
  - right-sizing Fargate tasks,
  - autoscaling policies,
  - reserved DB instances for stable workloads.

### Step 4.2 Iteration & Evaluation Strategy

#### Metrics for AI Website Designs
- Conversion rate
- Add-to-cart rate
- Bounce rate / dwell time
- Time-to-publish and post-publish edits
- Merchant satisfaction score

#### A/B Testing Strategy
- Run design/copy variants with tenant-safe experimentation IDs.
- Evaluate by channel-specific goals (CTR for ads, CVR for landing pages).
- Use Bayesian or sequential testing to reduce sample-size delays.

#### Feedback Collection
- In-product thumbs up/down on AI outputs.
- Mandatory quick survey after publish.
- Support ticket categorization for design/marketing issues.

#### Human Lead Feedback Loop for AI
- Review each phase output with a scorecard:
  - correctness
  - feasibility
  - implementation priority
- Convert feedback into versioned architecture decisions (ADRs).
- AI updates future suggestions using accepted/rejected ADR history.

---

## Recommended Immediate Next Deliverables
1. Implement this schema via migration files.
2. Scaffold NestJS services with shared auth/tenant middleware.
3. Build minimal Admin UI: shop setup, product CRUD, theme preview.
4. Add event bus + async job workers for marketing and delivery adapters.
5. Create first end-to-end happy path:
   - create shop -> create product -> place order -> request delivery -> generate campaign draft.

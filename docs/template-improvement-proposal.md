# Ecomai Storefront Templates — Improvement Proposal

> **Date:** February 28, 2026  
> **Scope:** Make templates more useful, attractive, flexible, and feature-rich for shop admins  
> **Approach:** All proposals are doable within the current architecture (React + Tailwind + PostgreSQL JSONB)

---

## Executive Summary

After a deep audit of the current template system (5 templates, 18 design tokens, 15 admin config tabs, 10 storefront pages), I identified **38 specific improvements** grouped into 4 phases. Each phase builds on the previous one, is independently shippable, and requires **zero schema migrations** — all new data fits into existing JSONB columns.

### Current State at a Glance

| Area | Status | Gap |
|------|--------|-----|
| Templates | 5 templates, 18 tokens each | No preview images, DB default `'starter'` doesn't match any template |
| Colors/Fonts | 12 color pickers, 1 font selector | Only 1 font option in UI, no font pairing |
| Homepage | Hero + featured products | Fixed section order, fake social proof stats, featured IDs ignored |
| Products | Grid listing + detail page | Ignores `grid_columns`/`products_per_page`/`default_sort` settings, no pagination |
| Checkout | 3-step wizard | No shipping calc, no tax, "Free" hardcoded everywhere |
| Policies | Plain textareas | No rich text rendering, just `white-space: pre-wrap` |
| Social/Icons | Emoji-based (📘📸🐦) | Unprofessional, inconsistent across platforms |
| Newsletter CTA | Button exists | Completely non-functional — no email collection endpoint |
| Product Detail | Basic gallery + variants | No reviews, no tabs, no badges (sale/new/bestseller) |

---

## Phase 1 — Fix What's Broken & Quick Wins (8 items)

These are bugs, misleading UI, and low-effort high-impact fixes.

### 1.1 Fix Template ID Mismatch
**Problem:** DB default is `'starter'` but `templates.js` has no `starter` template → silently falls back to `classic`.  
**Fix:** Either rename `classic` → `starter` in templates.js, or change `schema.sql` default to `'classic'`.  
**Effort:** 1 line change.

### 1.2 Wire Up Ignored Settings
**Problem:** `store_config.grid_columns`, `products_per_page`, `default_sort`, `show_out_of_stock`, `min_order_amount`, `guest_checkout` are all saved to DB but **never consumed** by storefront components.  
**Fix:** Read from `storeConfig` in `StoreProducts.jsx`, `StoreCheckout.jsx`, `StoreCart.jsx`.  
- `grid_columns` → dynamic `grid-cols-{n}` classes
- `products_per_page` → paginate product list (add page state + "Load More" or pagination)
- `default_sort` → set initial sort dropdown value
- `show_out_of_stock` → filter out products where `stock_quantity <= 0`
- `min_order_amount` → disable checkout button if cart total < minimum, show warning
- `guest_checkout` → if disabled and not logged in, redirect to login before checkout  
**Effort:** ~80 lines across 3 files.

### 1.3 Wire Up Featured Product IDs
**Problem:** Admin can select featured products in WebsiteSettings, but `StoreHome.jsx` ignores `homepage.featured_product_ids` and always shows latest 8.  
**Fix:** If `featured_product_ids` is set and non-empty, filter products to only those IDs (preserving admin-chosen order). Fall back to latest 8 if empty.  
**Effort:** ~10 lines in `StoreHome.jsx`.

### 1.4 Replace Emoji Icons with Proper SVGs
**Problem:** Social links use 📘📸🐦🎵📺, WhatsApp button uses 💬, payment icons are text. Looks unprofessional.  
**Fix:** Create a small `icons.jsx` utility with proper SVG components for: Facebook, Instagram, Twitter/X, TikTok, YouTube, WhatsApp, Visa, Mastercard, bKash, Nagad, SSL Secured.  
**Effort:** ~120 lines new file + ~30 line updates across `StorefrontLayout.jsx` and `StoreHome.jsx`.

### 1.5 Remove Custom JS Textarea (or add clear warning)
**Problem:** Admin UI shows "Custom JavaScript" textarea, but server strips it. Misleading.  
**Fix:** Either remove the field entirely from WebsiteSettings.jsx, or add a prominent warning: "Custom JS is disabled for security. Use Google Tag Manager instead."  
**Effort:** ~5 lines.

### 1.6 Fix Social Proof Section
**Problem:** Homepage shows "Happy Customers: products.length × 12", "Rating: 4.9" — fake numbers.  
**Fix:** Replace with real data from the API:  
- Total completed orders → "Orders Fulfilled"
- Total products → "Products Available"
- Total active categories → "Categories"
- Shop age → "Serving Since {year}"  
Add new lightweight endpoint: `GET /public/shops/:slug/stats` returning `{ total_orders, total_products, total_categories, created_at }`.  
**Effort:** ~30 lines backend + ~15 lines frontend.

### 1.7 Add Template Preview Thumbnails
**Problem:** Template cards in WebsiteSettings reference `'/templates/classic.svg'` etc. but files don't exist.  
**Fix:** Generate 5 static SVG preview cards (200×140px) showing color scheme + layout sketch for each template. Place in `frontend/public/templates/`.  
**Alternative (faster):** Instead of separate SVG files, render inline preview swatches directly in the template cards (already partially done with color circles — expand to show a mini layout preview using CSS).  
**Effort:** ~50 lines of inline preview component OR 5 SVG files.

### 1.8 Storefront Pagination
**Problem:** `StoreProducts.jsx` loads ALL products at once with client-side filtering — won't scale.  
**Fix:** Implement server-side pagination using existing `?page=&limit=` support in the public products API. Add a "Load More" button or numbered pagination at the bottom.  
**Effort:** ~40 lines in `StoreProducts.jsx`.

---

## Phase 2 — Enhanced Customization (10 items)

Give shop admins more creative control without code changes.

### 2.1 Homepage Section Reordering
**Problem:** Section order is hardcoded: Hero → Social Proof → Categories → Featured → Trust → CTA.  
**Fix:** Add `homepage.section_order` (array of section IDs) to website_settings. In `StoreHome.jsx`, render sections in the order specified. Admin UI: drag-and-drop list in the Homepage tab.  
**Data model (fits in existing `homepage` JSONB):**
```json
{
  "section_order": ["hero", "categories", "featured", "trust_badges", "newsletter"],
  "sections_visible": { "hero": true, "social_proof": false, "categories": true, ... }
}
```
**Effort:** ~60 lines in StoreHome.jsx (map section IDs to components), ~40 lines in WebsiteSettings.jsx (sortable list UI).

### 2.2 Multi-Hero Banner / Slider
**Problem:** Only one hero image. Shops need rotating banners for promotions.  
**Fix:** Extend `homepage.hero` to support an array of slides:
```json
{
  "hero": {
    "slides": [
      { "image_url": "...", "headline": "...", "subtitle": "...", "cta": "Shop Now", "cta_link": "/products", "overlay_color": "#000", "overlay_opacity": 40 },
      { "image_url": "...", "headline": "...", ... }
    ],
    "auto_rotate": true,
    "interval": 5000
  }
}
```
Build a simple auto-rotating carousel with dots/arrows. No external dependencies — just CSS transitions + state.  
**Effort:** ~120 lines new `HeroSlider` component + ~30 lines admin UI slider editor.

### 2.3 Font Pairing System
**Problem:** Only 1 font picker (body text). Real stores need heading font + body font.  
**Fix:** Add `headingFont` token to templates. Update admin Colors & Fonts tab with two font dropdowns:
- **Heading Font:** Playfair Display, Poppins, Space Grotesk, Montserrat, Merriweather, Lora
- **Body Font:** Inter, DM Sans, IBM Plex Sans, Nunito, Open Sans, Roboto

Auto-load selected Google Fonts via `<link>` tag in `StorefrontLayout.jsx`.  
**Effort:** ~30 lines in templates.js (new token), ~20 lines in WebsiteSettings.jsx, ~15 lines in StorefrontLayout.jsx (font loading).

### 2.4 Product Badges System
**Problem:** No way to visually highlight sale items, new arrivals, bestsellers.  
**Fix:** Add automated badge logic:
- **"Sale"** — if `compare_at_price > price`, show red badge with discount %
- **"New"** — if `created_at` within last 14 days (configurable)
- **"Low Stock"** — if `stock_quantity` between 1 and threshold (configurable)
- **"Bestseller"** — top N products by order count (optional, requires join)

Display as overlaid labels on product cards in both `StoreProducts.jsx` and `StoreHome.jsx`.

Store config (in existing `store_config` JSONB):
```json
{
  "badges": {
    "show_sale": true,
    "show_new": true,
    "new_days": 14,
    "show_low_stock": true,
    "low_stock_threshold": 5
  }
}
```
**Effort:** ~40 lines `ProductBadge` component + ~20 lines in product cards + ~15 lines admin UI.

### 2.5 Product Detail Tabs
**Problem:** Product detail only shows description. No structured content.  
**Fix:** Add tabbed content below product info:
- **Description** — existing `description` field
- **Specifications** — render `metadata` JSONB as a key-value table
- **Shipping & Returns** — pull from `store_policies.return_policy` (already exists)

Tabs are CSS-only (no new state library needed).  
**Effort:** ~50 lines in `StoreProductDetail.jsx`.

### 2.6 Rich Text for Policies
**Problem:** Policies render as `white-space: pre-wrap` plain text. No formatting.  
**Fix:** Support basic Markdown rendering. Use a tiny Markdown-to-HTML function (~30 lines, no library needed) that handles: `**bold**`, `*italic*`, `# headings`, `- lists`, `[links](url)`, and `\n\n` paragraphs.

Alternatively, swap textareas for a simple toolbar (bold/italic/heading/list buttons that insert Markdown syntax) — keeps the admin UI simple while rendering nicely on the storefront.  
**Effort:** ~40 lines `renderMarkdown()` utility + ~5 lines in `StorePolicy.jsx`.

### 2.7 Configurable Shipping Display
**Problem:** "Free" shipping hardcoded everywhere. Even shops that charge can't change this.  
**Fix:** Add to `store_config` JSONB:
```json
{
  "shipping_display": {
    "type": "free",           // "free" | "flat" | "threshold" | "custom_text"
    "flat_rate": 60,
    "free_threshold": 5000,   // free above this amount
    "custom_text": "Calculated at checkout"
  }
}
```
Storefront reads this and displays:
- **free:** "Free Shipping"
- **flat:** "Shipping: ৳60"
- **threshold:** "Free shipping on orders over ৳5,000" (with progress bar in cart showing how close)
- **custom_text:** Whatever the admin types  
**Effort:** ~30 lines helper + ~20 lines cart UI + ~10 lines admin UI.

### 2.8 Quick View Modal
**Problem:** Users must navigate to product detail page to see info → higher bounce rate.  
**Fix:** Add "Quick View" button on product cards that opens a modal with: image, name, price, variant picker, add-to-cart. Reuse existing `StoreProductDetail` logic in a modal wrapper.  
**Effort:** ~80 lines `QuickViewModal` component + ~10 lines in product cards.

### 2.9 Wishlist / Save for Later
**Problem:** No way for customers to save products they're interested in.  
**Fix:** Client-side wishlist persisted to `localStorage` (like cart). Heart icon toggle on product cards. Dedicated wishlist page accessible from account menu.  
**Effort:** ~60 lines `WishlistContext` + ~40 lines `Wishlist.jsx` page + ~15 lines icon updates.

### 2.10 Custom Color Schemes (Presets)
**Problem:** Choosing 12 individual colors is overwhelming for non-designers.  
**Fix:** Add 8-10 curated color presets per template that shop admins can one-click apply:
- "Ocean Blue", "Forest Green", "Sunset Warm", "Midnight", "Rose Gold", etc.

Each preset is just a pre-filled `theme` JSONB override. Admin sees a grid of clickable preset swatches that auto-apply all 12 colors.  
**Effort:** ~60 lines preset data + ~30 lines in WebsiteSettings.jsx.

---

## Phase 3 — New Features (10 items)

Major capabilities that significantly increase store functionality.

### 3.1 Newsletter Email Collection
**Problem:** CTA section has a subscribe button that does nothing.  
**Fix:** 
- **DB:** Add `newsletter_subscribers` table: `id, shop_id, email, subscribed_at, source`
- **Backend:** `POST /public/shops/:slug/newsletter` — validates email, deduplicates, stores
- **Frontend:** Wire `StoreHome.jsx` CTA form to new endpoint with success feedback
- **Admin:** New "Subscribers" tab in Campaigns page showing list + export CSV button  
**Effort:** ~80 lines backend + ~20 lines frontend + ~60 lines admin.

### 3.2 Product Reviews & Ratings
**Problem:** No social proof on products. The "4.9 rating" on the homepage is fake.  
**Fix:**
- **DB:** Add `product_reviews` table: `id, shop_id, product_id, customer_id, rating (1-5), title, body, is_approved, created_at`
- **Backend:** 
  - `POST /public/shops/:slug/products/:id/reviews` — customer submits review
  - `GET /public/shops/:slug/products/:id/reviews` — public listing
  - Admin routes: list, approve/reject, delete
- **Frontend:** Stars component, review list on product detail (new tab), average rating on product cards
- **Admin:** Review moderation page (approve/reject workflow)

Store config toggle: `reviews.enabled`, `reviews.require_approval`, `reviews.require_purchase`  
**Effort:** ~150 lines backend + ~120 lines frontend + ~80 lines admin.

### 3.3 Forgot Password Flow (Customers)
**Problem:** No password reset for storefront customers.  
**Fix:**
- Add `password_reset_tokens` table (or reuse existing token mechanism)
- `POST /public/shops/:slug/auth/forgot-password` — generates token, logs to console (or sends email if SMTP configured)
- `POST /public/shops/:slug/auth/reset-password` — validates token, updates password
- Frontend: "Forgot password?" link on StoreLogin, reset form page  
**Effort:** ~60 lines backend + ~50 lines frontend.

### 3.4 Store Announcement Scheduling
**Problem:** Announcement bar is manual on/off only.  
**Fix:** Add `start_date` and `end_date` to the existing `announcement` JSONB. `StorefrontLayout.jsx` checks if current time is within the window before displaying.  
**Effort:** ~15 lines frontend + ~10 lines admin UI (2 date inputs).

### 3.5 Custom 404 Page
**Problem:** No custom error page in storefront — React Router catch-all goes to main app.  
**Fix:** Add a `Store404.jsx` page with template-aware styling. Add `<Route path="*" element={<Store404 />} />` in storefront routes.  
**Effort:** ~30 lines.

### 3.6 Product Category Pages
**Problem:** Categories are only shown as filter dropdown. No dedicated category pages with banners/descriptions.  
**Fix:** Add `StoreCategory.jsx` page at `/store/:slug/categories/:categoryId`. Shows category name, optional banner image, and filtered product grid. Link from category cards on homepage.  
**Effort:** ~60 lines new page + route addition.

### 3.7 Share & Social Commerce
**Problem:** Product detail has basic share buttons, but homepage/products list has none.  
**Fix:** Add "Share Store" button in footer/header, and product-level share to WhatsApp (with pre-filled message including product name + price + link). This is especially valuable for Bangladesh market.  
**Effort:** ~30 lines utility + ~15 lines UI.

### 3.8 Live Preview (Hot Reload)
**Problem:** Admin website settings iframe does a full page reload on every save.  
**Fix:** Use `postMessage` API to send token/setting updates from admin → iframe, and have `StorefrontLayout` listen for messages and update context without reload.  
**Effort:** ~40 lines (20 in admin, 20 in storefront layout).

### 3.9 Mobile-Optimized Checkout
**Problem:** Checkout is a single long page on mobile.  
**Fix:** Progressive disclosure — show one step at a time on mobile (Contact → Next → Shipping → Next → Review). Already has step state; just needs conditional rendering per breakpoint.  
**Effort:** ~30 lines CSS/conditional rendering.

### 3.10 Homepage Testimonials Section
**Problem:** No social proof section with real customer quotes.  
**Fix:** Add `homepage.testimonials` array in settings:
```json
{
  "testimonials": [
    { "name": "Sarah K.", "text": "Amazing quality!", "rating": 5, "image_url": null },
    ...
  ]
}
```
Render as a card carousel on homepage. Admin UI: simple list editor (name, quote, rating, optional photo).  
**Effort:** ~50 lines frontend + ~30 lines admin.

---

## Phase 4 — Advanced & Competitive Edge (10 items)

Features that differentiate Ecomai from competitors.

### 4.1 3 New Templates
Add templates targeting specific industries:
- **`boutique_chic`** — Fashion-focused, full-width imagery, Instagram-style grid, serif headings
- **`tech_store`** — Dark mode option, spec-heavy product cards, comparison-style layout  
- **`food_delivery`** — Category-centric homepage, delivery time badges, order-again flow

Each template is just a new entry in `templates.js` (18 tokens + some style hints) plus minor layout variants in storefront components (conditionally render based on template).  
**Effort:** ~100 lines in templates.js + ~60 lines conditional layout.

### 4.2 Homepage Layout Variants
**Problem:** All 5 templates share the exact same page structure.  
**Fix:** Define 3 homepage layout variants:
- **Standard** (current): Hero → Products → Trust → CTA
- **Category-First**: Category grid → Hero banner → Products → CTA
- **Lookbook**: Full-bleed image grid → Featured → Trust → CTA

Admin selects layout variant in Homepage tab. `StoreHome.jsx` conditionally renders layout.  
**Effort:** ~80 lines (layout switching logic).

### 4.3 Color Contrast Accessibility Checker
**Problem:** Shop admins can set any colors, potentially creating unreadable text.  
**Fix:** In the Colors & Fonts tab, calculate WCAG contrast ratio between text/background pairs and show a green/yellow/red indicator. Warn if ratio < 4.5 (AA fail).  
**Effort:** ~30 lines utility + ~15 lines UI.

### 4.4 SEO Structured Data (JSON-LD)
**Problem:** No structured data for search engines.  
**Fix:** Auto-generate JSON-LD for:
- `Organization` — from shop name, logo, social links
- `Product` — from product data (name, price, image, availability)
- `BreadcrumbList` — from current page path

Inject in `<head>` via `StorefrontLayout.jsx`.  
**Effort:** ~60 lines.

### 4.5 Progressive Web App (PWA)
**Problem:** Storefronts are regular web pages.  
**Fix:** Generate a `manifest.json` dynamically from shop settings (name, theme color, icons). Add service worker for offline product browsing. "Add to Home Screen" prompt.  
**Effort:** ~80 lines (manifest generation + SW registration).

### 4.6 Store Analytics Dashboard (Basic)
**Problem:** Shop admins have GA4 integration but no built-in analytics.  
**Fix:** Track basic events server-side (page views per product, add-to-cart events, checkout starts vs completions) and show a simple analytics tab in the admin dashboard.  
**Effort:** ~120 lines backend + ~80 lines frontend.

### 4.7 Multi-Currency Display
**Problem:** Only one currency configured per store.  
**Fix:** Allow shops to configure a secondary display currency with a fixed conversion rate. Show both: "৳2,499 (~$29.99)". Customer can toggle preferred currency.  
**Effort:** ~40 lines.

### 4.8 Related Products Algorithm
**Problem:** Related products on detail page just shows random products from same category.  
**Fix:** Improve with: same category → same price range ± 30% → exclude current → limit 4. Also add "Recently Viewed" section (localStorage-based).  
**Effort:** ~30 lines (related) + ~40 lines (recently viewed).

### 4.9 Template Import/Export
**Problem:** If a shop admin carefully customizes settings, there's no way to save or share that configuration.  
**Fix:** Add "Export Settings" button (downloads JSON file) and "Import Settings" button (uploads JSON, validates shape, applies). Useful for:
- Migrating between shops
- Sharing themed configs
- Resetting to a saved state  
**Effort:** ~40 lines admin UI + ~20 lines backend validation.

### 4.10 A/B Testing for Hero
**Problem:** No way to test which hero converts better.  
**Fix:** If `hero.slides` has 2+ entries, optionally enable A/B mode (50/50 random display, tracked via localStorage which variant was shown). Admin sees simple click-through comparison in stats.  
**Effort:** ~50 lines.

---

## Implementation Priority Matrix

| # | Item | Impact | Effort | Priority |
|---|------|--------|--------|----------|
| 1.1 | Fix template ID mismatch | High | 5min | **P0** |
| 1.2 | Wire up ignored settings | High | 2hr | **P0** |
| 1.3 | Wire up featured product IDs | High | 30min | **P0** |
| 1.4 | Replace emoji with SVG icons | High | 1hr | **P0** |
| 1.5 | Fix custom JS textarea | Medium | 10min | **P0** |
| 1.6 | Fix social proof with real data | Medium | 1hr | **P0** |
| 1.7 | Template preview thumbnails | Medium | 1hr | **P1** |
| 1.8 | Storefront pagination | High | 1hr | **P0** |
| 2.1 | Homepage section reordering | High | 2hr | **P1** |
| 2.2 | Multi-hero banner/slider | High | 2hr | **P1** |
| 2.3 | Font pairing system | Medium | 1hr | **P1** |
| 2.4 | Product badges | High | 1hr | **P1** |
| 2.5 | Product detail tabs | Medium | 1hr | **P1** |
| 2.6 | Rich text for policies | Medium | 1hr | **P1** |
| 2.7 | Configurable shipping display | High | 1hr | **P1** |
| 2.8 | Quick view modal | High | 2hr | **P1** |
| 2.9 | Wishlist | Medium | 2hr | **P2** |
| 2.10 | Color scheme presets | Medium | 1hr | **P1** |
| 3.1 | Newsletter collection | High | 2hr | **P1** |
| 3.2 | Product reviews & ratings | High | 5hr | **P2** |
| 3.3 | Forgot password flow | Medium | 2hr | **P2** |
| 3.4 | Announcement scheduling | Low | 30min | **P2** |
| 3.5 | Custom 404 page | Low | 30min | **P2** |
| 3.6 | Product category pages | Medium | 1hr | **P2** |
| 3.7 | Share & social commerce | Medium | 1hr | **P2** |
| 3.8 | Live preview (hot reload) | Medium | 1hr | **P2** |
| 3.9 | Mobile-optimized checkout | Medium | 1hr | **P2** |
| 3.10 | Homepage testimonials | Medium | 1.5hr | **P2** |
| 4.1 | 3 new templates | High | 3hr | **P2** |
| 4.2 | Homepage layout variants | Medium | 2hr | **P3** |
| 4.3 | Color contrast checker | Low | 1hr | **P3** |
| 4.4 | SEO structured data (JSON-LD) | High | 1.5hr | **P2** |
| 4.5 | Progressive Web App (PWA) | Medium | 2hr | **P3** |
| 4.6 | Store analytics dashboard | High | 4hr | **P3** |
| 4.7 | Multi-currency display | Low | 1hr | **P3** |
| 4.8 | Related products algorithm | Medium | 1hr | **P2** |
| 4.9 | Template import/export | Medium | 1hr | **P3** |
| 4.10 | A/B testing for hero | Low | 1.5hr | **P3** |

---

## Recommended Implementation Order

### Sprint 1 — Foundation Fixes (P0, ~6 hours)
Items: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8  
**Impact:** Fixes all broken/misleading features. Makes existing settings actually work.

### Sprint 2 — Creative Control (P1, ~14 hours)
Items: 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.10, 3.1  
**Impact:** Shop admins get real customization power. Storefronts look unique.

### Sprint 3 — Competitive Features (P2, ~22 hours)
Items: 2.9, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 4.1, 4.4, 4.8  
**Impact:** Feature parity with Shopify/WooCommerce basics.

### Sprint 4 — Advanced Edge (P3, ~13 hours)
Items: 4.2, 4.3, 4.5, 4.6, 4.7, 4.9, 4.10  
**Impact:** Differentiation from competitors.

---

## Architecture Notes

- **Zero schema migrations needed** for Phases 1-2: All new data fits in existing JSONB columns (`homepage`, `store_config`, `theme`, `announcement`)
- **Phase 3** requires 2 new tables: `newsletter_subscribers` and `product_reviews`
- **No new npm dependencies** for any phase — everything built with React + Tailwind + vanilla JS
- **Backward compatible** — all changes are additive, existing shops won't break
- **Template token system** is solid — just needs more tokens (headingFont, new templates) and wiring

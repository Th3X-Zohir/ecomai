/**
 * Comprehensive API smoke test — runs inside ecomai_api container
 */
const db = require('./src/db');
const bcrypt = require('bcryptjs');

const API = 'http://localhost:3000';
let token = null;
let shopId = null;
let passed = 0;
let failed = 0;

async function req(method, path, body, authToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(name, ok, detail) {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.error(`  ✗ ${name}${detail ? ' — ' + JSON.stringify(detail) : ''}`); }
}

async function main() {
  console.log('\n=== ECOMAI API SMOKE TEST ===\n');

  // 1. Plans
  console.log('── Public endpoints ──');
  let r = await req('GET', '/v1/register/plans');
  check('GET /v1/register/plans', r.status === 200 && r.data.items?.length >= 4, r.data);

  // 2. Login
  console.log('\n── Auth ──');
  r = await req('POST', '/v1/auth/login', { email: 'admin@coffee.dev', password: 'password123' });
  check('POST /v1/auth/login', r.status === 200 && r.data.accessToken, r.data);
  token = r.data.accessToken;
  
  // Get shopId
  const userInfo = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  shopId = userInfo.shop_id;
  check('JWT contains shop_id', !!shopId, userInfo);

  // 3. Refresh
  r = await req('POST', '/v1/auth/refresh', { refreshToken: r.data.refreshToken });
  check('POST /v1/auth/refresh', r.status === 200 && r.data.accessToken, r.data);

  // 4. Products
  console.log('\n── Products ──');
  r = await req('GET', '/v1/products', null, token);
  check('GET /v1/products', r.status === 200 && r.data.items, r.data);
  const productCount = r.data.items?.length || 0;

  r = await req('POST', '/v1/products', {
    name: 'Smoke Test Product', slug: 'smoke-test-' + Date.now(),
    base_price: 25.00, category: 'Test', status: 'active', stock_quantity: 100,
  }, token);
  check('POST /v1/products', r.status === 201 && r.data.id, r.data);
  const productId = r.data.id;

  r = await req('GET', `/v1/products/${productId}`, null, token);
  check('GET /v1/products/:id', r.status === 200 && r.data.name === 'Smoke Test Product', r.data);

  r = await req('PATCH', `/v1/products/${productId}`, { base_price: 30 }, token);
  check('PATCH /v1/products/:id', r.status === 200 && Number(r.data.base_price) === 30, r.data);

  // 5. Product Variants
  console.log('\n── Variants ──');
  r = await req('POST', `/v1/products/${productId}/variants`, {
    title: 'Large', sku: 'SMK-LG-' + Date.now(), price: 35, inventory_qty: 50,
    attributes: { size: 'Large' },
  }, token);
  check('POST /v1/products/:id/variants', r.status === 201 && r.data.id, r.data);
  const variantId = r.data.id;

  r = await req('GET', `/v1/products/${productId}/variants`, null, token);
  check('GET /v1/products/:id/variants', r.status === 200 && (Array.isArray(r.data) || r.data.items), r.data);

  // 6. Orders
  console.log('\n── Orders ──');
  r = await req('POST', '/v1/orders', {
    customer_email: 'test@customer.dev',
    items: [{ product_id: productId, variant_id: variantId, quantity: 2 }],
    shipping_address: { line1: '123 Test St', city: 'Dhaka', country: 'BD' },
  }, token);
  check('POST /v1/orders', r.status === 201 && r.data.id, r.data);
  const orderId = r.data?.id;

  if (orderId) {
    r = await req('GET', '/v1/orders', null, token);
    check('GET /v1/orders', r.status === 200 && r.data.items?.length > 0, r.data);

    r = await req('GET', `/v1/orders/${orderId}`, null, token);
    check('GET /v1/orders/:id', r.status === 200 && (r.data.id === orderId || r.data.order?.id === orderId), r.data);

    r = await req('PATCH', `/v1/orders/${orderId}/status`, { status: 'confirmed' }, token);
    check('PATCH /v1/orders/:id/status', r.status === 200 && r.data.status === 'confirmed', r.data);
  }

  // 7. Customers
  console.log('\n── Customers ──');
  r = await req('GET', '/v1/customers', null, token);
  check('GET /v1/customers', r.status === 200 && r.data.items, r.data);

  // 8. Payments
  console.log('\n── Payments ──');
  if (orderId) {
    r = await req('POST', '/v1/payments/manual', {
      orderId: orderId, amount: 70, method: 'cash',
    }, token);
    check('POST /v1/payments/manual', r.status === 201 && r.data.id, r.data);

    r = await req('GET', '/v1/payments', null, token);
    check('GET /v1/payments', r.status === 200 && r.data.items, r.data);
  }

  // 9. Delivery Requests
  console.log('\n── Delivery ──');
  if (orderId) {
    r = await req('POST', '/v1/delivery-requests', {
      orderId: orderId,
      pickup_address: { line1: 'Warehouse', city: 'Dhaka' },
      delivery_address: { line1: '123 Test St', city: 'Dhaka' },
    }, token);
    check('POST /v1/delivery-requests', r.status === 201 && r.data.id, r.data);
    const deliveryId = r.data?.id;

    r = await req('GET', '/v1/delivery-requests', null, token);
    check('GET /v1/delivery-requests', r.status === 200 && r.data.items, r.data);

    if (deliveryId) {
      r = await req('PATCH', `/v1/delivery-requests/${deliveryId}/status`, { status: 'assigned' }, token);
      check('PATCH delivery status', r.status === 200, r.data);
    }
  }

  // 10. Marketing Campaigns
  console.log('\n── Campaigns ──');
  r = await req('POST', '/v1/marketing-campaigns', {
    name: 'Smoke Campaign ' + Date.now(), type: 'email',
    subject: 'Test', content: { headline: 'Hi', body: 'Test', cta: 'Buy' },
  }, token);
  check('POST /v1/marketing-campaigns', r.status === 201 && r.data.id, r.data);
  const campaignId = r.data?.id;

  r = await req('GET', '/v1/marketing-campaigns', null, token);
  check('GET /v1/marketing-campaigns', r.status === 200 && r.data.items, r.data);

  // 11. Inventory Movements
  console.log('\n── Inventory ──');
  r = await req('GET', '/v1/inventory-movements', null, token);
  check('GET /v1/inventory-movements', r.status === 200 && r.data.items, r.data);

  // 12. Website Settings
  console.log('\n── Website Settings ──');
  r = await req('GET', '/v1/website-settings/me', null, token);
  check('GET /v1/website-settings/me', r.status === 200 && r.data.template, r.data);

  r = await req('PATCH', '/v1/website-settings/me', { template: 'modern_luxe' }, token);
  check('PATCH /v1/website-settings/me', r.status === 200 && r.data.template === 'modern_luxe', r.data);

  // 13. Shops
  console.log('\n── Shops ──');
  r = await req('GET', '/v1/shops/me', null, token);
  check('GET /v1/shops/me', r.status === 200 && r.data.slug, r.data);

  // 14. Users
  console.log('\n── Users ──');
  r = await req('GET', '/v1/users', null, token);
  check('GET /v1/users', r.status === 200 && r.data.items, r.data);

  // 15. Public storefront
  console.log('\n── Public Storefront ──');
  r = await req('GET', '/v1/public/shops/demo-coffee');
  check('GET /v1/public/shops/:slug', r.status === 200 && r.data.slug === 'demo-coffee', r.data);

  r = await req('GET', '/v1/public/shops/demo-coffee/settings');
  check('GET /v1/public/shops/:slug/settings', r.status === 200, r.data);

  r = await req('GET', '/v1/public/shops/demo-coffee/products');
  check('GET /v1/public/shops/:slug/products', r.status === 200 && r.data.items, r.data);

  // 16. Registration
  console.log('\n── Registration ──');
  r = await req('POST', '/v1/register', {
    shop_name: 'Smoke Shop', slug: 'smoke-shop-' + Date.now(),
    email: `smoke-${Date.now()}@test.dev`, password: 'testpass123',
    full_name: 'Test Owner', industry: 'general', plan: 'free',
  });
  check('POST /v1/register', r.status === 201 && r.data.shop && r.data.accessToken, r.data);

  // Summary
  console.log(`\n\n=== RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} ===\n`);
  
  await db.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });

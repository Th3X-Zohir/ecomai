/* ── Public Storefront API client ── */
function resolvePublicApiBase() {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!raw) return '/v1/public';
  if (raw.endsWith('/v1/public')) return raw;
  if (raw.endsWith('/v1')) return `${raw}/public`;
  return `${raw}/v1/public`;
}

const API_BASE = resolvePublicApiBase();

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `${res.status}`);
  }
  return res.json();
}

export const storeApi = {
  // Shop
  getShop: (slug) => request('GET', `/shops/${slug}`),
  getSettings: (slug) => request('GET', `/shops/${slug}/settings`),
  getStats: (slug) => request('GET', `/shops/${slug}/stats`),

  // Products
  getProducts: (slug, params) => {
    const p = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
    const qs = p.toString();
    return request('GET', `/shops/${slug}/products${qs ? `?${qs}` : ''}`);
  },
  getProduct: (slug, productSlug) => request('GET', `/shops/${slug}/products/${productSlug}`),

  // Categories
  getCategories: (slug) => request('GET', `/shops/${slug}/categories`),
  submitCategoryRequest: (slug, data) => request('POST', `/shops/${slug}/category-requests`, data),

  // Customer auth
  register: (slug, data) => request('POST', `/shops/${slug}/auth/register`, data),
  login: (slug, data) => request('POST', `/shops/${slug}/auth/login`, data),
  getProfile: (slug, token) => request('GET', `/shops/${slug}/account/me`, null, token),
  updateProfile: (slug, data, token) => request('PATCH', `/shops/${slug}/account/me`, data, token),
  changePassword: (slug, data, token) => request('POST', `/shops/${slug}/account/change-password`, data, token),
  getOrders: (slug, token, params) => {
    const p = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
    const qs = p.toString();
    return request('GET', `/shops/${slug}/account/orders${qs ? `?${qs}` : ''}`, null, token);
  },
  getOrderDetail: (slug, orderId, token) => request('GET', `/shops/${slug}/account/orders/${orderId}`, null, token),

  // Invoices
  getInvoices: (slug, token, params) => {
    const p = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
    const qs = p.toString();
    return request('GET', `/shops/${slug}/account/invoices${qs ? `?${qs}` : ''}`, null, token);
  },
  getInvoiceDetail: (slug, invoiceId, token) => request('GET', `/shops/${slug}/account/invoices/${invoiceId}`, null, token),

  // Checkout (creates order + initiates SSLCommerz payment + auto-creates customer)
  checkout: (slug, data) => request('POST', `/shops/${slug}/checkout`, data),

  // Order tracking (public — no auth required)
  trackOrder: (slug, data) => request('POST', `/shops/${slug}/track`, data),

  // Coupon validation
  validateCoupon: (slug, code, orderTotal) =>
    request('POST', `/shops/${slug}/validate-coupon`, { code, order_amount: orderTotal }),

  // Newsletter
  subscribeNewsletter: (slug, email) => request('POST', `/shops/${slug}/newsletter`, { email }),

  // Reviews
  getProductReviews: (slug, productId) => request('GET', `/shops/${slug}/products/${productId}/reviews`),
  submitReview: (slug, productId, data, token) => request('POST', `/shops/${slug}/products/${productId}/reviews`, data, token),

  // Wishlist
  getWishlist: (slug, token) => request('GET', `/shops/${slug}/wishlist`, null, token),
  addToWishlist: (slug, productId, token) => request('POST', `/shops/${slug}/wishlist`, { product_id: productId }, token),
  removeFromWishlist: (slug, productId, token) => request('DELETE', `/shops/${slug}/wishlist/${productId}`, null, token),

  // Forgot Password
  forgotPassword: (slug, email) => request('POST', `/shops/${slug}/auth/forgot-password`, { email }),
  resetPassword: (slug, token, newPassword) => request('POST', `/shops/${slug}/auth/reset-password`, { token, new_password: newPassword }),
};
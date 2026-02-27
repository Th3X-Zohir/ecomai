/* ── Public Storefront API client ── */
const API_BASE = '/v1/public';

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
  getOrders: (slug, token, params) => {
    const p = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
    const qs = p.toString();
    return request('GET', `/shops/${slug}/account/orders${qs ? `?${qs}` : ''}`, null, token);
  },

  // Checkout (creates order + initiates SSLCommerz payment)
  checkout: (slug, data) => request('POST', `/shops/${slug}/checkout`, data),
};
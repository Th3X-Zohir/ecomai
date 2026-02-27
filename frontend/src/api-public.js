/* ── Public Storefront API client (no auth required) ── */
const API_BASE = '/v1/public';

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `${res.status}`);
  }
  return res.json();
}

export const storeApi = {
  /** Get shop info + website settings by slug */
  getShop: (slug) => request('GET', `/shops/${slug}`),

  /** List active products */
  getProducts: (slug) => request('GET', `/shops/${slug}/products`),

  /** Get single product + variants */
  getProduct: (slug, productId) => request('GET', `/shops/${slug}/products/${productId}`),

  /** Checkout — create order */
  checkout: (slug, data) => request('POST', `/shops/${slug}/orders`, data),
};

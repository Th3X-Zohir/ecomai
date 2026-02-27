const API_BASE = '/v1';

let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');
let onAuthFail = null;

export function setAuthFailHandler(handler) { onAuthFail = handler; }

export function setTokens(access, refresh) {
  accessToken = access; refreshToken = refresh;
  if (access) localStorage.setItem('accessToken', access); else localStorage.removeItem('accessToken');
  if (refresh) localStorage.setItem('refreshToken', refresh); else localStorage.removeItem('refreshToken');
}

export function getAccessToken() { return accessToken; }

export function clearTokens() {
  accessToken = null; refreshToken = null;
  localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken');
}

async function request(method, path, body, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });

  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
    });
    if (refreshRes.ok) {
      const data = await refreshRes.json();
      setTokens(data.accessToken, data.refreshToken);
      headers['Authorization'] = `Bearer ${data.accessToken}`;
      const retry = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
      if (!retry.ok) { const err = await retry.json().catch(() => ({ message: 'Request failed' })); throw new Error(err.message || `${retry.status}`); }
      return retry.json();
    } else { clearTokens(); if (onAuthFail) onAuthFail(); throw new Error('Session expired'); }
  }

  if (!res.ok) { const err = await res.json().catch(() => ({ message: 'Request failed' })); throw new Error(err.message || `${res.status}`); }
  return res.json();
}

function qs(params) { const p = new URLSearchParams(); if (params) Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') p.set(k, v); }); const s = p.toString(); return s ? `?${s}` : ''; }

export const auth = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  refresh: (token) => request('POST', '/auth/refresh', { refreshToken: token }),
  logout: (token) => request('POST', '/auth/logout', { refreshToken: token }),
};

export const register = {
  plans: () => request('GET', '/register/plans'),
  create: (data) => request('POST', '/register', data),
};

export const users = {
  me: () => request('GET', '/users/me'),
  list: (params) => request('GET', `/users${qs(params)}`),
  create: (data) => request('POST', '/users', data),
};

export const shops = {
  list: (params) => request('GET', `/shops${qs(params)}`),
  me: () => request('GET', '/shops/me'),
  updateMe: (data) => request('PATCH', '/shops/me', data),
  create: (data) => request('POST', '/shops', data),
};

export const products = {
  list: (params) => request('GET', `/products${qs(params)}`),
  get: (id) => request('GET', `/products/${id}`),
  create: (data) => request('POST', '/products', data),
  update: (id, data) => request('PATCH', `/products/${id}`, data),
  delete: (id) => request('DELETE', `/products/${id}`),
};

export const variants = {
  list: (productId) => request('GET', `/products/${productId}/variants`),
  create: (productId, data) => request('POST', `/products/${productId}/variants`, data),
  get: (variantId) => request('GET', `/product-variants/${variantId}`),
  update: (variantId, data) => request('PATCH', `/product-variants/${variantId}`, data),
  delete: (variantId) => request('DELETE', `/product-variants/${variantId}`),
};

export const orders = {
  list: (params) => request('GET', `/orders${qs(params)}`),
  get: (id) => request('GET', `/orders/${id}`),
  create: (data) => request('POST', '/orders', data),
  updateStatus: (id, status) => request('PATCH', `/orders/${id}/status`, { status }),
  createDelivery: (orderId, data) => request('POST', `/orders/${orderId}/delivery-requests`, data),
  createPayment: (orderId, data) => request('POST', `/orders/${orderId}/payments`, data),
};

export const customers = {
  list: (params) => request('GET', `/customers${qs(params)}`),
  create: (data) => request('POST', '/customers', data),
};

export const payments = {
  list: (params) => request('GET', `/payments${qs(params)}`),
  get: (id) => request('GET', `/payments/${id}`),
  refund: (paymentId, data) => request('POST', `/payments/${paymentId}/refunds`, data),
};

export const deliveries = {
  list: (params) => request('GET', `/delivery-requests${qs(params)}`),
  updateStatus: (id, status) => request('PATCH', `/delivery-requests/${id}/status`, { status }),
  assign: (id, driverId) => request('PATCH', `/delivery-requests/${id}/assign`, { driver_user_id: driverId }),
};

export const campaigns = {
  list: (params) => request('GET', `/marketing-campaigns${qs(params)}`),
  get: (id) => request('GET', `/marketing-campaigns/${id}`),
  create: (data) => request('POST', '/marketing-campaigns', data),
  update: (id, data) => request('PATCH', `/marketing-campaigns/${id}`, data),
  generateDraft: (data) => request('POST', '/marketing-campaigns/generate-draft', data),
};

export const inventory = {
  list: (params) => request('GET', `/inventory-movements${qs(params)}`),
  create: (data) => request('POST', '/inventory-movements', data),
};

export const websiteSettings = {
  get: () => request('GET', '/website-settings/me'),
  update: (data) => request('PATCH', '/website-settings/me', data),
};
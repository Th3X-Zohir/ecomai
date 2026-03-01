const API_BASE = '/v1';

let accessToken = localStorage.getItem('accessToken');
let refreshToken = localStorage.getItem('refreshToken');
let onAuthFail = null;
let _selectedShopId = localStorage.getItem('selectedShopId') || null;

export function setAuthFailHandler(handler) { onAuthFail = handler; }

export function setSelectedShopId(id) {
  _selectedShopId = id;
  if (id) localStorage.setItem('selectedShopId', id);
  else localStorage.removeItem('selectedShopId');
}
export function getSelectedShopId() { return _selectedShopId; }

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
  if (_selectedShopId) headers['x-shop-id'] = _selectedShopId;
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

// Download helper for CSV exports (needs auth headers)
export async function downloadFile(path, filename) {
  const headers = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  if (_selectedShopId) headers['x-shop-id'] = _selectedShopId;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) { const err = await res.json().catch(() => ({ message: 'Download failed' })); throw new Error(err.message || `${res.status}`); }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

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
  get: (id) => request('GET', `/users/${id}`),
  list: (params) => request('GET', `/users${qs(params)}`),
  listAll: (params) => request('GET', `/users/all${qs(params)}`),
  create: (data) => request('POST', '/users', data),
  update: (id, data) => request('PATCH', `/users/${id}`, data),
  delete: (id) => request('DELETE', `/users/${id}`),
};

export const shops = {
  list: (params) => request('GET', `/shops${qs(params)}`),
  get: (id) => request('GET', `/shops/${id}`),
  me: () => request('GET', '/shops/me'),
  updateMe: (data) => request('PATCH', '/shops/me', data),
  create: (data) => request('POST', '/shops', data),
  update: (id, data) => request('PATCH', `/shops/${id}`, data),
  delete: (id) => request('DELETE', `/shops/${id}`),
};

export const products = {
  list: (params) => request('GET', `/products${qs(params)}`),
  get: (id) => request('GET', `/products/${id}`),
  create: (data) => request('POST', '/products', data),
  update: (id, data) => request('PATCH', `/products/${id}`, data),
  delete: (id) => request('DELETE', `/products/${id}`),
  stats: () => request('GET', '/products/stats/summary'),
  exportCsvUrl: (params) => `${API_BASE}/products/export/csv${qs(params)}`,
};

export const productImages = {
  list: (productId) => request('GET', `/products/${productId}/images`),
  upload: async (productId, files, isPrimary = false) => {
    const fd = new FormData();
    for (const f of files) fd.append('images', f);
    if (isPrimary) fd.append('is_primary', 'true');
    const headers = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    if (_selectedShopId) headers['x-shop-id'] = _selectedShopId;
    const res = await fetch(`${API_BASE}/products/${productId}/images`, { method: 'POST', headers, body: fd });
    if (!res.ok) { const err = await res.json().catch(() => ({ message: 'Upload failed' })); throw new Error(err.message || `${res.status}`); }
    return res.json();
  },
  setPrimary: (productId, imageId) => request('PATCH', `/products/${productId}/images/${imageId}/primary`),
  delete: (productId, imageId) => request('DELETE', `/products/${productId}/images/${imageId}`),
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
  update: (id, data) => request('PATCH', `/orders/${id}`, data),
  updateStatus: (id, status) => request('PATCH', `/orders/${id}/status`, { status }),
  delete: (id) => request('DELETE', `/orders/${id}`),
  createDelivery: (orderId, data) => request('POST', `/orders/${orderId}/delivery-requests`, data),
  createPayment: (orderId, data) => request('POST', `/orders/${orderId}/payments`, data),
  bulkStatus: (order_ids, status) => request('POST', '/orders/bulk/status', { order_ids, status }),
  stats: () => request('GET', '/orders/stats/summary'),
  exportCsvUrl: (params) => `${API_BASE}/orders/export/csv${qs(params)}`,
};

export const customers = {
  list: (params) => request('GET', `/customers${qs(params)}`),
  get: (id) => request('GET', `/customers/${id}`),
  create: (data) => request('POST', '/customers', data),
  update: (id, data) => request('PATCH', `/customers/${id}`, data),
  delete: (id) => request('DELETE', `/customers/${id}`),
};

export const payments = {
  list: (params) => request('GET', `/payments${qs(params)}`),
  get: (id) => request('GET', `/payments/${id}`),
  manual: (data) => request('POST', '/payments/manual', data),
  update: (id, data) => request('PATCH', `/payments/${id}`, data),
  delete: (id) => request('DELETE', `/payments/${id}`),
  refund: (paymentId, data) => request('POST', `/payments/${paymentId}/refunds`, data),
};

export const deliveries = {
  list: (params) => request('GET', `/delivery-requests${qs(params)}`),
  get: (id) => request('GET', `/delivery-requests/${id}`),
  listByDriver: (driverUserId, params) => request('GET', `/delivery-requests/by-driver/${driverUserId}${qs(params)}`),
  updateStatus: (id, status) => request('PATCH', `/delivery-requests/${id}/status`, { status }),
  assign: (id, driverId) => request('PATCH', `/delivery-requests/${id}/assign`, { driver_user_id: driverId }),
  delete: (id) => request('DELETE', `/delivery-requests/${id}`),
};

export const campaigns = {
  list: (params) => request('GET', `/marketing-campaigns${qs(params)}`),
  get: (id) => request('GET', `/marketing-campaigns/${id}`),
  create: (data) => request('POST', '/marketing-campaigns', data),
  update: (id, data) => request('PATCH', `/marketing-campaigns/${id}`, data),
  delete: (id) => request('DELETE', `/marketing-campaigns/${id}`),
  generateDraft: (data) => request('POST', '/marketing-campaigns/generate-draft', data),
};

export const inventory = {
  list: (params) => request('GET', `/inventory-movements${qs(params)}`),
  get: (id) => request('GET', `/inventory-movements/${id}`),
  create: (data) => request('POST', '/inventory-movements', data),
};

export const websiteSettings = {
  get: () => request('GET', '/website-settings/me'),
  update: (data) => request('PATCH', '/website-settings/me', data),
  uploadImage: async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    const headers = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    if (_selectedShopId) headers['x-shop-id'] = _selectedShopId;
    const res = await fetch(`${API_BASE}/website-settings/upload`, { method: 'POST', headers, body: fd });
    if (!res.ok) { const err = await res.json().catch(() => ({ message: 'Upload failed' })); throw new Error(err.message || `${res.status}`); }
    return res.json();
  },
};

export const categories = {
  list: (params) => request('GET', `/categories${qs(params)}`),
  withCounts: () => request('GET', '/categories/with-counts'),
  get: (id) => request('GET', `/categories/${id}`),
  create: (data) => request('POST', '/categories', data),
  update: (id, data) => request('PATCH', `/categories/${id}`, data),
  delete: (id) => request('DELETE', `/categories/${id}`),
  // Category requests
  submitRequest: (data) => request('POST', '/categories/requests', data),
  requests: (params) => request('GET', `/categories/requests/list${qs(params)}`),
  pendingCount: () => request('GET', '/categories/requests/pending-count'),
  approveRequest: (id, data) => request('POST', `/categories/requests/${id}/approve`, data),
  rejectRequest: (id, data) => request('POST', `/categories/requests/${id}/reject`, data),
};

export const coupons = {
  list: (params) => request('GET', `/coupons${qs(params)}`),
  get: (id) => request('GET', `/coupons/${id}`),
  create: (data) => request('POST', '/coupons', data),
  update: (id, data) => request('PATCH', `/coupons/${id}`, data),
  delete: (id) => request('DELETE', `/coupons/${id}`),
};

export const invoices = {
  list: (params) => request('GET', `/invoices${qs(params)}`),
  listAll: (params) => request('GET', `/invoices${qs({ ...params, all: 'true' })}`),
  get: (id) => request('GET', `/invoices/${id}`),
  create: (data) => request('POST', '/invoices', data),
  generateFromOrder: (orderId, data) => request('POST', `/invoices/from-order/${orderId}`, data || {}),
  update: (id, data) => request('PATCH', `/invoices/${id}`, data),
  updateStatus: (id, status) => request('PATCH', `/invoices/${id}/status`, { status }),
  recordPayment: (id, amount) => request('POST', `/invoices/${id}/record-payment`, { amount }),
  delete: (id) => request('DELETE', `/invoices/${id}`),
};

export const earnings = {
  // Shop admin
  summary: () => request('GET', '/earnings/my/summary'),
  transactions: (params) => request('GET', `/earnings/my/transactions${qs(params)}`),
  withdrawals: (params) => request('GET', `/earnings/my/withdrawals${qs(params)}`),
  requestWithdrawal: (data) => request('POST', '/earnings/my/withdrawals', data),
  // Super admin
  platformSummary: () => request('GET', '/earnings/platform/summary'),
  shopBalances: (params) => request('GET', `/earnings/platform/balances${qs(params)}`),
  allTransactions: (params) => request('GET', `/earnings/platform/transactions${qs(params)}`),
  allWithdrawals: (params) => request('GET', `/earnings/platform/withdrawals${qs(params)}`),
  approveWithdrawal: (id, data) => request('POST', `/earnings/platform/withdrawals/${id}/approve`, data || {}),
  rejectWithdrawal: (id, data) => request('POST', `/earnings/platform/withdrawals/${id}/reject`, data),
  processWithdrawal: (id, data) => request('POST', `/earnings/platform/withdrawals/${id}/process`, data || {}),
  completeWithdrawal: (id, data) => request('POST', `/earnings/platform/withdrawals/${id}/complete`, data || {}),
  adjustment: (data) => request('POST', '/earnings/platform/adjustments', data),
  getCommission: (params) => request('GET', `/earnings/platform/commission${qs(params)}`),
  updateCommission: (data) => request('PUT', '/earnings/platform/commission', data),
};

export const dashboard = {
  shop: () => request('GET', '/dashboard/shop'),
  revenueTimeline: (days) => request('GET', `/dashboard/shop/revenue-timeline${qs({ days })}`),
  platform: () => request('GET', '/dashboard/platform'),
};

export const subscriptions = {
  // Plans
  listPlans: (params) => request('GET', `/subscriptions/plans${qs(params)}`),
  createPlan: (data) => request('POST', '/subscriptions/plans', data),
  updatePlan: (id, data) => request('PATCH', `/subscriptions/plans/${id}`, data),
  deletePlan: (id) => request('DELETE', `/subscriptions/plans/${id}`),
  // Shop subscriptions
  listShops: (params) => request('GET', `/subscriptions/shops${qs(params)}`),
  updateShop: (shopId, plan, billing_cycle) => request('PATCH', `/subscriptions/shops/${shopId}`, { plan, billing_cycle }),
  // Payments
  listPayments: (params) => request('GET', `/subscriptions/payments${qs(params)}`),
  getPayment: (id) => request('GET', `/subscriptions/payments/${id}`),
  updatePayment: (id, data) => request('PATCH', `/subscriptions/payments/${id}`, data),
  deletePayment: (id) => request('DELETE', `/subscriptions/payments/${id}`),
  // Stats
  stats: () => request('GET', '/subscriptions/stats'),
  // Usage & Plan (shop-facing)
  myUsage: () => request('GET', '/subscriptions/my-usage'),
  myPlan: () => request('GET', '/subscriptions/my-plan'),
  cancelSubscription: (immediate = false) => request('POST', '/subscriptions/cancel', { immediate }),
  myAuditLog: (params) => request('GET', `/subscriptions/my-audit-log${qs(params)}`),
  // Audit log (super admin)
  auditLog: (params) => request('GET', `/subscriptions/audit-log${qs(params)}`),
  // Shop usage (super admin)
  shopUsage: (shopId) => request('GET', `/subscriptions/shops/${shopId}/usage`),
};

export const reviews = {
  list: (params) => request('GET', `/reviews${qs(params)}`),
  stats: () => request('GET', '/reviews/stats'),
  approve: (id) => request('PATCH', `/reviews/${id}/approve`),
  reject: (id) => request('PATCH', `/reviews/${id}/reject`),
  remove: (id) => request('DELETE', `/reviews/${id}`),
};

export const newsletter = {
  list: (params) => request('GET', `/newsletter${qs(params)}`),
  stats: () => request('GET', '/newsletter/stats'),
  unsubscribe: (id) => request('PATCH', `/newsletter/${id}/unsubscribe`),
  remove: (id) => request('DELETE', `/newsletter/${id}`),
  exportUrl: () => `${API_BASE}/newsletter/export`,
};
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { storeApi } from '../../api-public';
import { useStore } from '../../contexts/StoreContext';
import { resolveTokens } from '../templates';

/* ── Status helpers ── */
const statusColor = (s) => {
  const map = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    pending_payment: { bg: '#fef3c7', text: '#92400e' },
    confirmed: { bg: '#dbeafe', text: '#1e40af' },
    processing: { bg: '#e0e7ff', text: '#3730a3' },
    shipped: { bg: '#ede9fe', text: '#5b21b6' },
    delivered: { bg: '#dcfce7', text: '#166534' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
    refunded: { bg: '#fce7f3', text: '#9d174d' },
    paid: { bg: '#dcfce7', text: '#166534' },
    unpaid: { bg: '#fef3c7', text: '#92400e' },
    failed: { bg: '#fee2e2', text: '#991b1b' },
  };
  return map[s] || { bg: '#f3f4f6', text: '#374151' };
};

const StatusBadge = ({ status }) => {
  const c = statusColor(status);
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

/* ── Stable Card component (module-level, never recreated) ── */
function Card({ t, children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}
      style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
      {children}
    </div>
  );
}

/* ── SVG Icons ── */
const Icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  ),
  orders: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
  ),
  addresses: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ),
  security: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
  ),
  invoices: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
  ),
  back: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
  ),
  package: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
  ),
  money: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ),
};

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { id: 'orders', label: 'My Orders', icon: Icons.orders },
  { id: 'profile', label: 'Profile', icon: Icons.profile },
  { id: 'addresses', label: 'Addresses', icon: Icons.addresses },
  { id: 'security', label: 'Security', icon: Icons.security },
  { id: 'invoices', label: 'Invoices', icon: Icons.invoices },
];

/* ── Order timeline ── */
const ORDER_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

function OrderTimeline({ status, t }) {
  const idx = ORDER_STEPS.indexOf(status);
  const isCancelled = status === 'cancelled' || status === 'refunded';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-3">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>✕</div>
        <span className="text-sm font-medium capitalize" style={{ color: '#991b1b' }}>{status}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 py-3 overflow-x-auto">
      {ORDER_STEPS.map((step, i) => {
        const done = i <= idx;
        const current = i === idx;
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${current ? 'ring-2 ring-offset-2' : ''}`}
                style={{
                  backgroundColor: done ? t.primary : t.border,
                  color: done ? t.bg : t.textMuted,
                  ...(current ? { '--tw-ring-color': t.primary } : {}),
                }}>
                {done && i < idx ? '✓' : i + 1}
              </div>
              <span className="text-[10px] mt-1 capitalize whitespace-nowrap"
                style={{ color: done ? t.text : t.textMuted }}>{step}</span>
            </div>
            {i < ORDER_STEPS.length - 1 && (
              <div className="w-8 sm:w-12 h-0.5 mx-1 -mt-3"
                style={{ backgroundColor: i < idx ? t.primary : t.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
export default function StoreAccount() {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const { theme, tokens, formatPrice } = useStore();
  const t = resolveTokens(theme, tokens);

  const token = localStorage.getItem(`customer_token_${shopSlug}`);
  const [tab, setTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!token) { navigate(`/store/${shopSlug}/auth/login`); return; }
    Promise.all([
      storeApi.getProfile(shopSlug, token).catch(() => null),
      storeApi.getOrders(shopSlug, token).catch(() => ({ items: [] })),
    ]).then(([p, o]) => {
      if (!p) { localStorage.removeItem(`customer_token_${shopSlug}`); navigate(`/store/${shopSlug}/auth/login`); return; }
      setProfile(p);
      setOrders(o.items || []);
    }).finally(() => setLoading(false));
  }, [shopSlug, token, navigate]);

  const viewOrder = async (orderId) => {
    setSelectedOrder(orderId);
    setDetailLoading(true);
    try {
      const detail = await storeApi.getOrderDetail(shopSlug, orderId, token);
      setOrderDetail(detail);
    } catch { setOrderDetail(null); }
    finally { setDetailLoading(false); }
  };

  const logout = () => {
    localStorage.removeItem(`customer_token_${shopSlug}`);
    localStorage.removeItem(`customer_${shopSlug}`);
    navigate(`/store/${shopSlug}`);
  };

  /* ── Loading spinner ── */
  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: t.primary }} />
    </div>
  );

  const totalSpent = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;
  const addresses = Array.isArray(profile?.addresses) ? profile.addresses : [];
  const btnPrimary = { backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* ── Sidebar ── */}
        <aside className="lg:w-64 shrink-0">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-full flex items-center justify-between p-4 mb-2 text-sm font-medium"
            style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}`, color: t.text }}>
            <span>{TABS.find(tb => tb.id === tab)?.label || 'Menu'}</span>
            <svg className={`w-4 h-4 transition ${mobileMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <nav className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block space-y-1 p-3 sticky top-20`}
            style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
            <div className="flex items-center gap-3 px-3 py-4 mb-2" style={{ borderBottom: `1px solid ${t.border}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: `${t.primary}15`, color: t.primary }}>
                {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: t.text }}>{profile?.full_name || 'Customer'}</div>
                <div className="text-xs truncate" style={{ color: t.textMuted }}>{profile?.email}</div>
              </div>
            </div>

            {TABS.map((tb) => (
              <button key={tb.id}
                onClick={() => { setTab(tb.id); setMobileMenuOpen(false); if (tb.id !== 'orders') { setSelectedOrder(null); setOrderDetail(null); } }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition"
                style={{
                  backgroundColor: tab === tb.id ? `${t.primary}12` : 'transparent',
                  color: tab === tb.id ? t.primary : t.textMuted,
                }}>
                {tb.icon}
                {tb.label}
              </button>
            ))}

            <div className="pt-2 mt-2" style={{ borderTop: `1px solid ${t.border}` }}>
              <button onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition text-red-500 hover:bg-red-50">
                {Icons.logout}
                Sign Out
              </button>
            </div>
          </nav>
        </aside>

        {/* ── Main content — proper component boundaries ── */}
        <main className="flex-1 min-w-0">
          {tab === 'dashboard' && (
            <DashboardTab t={t} profile={profile} orders={orders} shopSlug={shopSlug}
              totalSpent={totalSpent} deliveredCount={deliveredCount}
              setTab={setTab} viewOrder={viewOrder} btnPrimary={btnPrimary} formatPrice={formatPrice} />
          )}
          {tab === 'orders' && (
            <OrdersTab t={t} orders={orders} shopSlug={shopSlug}
              selectedOrder={selectedOrder} orderDetail={orderDetail}
              detailLoading={detailLoading} setSelectedOrder={setSelectedOrder}
              setOrderDetail={setOrderDetail} viewOrder={viewOrder} btnPrimary={btnPrimary} formatPrice={formatPrice} />
          )}
          {tab === 'profile' && (
            <ProfileTab t={t} profile={profile} setProfile={setProfile}
              shopSlug={shopSlug} token={token} />
          )}
          {tab === 'addresses' && (
            <AddressesTab t={t} profile={profile} setProfile={setProfile}
              shopSlug={shopSlug} token={token} addresses={addresses} />
          )}
          {tab === 'security' && (
            <SecurityTab t={t} profile={profile} shopSlug={shopSlug} token={token} />
          )}
          {tab === 'invoices' && (
            <InvoicesTab t={t} shopSlug={shopSlug} token={token} formatPrice={formatPrice} />
          )}
        </main>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   EXTRACTED TAB COMPONENTS
   Each has its own hook scope — no hook-order issues
   ══════════════════════════════════════════════ */

/* ── Dashboard Tab ── */
function DashboardTab({ t, profile, orders, shopSlug, totalSpent, deliveredCount, setTab, viewOrder, btnPrimary, formatPrice }) {
  return (
    <div className="space-y-6">
      {/* Welcome hero */}
      <div className="p-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary || t.primary}dd)`, borderRadius: t.radius }}>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1" style={{ color: t.bg }}>
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Shopper'}!
          </h2>
          <p className="text-sm opacity-80" style={{ color: t.bg }}>Here's a quick summary of your account.</p>
        </div>
        <div className="absolute right-4 bottom-2 opacity-10 text-8xl font-black" style={{ color: t.bg }}>♥</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Orders', value: orders.length, icon: Icons.package, color: t.primary },
          { label: 'Total Spent', value: formatPrice(totalSpent), icon: Icons.money, color: '#16a34a' },
          { label: 'Delivered', value: deliveredCount, icon: Icons.orders, color: '#8b5cf6' },
        ].map((stat) => (
          <Card t={t} key={stat.label}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                {stat.icon}
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: t.text }}>{stat.value}</div>
                <div className="text-xs" style={{ color: t.textMuted }}>{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent orders */}
      <Card t={t}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: t.text }}>Recent Orders</h3>
          {orders.length > 3 && (
            <button onClick={() => setTab('orders')} className="text-sm font-medium hover:underline" style={{ color: t.primary }}>
              View all
            </button>
          )}
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 opacity-30">📦</div>
            <p className="text-sm" style={{ color: t.textMuted }}>No orders yet. Start shopping!</p>
            <Link to={`/store/${shopSlug}/products`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium mt-4 transition hover:opacity-80"
              style={btnPrimary}>Browse Products</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 3).map(order => (
              <button key={order.id} onClick={() => { setTab('orders'); viewOrder(order.id); }}
                className="w-full flex items-center justify-between p-4 rounded-lg transition hover:opacity-80 text-left"
                style={{ backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: t.radius }}>
                <div>
                  <div className="font-semibold text-sm" style={{ color: t.text }}>Order #{order.id?.slice(0, 8)}</div>
                  <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>
                    {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm" style={{ color: t.text }}>{formatPrice(order.total_amount)}</div>
                  <StatusBadge status={order.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Orders Tab ── */
function OrdersTab({ t, orders, shopSlug, selectedOrder, orderDetail, detailLoading, setSelectedOrder, setOrderDetail, viewOrder, btnPrimary, formatPrice }) {
  /* Detail view */
  if (selectedOrder && orderDetail) {
    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedOrder(null); setOrderDetail(null); }}
          className="flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: t.primary }}>
          {Icons.back} Back to orders
        </button>

        <Card t={t}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-xl font-bold" style={{ color: t.text }}>Order #{orderDetail.id?.slice(0, 8)}</h3>
              <p className="text-sm mt-0.5" style={{ color: t.textMuted }}>
                Placed on {new Date(orderDetail.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={orderDetail.status} />
              <StatusBadge status={orderDetail.payment_status} />
            </div>
          </div>
          <OrderTimeline status={orderDetail.status} t={t} />
        </Card>

        {/* Items */}
        <Card t={t}>
          <h4 className="text-base font-bold mb-4" style={{ color: t.text }}>Items Ordered</h4>
          <div className="space-y-3">
            {(orderDetail.items || []).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3"
                style={{ borderBottom: i < orderDetail.items.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                <div>
                  <div className="font-medium text-sm" style={{ color: t.text }}>{item.item_name}</div>
                  <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>Qty: {item.quantity} × {formatPrice(item.unit_price)}</div>
                </div>
                <div className="font-semibold text-sm" style={{ color: t.text }}>{formatPrice(item.line_total)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 space-y-2" style={{ borderTop: `1px solid ${t.border}` }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: t.textMuted }}>Subtotal</span>
              <span style={{ color: t.text }}>{formatPrice(orderDetail.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: t.textMuted }}>Shipping</span>
              <span style={{ color: '#16a34a' }}>Free</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2" style={{ borderTop: `1px solid ${t.border}` }}>
              <span style={{ color: t.text }}>Total</span>
              <span style={{ color: t.primary }}>{formatPrice(orderDetail.total_amount)}</span>
            </div>
          </div>
        </Card>

        {/* Shipping address */}
        {orderDetail.shipping_address && (
          <Card t={t}>
            <h4 className="text-base font-bold mb-3" style={{ color: t.text }}>Shipping Address</h4>
            {(() => {
              const a = typeof orderDetail.shipping_address === 'string'
                ? JSON.parse(orderDetail.shipping_address)
                : orderDetail.shipping_address;
              return (
                <div className="text-sm space-y-1" style={{ color: t.textMuted }}>
                  <p>{a.street}</p>
                  <p>{[a.city, a.state, a.zip].filter(Boolean).join(', ')}</p>
                  <p>{a.country}</p>
                </div>
              );
            })()}
          </Card>
        )}
      </div>
    );
  }

  /* Loading detail */
  if (detailLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: t.primary }} />
      </div>
    );
  }

  /* Order list */
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold" style={{ color: t.text }}>My Orders</h3>
      {orders.length === 0 ? (
        <Card t={t}>
          <div className="text-center py-12">
            <div className="text-5xl mb-4 opacity-30">📦</div>
            <h4 className="text-lg font-semibold mb-2" style={{ color: t.text }}>No orders yet</h4>
            <p className="text-sm mb-6" style={{ color: t.textMuted }}>When you place an order, it will appear here.</p>
            <Link to={`/store/${shopSlug}/products`}
              className="inline-flex items-center px-5 py-2.5 text-sm font-semibold transition hover:opacity-80"
              style={btnPrimary}>Start Shopping</Link>
          </div>
        </Card>
      ) : (
        orders.map(order => (
          <button key={order.id} onClick={() => viewOrder(order.id)}
            className="w-full text-left p-5 transition hover:shadow-md"
            style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm" style={{ color: t.text }}>Order #{order.id?.slice(0, 8)}</div>
                <div className="text-xs mt-1" style={{ color: t.textMuted }}>
                  {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={order.status} />
                <span className="font-bold" style={{ color: t.primary }}>{formatPrice(order.total_amount)}</span>
                <svg className="w-4 h-4" style={{ color: t.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

/* ── Profile Tab ── */
function ProfileTab({ t, profile, setProfile, shopSlug, token }) {
  const inputCls = 'w-full px-4 py-3 text-sm outline-none transition';
  const inputStyle = { backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: t.radius, color: t.text };
  const btnPrimary = { backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius };

  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone: profile?.phone || '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const updated = await storeApi.updateProfile(shopSlug, form, token);
      setProfile(updated);
      setMsg('Profile updated successfully!');
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold" style={{ color: t.text }}>My Profile</h3>
      <Card t={t}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: `${t.primary}15`, color: t.primary }}>
            {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <div className="font-bold text-lg" style={{ color: t.text }}>{profile?.full_name || 'Customer'}</div>
            <div className="text-sm" style={{ color: t.textMuted }}>{profile?.email}</div>
            <div className="text-xs mt-0.5" style={{ color: t.textMuted }}>
              Member since {new Date(profile?.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>Full Name</label>
            <input value={form.full_name} onChange={(e) => setForm(p => ({ ...p, full_name: e.target.value }))}
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>Email</label>
            <input value={profile?.email || ''} disabled
              className={`${inputCls} opacity-60 cursor-not-allowed`} style={inputStyle} />
            <p className="text-xs mt-1" style={{ color: t.textMuted }}>Email cannot be changed.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>Phone</label>
            <input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
              className={inputCls} style={inputStyle} placeholder="e.g. +880 1XXX XXXXXX" />
          </div>
        </div>

        {msg && <p className={`text-sm mt-3 font-medium ${msg.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{msg}</p>}

        <button onClick={save} disabled={saving}
          className="mt-6 px-6 py-2.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
          style={btnPrimary}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </Card>
    </div>
  );
}

/* ── Addresses Tab ── */
function AddressesTab({ t, profile, setProfile, shopSlug, token, addresses }) {
  const inputCls = 'w-full px-4 py-3 text-sm outline-none transition';
  const inputStyle = { backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: t.radius, color: t.text };
  const btnPrimary = { backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius };
  const btnOutline = { border: `1px solid ${t.border}`, color: t.text, borderRadius: t.buttonRadius };

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ street: '', city: '', state: '', zip: '', country: 'BD', label: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const saveAddress = async () => {
    setSaving(true); setMsg('');
    try {
      const newAddrs = [...addresses];
      if (editing !== null && editing < addresses.length) {
        newAddrs[editing] = form;
      } else {
        if (newAddrs.length >= 5) { setMsg('Maximum 5 addresses allowed.'); setSaving(false); return; }
        newAddrs.push(form);
      }
      const updated = await storeApi.updateProfile(shopSlug, { addresses: newAddrs }, token);
      setProfile(updated);
      setEditing(null);
      setForm({ street: '', city: '', state: '', zip: '', country: 'BD', label: '' });
      setMsg('Address saved!');
    } catch (e) { setMsg(e.message); }
    finally { setSaving(false); }
  };

  const deleteAddr = async (idx) => {
    const newAddrs = addresses.filter((_, i) => i !== idx);
    try {
      const updated = await storeApi.updateProfile(shopSlug, { addresses: newAddrs }, token);
      setProfile(updated);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold" style={{ color: t.text }}>My Addresses</h3>
        {editing === null && (
          <button onClick={() => { setEditing(addresses.length); setForm({ street: '', city: '', state: '', zip: '', country: 'BD', label: '' }); }}
            className="px-4 py-2 text-sm font-semibold transition hover:opacity-80" style={btnPrimary}>
            + Add Address
          </button>
        )}
      </div>

      {editing !== null ? (
        <Card t={t}>
          <h4 className="font-bold mb-4" style={{ color: t.text }}>
            {editing < addresses.length ? 'Edit Address' : 'New Address'}
          </h4>
          <div className="space-y-3">
            <input placeholder="Label (e.g. Home, Office)" value={form.label}
              onChange={(e) => setForm(p => ({ ...p, label: e.target.value }))}
              className={inputCls} style={inputStyle} />
            <input placeholder="Street address *" value={form.street}
              onChange={(e) => setForm(p => ({ ...p, street: e.target.value }))}
              className={inputCls} style={inputStyle} required />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input placeholder="City *" value={form.city}
                onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))}
                className={inputCls} style={inputStyle} />
              <input placeholder="State" value={form.state}
                onChange={(e) => setForm(p => ({ ...p, state: e.target.value }))}
                className={inputCls} style={inputStyle} />
              <input placeholder="ZIP *" value={form.zip}
                onChange={(e) => setForm(p => ({ ...p, zip: e.target.value }))}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
          {msg && <p className="text-sm mt-2 font-medium text-red-600">{msg}</p>}
          <div className="flex items-center gap-3 mt-4">
            <button onClick={saveAddress} disabled={saving || !form.street || !form.city}
              className="px-5 py-2.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50" style={btnPrimary}>
              {saving ? 'Saving...' : 'Save Address'}
            </button>
            <button onClick={() => { setEditing(null); setMsg(''); }}
              className="px-5 py-2.5 text-sm font-medium transition hover:opacity-80" style={btnOutline}>
              Cancel
            </button>
          </div>
        </Card>
      ) : addresses.length === 0 ? (
        <Card t={t}>
          <div className="text-center py-8">
            <div className="text-4xl mb-3 opacity-30">📍</div>
            <p className="text-sm" style={{ color: t.textMuted }}>No saved addresses. Add one for faster checkout!</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {addresses.map((addr, i) => (
            <Card t={t} key={i}>
              <div className="flex items-start justify-between">
                <div>
                  {addr.label && <div className="font-bold text-sm mb-1" style={{ color: t.primary }}>{addr.label}</div>}
                  <div className="text-sm space-y-0.5" style={{ color: t.textMuted }}>
                    <p>{addr.street}</p>
                    <p>{[addr.city, addr.state, addr.zip].filter(Boolean).join(', ')}</p>
                    <p>{addr.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditing(i); setForm(addr); }}
                    className="text-xs font-medium hover:underline" style={{ color: t.primary }}>Edit</button>
                  <button onClick={() => deleteAddr(i)}
                    className="text-xs font-medium hover:underline text-red-500">Delete</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Security Tab ── */
function SecurityTab({ t, profile, shopSlug, token }) {
  const inputCls = 'w-full px-4 py-3 text-sm outline-none transition';
  const inputStyle = { backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: t.radius, color: t.text };
  const btnPrimary = { backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius };

  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', success: false });

  const isGuest = !profile?.is_registered;

  const handleChange = async () => {
    if (form.new_password !== form.confirm_password) {
      setMsg({ text: 'Passwords do not match.', success: false }); return;
    }
    if (form.new_password.length < 6) {
      setMsg({ text: 'Password must be at least 6 characters.', success: false }); return;
    }
    setSaving(true); setMsg({ text: '', success: false });
    try {
      await storeApi.changePassword(shopSlug, {
        current_password: form.current_password || undefined,
        new_password: form.new_password,
      }, token);
      setMsg({
        text: isGuest
          ? 'Password set! You can now sign in with your email and password.'
          : 'Password changed successfully!',
        success: true,
      });
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (e) { setMsg({ text: e.message, success: false }); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold" style={{ color: t.text }}>Security</h3>
      <Card t={t}>
        {isGuest && (
          <div className="mb-6 p-4 rounded-lg"
            style={{ backgroundColor: `${t.primary}10`, border: `1px solid ${t.primary}30` }}>
            <p className="text-sm font-medium" style={{ color: t.primary }}>
              Your account was created during checkout. Set a password to fully secure your account and sign in directly next time!
            </p>
          </div>
        )}

        <h4 className="font-bold mb-4" style={{ color: t.text }}>
          {isGuest ? 'Set a Password' : 'Change Password'}
        </h4>
        <div className="space-y-4 max-w-md">
          {!isGuest && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>Current Password</label>
              <input type="password" value={form.current_password}
                onChange={(e) => setForm(p => ({ ...p, current_password: e.target.value }))}
                className={inputCls} style={inputStyle} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>New Password</label>
            <input type="password" value={form.new_password}
              onChange={(e) => setForm(p => ({ ...p, new_password: e.target.value }))}
              className={inputCls} style={inputStyle} placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>Confirm New Password</label>
            <input type="password" value={form.confirm_password}
              onChange={(e) => setForm(p => ({ ...p, confirm_password: e.target.value }))}
              className={inputCls} style={inputStyle} />
          </div>
        </div>

        {msg.text && (
          <p className={`text-sm mt-3 font-medium ${msg.success ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
        )}

        <button onClick={handleChange} disabled={saving || !form.new_password || !form.confirm_password}
          className="mt-6 px-6 py-2.5 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
          style={btnPrimary}>
          {saving ? 'Saving...' : isGuest ? 'Set Password' : 'Change Password'}
        </button>
      </Card>
    </div>
  );
}

/* ── Invoices Tab ── */
function InvoicesTab({ t, shopSlug, token, formatPrice }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    storeApi.getInvoices(shopSlug, token)
      .then(r => setInvoices(r.items || []))
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, [shopSlug, token]);

  const viewInvoice = async (id) => {
    setSelected(id); setDetailLoading(true);
    try {
      const inv = await storeApi.getInvoiceDetail(shopSlug, id, token);
      setDetail(inv);
    } catch { setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const invStatusColor = (s) => {
    const map = { draft: { bg: '#f3f4f6', text: '#374151' }, sent: { bg: '#dbeafe', text: '#1e40af' },
      paid: { bg: '#dcfce7', text: '#166534' }, partially_paid: { bg: '#fef3c7', text: '#92400e' },
      overdue: { bg: '#fee2e2', text: '#991b1b' }, cancelled: { bg: '#f3f4f6', text: '#9ca3af' },
      refunded: { bg: '#fce7f3', text: '#9d174d' } };
    return map[s] || { bg: '#f3f4f6', text: '#374151' };
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: t.primary }} />
    </div>
  );

  // Invoice detail view
  if (selected && detail) {
    const lineItems = detail.line_items || [];
    const sc = invStatusColor(detail.status);
    return (
      <div className="space-y-6">
        <button onClick={() => { setSelected(null); setDetail(null); }}
          className="flex items-center gap-1 text-sm font-medium hover:opacity-80 transition" style={{ color: t.primary }}>
          {Icons.back} Back to Invoices
        </button>
        <Card t={t}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold" style={{ color: t.text }}>{detail.invoice_number}</h2>
              <p className="text-sm" style={{ color: t.textMuted }}>Issued {detail.issue_date ? new Date(detail.issue_date).toLocaleDateString() : '—'}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
              style={{ backgroundColor: sc.bg, color: sc.text }}>
              {detail.status?.replace(/_/g, ' ')}
            </span>
          </div>

          {detail.due_date && (
            <p className="text-sm mb-4" style={{ color: t.textMuted }}>Due: {new Date(detail.due_date).toLocaleDateString()}</p>
          )}

          <table className="w-full text-sm mb-4">
            <thead>
              <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                <th className="py-2 text-left text-xs uppercase" style={{ color: t.textMuted }}>Item</th>
                <th className="py-2 text-right text-xs uppercase w-16" style={{ color: t.textMuted }}>Qty</th>
                <th className="py-2 text-right text-xs uppercase w-24" style={{ color: t.textMuted }}>Price</th>
                <th className="py-2 text-right text-xs uppercase w-24" style={{ color: t.textMuted }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((it, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${t.border}` }}>
                  <td className="py-2" style={{ color: t.text }}>{it.description}</td>
                  <td className="py-2 text-right" style={{ color: t.textMuted }}>{it.quantity}</td>
                  <td className="py-2 text-right" style={{ color: t.textMuted }}>{formatPrice(it.unit_price)}</td>
                  <td className="py-2 text-right font-medium" style={{ color: t.text }}>{formatPrice(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-sm text-right" style={{ borderTop: `1px solid ${t.border}`, paddingTop: '1rem' }}>
            <div style={{ color: t.textMuted }}>Subtotal: <span className="ml-4 font-medium" style={{ color: t.text }}>{formatPrice(detail.subtotal)}</span></div>
            {Number(detail.tax_amount) > 0 && <div style={{ color: t.textMuted }}>Tax: <span className="ml-4">{formatPrice(detail.tax_amount)}</span></div>}
            {Number(detail.shipping_amount) > 0 && <div style={{ color: t.textMuted }}>Shipping: <span className="ml-4">{formatPrice(detail.shipping_amount)}</span></div>}
            {Number(detail.discount_amount) > 0 && <div style={{ color: t.textMuted }}>Discount: <span className="ml-4 text-red-600">-{formatPrice(detail.discount_amount)}</span></div>}
            <div className="text-lg font-bold pt-2" style={{ color: t.text }}>Total: {formatPrice(detail.total_amount)}</div>
            {Number(detail.amount_paid) > 0 && <div className="text-green-600">Paid: {formatPrice(detail.amount_paid)}</div>}
            {Number(detail.total_amount) - Number(detail.amount_paid) > 0 && (
              <div className="text-red-600 font-medium">Balance: {formatPrice(Number(detail.total_amount) - Number(detail.amount_paid))}</div>
            )}
          </div>

          {detail.notes && (
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: `${t.primary}08` }}>
              <p className="text-xs font-semibold uppercase mb-1" style={{ color: t.textMuted }}>Notes</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: t.text }}>{detail.notes}</p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Invoice list
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold" style={{ color: t.text }}>My Invoices</h2>
      {invoices.length === 0 ? (
        <Card t={t} className="text-center py-12">
          <div className="mb-3" style={{ color: t.textMuted }}>{Icons.invoices}</div>
          <h3 className="font-semibold mb-1" style={{ color: t.text }}>No invoices yet</h3>
          <p className="text-sm" style={{ color: t.textMuted }}>Invoices for your orders will appear here.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const sc = invStatusColor(inv.status);
            return (
              <Card t={t} key={inv.id} className="cursor-pointer hover:opacity-90 transition" onClick={() => viewInvoice(inv.id)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: t.text }}>{inv.invoice_number}</p>
                    <p className="text-xs" style={{ color: t.textMuted }}>
                      {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '—'}
                      {inv.due_date ? ` · Due ${new Date(inv.due_date).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: t.text }}>{formatPrice(inv.total_amount)}</p>
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                      style={{ backgroundColor: sc.bg, color: sc.text }}>
                      {inv.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

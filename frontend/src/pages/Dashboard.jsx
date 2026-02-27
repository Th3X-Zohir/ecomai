import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { products, orders, customers, campaigns, shops } from '../api';
import { StatCard, Card, Badge, Button, PageSkeleton } from '../components/UI';

export default function Dashboard() {
  const { user } = useAuth();
  const { isSuperAdmin, currentShop, selectedShop, shopList, selectShop } = useAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, orders: 0, customers: 0, campaigns: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSuperAdmin && !selectedShop) {
      setLoading(false);
      return;
    }

    Promise.allSettled([
      products.list(),
      orders.list(),
      customers.list(),
      campaigns.list(),
      isSuperAdmin ? Promise.resolve(currentShop) : shops.me(),
    ]).then(([p, o, c, m, s]) => {
      setStats({
        products: p.status === 'fulfilled' ? p.value.total : 0,
        orders: o.status === 'fulfilled' ? o.value.total : 0,
        customers: c.status === 'fulfilled' ? c.value.total : 0,
        campaigns: m.status === 'fulfilled' ? m.value.total : 0,
      });
      if (o.status === 'fulfilled') setRecentOrders(o.value.items.slice(-5).reverse());
      if (s?.status === 'fulfilled' && s.value) setShop(s.value);
      else if (isSuperAdmin && currentShop) setShop(currentShop);
      setLoading(false);
    });
  }, [user, selectedShop, currentShop]);

  if (loading) return <PageSkeleton />;

  if (isSuperAdmin && !selectedShop) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4"></div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Select a Shop</h2>
        <p className="text-gray-500 mb-6">Choose a shop from the sidebar to view its dashboard.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {shopList.map(s => (
            <button key={s.id} onClick={() => { selectShop(s.id); }} className="text-left p-5 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all group">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 font-bold text-lg mb-3 group-hover:bg-primary-600 group-hover:text-white transition">
                {s.name[0].toUpperCase()}
              </div>
              <p className="font-semibold text-gray-900">{s.name}</p>
              <p className="text-xs text-gray-500 mt-1">{s.slug}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const revenue = recentOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const storeUrl = shop ? `/store/${shop.slug}` : (currentShop ? `/store/${currentShop.slug}` : null);
  const avgOrder = recentOrders.length > 0 ? (revenue / recentOrders.length) : 0;

  const statusVariant = (s) => {
    const map = { pending: 'warning', confirmed: 'info', processing: 'info', shipped: 'purple', delivered: 'success', cancelled: 'danger' };
    return map[s] || 'default';
  };

  const quickActions = [
    { label: 'Add Product', icon: '', to: '/admin/products', desc: 'Create a new product listing' },
    { label: 'View Orders', icon: '', to: '/admin/orders', desc: 'Manage incoming orders' },
    { label: 'Customize Site', icon: '', to: '/admin/website-settings', desc: 'Update your storefront' },
    { label: 'New Campaign', icon: '', to: '/admin/campaigns', desc: 'Launch marketing campaign' },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}{user?.email ? `, ${user.email.split('@')[0]}` : ''}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isSuperAdmin && currentShop
                ? `Viewing ${currentShop.name}  Here's what's happening.`
                : "Here's what's happening with your store today."}
            </p>
          </div>
          {storeUrl && (
            <div className="flex items-center gap-2">
              <a href={storeUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                View Store
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(window.location.origin + storeUrl)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition shadow-sm"
                title="Copy store URL"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          )}
        </div>

        {storeUrl && (
          <div className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200/60 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-900">Your Store is Live</p>
              <p className="text-xs text-primary-600 font-mono truncate">{window.location.origin}{storeUrl}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Products" value={stats.products} icon="" color="primary" />
        <StatCard label="Total Orders" value={stats.orders} icon="" color="success" />
        <StatCard label="Customers" value={stats.customers} icon="" color="warning" />
        <StatCard label="Campaigns" value={stats.campaigns} icon="" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Recent Orders</h2>
              <p className="text-xs text-gray-500 mt-0.5">Latest 5 orders placed</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')}>View all </Button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2 opacity-30"></div>
                <p className="text-sm text-gray-500">No orders yet</p>
                <p className="text-xs text-gray-400 mt-1">Orders will show up here as they come in.</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50/80 transition cursor-pointer" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-mono text-gray-500">#{(order.id || '').slice(-4)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{order.customer_email}</p>
                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{Number(order.total_amount).toFixed(2)}</p>
                    <Badge variant={statusVariant(order.status)} size="sm">{order.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Revenue Summary</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Revenue</span>
                    <span className="text-xl font-bold text-emerald-600">{revenue.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, revenue > 0 ? 60 : 0)}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Order Value</span>
                  <span className="text-lg font-bold text-gray-900">{avgOrder.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Campaigns</span>
                  <span className="text-lg font-bold text-primary-600">{stats.campaigns}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="text-lg font-bold text-gray-900">
                    {stats.customers > 0 && stats.orders > 0 ? ((stats.orders / stats.customers) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Account</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900 truncate ml-2">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Role</span>
                  <Badge variant="info" size="sm">{user?.role?.replace('_', ' ')}</Badge>
                </div>
                {shop && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan</span>
                    <Badge variant="purple" size="sm">{shop.subscription_plan || 'starter'}</Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button key={action.to} onClick={() => navigate(action.to)} className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all group">
              <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform inline-block">{action.icon}</span>
              <p className="text-sm font-semibold text-gray-900">{action.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
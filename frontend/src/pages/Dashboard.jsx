import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { products, orders, customers, campaigns, shops } from '../api';
import { StatCard, Card } from '../components/UI';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: 0, orders: 0, customers: 0, campaigns: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [shop, setShop] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      products.list(),
      orders.list(),
      customers.list(),
      campaigns.list(),
      user.role !== 'super_admin' ? shops.me() : Promise.resolve(null),
    ]).then(([p, o, c, m, s]) => {
      setStats({
        products: p.status === 'fulfilled' ? p.value.count : 0,
        orders: o.status === 'fulfilled' ? o.value.count : 0,
        customers: c.status === 'fulfilled' ? c.value.count : 0,
        campaigns: m.status === 'fulfilled' ? m.value.count : 0,
      });
      if (o.status === 'fulfilled') {
        setRecentOrders(o.value.items.slice(-5).reverse());
      }
      if (s?.status === 'fulfilled' && s.value) {
        setShop(s.value);
      }
    });
  }, [user]);

  const revenue = recentOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const storeUrl = shop ? `/store/${shop.slug}` : null;

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-sm text-gray-500 mt-1">
              Signed in as <span className="font-medium">{user?.email}</span> ({user?.role?.replace('_', ' ')})
            </p>
          </div>
          {storeUrl && (
            <div className="flex items-center gap-3">
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview Store
              </a>
              <button
                onClick={() => {
                  const url = window.location.origin + storeUrl;
                  navigator.clipboard.writeText(url);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-50 transition"
                title="Copy store link"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy Link
              </button>
            </div>
          )}
        </div>

        {/* Store URL card */}
        {storeUrl && (
          <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-xl flex items-center gap-3">
            <span className="text-2xl">🌐</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary-800">Your Public Store URL</p>
              <p className="text-xs text-primary-600 font-mono truncate">
                {window.location.origin}{storeUrl}
              </p>
            </div>
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Open →
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Products" value={stats.products} icon="📦" color="primary" />
        <StatCard label="Orders" value={stats.orders} icon="🛒" color="success" />
        <StatCard label="Customers" value={stats.customers} icon="👥" color="warning" />
        <StatCard label="Campaigns" value={stats.campaigns} icon="📣" color="danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-5">
            <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-gray-500">No orders yet. Create products and place orders to see them here.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{order.id}</p>
                      <p className="text-xs text-gray-500">{order.customer_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">${Number(order.total_amount).toFixed(2)}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Revenue</span>
                <span className="text-lg font-bold text-success-600">${revenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Avg Order Value</span>
                <span className="text-lg font-bold">
                  ${recentOrders.length > 0 ? (revenue / recentOrders.length).toFixed(2) : '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Active Campaigns</span>
                <span className="text-lg font-bold text-primary-600">{stats.campaigns}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

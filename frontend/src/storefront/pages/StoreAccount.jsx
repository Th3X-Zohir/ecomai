import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { storeApi } from '../../api-public';

export default function StoreAccount() {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem(`customer_token_${shopSlug}`);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const logout = () => {
    localStorage.removeItem(`customer_token_${shopSlug}`);
    localStorage.removeItem(`customer_${shopSlug}`);
    navigate(`/store/${shopSlug}`);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
        <button onClick={logout} className="text-red-600 text-sm hover:text-red-700">Sign Out</button>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Name:</span> {profile?.full_name || '—'}</div>
          <div><span className="text-gray-500">Email:</span> {profile?.email}</div>
          <div><span className="text-gray-500">Phone:</span> {profile?.phone || '—'}</div>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order History</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500 text-sm">No orders yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="border border-gray-100 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Order #{order.id?.slice(0, 8)}</div>
                  <div className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">৳{Number(order.total_amount).toLocaleString()}</div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

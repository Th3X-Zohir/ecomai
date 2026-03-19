/**
 * Operations Dashboard — Merchant-focused operational command center
 * Shows: fulfillment queue, delivery ops, financial status, exceptions
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { operations, orders, deliveries, earnings } from '../api';
import { StatCard, Card, Badge, Button, PageSkeleton } from '../components/UI';

const fmt = (n) => Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => Number(n || 0).toLocaleString('en-BD');

const ORDER_STATUS_COLORS = {
  pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  shipped: 'purple',
  delivered: 'success',
  cancelled: 'danger',
  refunded: 'pink',
};

const DELIVERY_STATUS_COLORS = {
  pending: 'warning',
  assigned: 'info',
  picked_up: 'purple',
  in_transit: 'purple',
  delivered: 'success',
  failed: 'danger',
  cancelled: 'default',
};

function StatusBadge({ status, colors }) {
  const colorMap = {
    warning: { bg: '#fef3c7', text: '#92400e' },
    info: { bg: '#dbeafe', text: '#1e40af' },
    purple: { bg: '#ede9fe', text: '#5b21b6' },
    success: { bg: '#dcfce7', text: '#166534' },
    danger: { bg: '#fee2e2', text: '#991b1b' },
    pink: { bg: '#fce7f3', text: '#9d174d' },
    default: { bg: '#f3f4f6', text: '#374151' },
  };
  const c = colorMap[colors || ORDER_STATUS_COLORS[status] || 'default'] || colorMap.default;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function OpStatCard({ label, value, icon, color, onClick }) {
  const colorMap = {
    blue: { bg: '#eff6ff', icon: '#3b82f6' },
    green: { bg: '#f0fdf4', icon: '#16a34a' },
    red: { bg: '#fef2f2', icon: '#dc2626' },
    orange: { bg: '#fffbeb', icon: '#d97706' },
    purple: { bg: '#f5f3ff', icon: '#7c3aed' },
    teal: { bg: '#f0fdfa', icon: '#0d9488' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border cursor-pointer hover:shadow-md transition-shadow ${onClick ? '' : 'cursor-default'}`}
      style={{ backgroundColor: c.bg, borderColor: '#e5e7eb' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.icon + '20' }}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold" style={{ color: '#111827' }}>{value}</p>
          <p className="text-sm" style={{ color: '#6b7280' }}>{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function Operations() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [fulfillment, setFulfillment] = useState(null);
  const [deliveryQueue, setDeliveryQueue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      operations.merchantOverview(),
      operations.fulfillmentQueue(),
      operations.deliveryQueue(),
    ]).then(([ov, fq, dq]) => {
      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (fq.status === 'fulfilled') setFulfillment(fq.value);
      if (dq.status === 'fulfilled') setDeliveryQueue(dq.value);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageSkeleton />;

  const ops = overview || {};
  const fulfillOrders = fulfillment?.items || [];
  const deliveryItems = deliveryQueue?.items || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>Operations Center</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Monitor and manage your daily operations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/admin/orders')}
            className="px-4 py-2 text-sm font-medium rounded-lg transition hover:opacity-80"
            style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
          >
            All Orders
          </button>
          <button
            onClick={() => navigate('/admin/deliveries')}
            className="px-4 py-2 text-sm font-medium rounded-lg transition hover:opacity-80"
            style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}
          >
            Deliveries
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#f3f4f6', width: 'fit-content' }}>
        {['overview', 'fulfillment', 'deliveries'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-1.5 text-sm font-medium rounded-md capitalize transition"
            style={{
              backgroundColor: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#111827' : '#6b7280',
              boxShadow: tab === t ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <OpStatCard
              label="Needs Attention"
              value={ops.summary?.needsAttention?.count || 0}
              color="red"
              icon={
                <svg className="w-5 h-5" style={{ color: '#dc2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <OpStatCard
              label="Fulfillment Queue"
              value={ops.summary?.fulfillmentQueue?.count || 0}
              color="orange"
              onClick={() => setTab('fulfillment')}
              icon={
                <svg className="w-5 h-5" style={{ color: '#d97706' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            />
            <OpStatCard
              label="Active Deliveries"
              value={ops.summary?.activeDeliveries?.count || 0}
              color="blue"
              onClick={() => setTab('deliveries')}
              icon={
                <svg className="w-5 h-5" style={{ color: '#3b82f6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
              }
            />
            <OpStatCard
              label="Failed Deliveries"
              value={ops.summary?.failedDeliveries?.count || 0}
              color="red"
              icon={
                <svg className="w-5 h-5" style={{ color: '#dc2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <OpStatCard
              label="COD Uncollected"
              value={ops.summary?.uncollectedCod?.count || 0}
              color={ops.summary?.uncollectedCod?.overdue > 0 ? 'red' : 'orange'}
              onClick={() => window.location.href = '/admin/cod'}
              icon={
                <svg className="w-5 h-5" style={{ color: ops.summary?.uncollectedCod?.overdue > 0 ? '#dc2626' : '#d97706' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <OpStatCard
              label="COD Reconciliation"
              value={ops.summary?.cashReconciliation?.count || 0}
              color={ops.summary?.cashReconciliation?.count > 0 ? 'red' : 'teal'}
              onClick={() => window.location.href = '/admin/cod'}
              icon={
                <svg className="w-5 h-5" style={{ color: ops.summary?.cashReconciliation?.count > 0 ? '#dc2626' : '#0d9488' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
            />
          </div>

          {/* Balance + Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Balance */}
            <div className="p-5 rounded-xl border" style={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>Earnings Balance</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Held (in escrow)</span>
                  <span className="text-sm font-medium" style={{ color: '#d97706' }}>৳{fmt(ops.balance?.held_balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Releasable</span>
                  <span className="text-sm font-medium" style={{ color: '#0d9488' }}>৳{fmt(ops.balance?.releasable_balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#6b7280' }}>Available</span>
                  <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>৳{fmt(ops.balance?.available_balance)}</span>
                </div>
                <div className="flex justify-between" style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                  <span className="text-sm" style={{ color: '#6b7280' }}>In Payout</span>
                  <span className="text-sm font-medium" style={{ color: '#6b7280' }}>৳{fmt(ops.balance?.payouts_processing)}</span>
                </div>
              </div>
            </div>

            {/* Order Status Breakdown */}
            <div className="p-5 rounded-xl border" style={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>Orders by Status</h3>
              <div className="space-y-2">
                {(ops.ordersByStatus || []).map(r => (
                  <div key={r.status} className="flex items-center justify-between">
                    <StatusBadge status={r.status} colors={ORDER_STATUS_COLORS[r.status]} />
                    <span className="text-sm font-semibold" style={{ color: '#111827' }}>{r.count}</span>
                  </div>
                ))}
                {(ops.ordersByStatus || []).length === 0 && (
                  <p className="text-sm" style={{ color: '#9ca3af' }}>No orders yet</p>
                )}
              </div>
            </div>

            {/* Delivery Status Breakdown */}
            <div className="p-5 rounded-xl border" style={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#374151' }}>Deliveries by Status</h3>
              <div className="space-y-2">
                {(ops.deliveriesByStatus || []).map(r => (
                  <div key={r.status} className="flex items-center justify-between">
                    <StatusBadge status={r.status} colors={DELIVERY_STATUS_COLORS[r.status]} />
                    <span className="text-sm font-semibold" style={{ color: '#111827' }}>{r.count}</span>
                  </div>
                ))}
                {(ops.deliveriesByStatus || []).length === 0 && (
                  <p className="text-sm" style={{ color: '#9ca3af' }}>No deliveries yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <h3 className="font-semibold" style={{ color: '#111827' }}>Recent Orders</h3>
              <button
                onClick={() => setTab('fulfillment')}
                className="text-sm font-medium" style={{ color: '#6366f1' }}
              >
                View all →
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Order</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Total</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: '#f3f4f6' }}>
                {(ops.recentOrders || []).slice(0, 8).map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                    <td className="px-5 py-3 text-sm font-mono" style={{ color: '#111827' }}>#{String(order.id).split('-')[0].toUpperCase()}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{order.customer_email || order.customer_name || 'Guest'}</td>
                    <td className="px-5 py-3 text-sm font-medium" style={{ color: '#111827' }}>৳{fmt(order.total_amount)}</td>
                    <td className="px-5 py-3"><StatusBadge status={order.status} colors={ORDER_STATUS_COLORS[order.status]} /></td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>{new Date(order.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}</td>
                  </tr>
                ))}
                {(ops.recentOrders || []).length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm" style={{ color: '#9ca3af' }}>No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fulfillment Tab */}
      {tab === 'fulfillment' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <h3 className="font-semibold" style={{ color: '#111827' }}>Fulfillment Queue</h3>
            <span className="text-sm" style={{ color: '#6b7280' }}>{fulfillment?.total || 0} orders</span>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Order</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Customer</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Total</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Age</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: '#f3f4f6' }}>
              {fulfillOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-mono" style={{ color: '#111827' }}>#{String(order.id).split('-')[0].toUpperCase()}</td>
                  <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>
                    <div>{order.customer_email || order.customer_name || 'Guest'}</div>
                    {order.customer_phone && <div className="text-xs" style={{ color: '#9ca3af' }}>{order.customer_phone}</div>}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium" style={{ color: '#111827' }}>৳{fmt(order.total_amount)}</td>
                  <td className="px-5 py-3"><StatusBadge status={order.status} colors={ORDER_STATUS_COLORS[order.status]} /></td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${order.ageHours > 24 ? 'text-red-600' : order.ageHours > 12 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {order.ageHours}h
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                      className="text-sm font-medium px-3 py-1 rounded-lg"
                      style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}
                    >
                      Process
                    </button>
                  </td>
                </tr>
              ))}
              {fulfillOrders.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm" style={{ color: '#9ca3af' }}>No orders in fulfillment queue</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Deliveries Tab */}
      {tab === 'deliveries' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <h3 className="font-semibold" style={{ color: '#111827' }}>Delivery Queue</h3>
            <span className="text-sm" style={{ color: '#6b7280' }}>{deliveryQueue?.total || 0} deliveries</span>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Delivery</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Order</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Driver</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7280' }}>Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: '#f3f4f6' }}>
              {deliveryItems.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-mono" style={{ color: '#111827' }}>#{String(d.id).split('-')[0].toUpperCase()}</td>
                  <td className="px-5 py-3 text-sm font-mono" style={{ color: '#374151' }}>
                    {d.order ? `#${String(d.order_id).split('-')[0].toUpperCase()}` : '-'}
                    {d.order && <span className="ml-2 text-xs" style={{ color: '#9ca3af' }}>৳{fmt(d.order.total_amount)}</span>}
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{d.driver_name || 'Unassigned'}</td>
                  <td className="px-5 py-3"><StatusBadge status={d.status} colors={DELIVERY_STATUS_COLORS[d.status]} /></td>
                  <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>
                    {new Date(d.updated_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {deliveryItems.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-sm" style={{ color: '#9ca3af' }}>No deliveries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

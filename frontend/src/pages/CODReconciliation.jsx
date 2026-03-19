/**
 * COD Reconciliation Page
 * Cash-on-Delivery collection tracking, driver accountability, and settlement management
 */
import { useState, useEffect } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { cod, operations } from '../api';
import { PageSkeleton } from '../components/UI';

const fmt = (n) => Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  pending: 'warning',
  submitted: 'info',
  approved: 'success',
  rejected: 'danger',
  settled: 'success',
};

function StatusBadge({ status }) {
  const colorMap = {
    warning: { bg: '#fef3c7', text: '#92400e' },
    info: { bg: '#dbeafe', text: '#1e40af' },
    success: { bg: '#dcfce7', text: '#166534' },
    danger: { bg: '#fee2e2', text: '#991b1b' },
  };
  const c = colorMap[STATUS_COLORS[status] || 'warning'] || colorMap.warning;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

export default function CODReconciliation() {
  const { isSuperAdmin } = useAdmin();
  const [summary, setSummary] = useState(null);
  const [uncollected, setUncollected] = useState([]);
  const [collections, setCollections] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [cashRecon, setCashRecon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [tab, setTab] = useState('summary');

  async function refresh() {
    setLoading(true);
    const [s, u, c, st, d, cr] = await Promise.allSettled([
      cod.getSummary(),
      cod.getUncollected(),
      cod.getCollections(),
      cod.getSettlements(),
      cod.getDrivers(),
      isSuperAdmin ? operations.platformExceptions({ type: 'cash_reconciliation' }) : Promise.resolve({ items: [] }),
    ]);
    if (s.status === 'fulfilled') setSummary(s.value);
    if (u.status === 'fulfilled') setUncollected(u.value.items || []);
    if (c.status === 'fulfilled') setCollections(c.value.items || []);
    if (st.status === 'fulfilled') setSettlements(st.value.items || []);
    if (d.status === 'fulfilled') setDrivers(d.value.items || []);
    if (cr.status === 'fulfilled') setCashRecon(cr.value.items || []);
    setLoading(false);
  }

  async function handleReview(settlementId, action) {
    if (!window.confirm(`Are you sure you want to ${action} this settlement?`)) return;
    setActionLoading(settlementId);
    try {
      await cod.reviewSettlement(settlementId, { action, reviewNotes: '' });
      await refresh();
    } catch (err) {
      alert(`Failed to ${action} settlement: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <PageSkeleton />;

  const totalCod = Number(summary?.total_cod_amount || 0);
  const totalCollected = Number(summary?.total_collected || 0);
  const totalOutstanding = totalCod - totalCollected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>COD Reconciliation</h1>
        <p className="text-sm mt-1" style={{ color: '#6b7280' }}>
          Track cash collections and driver settlements
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#f3f4f6', width: 'fit-content' }}>
        {['summary', 'uncollected', 'collections', 'settlements', 'drivers', ...(isSuperAdmin ? ['cash_recon'] : [])].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 text-sm font-medium rounded-md capitalize transition"
            style={{
              backgroundColor: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#111827' : '#6b7280',
              boxShadow: tab === t ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}>
            {t === 'cash_recon' ? 'Cash Recon' : t}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {tab === 'summary' && summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl border" style={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }}>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Total COD Orders</p>
              <p className="text-3xl font-bold" style={{ color: '#111827' }}>{summary.total_cod_orders || 0}</p>
            </div>
            <div className="p-5 rounded-xl border" style={{ backgroundColor: '#fff', borderColor: '#e5e7eb' }}>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#6b7280' }}>Total COD Value</p>
              <p className="text-3xl font-bold" style={{ color: '#111827' }}>৳{fmt(totalCod)}</p>
            </div>
            <div className="p-5 rounded-xl border" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#166534' }}>Collected</p>
              <p className="text-3xl font-bold" style={{ color: '#16a34a' }}>৳{fmt(totalCollected)}</p>
            </div>
            <div className="p-5 rounded-xl border" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
              <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: '#991b1b' }}>Outstanding</p>
              <p className="text-3xl font-bold" style={{ color: '#dc2626' }}>৳{fmt(totalOutstanding)}</p>
            </div>
          </div>

          {/* Uncollected Quick View */}
          {uncollected.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#fef2f2' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="font-semibold" style={{ color: '#991b1b' }}>Uncollected COD — {uncollected.length} orders</h3>
                </div>
                <button onClick={() => setTab('uncollected')} className="text-sm font-medium" style={{ color: '#dc2626' }}>
                  View all →
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Order</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Driver</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Delivered</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: '#f3f4f6' }}>
                  {uncollected.slice(0, 5).map(o => (
                    <tr key={o.id}>
                      <td className="px-5 py-3 text-sm font-mono" style={{ color: '#111827' }}>#{String(o.id).split('-')[0].toUpperCase()}</td>
                      <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#111827' }}>৳{fmt(o.total_amount)}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{o.driver_name || 'Unassigned'}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>{new Date(o.updated_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {uncollected.length === 0 && (
            <div className="text-center py-12" style={{ color: '#6b7280' }}>
              <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>All COD orders have been collected</p>
            </div>
          )}
        </div>
      )}

      {/* Uncollected Tab */}
      {tab === 'uncollected' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <h3 className="font-semibold" style={{ color: '#111827' }}>Uncollected COD Orders</h3>
            <span className="text-sm" style={{ color: '#6b7280' }}>{uncollected.length} orders</span>
          </div>
          {uncollected.length === 0 ? (
            <div className="py-12 text-center" style={{ color: '#6b7280' }}>All orders collected</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Order</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Driver</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Delivered</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Days Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: '#f3f4f6' }}>
                {uncollected.map(o => {
                  const daysSince = o.days_since_delivered || Math.floor((Date.now() - new Date(o.updated_at).getTime()) / 86400000);
                  const isOverdue = daysSince >= 3;
                  return (
                    <tr key={o.id} style={isOverdue ? { backgroundColor: '#fef2f2' } : {}}>
                      <td className="px-5 py-3 text-sm font-mono" style={{ color: '#111827' }}>#{String(o.id).split('-')[0].toUpperCase()}</td>
                      <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#dc2626' }}>৳{fmt(o.total_amount)}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{o.customer_email || 'Guest'}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{o.driver_name || 'Unassigned'}</td>
                      <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>{new Date(o.updated_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}</td>
                      <td className="px-5 py-3">
                        {isOverdue ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#dc2626', color: '#fff' }}>{daysSince}d</span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>{daysSince}d</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Collections Tab */}
      {tab === 'collections' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <h3 className="font-semibold" style={{ color: '#111827' }}>COD Collections</h3>
            <span className="text-sm" style={{ color: '#6b7280' }}>{collections.length} records</span>
          </div>
          {collections.length === 0 ? (
            <div className="py-12 text-center" style={{ color: '#6b7280' }}>No collections recorded yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Order</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Collected</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Driver</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: '#f3f4f6' }}>
                {collections.map(c => (
                  <tr key={c.id}>
                    <td className="px-5 py-3 text-sm font-mono" style={{ color: '#111827' }}>#{String(c.order_id).split('-')[0].toUpperCase()}</td>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#16a34a' }}>৳{fmt(c.collected_amount)}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{c.driver_name}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#9ca3af' }}>{new Date(c.collected_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Settlements Tab */}
      {tab === 'settlements' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <h3 className="font-semibold" style={{ color: '#111827' }}>COD Settlements</h3>
          </div>
          {settlements.length === 0 ? (
            <div className="py-12 text-center" style={{ color: '#6b7280' }}>No settlements yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Period</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Driver</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: '#f3f4f6' }}>
                {settlements.map(s => (
                  <tr key={s.id}>
                    <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>
                      {new Date(s.period_start).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                      {' – '}
                      {new Date(s.period_end).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{s.driver_name}</td>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#111827' }}>৳{fmt(s.balance_due)}</td>
                    <td className="px-5 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-5 py-3">
                      {s.status === 'submitted' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(s.id, 'approve')}
                            disabled={actionLoading === s.id}
                            className="text-xs px-3 py-1 rounded-lg font-medium disabled:opacity-50"
                            style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                            {actionLoading === s.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReview(s.id, 'reject')}
                            disabled={actionLoading === s.id}
                            className="text-xs px-3 py-1 rounded-lg font-medium disabled:opacity-50"
                            style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                            {actionLoading === s.id ? '...' : 'Reject'}
                          </button>
                        </div>
                      )}
                      {s.status !== 'submitted' && (
                        <span className="text-xs" style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Drivers Tab */}
      {tab === 'drivers' && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb' }}>
            <h3 className="font-semibold" style={{ color: '#111827' }}>Driver COD Summary</h3>
          </div>
          {drivers.length === 0 ? (
            <div className="py-12 text-center" style={{ color: '#6b7280' }}>No drivers found</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Driver</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Collections</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Total Collected</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase" style={{ color: '#6b7280' }}>Pending Settlements</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: '#f3f4f6' }}>
                {drivers.map(d => (
                  <tr key={d.id}>
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium" style={{ color: '#111827' }}>{d.full_name}</div>
                      <div className="text-xs" style={{ color: '#9ca3af' }}>{d.phone || d.email}</div>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#374151' }}>{d.total_collections}</td>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: '#111827' }}>৳{fmt(d.total_amount_collected)}</td>
                    <td className="px-5 py-3">
                      {d.pending_settlements > 0 ? (
                        <span className="text-sm font-semibold" style={{ color: '#d97706' }}>{d.pending_settlements} pending</span>
                      ) : (
                        <span className="text-sm" style={{ color: '#16a34a' }}>Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Cash Reconciliation Tab — Super Admin only */}
      {tab === 'cash_recon' && isSuperAdmin && (
        <div className="space-y-4">
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#e5e7eb', backgroundColor: '#fff' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#fce7f3' }}>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-semibold" style={{ color: '#9d174d' }}>Cash Reconciliation Required</h3>
              </div>
              <span className="text-sm font-medium" style={{ color: '#be185d' }}>{cashRecon.length} cases</span>
            </div>
            {cashRecon.length === 0 ? (
              <div className="py-12 text-center" style={{ color: '#6b7280' }}>
                <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No cash reconciliation cases</p>
              </div>
            ) : (
              <div className="divide-y" style={{ divideColor: '#f3f4f6' }}>
                {cashRecon.map(exc => (
                  <div key={exc.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{exc.failure_reason}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500">Shop: <span className="font-medium text-gray-700">{exc.shop_name || exc.shop_id?.slice(0, 8)}</span></span>
                            {exc.order_id && (
                              <span className="text-xs font-mono text-primary-600">Order #{String(exc.order_id).split('-')[0].toUpperCase()}</span>
                            )}
                            <span className="text-xs text-gray-400">{new Date(exc.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      <a href="/admin/cod" className="text-xs font-medium px-3 py-1 rounded-lg" style={{ backgroundColor: '#fce7f3', color: '#be185d' }}>
                        View in COD →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">
            These cases require the shop owner to confirm cash return from the driver. The driver must return collected cash to the merchant, and the reversal recorded in COD reconciliation.
          </p>
        </div>
      )}
    </div>
  );
}

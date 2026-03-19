/**
 * Exception Queue Page — Super Admin
 * Platform-wide operational exceptions requiring admin attention
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { operations } from '../api';
import { PageHeader, Badge, Button, useToast, PageSkeleton } from '../components/UI';

const EXCEPTION_TYPE_COLORS = {
  delivery_failure: { bg: '#fee2e2', text: '#991b1b', label: 'Delivery Failure' },
  sla_breach: { bg: '#fef3c7', text: '#92400e', label: 'SLA Breach' },
  stale_refund: { bg: '#fef3c7', text: '#92400e', label: 'Stale Refund' },
  stale_withdrawal: { bg: '#fef3c7', text: '#92400e', label: 'Stale Withdrawal' },
  cash_reconciliation: { bg: '#fce7f3', text: '#9d174d', label: 'Cash Reconciliation' },
};

function ExceptionTypeBadge({ type }) {
  const c = EXCEPTION_TYPE_COLORS[type] || { bg: '#f3f4f6', text: '#374151', label: type };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {c.label}
    </span>
  );
}

export default function ExceptionQueue() {
  const navigate = useNavigate();
  const toast = useToast();
  const [exceptions, setExceptions] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    operations.platformExceptions({ page, type: typeFilter || undefined }).then(data => {
      setExceptions(data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, typeFilter]);

  if (loading && !exceptions.items.length) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exception Queue"
        description="Platform-wide issues requiring operational attention"
        action={
          <Button variant="secondary" onClick={() => navigate('/admin/operations')}>
            Platform Overview →
          </Button>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        {['', 'delivery_failure', 'sla_breach', 'stale_refund', 'stale_withdrawal', 'cash_reconciliation'].map(t => (
          <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${typeFilter === t ? 'bg-primary-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            {t === '' ? 'All' : (EXCEPTION_TYPE_COLORS[t]?.label || t)}
          </button>
        ))}
        <span className="text-sm text-gray-500 ml-auto">{exceptions.total} exceptions</span>
      </div>

      {/* Exception Cards */}
      {exceptions.items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>No exceptions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exceptions.items.map(exc => (
            <div key={exc.id} className="rounded-xl border bg-white hover:shadow-md transition-shadow p-5"
              style={{ borderColor: '#e5e7eb' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5">
                    <ExceptionTypeBadge type={exc.exception_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{exc.failure_reason}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-sm text-gray-500">
                        Shop: <span className="font-medium text-gray-700">{exc.shop_name || exc.shop_id?.slice(0, 8) || '—'}</span>
                      </span>
                      {exc.order_id && (
                        <button onClick={() => navigate(`/admin/orders/${exc.order_id}`)}
                          className="text-sm font-mono text-primary-600 hover:underline">
                          Order #{String(exc.order_id).split('-')[0].toUpperCase()}
                        </button>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(exc.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {exc.exception_type === 'cash_reconciliation' && (
                      <div className="mt-2 p-2 bg-pink-50 border border-pink-200 rounded-lg">
                        <p className="text-xs text-pink-800 font-medium">⚠️ Cash reconciliation required — merchant must confirm cash return from driver</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {exc.exception_type === 'delivery_failure' && exc.order_id && (
                    <Button size="xs" variant="secondary" onClick={() => navigate(`/admin/orders/${exc.order_id}`)}>
                      View Order
                    </Button>
                  )}
                  {exc.exception_type === 'cash_reconciliation' && (
                    <Button size="xs" variant="secondary" onClick={() => navigate('/admin/cod')}>
                      View COD
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {exceptions.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Page {exceptions.page} of {exceptions.totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => Math.min(exceptions.totalPages, p + 1))} disabled={page >= exceptions.totalPages} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Refund Management Page
 * View and manage refund requests: approve, reject, complete
 */
import { useState, useEffect } from 'react';
import { refunds } from '../api';
import { PageHeader, Card, Badge, Button, useToast, PageSkeleton, Modal, FormField } from '../components/UI';

const fmt = (n) => Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#dbeafe', text: '#1e40af' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
  completed: { bg: '#dcfce7', text: '#166534' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151' };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {status}
    </span>
  );
}

export default function RefundManagement() {
  const toast = useToast();
  const [refundsList, setRefundsList] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      refunds.list({ page, status: statusFilter || undefined }),
      refunds.stats(),
    ]).then(([listData, statsData]) => {
      setRefundsList(listData);
      setStats(statsData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, statusFilter]);

  async function handleApprove(refundId) {
    if (!window.confirm('Approve this refund request?')) return;
    setActionLoading(refundId);
    try {
      await refunds.approve(refundId);
      toast('Refund approved', 'success');
      setRefundsList(prev => ({ ...prev, items: prev.items.map(r => r.id === refundId ? { ...r, status: 'approved' } : r) }));
    } catch (err) { toast(err.message, 'error'); }
    finally { setActionLoading(null); }
  }

  async function handleReject(e) {
    e.preventDefault();
    if (!rejectReason.trim()) { toast('Please provide a rejection reason', 'error'); return; }
    setActionLoading(selectedRefund.id);
    try {
      await refunds.reject(selectedRefund.id, { reason: rejectReason });
      toast('Refund rejected', 'success');
      setSelectedRefund(null);
      setRejectReason('');
      setRefundsList(prev => ({ ...prev, items: prev.items.map(r => r.id === selectedRefund.id ? { ...r, status: 'rejected' } : r) }));
    } catch (err) { toast(err.message, 'error'); }
    finally { setActionLoading(null); }
  }

  async function handleComplete(refundId) {
    setActionLoading(refundId);
    try {
      await refunds.complete(refundId, {});
      toast('Refund marked as completed', 'success');
      setRefundsList(prev => ({ ...prev, items: prev.items.map(r => r.id === refundId ? { ...r, status: 'completed' } : r) }));
    } catch (err) { toast(err.message, 'error'); }
    finally { setActionLoading(null); }
  }

  if (loading && !stats) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Refund Management" description="View and manage customer refund requests" />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border bg-white border-gray-200">
            <p className="text-xs font-medium uppercase text-gray-500">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total || 0}</p>
          </div>
          <div className="p-5 rounded-xl border bg-white border-amber-200">
            <p className="text-xs font-medium uppercase text-amber-700">Pending</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending || 0}</p>
          </div>
          <div className="p-5 rounded-xl border bg-white border-green-200">
            <p className="text-xs font-medium uppercase text-green-700">Approved</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved || 0}</p>
          </div>
          <div className="p-5 rounded-xl border bg-white border-red-200">
            <p className="text-xs font-medium uppercase text-red-700">Total Refunded</p>
            <p className="text-2xl font-bold text-red-600 mt-1">৳{fmt(stats.total_refunded || 0)}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
        <span className="text-sm text-gray-500 ml-auto">{refundsList.total} requests</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">Order</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">Customer</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">Reason</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Status</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Date</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {refundsList.items.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No refund requests</td></tr>
            ) : refundsList.items.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-sm text-gray-900">#{String(r.order_id || '').split('-')[0].toUpperCase()}</td>
                <td className="px-5 py-3 text-sm text-gray-700">{r.customer_email || r.customer_name || '—'}</td>
                <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">{r.reason || '—'}</td>
                <td className="px-5 py-3 text-sm font-semibold text-red-600 text-right">৳{fmt(r.refund_amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-sm text-gray-400 text-right">
                  {new Date(r.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' })}
                </td>
                <td className="px-5 py-3 text-right">
                  {r.status === 'pending' && (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleApprove(r.id)} disabled={actionLoading === r.id}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50">
                        {actionLoading === r.id ? '…' : 'Approve'}
                      </button>
                      <button onClick={() => { setSelectedRefund(r); setRejectReason(''); }}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium bg-red-50 text-red-700 hover:bg-red-100">
                        Reject
                      </button>
                    </div>
                  )}
                  {r.status === 'approved' && (
                    <button onClick={() => handleComplete(r.id)} disabled={actionLoading === r.id}
                      className="text-xs px-2.5 py-1 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50">
                      {actionLoading === r.id ? '…' : 'Mark Completed'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {refundsList.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Page {refundsList.page} of {refundsList.totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => Math.min(refundsList.totalPages, p + 1))} disabled={page >= refundsList.totalPages} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <Modal open={!!selectedRefund} onClose={() => setSelectedRefund(null)} title="Reject Refund Request" size="sm">
        {selectedRefund && (
          <form onSubmit={handleReject}>
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">Order #{String(selectedRefund.order_id || '').split('-')[0].toUpperCase()}</p>
              <p className="text-xs text-red-600 mt-0.5">Refund amount: ৳{fmt(selectedRefund.refund_amount)}</p>
            </div>
            <FormField label="Rejection Reason *" required>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Explain why this refund request is being rejected..." required />
            </FormField>
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => setSelectedRefund(null)}>Cancel</Button>
              <Button type="submit" variant="danger" loading={actionLoading === selectedRefund.id}>Reject Refund</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

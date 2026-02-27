import { useState, useEffect } from 'react';
import { payments } from '../api';
import { PageHeader, Table, Badge, Button, Modal, FormField, Input, Textarea, Pagination } from '../components/UI';

export default function Payments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(null);
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = page) => {
    setLoading(true);
    payments.list({ page: p, limit: 20 })
      .then((data) => { setItems(data.items); setTotalPages(data.totalPages); setTotal(data.total); setPage(data.page); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleRefund = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await payments.refund(refunding.id, { amount: Number(refundForm.amount), reason: refundForm.reason });
      setRefunding(null);
      setRefundForm({ amount: '', reason: '' });
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const columns = [
    { key: 'id', label: 'Payment ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 12)}...</span> },
    { key: 'order_id', label: 'Order', render: (r) => <span className="font-mono text-xs">{r.order_id.slice(0, 12)}...</span> },
    { key: 'amount', label: 'Amount', render: (r) => <span className="font-semibold">${Number(r.amount).toFixed(2)}</span> },
    { key: 'currency', label: 'Currency' },
    { key: 'provider', label: 'Provider' },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'captured' ? 'success' : 'warning'}>{r.status}</Badge> },
    { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
    { key: 'actions', label: '', render: (r) => (
      r.status === 'captured' ? (
        <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setRefunding(r); setRefundForm({ amount: r.amount, reason: '' }); }}>Refund</Button>
      ) : null
    )},
  ];

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <PageHeader title="Payments" description={`${total} payment${total !== 1 ? 's' : ''}`} />

      <Table columns={columns} data={items} emptyMessage="No payments yet. Record payments from order detail pages." />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      <Modal open={!!refunding} onClose={() => setRefunding(null)} title="Process Refund">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        {refunding && (
          <form onSubmit={handleRefund}>
            <p className="text-sm text-gray-500 mb-4">Refunding payment <span className="font-mono">{refunding.id.slice(0, 12)}...</span> (${Number(refunding.amount).toFixed(2)})</p>
            <FormField label="Refund Amount">
              <Input type="number" step="0.01" min="0.01" max={refunding.amount} value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} required />
            </FormField>
            <FormField label="Reason">
              <Textarea value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} placeholder="Reason for refund..." />
            </FormField>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="secondary" type="button" onClick={() => setRefunding(null)}>Cancel</Button>
              <Button variant="danger" type="submit" disabled={saving}>{saving ? 'Processing...' : 'Process Refund'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

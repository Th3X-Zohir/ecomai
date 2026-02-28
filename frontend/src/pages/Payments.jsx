import { useState, useEffect } from 'react';
import { payments } from '../api';
import { PageHeader, Table, Badge, Button, Modal, FormField, Input, Select, Textarea, Pagination, StatCard, Card, ConfirmDialog, SearchInput, PageSkeleton, useToast } from '../components/UI';

export default function Payments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(null);
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ orderId: '', amount: '', method: 'cash', currency: 'BDT' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const load = (p = page, q = search) => {
    setLoading(true);
    payments.list({ page: p, limit: 20, search: q || undefined })
      .then((data) => { setItems(data.items); setTotalPages(data.totalPages); setTotal(data.total); setPage(data.page); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleRefund = async () => {
    setError(''); setSaving(true);
    try {
      await payments.refund(refunding.id, { amount: Number(refundForm.amount), reason: refundForm.reason });
      setRefunding(null); setShowConfirm(false);
      setRefundForm({ amount: '', reason: '' });
      toast('Refund processed successfully!', 'success');
      load();
    } catch (err) { setError(err.message); setShowConfirm(false); } finally { setSaving(false); }
  };

  const submitRefund = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleManualPayment = async (e) => {
    e.preventDefault();
    if (!manualForm.orderId.trim()) { setError('Order ID is required'); return; }
    if (!manualForm.amount || Number(manualForm.amount) <= 0) { setError('Amount must be greater than 0'); return; }
    setError(''); setSaving(true);
    try {
      await payments.manual({ orderId: manualForm.orderId.trim(), amount: Number(manualForm.amount), method: manualForm.method, currency: manualForm.currency });
      setShowManual(false);
      setManualForm({ orderId: '', amount: '', method: 'cash', currency: 'BDT' });
      toast('Manual payment recorded!', 'success');
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  // Stats
  const totalCaptured = items.filter(p => p.status === 'captured').reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = items.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0);
  const totalRefunded = items.filter(p => p.status === 'refunded').reduce((s, p) => s + Number(p.amount), 0);

  const providerIcon = (provider) => {
    const icons = {
      manual: <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
      stripe: <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
      paypal: <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      sslcommerz: <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
      cash: <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    };
    return icons[provider] || icons.manual;
  };

  const statusVariant = (s) => {
    const map = { captured: 'success', pending: 'warning', refunded: 'danger', failed: 'danger' };
    return map[s] || 'default';
  };

  const columns = [
    { key: 'id', label: 'Payment', render: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
          {providerIcon(r.provider)}
        </div>
        <div>
          <p className="font-mono text-xs font-medium text-gray-900">{r.id.slice(0, 10)}</p>
          <p className="text-[10px] text-gray-500">Order #{r.order_id.slice(-6)}</p>
        </div>
      </div>
    )},
    { key: 'amount', label: 'Amount', render: (r) => (
      <span className="font-semibold text-gray-900">৳{Number(r.amount).toFixed(2)} <span className="text-xs text-gray-400 font-normal uppercase">{r.currency || 'BDT'}</span></span>
    )},
    { key: 'provider', label: 'Provider', render: (r) => (
      <Badge variant="default">{r.provider}</Badge>
    )},
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)} dot>{r.status}</Badge> },
    { key: 'created_at', label: 'Date', render: (r) => (
      <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
    )},
    { key: 'actions', label: '', render: (r) => (
      r.status === 'captured' ? (
        <Button size="xs" variant="danger" onClick={(e) => { e.stopPropagation(); setRefunding(r); setRefundForm({ amount: r.amount, reason: '' }); }}
          icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}>
          Refund
        </Button>
      ) : null
    )},
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Payments" description="Track all payment transactions">
        <Button onClick={() => { setShowManual(true); setError(''); }} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Record Manual Payment
        </Button>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Payments" value={total} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        } />
        <StatCard label="Captured" value={`৳${totalCaptured.toFixed(2)}`} trend="up" trendLabel="Revenue" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        } />
        <StatCard label="Pending" value={`৳${totalPending.toFixed(2)}`} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        } />
        <StatCard label="Refunded" value={`৳${totalRefunded.toFixed(2)}`} trend={totalRefunded > 0 ? 'down' : undefined} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
        } />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="sm:w-80">
          <SearchInput value={search} onChange={(v) => { setSearch(v); load(1, v); }} placeholder="Search by transaction ID, method..." />
        </div>
      </div>

      <Table columns={columns} data={items} loading={loading} emptyMessage="No payments yet. Record payments from order detail pages." emptyIcon="💳" />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {/* Refund Modal */}
      <Modal open={!!refunding} onClose={() => setRefunding(null)} title="Process Refund" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        {refunding && (
          <form onSubmit={submitRefund}>
            <Card className="mb-4 bg-amber-50 border-amber-200">
              <div className="p-3 flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">Refunding payment</p>
                  <p className="text-xs text-amber-600"><span className="font-mono">{refunding.id.slice(0, 12)}</span> — Original: ৳{Number(refunding.amount).toFixed(2)}</p>
                </div>
              </div>
            </Card>
            <FormField label="Refund Amount" hint={`Max: ৳${Number(refunding.amount).toFixed(2)}`}>
              <Input type="number" step="0.01" min="0.01" max={refunding.amount} value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} required autoFocus />
            </FormField>
            <FormField label="Reason" hint="Required for audit trail">
              <Textarea value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} placeholder="Describe the reason for this refund..." rows={3} required />
            </FormField>
            <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => setRefunding(null)}>Cancel</Button>
              <Button variant="danger" type="submit" loading={saving}>Process Refund</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleRefund}
        title="Confirm Refund"
        message={`Are you sure you want to refund ৳${Number(refundForm.amount || 0).toFixed(2)}? This action cannot be undone.`}
        confirmLabel="Yes, Process Refund"
        variant="danger"
      />

      {/* Manual Payment Modal */}
      <Modal open={showManual} onClose={() => setShowManual(false)} title="Record Manual Payment" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleManualPayment}>
          <FormField label="Order ID" required hint="UUID of the order to record payment against">
            <Input type="text" value={manualForm.orderId} onChange={(e) => setManualForm({ ...manualForm, orderId: e.target.value })} placeholder="Paste order UUID" required />
          </FormField>
          <FormField label="Amount" required>
            <Input type="number" step="0.01" min="0.01" value={manualForm.amount} onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })} placeholder="e.g. 1500.00" required />
          </FormField>
          <FormField label="Payment Method">
            <Select value={manualForm.method} onChange={(e) => setManualForm({ ...manualForm, method: e.target.value })}>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </Select>
          </FormField>
          <FormField label="Currency">
            <Select value={manualForm.currency} onChange={(e) => setManualForm({ ...manualForm, currency: e.target.value })}>
              <option value="BDT">BDT</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowManual(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

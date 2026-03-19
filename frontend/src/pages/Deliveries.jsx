import { useState, useEffect } from 'react';
import { deliveries, deliveryExceptions } from '../api';
import { PageHeader, Table, Badge, Button, Modal, FormField, Select, Pagination, StatCard, Card, SearchInput, PageSkeleton, ConfirmDialog, useToast } from '../components/UI';
import { useAdmin } from '../contexts/AdminContext';

const STATUSES = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

const FAILURE_CODES = [
  { value: 'customer_unavailable', label: 'Customer Unavailable' },
  { value: 'wrong_address', label: 'Wrong Address' },
  { value: 'address_incomplete', label: 'Address Incomplete' },
  { value: 'refused', label: 'Refused by Customer' },
  { value: 'not_home', label: 'Not Home' },
  { value: 'business_closed', label: 'Business Closed' },
  { value: 'flooded_area', label: 'Area Flooded' },
  { value: 'area_out_of_delivery_zone', label: 'Out of Delivery Zone' },
  { value: 'package_damaged', label: 'Package Damaged' },
  { value: 'lost', label: 'Package Lost' },
  { value: 'other', label: 'Other' },
];

export default function Deliveries() {
  const { isSuperAdmin, shopList, selectedShop } = useAdmin();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const toast = useToast();

  // Exception action state
  const [failingDelivery, setFailingDelivery] = useState(null);
  const [failureReasonCode, setFailureReasonCode] = useState('customer_unavailable');
  const [failureReasonDesc, setFailureReasonDesc] = useState('');
  const [failureSaving, setFailureSaving] = useState(false);

  // Return action state
  const [returningDelivery, setReturningDelivery] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnSaving, setReturnSaving] = useState(false);

  // Reschedule action state
  const [reschedulingDelivery, setReschedulingDelivery] = useState(null);
  const [newSchedDate, setNewSchedDate] = useState('');
  const [newSchedSlot, setNewSchedSlot] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  // Confirm delivery state
  const [confirmingDelivery, setConfirmingDelivery] = useState(null);
  const [codAmount, setCodAmount] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [confirmSaving, setConfirmSaving] = useState(false);

  const shopName = (shopId) => {
    const s = shopList.find(sh => sh.id === shopId);
    return s ? s.name : shopId?.slice(0, 8) || '—';
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deliveries.delete(confirmDelete.id);
      toast('Delivery request deleted', 'success');
      setConfirmDelete(null);
      load();
    } catch (err) { toast(err.message, 'error'); setConfirmDelete(null); }
  };

  const load = (p = page, q = search) => {
    setLoading(true);
    deliveries.list({ page: p, limit: 20, search: q || undefined })
      .then((data) => { setItems(data.items); setTotalPages(data.totalPages); setTotal(data.total); setPage(data.page); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await deliveries.updateStatus(updating.id, newStatus);
      setUpdating(null);
      toast('Delivery status updated!', 'success');
      load();
    } catch (err) {
      if (err.message.includes('409') || err.message.toLowerCase().includes('conflict')) {
        setError('This delivery was modified by another action (e.g., a driver app update). Please refresh the page and try again.');
      } else {
        setError(err.message);
      }
    } finally { setSaving(false); }
  };

  const handleRecordFailure = async (e) => {
    e.preventDefault();
    setFailureSaving(true);
    try {
      await deliveryExceptions.recordFailedAttempt(failingDelivery.id, {
        reasonCode: failureReasonCode,
        reasonDescription: failureReasonDesc,
        attemptCount: failingDelivery.attempt_count || 0,
      });
      setFailingDelivery(null);
      setFailureReasonCode('customer_unavailable');
      setFailureReasonDesc('');
      toast('Failed attempt recorded. Delivery will retry.', 'success');
      load();
    } catch (err) {
      if (err.message.includes('409') || err.message.toLowerCase().includes('conflict')) {
        toast('Delivery was modified by another operation. Please refresh and try again.', 'error');
      } else {
        toast(err.message, 'error');
      }
    } finally { setFailureSaving(false); }
  };

  const handleInitiateReturn = async (e) => {
    e.preventDefault();
    setReturnSaving(true);
    try {
      await deliveryExceptions.initiateReturn(returningDelivery.id, {
        reason: returnReason || 'Delivery failed after maximum attempts',
      });
      setReturningDelivery(null);
      setReturnReason('');
      toast('Return initiated. Package will be returned to merchant.', 'success');
      load();
    } catch (err) {
      if (err.message.includes('409') || err.message.toLowerCase().includes('conflict')) {
        toast('Delivery was modified by another operation. Please refresh and try again.', 'error');
      } else {
        toast(err.message, 'error');
      }
    } finally { setReturnSaving(false); }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    setRescheduleSaving(true);
    try {
      await deliveryExceptions.reschedule(reschedulingDelivery.id, {
        newDate: newSchedDate,
        newTimeSlot: newSchedSlot,
        notes: rescheduleNotes,
      });
      setReschedulingDelivery(null);
      setNewSchedDate('');
      setNewSchedSlot('');
      setRescheduleNotes('');
      toast('Delivery rescheduled successfully.', 'success');
      load();
    } catch (err) {
      if (err.message.includes('409') || err.message.toLowerCase().includes('conflict')) {
        toast('Delivery was modified by another operation. Please refresh and try again.', 'error');
      } else {
        toast(err.message, 'error');
      }
    } finally { setRescheduleSaving(false); }
  };

  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
    setConfirmSaving(true);
    try {
      await deliveryExceptions.confirmDelivery(confirmingDelivery.id, {
        codAmount: codAmount ? Number(codAmount) : undefined,
        notes: deliveryNotes,
      });
      setConfirmingDelivery(null);
      setCodAmount('');
      setDeliveryNotes('');
      toast('Delivery confirmed successfully!', 'success');
      load();
    } catch (err) {
      if (err.message.includes('409') || err.message.toLowerCase().includes('conflict')) {
        toast('Delivery was modified by another operation. Please refresh and try again.', 'error');
      } else {
        toast(err.message, 'error');
      }
    } finally { setConfirmSaving(false); }
  };

  const statusVariant = (s) => {
    const map = { pending: 'warning', assigned: 'info', picked_up: 'info', in_transit: 'purple', delivered: 'success', cancelled: 'danger' };
    return map[s] || 'default';
  };

  const statusIcon = (s) => {
    const icons = {
      pending: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      assigned: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
      picked_up: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
      in_transit: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
      delivered: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      cancelled: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    };
    return icons[s] || icons.pending;
  };

  const formatAddress = (addr) => {
    if (!addr) return '—';
    if (typeof addr === 'object') return `${addr.street || ''}, ${addr.city || ''} ${addr.zip || ''}`.replace(/^,\s*/, '').trim() || '—';
    return String(addr).slice(0, 40);
  };

  // Stats
  const inTransit = items.filter(d => d.status === 'in_transit').length;
  const delivered = items.filter(d => d.status === 'delivered').length;
  const pending = items.filter(d => ['pending', 'assigned'].includes(d.status)).length;

  const columns = [
    { key: 'id', label: 'Delivery', render: (r) => (
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          r.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' :
          r.status === 'in_transit' ? 'bg-primary-100 text-primary-600' :
          r.status === 'cancelled' ? 'bg-red-100 text-red-600' :
          'bg-amber-100 text-amber-600'
        }`}>
          {statusIcon(r.status)}
        </div>
        <div>
          <p className="font-mono text-xs font-medium text-gray-900">{r.id.slice(0, 10)}</p>
          <p className="text-[10px] text-gray-500">Order #{r.order_id.slice(-6)}</p>
        </div>
      </div>
    )},
    { key: 'provider', label: 'Provider', render: (r) => (
      <Badge variant="default">{r.provider}</Badge>
    )},
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)} dot>{r.status.replace('_', ' ')}</Badge> },
    { key: 'pickup_address', label: 'Route', render: (r) => (
      <div className="text-xs max-w-[200px]">
        <div className="flex items-start gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1.5 shrink-0" />
          <span className="text-gray-600 truncate">{formatAddress(r.pickup_address)}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
          <span className="text-gray-600 truncate">{formatAddress(r.dropoff_address)}</span>
        </div>
      </div>
    )},
    { key: 'created_at', label: 'Requested', render: (r) => (
      <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
    )},
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-1 flex-wrap">
        {['assigned', 'picked_up', 'in_transit'].includes(r.status) && (
          <>
            <Button size="xs" variant="danger" onClick={(e) => { e.stopPropagation(); setFailingDelivery(r); setFailureReasonCode('customer_unavailable'); setFailureReasonDesc(''); }}
              icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}>
              Failed
            </Button>
            <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirmingDelivery(r); setCodAmount(''); setDeliveryNotes(''); }}
              icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
              Delivered
            </Button>
          </>
        )}
        {['pending', 'assigned', 'failed'].includes(r.status) && (
          <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); setReschedulingDelivery(r); setNewSchedDate(''); setNewSchedSlot(''); setRescheduleNotes(''); }}
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}>
            Reschedule
          </Button>
        )}
        {r.status === 'failed' && (
          <Button size="xs" variant="danger" onClick={(e) => { e.stopPropagation(); setReturningDelivery(r); setReturnReason(''); }}
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>}>
            Return
          </Button>
        )}
        {['pending', 'cancelled'].includes(r.status) && (
          <Button size="xs" variant="danger" onClick={(e) => { e.stopPropagation(); setConfirmDelete(r); }}
            icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}>
            Delete
          </Button>
        )}
      </div>
    )},
    ...(isSuperAdmin && !selectedShop ? [{ key: 'shop_id', label: 'Shop', render: (r) => (
      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{shopName(r.shop_id)}</span>
    )}] : []),
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Deliveries" description="Track and manage delivery requests" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Deliveries" value={total} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
        } />
        <StatCard label="In Transit" value={inTransit} trend={inTransit > 0 ? 'up' : undefined} trendLabel="On the way" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        } />
        <StatCard label="Pending" value={pending} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        } />
        <StatCard label="Delivered" value={delivered} trend={delivered > 0 ? 'up' : undefined} trendLabel="Completed" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        } />
      </div>

      {/* Delivery pipeline mini-visual */}
      {items.length > 0 && (
        <Card className="mb-6">
          <div className="p-4">
            <div className="flex items-center gap-1">
              {STATUSES.filter(s => s !== 'cancelled').map((s) => {
                const count = items.filter(d => d.status === s).length;
                return (
                  <div key={s} className="flex-1 text-center">
                    <div className={`h-1.5 rounded-full mb-1.5 ${count > 0 ? {
                      pending: 'bg-amber-400', assigned: 'bg-blue-400', picked_up: 'bg-primary-400', in_transit: 'bg-purple-400', delivered: 'bg-emerald-400'
                    }[s] : 'bg-gray-200'}`} />
                    <p className="text-[10px] text-gray-500 capitalize">{s.replace('_', ' ')}</p>
                    <p className={`text-xs font-semibold ${count > 0 ? 'text-gray-900' : 'text-gray-300'}`}>{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="sm:w-80">
          <SearchInput value={search} onChange={(v) => { setSearch(v); load(1, v); }} placeholder="Search by ID, order..." />
        </div>
      </div>

      <Table columns={columns} data={items} loading={loading} emptyMessage="No delivery requests yet. Create one from an order detail page." emptyIcon="🚚" />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {/* Update Status Modal */}
      <Modal open={!!updating} onClose={() => setUpdating(null)} title="Update Delivery Status" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        {updating && (
          <form onSubmit={handleStatusUpdate}>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded flex items-center justify-center ${
                  updating.status === 'in_transit' ? 'bg-primary-100 text-primary-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {statusIcon(updating.status)}
                </div>
                <span className="text-sm font-medium text-gray-700">Current: <Badge variant={statusVariant(updating.status)} dot>{updating.status.replace('_', ' ')}</Badge></span>
              </div>
              <p className="text-xs text-gray-500">Delivery #{updating.id.slice(0, 10)} • {updating.provider}</p>
            </div>

            <FormField label="New Status">
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </Select>
            </FormField>

            {/* Status flow visualization */}
            <div className="mt-3 flex items-center gap-1">
              {STATUSES.filter(s => s !== 'cancelled').map((s, i) => {
                const targetIdx = STATUSES.indexOf(newStatus);
                    const isActive = i <= targetIdx && newStatus !== 'cancelled';
                return (
                  <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${isActive ? 'bg-primary-500' : 'bg-gray-200'}`} />
                );
              })}
            </div>

            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => setUpdating(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>Update Status</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Delivery Confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="Delete Delivery Request"
        message={`Are you sure you want to delete delivery #${(confirmDelete?.id || '').slice(0, 10)}? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        variant="danger"
      />

      {/* Record Failed Attempt Modal */}
      <Modal open={!!failingDelivery} onClose={() => setFailingDelivery(null)} title="Record Failed Delivery Attempt" size="sm">
        {failingDelivery && (
          <form onSubmit={handleRecordFailure}>
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800">Delivery #{failingDelivery.id?.slice(0, 10)}</p>
              <p className="text-xs text-red-600 mt-1">Current: {failingDelivery.status.replace('_', ' ')} • Attempt: {(failingDelivery.attempt_count || 0) + 1} of 3</p>
            </div>
            <FormField label="Failure Reason *">
              <Select value={failureReasonCode} onChange={e => setFailureReasonCode(e.target.value)}>
                {FAILURE_CODES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Additional Details">
              <textarea value={failureReasonDesc} onChange={e => setFailureReasonDesc(e.target.value)} rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Optional description..." />
            </FormField>
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => setFailingDelivery(null)}>Cancel</Button>
              <Button type="submit" variant="danger" loading={failureSaving}>Record Attempt</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Initiate Return Modal */}
      <Modal open={!!returningDelivery} onClose={() => setReturningDelivery(null)} title="Initiate Return to Merchant" size="sm">
        {returningDelivery && (
          <form onSubmit={handleInitiateReturn}>
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800">Return delivery #{returningDelivery.id?.slice(0, 10)} to merchant</p>
              {returningDelivery.cod_amount > 0 && (
                <p className="text-xs text-red-600 mt-1 font-semibold">⚠️ COD amount ৳{Number(returningDelivery.cod_amount).toFixed(2)} was collected — cash reconciliation required</p>
              )}
            </div>
            <FormField label="Return Reason">
              <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Reason for return..." />
            </FormField>
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => setReturningDelivery(null)}>Cancel</Button>
              <Button type="submit" variant="danger" loading={returnSaving}>Initiate Return</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reschedule Modal */}
      <Modal open={!!reschedulingDelivery} onClose={() => setReschedulingDelivery(null)} title="Reschedule Delivery" size="sm">
        {reschedulingDelivery && (
          <form onSubmit={handleReschedule}>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800">Delivery #{reschedulingDelivery.id?.slice(0, 10)}</p>
              <p className="text-xs text-blue-600 mt-1">Current: {reschedulingDelivery.status.replace('_', ' ')}</p>
            </div>
            <FormField label="New Date *" required>
              <input type="date" value={newSchedDate} onChange={e => setNewSchedDate(e.target.value)} required
                className="w-full px-3 py-2 border rounded-lg text-sm" min={new Date().toISOString().split('T')[0]} />
            </FormField>
            <FormField label="Time Slot">
              <Select value={newSchedSlot} onChange={e => setNewSchedSlot(e.target.value)}>
                <option value="">Select time slot</option>
                <option value="09:00-12:00">09:00 – 12:00</option>
                <option value="12:00-15:00">12:00 – 15:00</option>
                <option value="15:00-18:00">15:00 – 18:00</option>
                <option value="18:00-21:00">18:00 – 21:00</option>
              </Select>
            </FormField>
            <FormField label="Notes">
              <textarea value={rescheduleNotes} onChange={e => setRescheduleNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Delivery notes..." />
            </FormField>
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => setReschedulingDelivery(null)}>Cancel</Button>
              <Button type="submit" loading={rescheduleSaving}>Reschedule</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm Delivery Modal */}
      <Modal open={!!confirmingDelivery} onClose={() => setConfirmingDelivery(null)} title="Confirm Delivery" size="sm">
        {confirmingDelivery && (
          <form onSubmit={handleConfirmDelivery}>
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm font-medium text-emerald-800">Delivery #{confirmingDelivery.id?.slice(0, 10)}</p>
              <p className="text-xs text-emerald-600 mt-1">Confirm the package was delivered to the customer</p>
            </div>
            {confirmingDelivery.method === 'cod' && (
              <FormField label="COD Amount Collected (BDT)">
                <input type="number" value={codAmount} onChange={e => setCodAmount(e.target.value)} step="0.01"
                  className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Enter amount if COD was collected" />
              </FormField>
            )}
            <FormField label="Delivery Notes">
              <textarea value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Proof notes or customer instructions..." />
            </FormField>
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => setConfirmingDelivery(null)}>Cancel</Button>
              <Button type="submit" loading={confirmSaving}>Confirm Delivery</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

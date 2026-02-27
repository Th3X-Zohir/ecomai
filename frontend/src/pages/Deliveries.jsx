import { useState, useEffect } from 'react';
import { deliveries } from '../api';
import { PageHeader, Table, Badge, Button, Modal, FormField, Select, Pagination } from '../components/UI';

const STATUSES = ['requested', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

export default function Deliveries() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = page) => {
    setLoading(true);
    deliveries.list({ page: p, limit: 20 })
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
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const statusVariant = (s) => {
    const map = { requested: 'warning', assigned: 'info', picked_up: 'info', in_transit: 'purple', delivered: 'success', cancelled: 'danger' };
    return map[s] || 'default';
  };

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 12)}...</span> },
    { key: 'order_id', label: 'Order', render: (r) => <span className="font-mono text-xs">{r.order_id.slice(0, 12)}...</span> },
    { key: 'provider', label: 'Provider', render: (r) => <Badge variant="default">{r.provider}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'pickup_address', label: 'Pickup', render: (r) => (
      <span className="text-xs">{typeof r.pickup_address === 'object' ? `${r.pickup_address.street}, ${r.pickup_address.city}` : String(r.pickup_address).slice(0, 30)}</span>
    )},
    { key: 'dropoff_address', label: 'Dropoff', render: (r) => (
      <span className="text-xs">{typeof r.dropoff_address === 'object' ? `${r.dropoff_address.street}, ${r.dropoff_address.city}` : String(r.dropoff_address).slice(0, 30)}</span>
    )},
    { key: 'actions', label: '', render: (r) => (
      r.status !== 'delivered' && r.status !== 'cancelled' ? (
        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); setUpdating(r); setNewStatus(r.status); }}>Update</Button>
      ) : null
    )},
  ];

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <PageHeader title="Deliveries" description={`${total} delivery request${total !== 1 ? 's' : ''}`} />

      <Table columns={columns} data={items} emptyMessage="No delivery requests yet. Create one from an order." />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      <Modal open={!!updating} onClose={() => setUpdating(null)} title="Update Delivery Status">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleStatusUpdate}>
          <FormField label="Status">
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" type="button" onClick={() => setUpdating(null)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update Status'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

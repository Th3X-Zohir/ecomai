import { useState, useEffect } from 'react';
import { deliveries, users } from '../api';
import { PageHeader, Table, Badge, Button, Modal, FormField, Select, Pagination, StatCard, SearchInput, PageSkeleton, useToast } from '../components/UI';
import { useAdmin } from '../contexts/AdminContext';

const STATUSES = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'];

const statusVariant = (s) => {
  const map = { pending: 'warning', assigned: 'info', picked_up: 'info', in_transit: 'purple', delivered: 'success', cancelled: 'danger' };
  return map[s] || 'default';
};

export default function DriverAssignments() {
  const { isSuperAdmin, shopList, selectedShop } = useAdmin();
  const [items, setItems] = useState([]);
  const [driverList, setDriverList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [driverId, setDriverId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const shopName = (shopId) => {
    const s = shopList.find(sh => sh.id === shopId);
    return s ? s.name : shopId?.slice(0, 8) || '—';
  };

  const driverName = (driverUserId) => {
    const d = driverList.find(dr => dr.id === driverUserId);
    return d ? (d.full_name || d.email) : null;
  };

  const loadDrivers = () => {
    const fetchFn = isSuperAdmin ? users.listAll : users.list;
    fetchFn({ role: 'delivery_agent', limit: 200 })
      .then((data) => setDriverList(data.items || []))
      .catch(() => {});
  };

  const load = (p = page, q = search) => {
    setLoading(true);
    deliveries.list({ page: p, limit: 20, search: q || undefined })
      .then((data) => { setItems(data.items || []); setTotalPages(data.totalPages || 1); setTotal(data.total || 0); setPage(data.page || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); loadDrivers(); }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!driverId.trim()) { setError('Please select a driver'); return; }
    setError(''); setSaving(true);
    try {
      await deliveries.assign(assigning.id, driverId.trim());
      setAssigning(null);
      setDriverId('');
      toast('Driver assigned successfully!', 'success');
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  // Stats
  const unassigned = items.filter(d => d.status === 'pending').length;
  const assigned = items.filter(d => d.status === 'assigned').length;
  const inTransit = items.filter(d => d.status === 'in_transit' || d.status === 'picked_up').length;

  const formatAddress = (addr) => {
    if (!addr) return '—';
    if (typeof addr === 'object') return `${addr.street || ''}, ${addr.city || ''} ${addr.zip || ''}`.replace(/^,\s*/, '').trim() || '—';
    return String(addr).slice(0, 40);
  };

  const columns = [
    { key: 'id', label: 'Delivery', render: (r) => (
      <div>
        <p className="font-mono text-xs font-medium text-gray-900">{r.id.slice(0, 10)}</p>
        <p className="text-[10px] text-gray-500">Order #{(r.order_id || '').slice(-6)}</p>
      </div>
    )},
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)} dot>{r.status.replace(/_/g, ' ')}</Badge> },
    { key: 'driver', label: 'Driver', render: (r) => r.assigned_driver_user_id ? (
      <div>
        <span className="text-sm text-gray-700 font-medium">{driverName(r.assigned_driver_user_id) || r.assigned_driver_user_id.slice(0, 10) + '...'}</span>
        {driverName(r.assigned_driver_user_id) && <p className="text-[10px] text-gray-400 font-mono">{r.assigned_driver_user_id.slice(0, 10)}</p>}
      </div>
    ) : (
      <span className="text-xs text-gray-400 italic">Unassigned</span>
    )},
    { key: 'route', label: 'Route', render: (r) => (
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
      (r.status === 'pending' || r.status === 'assigned') ? (
        <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); setAssigning(r); setDriverId(r.assigned_driver_user_id || ''); setError(''); loadDrivers(); }}>
          {r.assigned_driver_user_id ? 'Reassign' : 'Assign Driver'}
        </Button>
      ) : null
    )},
    ...(isSuperAdmin && !selectedShop ? [{ key: 'shop_id', label: 'Shop', render: (r) => (
      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{shopName(r.shop_id)}</span>
    )}] : []),
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Driver Assignments" description="Assign delivery drivers to pending requests" />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Deliveries" value={total} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
        } />
        <StatCard label="Unassigned" value={unassigned} color="warning" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        } />
        <StatCard label="Assigned" value={assigned} color="info" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        } />
        <StatCard label="In Transit" value={inTransit} color="purple" icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        } />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="sm:w-80">
          <SearchInput value={search} onChange={(v) => { setSearch(v); load(1, v); }} placeholder="Search deliveries..." />
        </div>
      </div>

      <Table columns={columns} data={items} loading={loading} emptyMessage="No delivery requests found." emptyIcon="🚚" />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {/* Assign Driver Modal */}
      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Assign Driver" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        {assigning && (
          <form onSubmit={handleAssign}>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Delivery #{assigning.id.slice(0, 10)}</p>
              <p className="text-sm font-medium text-gray-700 mt-1">
                Current status: <Badge variant={statusVariant(assigning.status)} dot>{assigning.status.replace(/_/g, ' ')}</Badge>
              </p>
            </div>
            <FormField label="Select Driver" required>
              <Select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">— choose a driver —</option>
                {driverList.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name || d.email} ({d.email})</option>
                ))}
              </Select>
              {driverList.length === 0 && <p className="text-xs text-amber-500 mt-1">No delivery agents found. Create a user with the delivery_agent role first.</p>}
            </FormField>
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => setAssigning(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>Assign Driver</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { customers } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Pagination, SearchInput, Card, StatCard, Avatar, Badge, PageSkeleton, ConfirmDialog, useToast } from '../components/UI';

export default function Customers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ email: '', full_name: '', phone: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const load = (p = page, q = search) => {
    setLoading(true);
    customers.list({ page: p, limit: 20, search: q || undefined })
      .then((data) => { setItems(data.items); setTotalPages(data.totalPages); setTotal(data.total); setPage(data.page); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleSearch = (val) => { setSearch(val); load(1, val); };

  const openCreate = () => {
    setForm({ email: '', full_name: '', phone: '' });
    setEditingCustomer(null);
    setError('');
    setShowCreate(true);
  };

  const openEdit = (c) => {
    setForm({ email: c.email || '', full_name: c.full_name || '', phone: c.phone || '' });
    setEditingCustomer(c);
    setError('');
    setShowCreate(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (editingCustomer) {
        await customers.update(editingCustomer.id, { full_name: form.full_name, phone: form.phone });
        toast('Customer updated!', 'success');
      } else {
        await customers.create(form);
        toast('Customer added!', 'success');
      }
      setShowCreate(false);
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await customers.delete(confirmDelete.id);
      toast('Customer deleted', 'success');
      setConfirmDelete(null);
      setViewCustomer(null);
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const recentCount = items.filter(c => {
    const d = new Date(c.created_at);
    return (Date.now() - d) < 30 * 24 * 60 * 60 * 1000;
  }).length;

  const withPhone = items.filter(c => c.phone).length;
  const registered = items.filter(c => c.is_registered).length;

  const columns = [
    { key: 'full_name', label: 'Customer', render: (r) => (
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewCustomer(r)}>
        <Avatar name={r.full_name || r.email} size="sm" />
        <div>
          <p className="font-medium text-gray-900">{r.full_name || '—'}</p>
          <p className="text-xs text-gray-500">{r.email}</p>
        </div>
      </div>
    )},
    { key: 'phone', label: 'Phone', render: (r) => r.phone ? (
      <span className="flex items-center gap-1.5 text-sm text-gray-700">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        {r.phone}
      </span>
    ) : <span className="text-gray-400 text-sm">—</span> },
    { key: 'is_registered', label: 'Account', render: (r) => (
      <Badge variant={r.is_registered ? 'success' : 'default'} dot>{r.is_registered ? 'Registered' : 'Guest'}</Badge>
    )},
    { key: 'created_at', label: 'Joined', render: (r) => {
      const d = new Date(r.created_at);
      const days = Math.floor((Date.now() - d) / (24 * 60 * 60 * 1000));
      return (
        <div>
          <p className="text-sm text-gray-700">{d.toLocaleDateString()}</p>
          {days <= 7 && <Badge variant="success" size="sm">New</Badge>}
        </div>
      );
    }},
    { key: 'actions', label: '', render: (r) => (
      <div className="flex gap-1">
        <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); setViewCustomer(r); }} className="text-gray-500 hover:text-primary-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        </Button>
        <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="text-gray-500 hover:text-primary-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </Button>
        <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirmDelete(r); }} className="text-gray-500 hover:text-red-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </Button>
      </div>
    )},
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Customers" description="Manage your customer base">
        <Button onClick={openCreate}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}>
          Add Customer
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Customers" value={total} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        } />
        <StatCard label="Registered" value={registered} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        } />
        <StatCard label="New This Month" value={recentCount} trend={recentCount > 0 ? 'up' : undefined} trendLabel={recentCount > 0 ? 'Active growth' : 'No new signups'} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        } />
        <StatCard label="With Phone" value={withPhone} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
        } />
      </div>

      {/* Search bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="max-w-sm flex-1">
          <SearchInput value={search} onChange={handleSearch} placeholder="Search by name, email, or phone..." />
        </div>
        <span className="text-sm text-gray-500">{total} result{total !== 1 ? 's' : ''}</span>
      </div>

      <Table columns={columns} data={items} loading={loading} emptyMessage="No customers yet" emptyIcon="👤" />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {/* Create/Edit modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={editingCustomer ? 'Edit Customer' : 'Add New Customer'} size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleSave}>
          <FormField label="Email" hint="Customer's primary email address">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" required autoFocus disabled={!!editingCustomer} />
          </FormField>
          <FormField label="Full Name">
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" />
          </FormField>
          <FormField label="Phone" hint="Optional - for SMS marketing">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
          </FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingCustomer ? 'Save Changes' : 'Add Customer'}</Button>
          </div>
        </form>
      </Modal>

      {/* View customer detail modal */}
      <Modal open={!!viewCustomer} onClose={() => setViewCustomer(null)} title="Customer Details" size="sm">
        {viewCustomer && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={viewCustomer.full_name || viewCustomer.email} size="lg" />
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{viewCustomer.full_name || 'No name'}</h3>
                <p className="text-sm text-gray-500">{viewCustomer.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Phone</p>
                <p className="text-sm font-medium text-gray-900">{viewCustomer.phone || '—'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Account</p>
                <Badge variant={viewCustomer.is_registered ? 'success' : 'default'} dot>{viewCustomer.is_registered ? 'Registered' : 'Guest'}</Badge>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Joined</p>
                <p className="text-sm font-medium text-gray-900">{new Date(viewCustomer.created_at).toLocaleDateString()}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">ID</p>
                <p className="text-xs font-mono text-gray-600 truncate">{viewCustomer.id}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t border-gray-100">
              <Button variant="secondary" size="sm" onClick={() => { setViewCustomer(null); openEdit(viewCustomer); }}
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => { setConfirmDelete(viewCustomer); }}
                icon={<svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete}
        title="Delete Customer?" message={`This will permanently remove "${confirmDelete?.full_name || confirmDelete?.email}" and all their data.`}
        confirmText="Delete" variant="danger" />
    </div>
  );
}

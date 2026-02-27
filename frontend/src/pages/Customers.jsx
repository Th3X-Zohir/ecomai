import { useState, useEffect } from 'react';
import { customers } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Pagination, SearchInput, Card, StatCard, Avatar, Badge, PageSkeleton, useToast } from '../components/UI';

export default function Customers() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
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

  const handleSearch = (val) => {
    setSearch(val);
    load(1, val);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await customers.create(form);
      setShowCreate(false);
      setForm({ email: '', full_name: '', phone: '' });
      toast('Customer added successfully!', 'success');
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const recentCount = items.filter(c => {
    const d = new Date(c.created_at);
    const now = new Date();
    return (now - d) < 30 * 24 * 60 * 60 * 1000;
  }).length;

  const withPhone = items.filter(c => c.phone).length;

  const columns = [
    { key: 'full_name', label: 'Customer', render: (r) => (
      <div className="flex items-center gap-3">
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
    { key: 'created_at', label: 'Joined', render: (r) => {
      const d = new Date(r.created_at);
      const now = new Date();
      const days = Math.floor((now - d) / (24 * 60 * 60 * 1000));
      return (
        <div>
          <p className="text-sm text-gray-700">{d.toLocaleDateString()}</p>
          {days <= 7 && <Badge variant="success" size="sm">New</Badge>}
        </div>
      );
    }},
    { key: 'status', label: 'Status', render: () => <Badge variant="success" dot>Active</Badge> },
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Customers" description="Manage your customer base">
        <Button onClick={() => setShowCreate(true)}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>}>
          Add Customer
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Customers" value={total} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
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

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Customer" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <FormField label="Email" hint="Customer's primary email address">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" required autoFocus />
          </FormField>
          <FormField label="Full Name">
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" />
          </FormField>
          <FormField label="Phone" hint="Optional - for SMS marketing">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
          </FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

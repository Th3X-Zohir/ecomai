import { useState, useEffect } from 'react';
import { customers } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Pagination, SearchInput } from '../components/UI';

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
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const columns = [
    { key: 'full_name', label: 'Name', render: (r) => <span className="font-medium">{r.full_name || '—'}</span> },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'created_at', label: 'Since', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <PageHeader title="Customers" description={`${total} customer${total !== 1 ? 's' : ''}`}>
        <Button onClick={() => setShowCreate(true)}>+ New Customer</Button>
      </PageHeader>

      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={handleSearch} placeholder="Search customers..." />
      </div>

      <Table columns={columns} data={items} emptyMessage="No customers yet" />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Customer">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <FormField label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></FormField>
          <FormField label="Full Name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></FormField>
          <FormField label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Add Customer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

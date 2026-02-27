import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { products } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Select, Textarea, Badge, Pagination, SearchInput } from '../components/UI';

export default function Products() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', base_price: '', description: '', category: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const load = (p = page, q = search) => {
    setLoading(true);
    products.list({ page: p, limit: 20, search: q || undefined })
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
    setError('');
    setSaving(true);
    try {
      await products.create({ ...form, base_price: Number(form.base_price) });
      setShowCreate(false);
      setForm({ name: '', slug: '', base_price: '', description: '', category: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const statusBadge = (status) => {
    const map = { active: 'success', draft: 'warning', archived: 'default' };
    return <Badge variant={map[status] || 'default'}>{status}</Badge>;
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'slug', label: 'Slug' },
    { key: 'category', label: 'Category', render: (r) => r.category || '—' },
    { key: 'base_price', label: 'Price', render: (r) => `$${Number(r.base_price).toFixed(2)}` },
    { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
    {
      key: 'created_at', label: 'Created',
      render: (r) => new Date(r.created_at).toLocaleDateString()
    },
  ];

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <PageHeader title="Products" description={`${total} product${total !== 1 ? 's' : ''} in catalog`}>
        <Button onClick={() => setShowCreate(true)}>+ New Product</Button>
      </PageHeader>

      <div className="mb-4 max-w-sm">
        <SearchInput value={search} onChange={handleSearch} placeholder="Search products..." />
      </div>

      <Table
        columns={columns}
        data={items}
        onRowClick={(row) => navigate(`/admin/products/${row.id}`)}
        emptyMessage="No products yet. Create your first product!"
      />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Product">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <FormField label="Product Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })}
              placeholder="e.g. Cold Brew Coffee"
              required
            />
          </FormField>
          <FormField label="Slug">
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="cold-brew-coffee"
              required
            />
          </FormField>
          <FormField label="Base Price ($)">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.base_price}
              onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              placeholder="12.99"
              required
            />
          </FormField>
          <FormField label="Category">
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Beverages"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Product description..."
            />
          </FormField>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Product'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

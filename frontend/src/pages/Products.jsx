import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { products, categories as categoriesApi } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Select, Textarea, Badge, Pagination, SearchInput, Card, PageSkeleton, useToast } from '../components/UI';

export default function Products() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', base_price: '', description: '', category: '', category_id: '', status: 'active' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryList, setCategoryList] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');

  const loadCategories = () => {
    categoriesApi.list({ status: 'active' }).then(setCategoryList).catch(() => {});
  };

  const load = (p = page, q = search) => {
    setLoading(true);
    products.list({ page: p, limit: 20, search: q || undefined })
      .then((data) => { setItems(data.items); setTotalPages(data.totalPages); setTotal(data.total); setPage(data.page); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); loadCategories(); }, []);

  const handleSearch = (val) => { setSearch(val); load(1, val); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await products.create({ ...form, base_price: Number(form.base_price) });
      setShowCreate(false);
      setForm({ name: '', slug: '', base_price: '', description: '', category: '', category_id: '', status: 'active' });
      toast('Product created successfully!', 'success');
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const statusBadge = (status) => {
    const map = { active: 'success', draft: 'warning', archived: 'default' };
    return <Badge variant={map[status] || 'default'} dot>{status}</Badge>;
  };

  const columns = [
    { key: 'name', label: 'Product', render: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
          {r.category?.toLowerCase().includes('coffee') ? '☕' : r.category?.toLowerCase().includes('food') ? '🍽️' : '📦'}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{r.name}</p>
          <p className="text-xs text-gray-500 font-mono truncate">{r.slug}</p>
        </div>
      </div>
    )},
    { key: 'category', label: 'Category', render: (r) => (
      <span className="text-sm text-gray-600">{r.category_name || r.category || <span className="text-gray-400">—</span>}</span>
    )},
    { key: 'base_price', label: 'Price', render: (r) => (
      <span className="font-semibold text-gray-900">${Number(r.base_price).toFixed(2)}</span>
    )},
    { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
    { key: 'created_at', label: 'Created', render: (r) => (
      <span className="text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
    )},
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Products" description={`${total} product${total !== 1 ? 's' : ''} in your catalog`}>
        <Button onClick={() => setShowCreate(true)}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          New Product
        </Button>
      </PageHeader>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="sm:w-80">
          <SearchInput value={search} onChange={handleSearch} placeholder="Search products..." />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{total} total</span>
          {search && <span>· Filtered</span>}
        </div>
      </div>

      <Table
        columns={columns}
        data={items}
        onRowClick={(row) => navigate(`/admin/products/${row.id}`)}
        emptyMessage="No products yet"
        emptyIcon="📦"
        loading={loading}
      />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Product">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <FormField label="Product Name" hint="The display name shown to customers">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })}
              placeholder="e.g. Cold Brew Coffee"
              required autoFocus
            />
          </FormField>
          <FormField label="URL Slug" hint="Used in the product URL">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="cold-brew-coffee" required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Base Price ($)">
              <Input type="number" step="0.01" min="0" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} placeholder="12.99" required />
            </FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Category">
            <Select value={form.category_id} onChange={(e) => {
              const cat = categoryList.find(c => c.id === e.target.value);
              setForm({ ...form, category_id: e.target.value, category: cat?.name || '' });
            }}>
              <option value="">— Select Category —</option>
              {categoryList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Write a compelling product description..." />
          </FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Product</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

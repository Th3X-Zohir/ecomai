import { useState, useEffect } from 'react';
import { inventory, products } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Select, Badge, Pagination, StatCard, SearchInput, PageSkeleton, useToast } from '../components/UI';
import { useAdmin } from '../contexts/AdminContext';

const TYPES = ['in', 'out', 'adjustment', 'return'];

const typeVariant = (t) => ({ in: 'success', out: 'danger', adjustment: 'warning', return: 'info' })[t] || 'default';
const typeIcon = (t) => ({ in: '+', out: '−', adjustment: '~', return: '↩' })[t] || '?';

export default function Inventory() {
  const { isSuperAdmin, shopList, selectedShop } = useAdmin();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [productList, setProductList] = useState([]);
  const [form, setForm] = useState({ product_id: '', type: 'in', quantity: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const toast = useToast();

  const load = (p = page, q = search) => {
    setLoading(true);
    inventory.list({ page: p, limit: 20, type: typeFilter || undefined, search: q || undefined })
      .then((data) => { setItems(data.items || []); setTotalPages(data.totalPages || 1); setTotal(data.total || 0); setPage(data.page || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [typeFilter]);

  const openCreate = () => {
    setError('');
    setForm({ product_id: '', type: 'in', quantity: '' });
    products.list({ limit: 200 })
      .then((data) => setProductList(data.items || []))
      .catch(() => {});
    setShowCreate(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.product_id) { setError('Please select a product'); return; }
    if (!form.quantity || Number(form.quantity) < 1) { setError('Quantity must be at least 1'); return; }
    setError(''); setSaving(true);
    try {
      await inventory.create({ product_id: form.product_id, type: form.type, quantity: Number(form.quantity) });
      setShowCreate(false);
      toast('Inventory movement recorded!', 'success');
      load(1);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  // Stats from current page items
  const totalIn = items.filter(i => i.type === 'in').reduce((s, i) => s + Number(i.quantity), 0);
  const totalOut = items.filter(i => i.type === 'out').reduce((s, i) => s + Number(i.quantity), 0);
  const totalReturn = items.filter(i => i.type === 'return').reduce((s, i) => s + Number(i.quantity), 0);

  const columns = [
    { key: 'product', label: 'Product', render: (r) => (
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
          r.type === 'in' ? 'bg-emerald-100 text-emerald-600' :
          r.type === 'out' ? 'bg-red-100 text-red-600' :
          r.type === 'return' ? 'bg-blue-100 text-blue-600' :
          'bg-amber-100 text-amber-600'
        }`}>
          {typeIcon(r.type)}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{r.product_name || r.product_id?.slice(0, 10)}</p>
          {r.variant_name && <p className="text-xs text-gray-500">{r.variant_name}</p>}
        </div>
      </div>
    )},
    { key: 'type', label: 'Type', render: (r) => <Badge variant={typeVariant(r.type)}>{r.type}</Badge> },
    { key: 'quantity', label: 'Quantity', render: (r) => (
      <span className={`font-semibold tabular-nums ${r.type === 'in' || r.type === 'return' ? 'text-emerald-600' : r.type === 'out' ? 'text-red-600' : 'text-amber-600'}`}>
        {r.type === 'in' || r.type === 'return' ? '+' : r.type === 'out' ? '−' : ''}{r.quantity}
      </span>
    )},
    { key: 'created_at', label: 'Date', render: (r) => (
      <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
    )},
    ...(isSuperAdmin && !selectedShop ? [{ key: 'shop_id', label: 'Shop', render: (r) => {
      const s = shopList.find(sh => sh.id === r.shop_id);
      return <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{s ? s.name : r.shop_id?.slice(0, 8) || '—'}</span>;
    }}] : []),
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Inventory Movements" description="Track stock changes across your products">
        <Button onClick={openCreate} icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Record Movement
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Movements" value={total} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
        } />
        <StatCard label="Stock In" value={`+${totalIn}`} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        } color="success" />
        <StatCard label="Stock Out" value={`−${totalOut}`} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        } color="danger" />
        <StatCard label="Returns" value={`↩ ${totalReturn}`} icon={
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
        } color="info" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="sm:w-80">
          <SearchInput value={search} onChange={(v) => { setSearch(v); load(1, v); }} placeholder="Search by product..." />
        </div>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sm:w-40">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </Select>
      </div>

      <Table columns={columns} data={items} loading={loading} emptyMessage="No inventory movements recorded yet." emptyIcon="📦" />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {/* Create Movement Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Record Inventory Movement" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <FormField label="Product" required>
            <Select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">— select product —</option>
              {productList.map((p) => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_quantity ?? '?'})</option>)}
            </Select>
          </FormField>
          <FormField label="Movement Type" required>
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </Select>
          </FormField>
          <FormField label="Quantity" required>
            <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 50" />
          </FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Record Movement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

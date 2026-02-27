import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orders, products } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Select, Badge, Pagination, Alert, SearchInput, PageSkeleton, useToast } from '../components/UI';

export default function Orders() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ customer_email: '', items: [{ product_id: '', quantity: 1 }] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const load = (p = page, q = search) => {
    setLoading(true);
    Promise.all([orders.list({ page: p, limit: 20, search: q || undefined }), products.list({ limit: 100 })])
      .then(([o, pr]) => { setItems(o.items); setTotalPages(o.totalPages); setTotal(o.total); setPage(o.page); setProductList(pr.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await orders.create({
        customer_email: form.customer_email,
        items: form.items.filter(i => i.product_id).map(i => ({ product_id: i.product_id, quantity: Number(i.quantity) })),
      });
      setShowCreate(false);
      setForm({ customer_email: '', items: [{ product_id: '', quantity: 1 }] });
      toast('Order created successfully!', 'success');
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: '', quantity: 1 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const statusVariant = (s) => {
    const map = { pending: 'warning', confirmed: 'info', processing: 'info', shipped: 'purple', delivered: 'success', cancelled: 'danger' };
    return map[s] || 'default';
  };

  const columns = [
    { key: 'id', label: 'Order', render: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-mono text-gray-600 font-semibold">
          #{(r.id || '').slice(-4)}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{r.customer_email}</p>
          <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    )},
    { key: 'total_amount', label: 'Total', render: (r) => <span className="font-semibold text-gray-900">৳{Number(r.total_amount).toFixed(2)}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)} dot>{r.status}</Badge> },
    { key: 'items', label: 'Items', render: (r) => (
      <span className="text-sm text-gray-600">{r.items?.length || 0} item{(r.items?.length || 0) !== 1 ? 's' : ''}</span>
    )},
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Orders" description={`${total} order${total !== 1 ? 's' : ''}`}>
        <Button onClick={() => setShowCreate(true)} disabled={productList.length === 0}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          New Order
        </Button>
      </PageHeader>

      {productList.length === 0 && (
        <div className="mb-6">
          <Alert type="warning">Create products first before placing orders.</Alert>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="sm:w-80">
          <SearchInput value={search} onChange={(v) => { setSearch(v); load(1, v); }} placeholder="Search by email, order ID..." />
        </div>
      </div>

      <Table columns={columns} data={items} onRowClick={(row) => navigate(`/admin/orders/${row.id}`)} emptyMessage="No orders yet" emptyIcon="🛒" loading={loading} />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Order">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <FormField label="Customer Email" hint="The customer will receive order updates at this email">
            <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="customer@example.com" required autoFocus />
          </FormField>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Order Items</label>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <Select value={item.product_id} onChange={(e) => updateItem(idx, 'product_id', e.target.value)} required>
                      <option value="">Select product...</option>
                      {productList.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — ৳{Number(p.base_price).toFixed(2)}</option>
                      ))}
                    </Select>
                  </div>
                  <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="!w-20" />
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="mt-2 text-red-400 hover:text-red-600 transition">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-2 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add another item
            </button>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Place Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

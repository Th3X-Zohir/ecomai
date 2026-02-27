import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orders, products } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Badge, Pagination } from '../components/UI';

export default function Orders() {
  const navigate = useNavigate();
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

  const load = (p = page) => {
    setLoading(true);
    Promise.all([orders.list({ page: p, limit: 20 }), products.list({ limit: 100 })])
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
    { key: 'id', label: 'Order ID', render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 16)}...</span> },
    { key: 'customer_email', label: 'Customer' },
    { key: 'total_amount', label: 'Total', render: (r) => <span className="font-semibold">${Number(r.total_amount).toFixed(2)}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)}>{r.status}</Badge> },
    { key: 'items', label: 'Items', render: (r) => `${r.items?.length || 0} item(s)` },
    { key: 'created_at', label: 'Date', render: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

  return (
    <div>
      <PageHeader title="Orders" description={`${total} order${total !== 1 ? 's' : ''}`}>
        <Button onClick={() => setShowCreate(true)} disabled={productList.length === 0}>+ New Order</Button>
      </PageHeader>

      {productList.length === 0 && (
        <div className="mb-4 p-3 bg-warning-50 text-warning-600 text-sm rounded-lg">
          Create products first before placing orders.
        </div>
      )}

      <Table columns={columns} data={items} onRowClick={(row) => navigate(`/admin/orders/${row.id}`)} emptyMessage="No orders yet" />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Order">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <FormField label="Customer Email">
            <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} required />
          </FormField>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Order Items</label>
            {form.items.map((item, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={item.product_id}
                  onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                  required
                >
                  <option value="">Select product...</option>
                  {productList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} — ${Number(p.base_price).toFixed(2)}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                  className="!w-20"
                />
                {form.items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 text-sm px-2">✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addItem} className="text-sm text-primary-600 hover:text-primary-700 mt-1">+ Add item</button>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Place Order'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

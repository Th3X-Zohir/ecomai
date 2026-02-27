import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products, variants } from '../api';
import { PageHeader, Card, Button, Badge, Modal, FormField, Input, Table } from '../components/UI';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [productVariants, setProductVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showVariant, setShowVariant] = useState(false);
  const [variantForm, setVariantForm] = useState({ sku: '', title: '', price: '', inventory_qty: '0' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = await products.get(id);
      setProduct(p);
      setForm({ name: p.name, slug: p.slug, base_price: p.base_price, description: p.description || '', category: p.category || '', status: p.status });
      const v = await variants.list(id);
      setProductVariants(v.items);
    } catch {
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const updated = await products.update(id, { ...form, base_price: Number(form.base_price) });
      setProduct(updated);
      setEditing(false);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this product?')) return;
    try {
      await products.delete(id);
      navigate('/admin/products');
    } catch (err) { alert(err.message); }
  };

  const handleCreateVariant = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await variants.create(id, { ...variantForm, price: Number(variantForm.price), inventory_qty: Number(variantForm.inventory_qty) });
      setShowVariant(false);
      setVariantForm({ sku: '', title: '', price: '', inventory_qty: '0' });
      const v = await variants.list(id);
      setProductVariants(v.items);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!confirm('Delete this variant?')) return;
    try {
      await variants.delete(variantId);
      const v = await variants.list(id);
      setProductVariants(v.items);
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  if (!product) return null;

  const statusMap = { active: 'success', draft: 'warning', archived: 'default' };

  const variantColumns = [
    { key: 'sku', label: 'SKU', render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: 'title', label: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'price', label: 'Price', render: (r) => `$${Number(r.price).toFixed(2)}` },
    { key: 'inventory_qty', label: 'Stock', render: (r) => (
      <Badge variant={r.inventory_qty > 0 ? 'success' : 'danger'}>{r.inventory_qty}</Badge>
    )},
    { key: 'actions', label: '', render: (r) => (
      <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDeleteVariant(r.id); }}>Delete</Button>
    )},
  ];

  return (
    <div>
      <PageHeader title={product.name} description={`SKU slug: ${product.slug}`}>
        <Button variant="secondary" onClick={() => navigate('/admin/products')}>← Back</Button>
        <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
        <Button variant="danger" onClick={handleDelete}>Delete</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <div className="p-5">
            <h3 className="font-semibold mb-3">Product Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Price</span><p className="font-semibold text-lg">${Number(product.base_price).toFixed(2)}</p></div>
              <div><span className="text-gray-500">Status</span><p className="mt-1"><Badge variant={statusMap[product.status]}>{product.status}</Badge></p></div>
              <div><span className="text-gray-500">Category</span><p className="font-medium">{product.category || '—'}</p></div>
              <div><span className="text-gray-500">Created</span><p>{new Date(product.created_at).toLocaleDateString()}</p></div>
            </div>
            {product.description && (
              <div className="mt-4">
                <span className="text-sm text-gray-500">Description</span>
                <p className="mt-1 text-sm">{product.description}</p>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <h3 className="font-semibold mb-3">Variants Summary</h3>
            <p className="text-3xl font-bold text-primary-600">{productVariants.length}</p>
            <p className="text-sm text-gray-500">Total variants</p>
            <p className="text-2xl font-bold mt-4 text-success-600">
              {productVariants.reduce((sum, v) => sum + v.inventory_qty, 0)}
            </p>
            <p className="text-sm text-gray-500">Total inventory</p>
          </div>
        </Card>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Variants</h2>
        <Button size="sm" onClick={() => setShowVariant(true)}>+ Add Variant</Button>
      </div>
      <Table columns={variantColumns} data={productVariants} emptyMessage="No variants yet" />

      {/* Edit Product Modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Product">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleUpdate}>
          <FormField label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
          <FormField label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></FormField>
          <FormField label="Base Price"><Input type="number" step="0.01" min="0" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} required /></FormField>
          <FormField label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></FormField>
          <FormField label="Status">
            <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </FormField>
          <FormField label="Description"><textarea className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Create Variant Modal */}
      <Modal open={showVariant} onClose={() => setShowVariant(false)} title="Add Variant">
        {error && <div className="mb-4 p-3 bg-danger-50 text-danger-600 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreateVariant}>
          <FormField label="SKU"><Input value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} placeholder="e.g. CB-SM-001" required /></FormField>
          <FormField label="Title"><Input value={variantForm.title} onChange={(e) => setVariantForm({ ...variantForm, title: e.target.value })} placeholder="e.g. Small (8oz)" required /></FormField>
          <FormField label="Price"><Input type="number" step="0.01" min="0" value={variantForm.price} onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })} required /></FormField>
          <FormField label="Initial Stock"><Input type="number" min="0" value={variantForm.inventory_qty} onChange={(e) => setVariantForm({ ...variantForm, inventory_qty: e.target.value })} /></FormField>
          <div className="flex gap-2 justify-end mt-6">
            <Button variant="secondary" type="button" onClick={() => setShowVariant(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Add Variant'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

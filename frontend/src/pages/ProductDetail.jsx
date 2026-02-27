import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products, productImages, variants, categories as categoriesApi } from '../api';
import { PageHeader, Card, Button, Badge, Modal, FormField, Input, Select, Textarea, Table, ConfirmDialog, PageSkeleton, useToast } from '../components/UI';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [product, setProduct] = useState(null);
  const [productVariants, setProductVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showVariant, setShowVariant] = useState(false);
  const [variantForm, setVariantForm] = useState({ sku: '', title: '', price: '', inventory_qty: '0' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDeleteVariant, setConfirmDeleteVariant] = useState(null);
  const [categoryList, setCategoryList] = useState([]);
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = await products.get(id);
      setProduct(p);
      setImages(p.images || []);
      setForm({ name: p.name, slug: p.slug, base_price: p.base_price, description: p.description || '', category: p.category || '', category_id: p.category_id || '', status: p.status });
      const v = await variants.list(id);
      setProductVariants(v.items);
    } catch { navigate('/admin/products'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { categoriesApi.list({ status: 'active' }).then(data => setCategoryList(data.items || data)).catch(() => {}); }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const updated = await products.update(id, { ...form, base_price: Number(form.base_price) });
      setProduct(updated);
      setEditing(false);
      toast('Product updated successfully!', 'success');
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await products.delete(id);
      toast('Product deleted', 'success');
      navigate('/admin/products');
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleCreateVariant = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await variants.create(id, { ...variantForm, price: Number(variantForm.price), inventory_qty: Number(variantForm.inventory_qty) });
      setShowVariant(false);
      setVariantForm({ sku: '', title: '', price: '', inventory_qty: '0' });
      toast('Variant added!', 'success');
      const v = await variants.list(id);
      setProductVariants(v.items);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDeleteVariant = async () => {
    if (!confirmDeleteVariant) return;
    try {
      await variants.delete(confirmDeleteVariant);
      setConfirmDeleteVariant(null);
      toast('Variant deleted', 'success');
      const v = await variants.list(id);
      setProductVariants(v.items);
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const newImages = await productImages.upload(id, files, images.length === 0);
      setImages(prev => [...prev, ...newImages]);
      toast(`${files.length} image${files.length > 1 ? 's' : ''} uploaded`, 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleSetPrimary = async (imageId) => {
    try {
      await productImages.setPrimary(id, imageId);
      setImages(prev => prev.map(img => ({ ...img, is_primary: img.id === imageId })));
      toast('Primary image updated', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await productImages.delete(id, imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
      toast('Image deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  if (loading) return <PageSkeleton />;
  if (!product) return null;

  const statusMap = { active: 'success', draft: 'warning', archived: 'default' };
  const totalStock = productVariants.reduce((sum, v) => sum + v.inventory_qty, 0);

  const variantColumns = [
    { key: 'sku', label: 'SKU', render: (r) => <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{r.sku}</span> },
    { key: 'title', label: 'Title', render: (r) => <span className="font-medium text-gray-900">{r.title}</span> },
    { key: 'price', label: 'Price', render: (r) => <span className="font-semibold">৳{Number(r.price).toFixed(2)}</span> },
    { key: 'inventory_qty', label: 'Stock', render: (r) => (
      <Badge variant={r.inventory_qty > 10 ? 'success' : r.inventory_qty > 0 ? 'warning' : 'danger'} dot>
        {r.inventory_qty} units
      </Badge>
    )},
    { key: 'actions', label: '', render: (r) => (
      <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirmDeleteVariant(r.id); }}
        className="text-red-500 hover:text-red-700 hover:bg-red-50">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </Button>
    )},
  ];

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`/${product.slug}`}
        breadcrumbs={[{ label: 'Products', href: '/admin/products' }, { label: product.name }]}
      >
        <Button variant="secondary" size="sm" onClick={() => setEditing(true)}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}>
          Edit
        </Button>
        <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}>
          Delete
        </Button>
      </PageHeader>

      {/* Product info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="p-5 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Price</p>
            <p className="text-2xl font-bold text-gray-900">৳{Number(product.base_price).toFixed(2)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Status</p>
            <div className="mt-1">
              <Badge variant={statusMap[product.status]} dot size="md">{product.status}</Badge>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-5 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Variants</p>
            <p className="text-2xl font-bold text-primary-600">{productVariants.length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Total Stock</p>
            <p className={`text-2xl font-bold ${totalStock > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{totalStock}</p>
          </div>
        </Card>
      </div>

      {/* Product details */}
      <Card className="mb-8">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Product Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Category</p>
              <p className="font-medium text-gray-900">{product.category || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Created</p>
              <p className="font-medium text-gray-900">{new Date(product.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            {product.description && (
              <div className="sm:col-span-2">
                <p className="text-gray-500 mb-1">Description</p>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Product Images */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Product Images</h3>
              <p className="text-xs text-gray-400 mt-0.5">{images.length}/10 images uploaded</p>
            </div>
            {images.length < 10 && (
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
          </div>
          {images.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <div className="text-4xl mb-2 opacity-30">🖼️</div>
              <p className="text-sm text-gray-500">No images yet. Upload product photos to display in your storefront.</p>
              <label className="cursor-pointer mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Upload Images
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {images.map((img) => (
                <div key={img.id} className={`relative group rounded-lg overflow-hidden border-2 ${img.is_primary ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'}`}>
                  <img src={img.url} alt={img.alt_text || 'Product'} className="aspect-square object-cover w-full" />
                  {img.is_primary && (
                    <span className="absolute top-1 left-1 bg-primary-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PRIMARY</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    {!img.is_primary && (
                      <button onClick={() => handleSetPrimary(img.id)} className="p-1.5 bg-white rounded-full text-primary-600 hover:bg-primary-50" title="Set as primary">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                      </button>
                    )}
                    <button onClick={() => handleDeleteImage(img.id)} className="p-1.5 bg-white rounded-full text-red-600 hover:bg-red-50" title="Delete image">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Variants section */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Variants</h2>
          <p className="text-sm text-gray-500">{productVariants.length} variant{productVariants.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" onClick={() => setShowVariant(true)}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          Add Variant
        </Button>
      </div>
      <Table columns={variantColumns} data={productVariants} emptyMessage="No variants yet. Add sizes, colors, or other options." emptyIcon="🏷️" />

      {/* Edit Product Modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Product">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleUpdate}>
          <FormField label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></FormField>
          <FormField label="Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Base Price (৳)"><Input type="number" step="0.01" min="0" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} required /></FormField>
            <FormField label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
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
          <FormField label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Create Variant Modal */}
      <Modal open={showVariant} onClose={() => setShowVariant(false)} title="Add Variant">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreateVariant}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="SKU"><Input value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} placeholder="e.g. CB-SM-001" required /></FormField>
            <FormField label="Title"><Input value={variantForm.title} onChange={(e) => setVariantForm({ ...variantForm, title: e.target.value })} placeholder="e.g. Small (8oz)" required /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Price (৳)"><Input type="number" step="0.01" min="0" value={variantForm.price} onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })} required /></FormField>
            <FormField label="Initial Stock"><Input type="number" min="0" value={variantForm.inventory_qty} onChange={(e) => setVariantForm({ ...variantForm, inventory_qty: e.target.value })} /></FormField>
          </div>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowVariant(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Variant</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Product */}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Product?"
        message={`This will permanently delete "${product.name}" and all its variants. This action cannot be undone.`}
        confirmText="Delete Product"
        variant="danger"
      />

      {/* Confirm Delete Variant */}
      <ConfirmDialog
        open={!!confirmDeleteVariant}
        onClose={() => setConfirmDeleteVariant(null)}
        onConfirm={handleDeleteVariant}
        title="Delete Variant?"
        message="This variant will be permanently removed."
        confirmText="Delete Variant"
        variant="danger"
      />
    </div>
  );
}

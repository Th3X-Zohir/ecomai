import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shops, subscriptions } from '../api';
import { useAdmin } from '../contexts/AdminContext';
import { PageHeader, Table, Button, Modal, FormField, Input, Select, Textarea, Badge, Pagination, SearchInput, Card, PageSkeleton, useToast } from '../components/UI';

const STATUS_OPTIONS = ['active', 'suspended', 'closed'];

function StatusBadge({ status }) {
  const map = { active: 'success', suspended: 'warning', closed: 'danger' };
  return <Badge variant={map[status] || 'default'} dot>{status}</Badge>;
}

function PlanBadge({ plan }) {
  const map = { free: 'default', starter: 'info', growth: 'success', enterprise: 'purple' };
  return <Badge variant={map[plan] || 'default'}>{plan || 'free'}</Badge>;
}

const emptyForm = { name: '', slug: '', industry: '', description: '', status: 'active', subscription_plan: 'free' };

export default function AllShops() {
  const navigate = useNavigate();
  const toast = useToast();
  const { selectShop } = useAdmin();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planOptions, setPlanOptions] = useState([]);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = (p = page, q = search, status = statusFilter) => {
    setLoading(true);
    shops.list({ page: p, limit: 20, search: q || undefined, status: status || undefined })
      .then(data => {
        setItems(data.items); setTotalPages(data.totalPages); setTotal(data.total); setPage(data.page);
      })
      .catch(() => toast('Failed to load shops', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
    // Load plan options dynamically
    subscriptions.listPlans({ all: 'true' }).then(data => {
      setPlanOptions((data || []).map(p => p.slug));
    }).catch(() => setPlanOptions(['free', 'starter', 'growth', 'enterprise']));
  }, []);

  const handleSearch = (val) => { setSearch(val); load(1, val, statusFilter); };
  const handleStatusFilter = (val) => { setStatusFilter(val); load(1, search, val); };

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await shops.create(form);
      setShowCreate(false); setForm(emptyForm);
      toast('Shop created successfully!', 'success');
      load(1);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await shops.update(showEdit.id, form);
      setShowEdit(null); setForm(emptyForm);
      toast('Shop updated successfully!', 'success');
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await shops.delete(showDelete.id);
      setShowDelete(null);
      toast('Shop deleted', 'success');
      load();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  const openEdit = (shop) => {
    setForm({
      name: shop.name || '', slug: shop.slug || '', industry: shop.industry || '',
      description: shop.description || '', status: shop.status || 'active',
      subscription_plan: shop.subscription_plan || 'free',
    });
    setError('');
    setShowEdit(shop);
  };

  const switchToShop = (shopId, shopName) => {
    selectShop(shopId);
    toast(`Switched to ${shopName}`, 'info');
    navigate('/admin');
    setTimeout(() => window.location.reload(), 100);
  };

  const fmtCurrency = (val) => {
    const n = Number(val || 0);
    return n >= 1000 ? `৳${(n / 1000).toFixed(1)}k` : `৳${n.toFixed(0)}`;
  };

  const columns = [
    { key: 'name', label: 'Shop', render: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-700 font-bold text-lg shrink-0">
          {(r.name || '?')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{r.name}</p>
          <p className="text-xs text-gray-500 font-mono truncate">{r.slug}</p>
        </div>
      </div>
    )},
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'subscription_plan', label: 'Plan', render: (r) => <PlanBadge plan={r.subscription_plan} /> },
    { key: 'product_count', label: 'Products', render: (r) => (
      <span className="text-sm font-medium text-gray-700">{r.product_count || 0}</span>
    )},
    { key: 'order_count', label: 'Orders', render: (r) => (
      <span className="text-sm font-medium text-gray-700">{r.order_count || 0}</span>
    )},
    { key: 'customer_count', label: 'Customers', render: (r) => (
      <span className="text-sm font-medium text-gray-700">{r.customer_count || 0}</span>
    )},
    { key: 'total_revenue', label: 'Revenue', render: (r) => (
      <span className="text-sm font-bold text-emerald-600">{fmtCurrency(r.total_revenue)}</span>
    )},
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => switchToShop(r.id, r.name)} className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition" title="Switch to this shop">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        </button>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition" title="Edit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button onClick={() => setShowDelete(r)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition" title="Delete">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    )},
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="All Shops" description={`${total} shop${total !== 1 ? 's' : ''} on the platform`}>
        <Button onClick={() => { setForm(emptyForm); setError(''); setShowCreate(true); }}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          New Shop
        </Button>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Shops</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Active</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{items.filter(i => i.status === 'active').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Products</p>
          <p className="text-2xl font-bold text-primary-600 mt-1">{items.reduce((s, i) => s + Number(i.product_count || 0), 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total Revenue</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{fmtCurrency(items.reduce((s, i) => s + Number(i.total_revenue || 0), 0))}</p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="sm:w-80">
          <SearchInput value={search} onChange={handleSearch} placeholder="Search shops..." />
        </div>
        <select value={statusFilter} onChange={(e) => handleStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-500 ml-auto">
          <span>{total} total</span>
          {(search || statusFilter) && <span>· Filtered</span>}
        </div>
      </div>

      <Table columns={columns} data={items} onRowClick={(row) => openEdit(row)} emptyMessage="No shops found" emptyIcon="🏪" loading={loading} />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Shop" size="lg">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="space-y-4">
            <FormField label="Shop Name">
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: autoSlug(e.target.value) })} placeholder="My Awesome Store" required autoFocus />
            </FormField>
            <FormField label="URL Slug">
              <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="my-awesome-store" required />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Status">
                <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </Select>
              </FormField>
              <FormField label="Plan">
                <Select value={form.subscription_plan} onChange={e => setForm({ ...form, subscription_plan: e.target.value })}>
                  {planOptions.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Industry">
              <Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Food & Beverage" />
            </FormField>
            <FormField label="Description">
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief shop description..." />
            </FormField>
          </div>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Shop</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title={`Edit: ${showEdit?.name || ''}`} size="lg">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleEdit}>
          <div className="space-y-4">
            <FormField label="Shop Name">
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </FormField>
            <FormField label="URL Slug">
              <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} required />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Status">
                <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </Select>
              </FormField>
              <FormField label="Plan">
                <Select value={form.subscription_plan} onChange={e => setForm({ ...form, subscription_plan: e.target.value })}>
                  {planOptions.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Industry">
              <Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="e.g. Food & Beverage" />
            </FormField>
            <FormField label="Description">
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </FormField>
          </div>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete Shop" size="sm">
        <div className="text-center py-4">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-700 mb-1">Are you sure you want to delete <strong>{showDelete?.name}</strong>?</p>
          <p className="text-sm text-red-600">This action cannot be undone. All products, orders and data in this shop will be lost.</p>
        </div>
        <div className="flex gap-2 justify-center mt-4">
          <Button variant="secondary" onClick={() => setShowDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={saving}>Delete Shop</Button>
        </div>
      </Modal>
    </div>
  );
}

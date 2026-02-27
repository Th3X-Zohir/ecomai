import { useState, useEffect } from 'react';
import { categories } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Card, Button, Modal, FormField, Input, Textarea, Select, Badge, Table, SearchInput, Pagination, ConfirmDialog, PageSkeleton, useToast } from '../components/UI';

export default function Categories() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const toast = useToast();
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', sort_order: '0' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState('categories'); // categories | requests
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showRequest, setShowRequest] = useState(false);
  const [reqForm, setReqForm] = useState({ name: '', reason: '' });

  const load = async (p = page, q = search) => {
    setLoading(true);
    try {
      const data = await categories.list({ search: q || undefined, page: p, limit: 20 });
      setCats(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      const pc = await categories.pendingCount();
      setPendingCount(pc.count);
    } catch {} finally { setLoading(false); }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    try {
      const data = await categories.requests({});
      setRequests(data.items || []);
    } catch {} finally { setRequestsLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'requests') loadRequests(); }, [tab]);

  const autoSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const openCreate = () => {
    setForm({ name: '', slug: '', description: '', sort_order: '0' });
    setEditingCat(null);
    setError('');
    setShowCreate(true);
  };

  const openEdit = (cat) => {
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', sort_order: String(cat.sort_order || 0) });
    setEditingCat(cat);
    setError('');
    setShowCreate(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      if (editingCat) {
        await categories.update(editingCat.id, { ...form, sort_order: Number(form.sort_order) });
        toast('Category updated!', 'success');
      } else {
        await categories.create({ ...form, sort_order: Number(form.sort_order) });
        toast('Category created!', 'success');
      }
      setShowCreate(false);
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await categories.delete(confirmDelete.id);
      toast('Category deleted', 'success');
      setConfirmDelete(null);
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleApprove = async (req) => {
    try {
      await categories.approveRequest(req.id, { admin_notes: 'Approved' });
      toast(`"${req.name}" approved & category created!`, 'success');
      loadRequests();
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleReject = async (req) => {
    try {
      await categories.rejectRequest(req.id, { admin_notes: 'Not applicable' });
      toast(`"${req.name}" rejected`, 'success');
      loadRequests();
    } catch (err) { toast(err.message, 'error'); }
  };

  const catColumns = [
    { key: 'name', label: 'Category', render: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center text-base font-bold text-primary-600">{r.name.charAt(0).toUpperCase()}</div>
        <div>
          <p className="font-semibold text-gray-900">{r.name}</p>
          <p className="text-xs text-gray-500 font-mono">/{r.slug}</p>
        </div>
      </div>
    )},
    { key: 'description', label: 'Description', render: (r) => (
      <span className="text-sm text-gray-600 line-clamp-1">{r.description || <span className="text-gray-400">—</span>}</span>
    )},
    { key: 'sort_order', label: 'Order', render: (r) => <span className="text-sm text-gray-500">{r.sort_order}</span> },
    { key: 'status', label: 'Status', render: (r) => (
      <Badge variant={r.status === 'active' ? 'success' : 'default'} dot>{r.status}</Badge>
    )},
    { key: 'actions', label: '', render: (r) => isSuperAdmin ? (
      <div className="flex gap-1">
        <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="text-gray-500 hover:text-primary-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </Button>
        <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); setConfirmDelete(r); }} className="text-gray-500 hover:text-red-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </Button>
      </div>
    ) : null },
  ];

  const reqColumns = [
    { key: 'name', label: 'Suggested Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
    { key: 'reason', label: 'Reason', render: (r) => <span className="text-sm text-gray-600">{r.reason || '—'}</span> },
    { key: 'customer_name', label: 'From', render: (r) => (
      <span className="text-sm text-gray-600">{r.customer_name || r.customer_email || 'Anonymous'}</span>
    )},
    { key: 'status', label: 'Status', render: (r) => (
      <Badge variant={r.status === 'pending' ? 'warning' : r.status === 'approved' ? 'success' : 'danger'} dot>{r.status}</Badge>
    )},
    { key: 'created_at', label: 'Date', render: (r) => <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span> },
    { key: 'actions', label: '', render: (r) => r.status === 'pending' && isSuperAdmin ? (
      <div className="flex gap-1">
        <Button size="xs" variant="primary" onClick={(e) => { e.stopPropagation(); handleApprove(r); }}>Approve</Button>
        <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); handleReject(r); }} className="text-red-500 hover:text-red-700">Reject</Button>
      </div>
    ) : null },
  ];

  if (loading && cats.length === 0) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Categories" description={isSuperAdmin ? "Manage product categories for all shops" : "Browse categories — request new ones if needed"}>
        {isSuperAdmin ? (
          <Button onClick={openCreate}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
            New Category
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => { setReqForm({ name: '', reason: '' }); setError(''); setShowRequest(true); }}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}>
            Request Category
          </Button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button onClick={() => setTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'categories' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          🏷️ Categories ({total})
        </button>
        <button onClick={() => setTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === 'requests' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          📬 Customer Requests
          {pendingCount > 0 && <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{pendingCount}</span>}
        </button>
      </div>

      {tab === 'categories' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="sm:w-80">
              <SearchInput value={search} onChange={(v) => { setSearch(v); load(1, v); }} placeholder="Search categories..." />
            </div>
          </div>
          <Table columns={catColumns} data={cats} emptyMessage="No categories yet. Create one to organize your products." emptyIcon="🏷️" loading={loading} />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />
        </>
      )}

      {tab === 'requests' && (
        <Table columns={reqColumns} data={requests} emptyMessage="No category requests from customers yet." emptyIcon="📬" loading={requestsLoading} />
      )}

      {/* Create/Edit Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={editingCat ? 'Edit Category' : 'Create Category'}>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleSave}>
          <FormField label="Category Name" hint="Visible to customers on your storefront">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingCat ? form.slug : autoSlug(e.target.value) })} placeholder="e.g. Hot Beverages" required autoFocus />
          </FormField>
          <FormField label="URL Slug"><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required /></FormField>
          <FormField label="Description (optional)"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this category" /></FormField>
          <FormField label="Sort Order" hint="Lower numbers appear first">
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
          </FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingCat ? 'Save Changes' : 'Create Category'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete}
        title="Delete Category?" message={`This will remove "${confirmDelete?.name}". Products in this category won't be deleted but will become uncategorized.`}
        confirmText="Delete" variant="danger" />

      {/* Request Category Modal (shop admin) */}
      <Modal open={showRequest} onClose={() => setShowRequest(false)} title="Request New Category" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          Your request will be reviewed by the platform admin. Once approved, the category will appear in your list.
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setError(''); setSaving(true);
          try {
            await categories.submitRequest({ name: reqForm.name, reason: reqForm.reason });
            setShowRequest(false);
            toast('Category request submitted!', 'success');
            load();
          } catch (err) { setError(err.message); } finally { setSaving(false); }
        }}>
          <FormField label="Category Name" hint="What category do you need?">
            <Input value={reqForm.name} onChange={(e) => setReqForm({ ...reqForm, name: e.target.value })} placeholder="e.g. Vegan Products" required autoFocus />
          </FormField>
          <FormField label="Reason (optional)" hint="Why do you need this category?">
            <Textarea value={reqForm.reason} onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })} placeholder="Explain why this category would be useful..." />
          </FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowRequest(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

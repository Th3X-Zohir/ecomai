import { useState, useEffect } from 'react';
import { users, shops } from '../api';
import { PageHeader, Table, Button, Modal, FormField, Input, Select, Badge, Pagination, SearchInput, Card, PageSkeleton, useToast } from '../components/UI';

const ROLE_OPTIONS = ['super_admin', 'shop_admin', 'shop_user', 'delivery_agent'];
const ROLE_COLORS = { super_admin: 'danger', shop_admin: 'purple', shop_user: 'info', delivery_agent: 'warning' };

function RoleBadge({ role }) {
  return <Badge variant={ROLE_COLORS[role] || 'default'}>{(role || '').replace('_', ' ')}</Badge>;
}

const emptyForm = { email: '', password: '', full_name: '', phone: '', role: 'shop_user', shop_id: '', is_active: true };

export default function AllUsers() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [shopList, setShopList] = useState([]);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = (p = page, q = search, role = roleFilter) => {
    setLoading(true);
    users.listAll({ page: p, limit: 20, search: q || undefined, role: role || undefined })
      .then(data => {
        setItems(data.items); setTotalPages(data.totalPages); setTotal(data.total); setPage(data.page);
      })
      .catch(() => toast('Failed to load users', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
    shops.list({ limit: 200 }).then(d => setShopList(d.items || [])).catch(() => {});
  }, []);

  const handleSearch = (val) => { setSearch(val); load(1, val, roleFilter); };
  const handleRoleFilter = (val) => { setRoleFilter(val); load(1, search, val); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await users.create({ ...form, shopId: form.shop_id || undefined });
      setShowCreate(false); setForm(emptyForm);
      toast('User created successfully!', 'success');
      load(1);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const patch = { full_name: form.full_name, phone: form.phone, role: form.role, is_active: form.is_active, shop_id: form.shop_id || undefined };
      if (form.password) patch.password = form.password;
      await users.update(showEdit.id, patch);
      setShowEdit(null); setForm(emptyForm);
      toast('User updated successfully!', 'success');
      load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await users.delete(showDelete.id);
      setShowDelete(null);
      toast('User deleted', 'success');
      load();
    } catch (err) { toast(err.message, 'error'); } finally { setSaving(false); }
  };

  const openEdit = (user) => {
    setForm({
      email: user.email || '', password: '', full_name: user.full_name || '', phone: user.phone || '',
      role: user.role || 'shop_user', shop_id: user.shop_id || '', is_active: user.is_active !== false,
    });
    setError('');
    setShowEdit(user);
  };

  const columns = [
    { key: 'email', label: 'User', render: (r) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
          {(r.email || '?')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{r.full_name || r.email?.split('@')[0]}</p>
          <p className="text-xs text-gray-500 truncate">{r.email}</p>
        </div>
      </div>
    )},
    { key: 'role', label: 'Role', render: (r) => <RoleBadge role={r.role} /> },
    { key: 'shop_name', label: 'Shop', render: (r) => (
      <span className="text-sm text-gray-600">{r.shop_name || <span className="text-gray-400 italic">Platform</span>}</span>
    )},
    { key: 'is_active', label: 'Status', render: (r) => (
      <Badge variant={r.is_active !== false ? 'success' : 'danger'} dot>{r.is_active !== false ? 'Active' : 'Disabled'}</Badge>
    )},
    { key: 'created_at', label: 'Joined', render: (r) => (
      <span className="text-xs text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</span>
    )},
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition" title="Edit">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        {r.role !== 'super_admin' && (
          <button onClick={() => setShowDelete(r)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition" title="Delete">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        )}
      </div>
    )},
  ];

  if (loading && items.length === 0) return <PageSkeleton />;

  // Count roles
  const roleCounts = items.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});

  return (
    <div>
      <PageHeader title="All Users" description={`${total} user${total !== 1 ? 's' : ''} across the platform`}>
        <Button onClick={() => { setForm(emptyForm); setError(''); setShowCreate(true); }}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
          New User
        </Button>
      </PageHeader>

      {/* Role summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
        </Card>
        {ROLE_OPTIONS.map(role => (
          <Card key={role} className="p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">{role.replace('_', ' ')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{roleCounts[role] || 0}</p>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="sm:w-80">
          <SearchInput value={search} onChange={handleSearch} placeholder="Search users..." />
        </div>
        <select value={roleFilter} onChange={(e) => handleRoleFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm text-gray-500 ml-auto">
          <span>{total} total</span>
          {(search || roleFilter) && <span>· Filtered</span>}
        </div>
      </div>

      <Table columns={columns} data={items} onRowClick={(row) => openEdit(row)} emptyMessage="No users found" emptyIcon="👤" loading={loading} />
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => load(p)} />

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New User" size="lg">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="space-y-4">
            <FormField label="Email">
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" required autoFocus />
            </FormField>
            <FormField label="Password">
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" required />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name">
                <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="John Doe" />
              </FormField>
              <FormField label="Phone">
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+880..." />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Role">
                <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </Select>
              </FormField>
              <FormField label="Assign to Shop">
                <Select value={form.shop_id} onChange={e => setForm({ ...form, shop_id: e.target.value })}>
                  <option value="">— No shop (platform) —</option>
                  {shopList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create User</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title={`Edit: ${showEdit?.email || ''}`} size="lg">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleEdit}>
          <div className="space-y-4">
            <FormField label="Email">
              <Input type="email" value={form.email} disabled className="bg-gray-50 cursor-not-allowed" />
            </FormField>
            <FormField label="New Password" hint="Leave blank to keep current password">
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name">
                <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
              </FormField>
              <FormField label="Phone">
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Role">
                <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </Select>
              </FormField>
              <FormField label="Assign to Shop">
                <Select value={form.shop_id} onChange={e => setForm({ ...form, shop_id: e.target.value })}>
                  <option value="">— No shop (platform) —</option>
                  {shopList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </FormField>
            </div>
            <FormField label="Account Status">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500" />
                <span className="text-sm text-gray-700">{form.is_active ? 'Active' : 'Disabled'}</span>
              </label>
            </FormField>
          </div>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!showDelete} onClose={() => setShowDelete(null)} title="Delete User" size="sm">
        <div className="text-center py-4">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-700 mb-1">Delete user <strong>{showDelete?.email}</strong>?</p>
          <p className="text-sm text-red-600">This cannot be undone.</p>
        </div>
        <div className="flex gap-2 justify-center mt-4">
          <Button variant="secondary" onClick={() => setShowDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={saving}>Delete User</Button>
        </div>
      </Modal>
    </div>
  );
}

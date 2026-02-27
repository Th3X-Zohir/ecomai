import { useState, useEffect } from 'react';
import { shops } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader, Card, Badge, Button, Modal, FormField, Input, Select, StatCard, PageSkeleton, useToast } from '../components/UI';

const planColors = { starter: 'default', growth: 'info', pro: 'purple', enterprise: 'success' };
const planIcons = {
  starter: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  growth: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  pro: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  enterprise: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
};

export default function ShopSettings() {
  const { user } = useAuth();
  const [shop, setShop] = useState(null);
  const [allShops, setAllShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', slug: '', industry: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (user.role === 'super_admin') {
          const data = await shops.list();
          setAllShops(data.items);
        } else {
          const data = await shops.me();
          setShop(data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  const handleEdit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const updated = await shops.updateMe(editForm);
      setShop({ ...shop, ...updated });
      setShowEdit(false);
      toast('Shop settings updated!', 'success');
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const openEdit = () => {
    setEditForm({ name: shop.name || '', slug: shop.slug || '', industry: shop.industry || '' });
    setShowEdit(true);
  };

  if (loading) return <PageSkeleton />;

  // Super admin view
  if (user.role === 'super_admin') {
    return (
      <div>
        <PageHeader title="All Shops" description="Platform-wide shop management">
          <Badge variant="purple" dot>Super Admin</Badge>
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Shops" value={allShops.length} icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          } />
          <StatCard label="Active" value={allShops.filter(s => (s.status || 'active') === 'active').length} trend="up" trendLabel="Operational" icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          } />
          <StatCard label="Plans" value={[...new Set(allShops.map(s => s.subscription_plan || 'starter'))].length + ' types'} icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          } />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allShops.map((s) => {
            const plan = s.subscription_plan || 'starter';
            return (
              <Card key={s.id} hover>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{s.slug || s.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <Badge variant={(s.status || 'active') === 'active' ? 'success' : 'warning'} dot>{s.status || 'active'}</Badge>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Industry</span>
                      <span className="font-medium text-gray-700">{s.industry || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Plan</span>
                      <Badge variant={planColors[plan] || 'default'}>{plan}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Created</span>
                      <span className="text-gray-600">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Shop admin view
  if (!shop) return <p className="text-gray-500 p-8 text-center">Shop not found</p>;

  const plan = shop.subscription_plan || 'starter';

  return (
    <div>
      <PageHeader title="Shop Settings" description="Manage your shop configuration">
        <Button onClick={openEdit}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}>
          Edit Settings
        </Button>
      </PageHeader>

      {/* Shop identity card */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {(shop.name || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{shop.name}</h2>
                <Badge variant={(shop.status || 'active') === 'active' ? 'success' : 'warning'} dot>{shop.status || 'active'}</Badge>
              </div>
              <p className="text-sm text-gray-500 font-mono mb-3">{shop.slug || shop.id}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  {planIcons[plan] || planIcons.starter}
                  <span className="text-sm font-medium capitalize">{plan} Plan</span>
                </div>
                {shop.industry && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {shop.industry}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              General Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Shop ID</span>
                <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{shop.id.slice(0, 12)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Name</span>
                <span className="text-sm font-medium">{shop.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Slug</span>
                <span className="text-sm font-mono">{shop.slug || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Industry</span>
                <span className="text-sm">{shop.industry || '—'}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              Subscription & Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <Badge variant={(shop.status || 'active') === 'active' ? 'success' : 'warning'} dot>{shop.status || 'active'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Plan</span>
                <Badge variant={planColors[plan] || 'default'}>{plan}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm">{shop.created_at ? new Date(shop.created_at).toLocaleDateString() : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Last Updated</span>
                <span className="text-sm">{shop.updated_at ? new Date(shop.updated_at).toLocaleDateString() : '—'}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Shop Settings" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleEdit}>
          <FormField label="Shop Name">
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required autoFocus />
          </FormField>
          <FormField label="Slug" hint="Used in your store URL">
            <Input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} placeholder="my-store" />
          </FormField>
          <FormField label="Industry">
            <Input value={editForm.industry} onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })} placeholder="e.g. Fashion, Food & Beverage" />
          </FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

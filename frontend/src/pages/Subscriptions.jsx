import { useState, useEffect, useMemo } from 'react';
import { subscriptions } from '../api';
import { PageHeader, Table, Badge, Button, Modal, FormField, Input, Select, Pagination, StatCard, Card, SearchInput, PageSkeleton, ConfirmDialog, useToast, Textarea } from '../components/UI';

const planVariant = (slug) => {
  const map = { free: 'default', starter: 'info', growth: 'success', enterprise: 'purple' };
  return map[slug] || 'warning';
};

const statusVariant = (s) => {
  const map = { active: 'success', pending: 'warning', completed: 'success', failed: 'danger', cancelled: 'danger', suspended: 'danger', closed: 'default', pending_payment: 'warning' };
  return map[s] || 'default';
};

// ── Tiny bar chart component ────────────────────────────
function MiniBarChart({ data, labelKey, valueKey, colorFn }) {
  const max = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = Math.max((val / max) * 100, 4);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold text-gray-700">{val}</span>
            <div className={`w-full rounded-t ${colorFn ? colorFn(d) : 'bg-primary-500'}`} style={{ height: `${pct}%` }} />
            <span className="text-[9px] text-gray-500 truncate w-full text-center">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Subscriptions() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [shops, setShops] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Modals
  const [planModal, setPlanModal] = useState(null); // null | 'new' | plan object
  const [shopModal, setShopModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  // Plan form
  const [planForm, setPlanForm] = useState({ name: '', slug: '', price_monthly: 0, price_yearly: 0, product_limit: 10, order_limit: 50, features: '', is_active: true });

  // Shop plan change
  const [shopPlan, setShopPlan] = useState('');

  const loadStats = () => {
    subscriptions.stats().then(setStats).catch(() => {});
  };

  const loadPlans = () => {
    setLoading(true);
    subscriptions.listPlans({ all: 'true' })
      .then((data) => setPlans(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadShops = (p = page, q = search) => {
    setLoading(true);
    subscriptions.listShops({ page: p, limit: 20, search: q || undefined })
      .then((data) => { setShops(data.items || []); setTotalPages(data.totalPages || 1); setTotal(data.total || 0); setPage(data.page || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadPayments = (p = page, q = search) => {
    setLoading(true);
    subscriptions.listPayments({ page: p, limit: 20, search: q || undefined })
      .then((data) => { setPayments(data.items || []); setTotalPages(data.totalPages || 1); setTotal(data.total || 0); setPage(data.page || 1); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
    loadPlans();
  }, []);

  useEffect(() => {
    if (tab === 'plans') loadPlans();
    else if (tab === 'shops') { setPage(1); setSearch(''); loadShops(1, ''); }
    else if (tab === 'payments') { setPage(1); setSearch(''); loadPayments(1, ''); }
    else { loadStats(); loadPlans(); }
  }, [tab]);

  // ── Plan CRUD handlers ─────────────────────────────────
  const openPlanModal = (plan) => {
    if (plan === 'new') {
      setPlanForm({ name: '', slug: '', price_monthly: 0, price_yearly: 0, product_limit: 10, order_limit: 50, features: '', is_active: true });
    } else {
      setPlanForm({
        name: plan.name, slug: plan.slug,
        price_monthly: plan.price_monthly, price_yearly: plan.price_yearly,
        product_limit: plan.product_limit, order_limit: plan.order_limit,
        features: (plan.features || []).join('\n'), is_active: plan.is_active,
      });
    }
    setPlanModal(plan);
    setError('');
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const data = {
        ...planForm,
        price_monthly: Number(planForm.price_monthly) || 0,
        price_yearly: Number(planForm.price_yearly) || 0,
        product_limit: Number(planForm.product_limit) || 10,
        order_limit: Number(planForm.order_limit) || 50,
        features: planForm.features ? planForm.features.split('\n').map(f => f.trim()).filter(Boolean) : [],
      };
      if (planModal === 'new') {
        await subscriptions.createPlan(data);
        toast('Plan created!', 'success');
      } else {
        await subscriptions.updatePlan(planModal.id, data);
        toast('Plan updated!', 'success');
      }
      setPlanModal(null);
      loadPlans();
      loadStats();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDeletePlan = async () => {
    if (!confirmDelete) return;
    try {
      await subscriptions.deletePlan(confirmDelete.id);
      toast('Plan deleted', 'success');
      setConfirmDelete(null);
      loadPlans();
      loadStats();
    } catch (err) { toast(err.message, 'error'); setConfirmDelete(null); }
  };

  // ── Shop plan change handler ───────────────────────────
  const handleShopPlanChange = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await subscriptions.updateShop(shopModal.id, shopPlan);
      toast(`${shopModal.name} updated to ${shopPlan}`, 'success');
      setShopModal(null);
      loadShops();
      loadStats();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  // ── Payment delete handler ─────────────────────────────
  const handleDeletePayment = async () => {
    if (!confirmDelete) return;
    try {
      await subscriptions.deletePayment(confirmDelete.id);
      toast('Payment record deleted', 'success');
      setConfirmDelete(null);
      loadPayments();
      loadStats();
    } catch (err) { toast(err.message, 'error'); setConfirmDelete(null); }
  };

  // ── Stats computed ─────────────────────────────────────
  const totalShops = useMemo(() => {
    if (!stats?.planDistribution) return 0;
    return stats.planDistribution.reduce((acc, d) => acc + d.count, 0);
  }, [stats]);

  const paidShops = useMemo(() => {
    if (!stats?.planDistribution) return 0;
    return stats.planDistribution.filter(d => d.plan !== 'free').reduce((acc, d) => acc + d.count, 0);
  }, [stats]);

  // ── Tab buttons ────────────────────────────────────────
  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'plans', label: 'Plans' },
    { key: 'shops', label: 'Shop Subscriptions' },
    { key: 'payments', label: 'Payments' },
  ];

  // ── Plans columns ──────────────────────────────────────
  const planColumns = [
    { key: 'name', label: 'Plan', render: (r) => (
      <div>
        <p className="text-sm font-semibold text-gray-900">{r.name}</p>
        <p className="text-xs text-gray-500 font-mono">{r.slug}</p>
      </div>
    )},
    { key: 'price', label: 'Pricing', render: (r) => (
      <div className="text-sm">
        <p className="font-medium text-gray-900">${Number(r.price_monthly).toFixed(2)}<span className="text-gray-400 text-xs">/mo</span></p>
        <p className="text-xs text-gray-500">${Number(r.price_yearly).toFixed(2)}<span className="text-gray-400">/yr</span></p>
      </div>
    )},
    { key: 'limits', label: 'Limits', render: (r) => (
      <div className="text-xs text-gray-600">
        <p>{r.product_limit} products</p>
        <p>{r.order_limit} orders/mo</p>
      </div>
    )},
    { key: 'features', label: 'Features', render: (r) => (
      <div className="text-xs text-gray-600 max-w-[200px]">
        {(r.features || []).slice(0, 3).map((f, i) => (
          <span key={i} className="inline-block bg-gray-100 rounded px-1.5 py-0.5 mr-1 mb-0.5">{f}</span>
        ))}
        {(r.features || []).length > 3 && <span className="text-gray-400">+{r.features.length - 3} more</span>}
      </div>
    )},
    { key: 'status', label: 'Status', render: (r) => (
      <Badge variant={r.is_active ? 'success' : 'danger'} dot>{r.is_active ? 'Active' : 'Inactive'}</Badge>
    )},
    { key: 'shops', label: 'Shops', render: (r) => {
      const count = stats?.planDistribution?.find(d => d.plan === r.slug)?.count || 0;
      return <span className="text-sm font-semibold text-gray-700">{count}</span>;
    }},
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center gap-1">
        <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); openPlanModal(r); }}>Edit</Button>
        <Button size="xs" variant="danger" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ ...r, type: 'plan' }); }}>Delete</Button>
      </div>
    )},
  ];

  // ── Shop columns ───────────────────────────────────────
  const shopColumns = [
    { key: 'name', label: 'Shop', render: (r) => (
      <div>
        <p className="text-sm font-semibold text-gray-900">{r.name}</p>
        <p className="text-xs text-gray-500">{r.owner_email || '—'}</p>
      </div>
    )},
    { key: 'plan', label: 'Plan', render: (r) => (
      <Badge variant={planVariant(r.subscription_plan)}>{r.subscription_plan}</Badge>
    )},
    { key: 'status', label: 'Status', render: (r) => (
      <Badge variant={statusVariant(r.status)} dot>{r.status.replace(/_/g, ' ')}</Badge>
    )},
    { key: 'products', label: 'Products', render: (r) => <span className="text-sm text-gray-700">{r.product_count}</span> },
    { key: 'orders', label: 'Orders', render: (r) => <span className="text-sm text-gray-700">{r.order_count}</span> },
    { key: 'created', label: 'Joined', render: (r) => (
      <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
    )},
    { key: 'actions', label: '', render: (r) => (
      <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); setShopModal(r); setShopPlan(r.subscription_plan); setError(''); }}>
        Change Plan
      </Button>
    )},
  ];

  // ── Payment columns ────────────────────────────────────
  const paymentColumns = [
    { key: 'shop', label: 'Shop', render: (r) => (
      <div>
        <p className="text-sm font-medium text-gray-900">{r.shop_name || '—'}</p>
        <p className="text-xs text-gray-500">{r.user_email || '—'}</p>
      </div>
    )},
    { key: 'plan', label: 'Plan', render: (r) => <Badge variant={planVariant(r.plan_slug)}>{r.plan_slug}</Badge> },
    { key: 'amount', label: 'Amount', render: (r) => (
      <span className="text-sm font-semibold text-gray-900">{r.currency} {Number(r.amount).toFixed(2)}</span>
    )},
    { key: 'cycle', label: 'Cycle', render: (r) => (
      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded capitalize">{r.billing_cycle}</span>
    )},
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant(r.status)} dot>{r.status}</Badge> },
    { key: 'gateway', label: 'Transaction', render: (r) => (
      <span className="text-xs font-mono text-gray-500">{r.gateway_tran_id || '—'}</span>
    )},
    { key: 'date', label: 'Date', render: (r) => (
      <span className="text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
    )},
    { key: 'actions', label: '', render: (r) => (
      ['pending', 'failed'].includes(r.status) ? (
        <Button size="xs" variant="danger" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ ...r, type: 'payment' }); }}>Delete</Button>
      ) : null
    )},
  ];

  if (loading && !stats) return <PageSkeleton />;

  return (
    <div>
      <PageHeader title="Subscription Management" description="Manage plans, shop subscriptions, and billing" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ──────────────────────────────── */}
      {tab === 'overview' && stats && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Shops" value={totalShops} icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            } />
            <StatCard label="Paid Subscribers" value={paidShops} color="success" icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            } />
            <StatCard label="Total Revenue" value={`$${Number(stats.totalRevenue?.total || 0).toFixed(0)}`} color="info" icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            } />
            <StatCard label="Payments" value={stats.totalRevenue?.count || 0} icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            } />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Plan distribution */}
            <Card>
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Plan Distribution</h3>
                {stats.planDistribution && stats.planDistribution.length > 0 ? (
                  <>
                    <MiniBarChart
                      data={stats.planDistribution}
                      labelKey="plan"
                      valueKey="count"
                      colorFn={(d) => {
                        const c = { free: 'bg-gray-400', starter: 'bg-blue-500', growth: 'bg-emerald-500', enterprise: 'bg-purple-500' };
                        return c[d.plan] || 'bg-primary-500';
                      }}
                    />
                    <div className="mt-4 flex flex-wrap gap-2">
                      {stats.planDistribution.map((d) => (
                        <div key={d.plan} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                          <Badge variant={planVariant(d.plan)}>{d.plan}</Badge>
                          <span className="text-sm font-semibold text-gray-700">{d.count}</span>
                          <span className="text-xs text-gray-400">({totalShops > 0 ? Math.round((d.count / totalShops) * 100) : 0}%)</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">No shop data available</p>
                )}
              </div>
            </Card>

            {/* Monthly Revenue Trend */}
            <Card>
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
                {stats.monthlyTrend && stats.monthlyTrend.length > 0 ? (
                  <MiniBarChart
                    data={stats.monthlyTrend}
                    labelKey="month"
                    valueKey="revenue"
                    colorFn={() => 'bg-primary-500'}
                  />
                ) : (
                  <div className="flex items-center justify-center h-24 text-sm text-gray-400">No revenue data yet</div>
                )}
              </div>
            </Card>
          </div>

          {/* Shop Status Breakdown */}
          {stats.shopStatuses && stats.shopStatuses.length > 0 && (
            <Card className="mb-6">
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Shop Status Breakdown</h3>
                <div className="flex gap-4 flex-wrap">
                  {stats.shopStatuses.map((s) => (
                    <div key={s.status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                      <Badge variant={statusVariant(s.status)} dot>{s.status.replace(/_/g, ' ')}</Badge>
                      <span className="text-lg font-bold text-gray-800">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Recent Payments */}
          {stats.recentPayments && stats.recentPayments.length > 0 && (
            <Card>
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Subscription Payments</h3>
                <div className="space-y-2">
                  {stats.recentPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.shop_name || 'Unknown Shop'}</p>
                          <p className="text-xs text-gray-500"><Badge variant={planVariant(p.plan_slug)} className="mr-1">{p.plan_slug}</Badge> {p.billing_cycle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{p.currency} {Number(p.amount).toFixed(2)}</p>
                        <Badge variant={statusVariant(p.status)} dot>{p.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Plans Quick Overview if no payments yet */}
          {(!stats.recentPayments || stats.recentPayments.length === 0) && plans.length > 0 && (
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Available Plans</h3>
                  <Button size="xs" variant="primary" onClick={() => setTab('plans')}>Manage Plans</Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {plans.filter(p => p.is_active).map((p) => (
                    <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:border-primary-300 transition">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={planVariant(p.slug)}>{p.name}</Badge>
                        {Number(p.price_monthly) === 0 && <span className="text-xs text-emerald-600 font-semibold">FREE</span>}
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-1">
                        ${Number(p.price_monthly).toFixed(0)}<span className="text-sm text-gray-400 font-normal">/mo</span>
                      </p>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p>{p.product_limit} products • {p.order_limit} orders/mo</p>
                        {(p.features || []).slice(0, 2).map((f, i) => (
                          <p key={i} className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            {f}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Plans Tab ─────────────────────────────────── */}
      {tab === 'plans' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{plans.length} plan{plans.length !== 1 ? 's' : ''}</p>
            <Button size="sm" onClick={() => openPlanModal('new')}
              icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
              Add Plan
            </Button>
          </div>
          <Table columns={planColumns} data={plans} loading={loading} emptyMessage="No subscription plans found." emptyIcon="📋" />
        </>
      )}

      {/* ── Shops Tab ─────────────────────────────────── */}
      {tab === 'shops' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="sm:w-80">
              <SearchInput value={search} onChange={(v) => { setSearch(v); loadShops(1, v); }} placeholder="Search shops..." />
            </div>
          </div>
          <Table columns={shopColumns} data={shops} loading={loading} emptyMessage="No shops found." emptyIcon="🏪" />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => loadShops(p)} />
        </>
      )}

      {/* ── Payments Tab ──────────────────────────────── */}
      {tab === 'payments' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="sm:w-80">
              <SearchInput value={search} onChange={(v) => { setSearch(v); loadPayments(1, v); }} placeholder="Search payments..." />
            </div>
          </div>
          <Table columns={paymentColumns} data={payments} loading={loading} emptyMessage="No subscription payments yet." emptyIcon="💳" />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => loadPayments(p)} />
        </>
      )}

      {/* ── Plan Create/Edit Modal ────────────────────── */}
      <Modal open={!!planModal} onClose={() => setPlanModal(null)} title={planModal === 'new' ? 'Create Plan' : 'Edit Plan'} size="md">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleSavePlan}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Plan Name" required>
              <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Growth" />
            </FormField>
            <FormField label="Slug" required>
              <Input value={planForm.slug} onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })} placeholder="e.g. growth" />
            </FormField>
            <FormField label="Price (Monthly)">
              <Input type="number" step="0.01" min="0" value={planForm.price_monthly} onChange={(e) => setPlanForm({ ...planForm, price_monthly: e.target.value })} />
            </FormField>
            <FormField label="Price (Yearly)">
              <Input type="number" step="0.01" min="0" value={planForm.price_yearly} onChange={(e) => setPlanForm({ ...planForm, price_yearly: e.target.value })} />
            </FormField>
            <FormField label="Product Limit">
              <Input type="number" min="0" value={planForm.product_limit} onChange={(e) => setPlanForm({ ...planForm, product_limit: e.target.value })} />
            </FormField>
            <FormField label="Order Limit (monthly)">
              <Input type="number" min="0" value={planForm.order_limit} onChange={(e) => setPlanForm({ ...planForm, order_limit: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Features (one per line)" className="mt-4">
            <Textarea rows={4} value={planForm.features} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })} placeholder="Email marketing&#10;Priority support&#10;Custom domain" />
          </FormField>
          <FormField label="Active" className="mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={planForm.is_active} onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
              <span className="text-sm text-gray-700">Plan is active and visible</span>
            </label>
          </FormField>
          <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => setPlanModal(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>{planModal === 'new' ? 'Create Plan' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Shop Plan Change Modal ────────────────────── */}
      <Modal open={!!shopModal} onClose={() => setShopModal(null)} title="Change Subscription Plan" size="sm">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        {shopModal && (
          <form onSubmit={handleShopPlanChange}>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900">{shopModal.name}</p>
              <p className="text-xs text-gray-500">Current: <Badge variant={planVariant(shopModal.subscription_plan)}>{shopModal.subscription_plan}</Badge></p>
            </div>
            <FormField label="New Plan" required>
              <Select value={shopPlan} onChange={(e) => setShopPlan(e.target.value)}>
                {plans.map((p) => (
                  <option key={p.id} value={p.slug}>{p.name} — ${Number(p.price_monthly).toFixed(2)}/mo</option>
                ))}
                <option value="free">Free</option>
              </Select>
            </FormField>
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => setShopModal(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>Update Plan</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete Confirm ────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmDelete?.type === 'plan' ? handleDeletePlan : handleDeletePayment}
        title={confirmDelete?.type === 'plan' ? 'Delete Plan' : 'Delete Payment'}
        message={confirmDelete?.type === 'plan'
          ? `Are you sure you want to delete the "${confirmDelete?.name}" plan? This cannot be undone.`
          : `Are you sure you want to delete this payment record? This cannot be undone.`}
        confirmLabel="Yes, Delete"
        variant="danger"
      />
    </div>
  );
}

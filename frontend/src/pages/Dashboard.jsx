import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { products, orders, customers, campaigns, shops, dashboard, operations, cod, platformSettlements, refunds } from '../api';
import { StatCard, Card, Badge, Button, PageSkeleton } from '../components/UI';

/* helpers */
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
};
const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n) => Number(n || 0).toLocaleString();
const statusColor = (s) =>
  ({ active: 'success', inactive: 'danger', suspended: 'warning' })[s] || 'default';
const orderStatusColor = (s) =>
  ({ pending: 'warning', confirmed: 'info', processing: 'info', shipped: 'purple', delivered: 'success', cancelled: 'danger' })[s] || 'default';

/* ======================================================
   PLATFORM DASHBOARD  -  super admin sees all shops
   ====================================================== */
function PlatformDashboard({ user, shopList, selectShop }) {
  const navigate = useNavigate();
  const [allShops, setAllShops] = useState([]);
  const [platformStats, setPlatformStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [opsData, setOpsData] = useState({ exceptions: [], exceptionCounts: {}, codSummary: null, platformBalances: null, refundStats: null });
  const [opsLoading, setOpsLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      shops.list({ limit: 200 }),
      dashboard.platform(),
    ]).then(([shopsRes, platformRes]) => {
      if (shopsRes.status === 'fulfilled') setAllShops(shopsRes.value.items || []);
      if (platformRes.status === 'fulfilled') setPlatformStats(platformRes.value);
      setLoading(false);
    });
  }, []);

  // Load operational data for the attention panel
  useEffect(() => {
    Promise.allSettled([
      operations.platformExceptions({ limit: 5 }),
      cod.getSummary(),
      platformSettlements.getBalances(),
      refunds.stats(),
    ]).then(([exceptionsRes, codRes, balancesRes, refundRes]) => {
      const exceptionItems = exceptionsRes.status === 'fulfilled' ? (exceptionsRes.value.items || []) : [];
      const exceptionCountMap = {};
      (exceptionsRes.status === 'fulfilled' ? (exceptionsRes.value.items || []) : []).forEach(e => {
        exceptionCountMap[e.type] = (exceptionCountMap[e.type] || 0) + 1;
      });
      setOpsData({
        exceptions: exceptionItems.slice(0, 5),
        exceptionCounts: exceptionCountMap,
        codSummary: codRes.status === 'fulfilled' ? codRes.value : null,
        platformBalances: balancesRes.status === 'fulfilled' ? balancesRes.value : null,
        refundStats: refundRes.status === 'fulfilled' ? refundRes.value : null,
      });
      setOpsLoading(false);
    });
  }, []);

  const totals = useMemo(() => {
    if (platformStats) {
      const shopsByStatus = platformStats.shops || {};
      const totalShops = Object.values(shopsByStatus).reduce((a, c) => a + c, 0);
      const usersByRole = platformStats.users || {};
      const totalUsers = Object.values(usersByRole).reduce((a, c) => a + c, 0);
      return {
        shops: filter === 'all' ? totalShops : 1,
        products: allShops.reduce((a, s) => a + Number(s.product_count || 0), 0),
        orders: platformStats.orders?.total || 0,
        customers: allShops.reduce((a, s) => a + Number(s.customer_count || 0), 0),
        users: totalUsers,
        revenue: platformStats.revenue?.total || 0,
        pendingOrders: platformStats.orders?.pending || 0,
      };
    }
    const src = filter === 'all' ? allShops : allShops.filter((s) => s.id === filter);
    return {
      shops: src.length,
      products: src.reduce((a, s) => a + Number(s.product_count || 0), 0),
      orders: src.reduce((a, s) => a + Number(s.order_count || 0), 0),
      customers: src.reduce((a, s) => a + Number(s.customer_count || 0), 0),
      users: src.reduce((a, s) => a + Number(s.user_count || 0), 0),
      revenue: src.reduce((a, s) => a + Number(s.total_revenue || 0), 0),
    };
  }, [allShops, filter, platformStats]);

  const visibleShops = useMemo(() => {
    let list = filter === 'all' ? allShops : allShops.filter((s) => s.id === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q));
    }
    return list;
  }, [allShops, filter, search]);

  const topShop = useMemo(() => {
    if (allShops.length === 0) return null;
    return [...allShops].sort((a, b) => Number(b.total_revenue || 0) - Number(a.total_revenue || 0))[0];
  }, [allShops]);

  const maxRevenue = useMemo(
    () => Math.max(...allShops.map((s) => Number(s.total_revenue || 0)), 1),
    [allShops]
  );

  // Count items needing attention
  const urgentCount = useMemo(() => {
    let n = 0;
    n += opsData.exceptionCounts['delivery_failed'] || 0;
    n += opsData.exceptionCounts['cod_recon'] || 0;
    n += opsData.refundStats?.pending || 0;
    n += opsData.codSummary?.uncollected_count || 0;
    return n;
  }, [opsData]);

  if (loading) return <PageSkeleton />;

  const icon = (path, extra = '') => (
    <svg className={`w-5 h-5 ${extra}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={path} />
    </svg>
  );

  // Quick links for the ops panel
  const quickLinks = [
    {
      label: 'Exception Queue',
      icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>),
      to: '/admin/exception-queue',
      count: Object.values(opsData.exceptionCounts).reduce((a, c) => a + c, 0),
      countColor: 'text-red-600 bg-red-50',
      desc: 'Delivery failures, COD gaps',
      color: 'from-red-50 to-orange-50 border-red-200',
    },
    {
      label: 'COD Reconciliation',
      icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
      to: '/admin/cod',
      count: opsData.codSummary?.uncollected_value || 0,
      countPrefix: '৳',
      countColor: 'text-amber-600 bg-amber-50',
      desc: `${opsData.codSummary?.uncollected_count || 0} uncollected`,
      color: 'from-amber-50 to-yellow-50 border-amber-200',
    },
    {
      label: 'Platform Earnings',
      icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
      to: '/admin/platform-earnings',
      count: opsData.platformBalances?.held || 0,
      countPrefix: '৳',
      countColor: 'text-blue-600 bg-blue-50',
      desc: `${opsData.platformBalances?.releasable || 0} releasable`,
      color: 'from-blue-50 to-indigo-50 border-blue-200',
    },
    {
      label: 'Refund Requests',
      icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>),
      to: '/admin/refunds',
      count: opsData.refundStats?.pending || 0,
      countColor: 'text-purple-600 bg-purple-50',
      desc: `${opsData.refundStats?.approved || 0} approved, ${opsData.refundStats?.completed || 0} completed`,
      color: 'from-purple-50 to-pink-50 border-purple-200',
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Control Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Good {greeting()}{user?.email ? `, ${user.email.split('@')[0]}` : ''} &mdash;
            {filter === 'all' ? ' All shops' : visibleShops[0]?.name} overview
            {urgentCount > 0 && <span className="ml-2 text-red-600 font-medium">· {urgentCount} item{urgentCount !== 1 ? 's' : ''} need attention</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            <option value="all">All Shops ({allShops.length})</option>
            {allShops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search shops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-44"
          />
        </div>
      </div>

      {/* Section 1: Operations Oversight — the "Needs Attention" panel */}
      <div className={`mb-6 rounded-2xl border bg-gradient-to-r from-red-50/80 to-amber-50/80 border-red-200/60 p-5 ${!opsLoading && urgentCount === 0 ? 'hidden' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-red-800">Needs Attention</h2>
          {urgentCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{urgentCount}</span>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map((link) => {
            const count = link.count;
            const hasItems = link.count > 0 || link.count === 0;
            return (
              <button
                key={link.to}
                onClick={() => navigate(link.to)}
                className={`text-left p-4 rounded-xl bg-white/80 backdrop-blur border ${link.color} hover:shadow-md hover:-translate-y-0.5 transition-all group`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${link.countColor.replace('text-', 'bg-').replace('600', '100').replace('500', '100')}`}>
                    <span className={link.countColor}>{link.icon}</span>
                  </div>
                  {count > 0 && (
                    <span className={`text-sm font-bold ${link.countColor}`}>
                      {link.countPrefix || ''}{typeof count === 'number' ? count.toLocaleString() : count}
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-gray-900 group-hover:text-primary-700 transition">{link.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Platform Health — top-line metrics */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Platform Health</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Shops */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition group">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtInt(totals.shops)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active Shops</p>
          </div>
          {/* Products */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition group">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtInt(totals.products)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Products Listed</p>
          </div>
          {/* Orders */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition group">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtInt(totals.orders)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Orders</p>
          </div>
          {/* Revenue */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition group">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">৳{fmt(totals.revenue)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total Revenue</p>
          </div>
          {/* Customers */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition group">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtInt(totals.customers)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Customers</p>
          </div>
          {/* Pending Orders */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition group">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtInt(totals.pendingOrders)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pending Orders</p>
          </div>
        </div>
      </div>

      {/* Section 3: Revenue by Shop + Platform Summary side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Revenue by Shop</h2>
              <p className="text-xs text-gray-500 mt-0.5">Non-cancelled order totals — top performers first</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/all-shops')}>All shops &rarr;</Button>
          </div>
          <div className="divide-y divide-gray-100">
            {allShops.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No shops found.</div>
            ) : (
              [...allShops]
                .sort((a, b) => Number(b.total_revenue || 0) - Number(a.total_revenue || 0))
                .slice(0, 8)
                .map((s) => {
                  const rev = Number(s.total_revenue || 0);
                  const pct = maxRevenue > 0 ? (rev / maxRevenue) * 100 : 0;
                  return (
                    <div key={s.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50/80 transition cursor-pointer" onClick={() => { selectShop(s.id); navigate('/admin'); }}>
                      <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0">
                        {s.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                        <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: pct + '%' }} />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">৳{fmt(rev)}</span>
                        <span className="ml-2 text-xs text-gray-400">{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {/* Financial summary */}
          <Card>
            <div className="p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Financial Summary</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Platform Revenue</span>
                    <span className="text-lg font-bold text-emerald-600 tabular-nums">৳{fmt(totals.revenue)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Revenue / Shop</span>
                  <span className="text-base font-bold text-gray-900 tabular-nums">
                    ৳{totals.shops > 0 ? fmt(totals.revenue / totals.shops) : '0.00'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Orders / Shop</span>
                  <span className="text-base font-bold text-gray-900 tabular-nums">
                    {totals.shops > 0 ? (totals.orders / totals.shops).toFixed(1) : '0'}
                  </span>
                </div>
                {topShop && (
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Top Performer</span>
                    <button
                      onClick={() => { selectShop(topShop.id); navigate('/admin'); }}
                      className="flex items-center justify-between w-full mt-1 group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{topShop.name}</p>
                        <p className="text-xs text-emerald-600 font-medium">৳{fmt(topShop.total_revenue)}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* COD snapshot */}
          {opsData.codSummary && (
            <Card>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">COD Status</h3>
                  <button onClick={() => navigate('/admin/cod')} className="text-xs text-primary-600 hover:text-primary-700 font-medium">View details &rarr;</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-amber-700 tabular-nums">৳{fmt(opsData.codSummary.uncollected_value || 0)}</p>
                    <p className="text-xs text-amber-600 mt-0.5">Uncollected</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-emerald-700 tabular-nums">৳{fmt(opsData.codSummary.collected_value || 0)}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Collected</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Account info */}
          <Card>
            <div className="p-5">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Account</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900 truncate ml-2 max-w-[180px]">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Role</span>
                  <Badge variant="info" size="sm">{user?.role?.replace('_', ' ')}</Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Section 4: Shop Performance Table */}
      <Card className="mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Shop Performance</h2>
            <p className="text-xs text-gray-500 mt-0.5">{visibleShops.length} shop{visibleShops.length !== 1 ? 's' : ''} · click any shop to switch context</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/all-shops')}>Manage All &rarr;</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Shop</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Products</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Orders</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Revenue</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleShops.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No shops match your criteria.</td></tr>
              ) : (
                visibleShops.map((s) => (
                  <tr key={s.id} className="hover:bg-primary-50/40 transition cursor-pointer" onClick={() => { selectShop(s.id); navigate('/admin'); }}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600 font-bold text-xs flex-shrink-0">
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3">
                      <Badge variant={statusColor(s.status)} size="sm">{s.status}</Badge>
                    </td>
                    <td className="text-right px-4 py-3 font-medium tabular-nums">{fmtInt(s.product_count)}</td>
                    <td className="text-right px-4 py-3 font-medium tabular-nums">{fmtInt(s.order_count)}</td>
                    <td className="text-right px-4 py-3 font-semibold text-emerald-600 tabular-nums">৳{fmt(s.total_revenue)}</td>
                    <td className="text-center px-4 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); selectShop(s.id); navigate('/admin'); }}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-800 transition"
                      >
                        Switch &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Section 5: Quick Access */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'All Shops', icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>), to: '/admin/all-shops', desc: 'Manage every shop' },
            { label: 'All Orders', icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>), to: '/admin/orders', desc: 'Browse all orders' },
            { label: 'All Users', icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>), to: '/admin/all-users', desc: 'Platform user management' },
            { label: 'Delivery Control', icon: (<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>), to: '/admin/operations', desc: 'Fulfillment & deliveries' },
          ].map((a) => (
            <button key={a.to} onClick={() => navigate(a.to)} className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all group">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition mb-3">
                {a.icon}
              </div>
              <p className="text-sm font-semibold text-gray-900">{a.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   SHOP DASHBOARD  -  shop_admin / shop_user view
   ====================================================== */
function ShopDashboard({ user, isSuperAdmin, currentShop, selectedShop }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, orders: 0, customers: 0, campaigns: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState({});
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    Promise.allSettled([
      dashboard.shop(),
      campaigns.list(),
      isSuperAdmin ? Promise.resolve(currentShop) : shops.me(),
    ]).then(([d, m, s]) => {
      if (d.status === 'fulfilled') {
        const data = d.value;
        setStats({
          products: data.products?.total || 0,
          orders: data.orders?.total || 0,
          customers: data.customers?.total || 0,
          campaigns: m.status === 'fulfilled' ? m.value.total : 0,
        });
        setRevenue(data.revenue?.total || 0);
        setOrdersByStatus(data.orders?.byStatus || {});
        setRecentOrders(data.recentOrders || []);
        setTopProducts(data.topProducts || []);
      } else {
        // Fallback: legacy multiple-API approach
        Promise.allSettled([products.list(), orders.list(), customers.list()])
          .then(([p, o, c]) => {
            setStats({
              products: p.status === 'fulfilled' ? p.value.total : 0,
              orders: o.status === 'fulfilled' ? o.value.total : 0,
              customers: c.status === 'fulfilled' ? c.value.total : 0,
              campaigns: m.status === 'fulfilled' ? m.value.total : 0,
            });
            if (o.status === 'fulfilled') setRecentOrders(o.value.items.slice(-5).reverse());
          });
      }
      if (s?.status === 'fulfilled' && s.value) setShop(s.value);
      else if (isSuperAdmin && currentShop) setShop(currentShop);
      setLoading(false);
    });
  }, [user, selectedShop, currentShop]);

  if (loading) return <PageSkeleton />;

  const storeUrl = shop ? '/store/' + shop.slug : (currentShop ? '/store/' + currentShop.slug : null);
  const avgOrder = stats.orders > 0 ? (revenue / stats.orders) : 0;

  const quickActions = [
    { label: 'Add Product', icon: '\u{1F4E6}', to: '/admin/products', desc: 'Create a new product listing' },
    { label: 'View Orders', icon: '\u{1F6D2}', to: '/admin/orders', desc: 'Manage incoming orders' },
    { label: 'Customize Site', icon: '\u{1F3A8}', to: '/admin/website-settings', desc: 'Update your storefront' },
    { label: 'New Campaign', icon: '\u{1F4E3}', to: '/admin/campaigns', desc: 'Launch marketing campaign' },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Good {greeting()}{user?.email ? `, ${user.email.split('@')[0]}` : ''}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isSuperAdmin && currentShop
                ? 'Viewing ' + currentShop.name + ' \u{2014} here\'s what\'s happening.'
                : "Here's what's happening with your store today."}
            </p>
          </div>
          {storeUrl && (
            <div className="flex items-center gap-2">
              <a href={storeUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                View Store
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(window.location.origin + storeUrl)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition shadow-sm"
                title="Copy store URL"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          )}
        </div>

        {storeUrl && (
          <div className="mt-4 p-4 bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200/60 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-900">Your Store is Live</p>
              <p className="text-xs text-primary-600 font-mono truncate">{window.location.origin}{storeUrl}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Products" value={stats.products} icon={'\u{1F4E6}'} color="primary" />
        <StatCard label="Total Orders" value={stats.orders} icon={'\u{1F6D2}'} color="success" />
        <StatCard label="Customers" value={stats.customers} icon={'\u{1F465}'} color="warning" />
        <StatCard label="Campaigns" value={stats.campaigns} icon={'\u{1F4E3}'} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Recent Orders</h2>
              <p className="text-xs text-gray-500 mt-0.5">Latest orders placed</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/orders')}>View all &rarr;</Button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOrders.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2 opacity-30">{'\u{1F4CB}'}</div>
                <p className="text-sm text-gray-500">No orders yet</p>
                <p className="text-xs text-gray-400 mt-1">Orders will show up here as they come in.</p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50/80 transition cursor-pointer" onClick={() => navigate('/admin/orders/' + order.id)}>
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-mono text-gray-500">#{(order.id || '').slice(-4)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{order.customer_email}</p>
                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{Number(order.total_amount).toFixed(2)}</p>
                    <Badge variant={orderStatusColor(order.status)} size="sm">{order.status}</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Revenue Summary</h3>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Revenue</span>
                    <span className="text-xl font-bold text-emerald-600">৳{fmt(revenue)}</span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: Math.min(100, revenue > 0 ? 60 : 0) + '%' }} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Order Value</span>
                  <span className="text-lg font-bold text-gray-900">৳{fmt(avgOrder)}</span>
                </div>
                {Object.keys(ordersByStatus).length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Orders by Status</span>
                    <div className="mt-2 space-y-1.5">
                      {Object.entries(ordersByStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <Badge variant={orderStatusColor(status)} size="sm">{status}</Badge>
                          <span className="text-sm font-semibold text-gray-700 tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Campaigns</span>
                  <span className="text-lg font-bold text-primary-600">{stats.campaigns}</span>
                </div>
              </div>
            </div>
          </Card>

          {topProducts.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Top Products</h3>
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={p.product_id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.units_sold} sold</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600 tabular-nums">৳{fmt(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <Card>
            <div className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Account</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900 truncate ml-2">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Role</span>
                  <Badge variant="info" size="sm">{user?.role?.replace('_', ' ')}</Badge>
                </div>
                {shop && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan</span>
                    <Badge variant="purple" size="sm">{shop.subscription_plan || 'free'}</Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button key={action.to} onClick={() => navigate(action.to)} className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all group">
              <span className="text-2xl block mb-2 group-hover:scale-110 transition-transform inline-block">{action.icon}</span>
              <p className="text-sm font-semibold text-gray-900">{action.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{action.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ======================================================
   MAIN EXPORT  -  decides which dashboard to render
   ====================================================== */
export default function Dashboard() {
  const { user } = useAuth();
  const { isSuperAdmin, currentShop, selectedShop, shopList, selectShop } = useAdmin();

  // Super admin with no shop selected → platform overview
  // Super admin with shop selected → shop-level dashboard
  if (isSuperAdmin && !selectedShop) {
    return <PlatformDashboard user={user} shopList={shopList} selectShop={selectShop} />;
  }

  return (
    <ShopDashboard
      user={user}
      isSuperAdmin={isSuperAdmin}
      currentShop={currentShop}
      selectedShop={selectedShop}
    />
  );
}

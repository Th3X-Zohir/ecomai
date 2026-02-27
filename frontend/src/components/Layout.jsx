import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import { Avatar, Dropdown, DropdownItem } from './UI';

/* ── SVG Icon Components ── */
const icons = {
  dashboard: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" /></svg>,
  products: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  orders: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  customers: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  marketing: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>,
  deliveries: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
  payments: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  website: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  categories: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
  shop: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  menu: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  close: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  logout: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  collapse: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>,
  expand: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>,
};

const navSections = [
  {
    label: 'Main',
    items: [
      { to: '/admin', label: 'Dashboard', icon: 'dashboard' },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { to: '/admin/products', label: 'Products', icon: 'products' },
      { to: '/admin/categories', label: 'Categories', icon: 'categories' },
      { to: '/admin/orders', label: 'Orders', icon: 'orders' },
      { to: '/admin/customers', label: 'Customers', icon: 'customers' },
      { to: '/admin/payments', label: 'Payments', icon: 'payments' },
      { to: '/admin/deliveries', label: 'Deliveries', icon: 'deliveries' },
    ],
  },
  {
    label: 'Grow',
    items: [
      { to: '/admin/campaigns', label: 'Marketing', icon: 'marketing' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/website-settings', label: 'Website', icon: 'website' },
      { to: '/admin/shop', label: 'Shop', icon: 'shop' },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { isSuperAdmin, shopList, selectedShop, selectShop, currentShop } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  /* Set admin page title */
  useEffect(() => {
    const segment = location.pathname.replace('/admin', '').replace(/^\//, '');
    const page = segment ? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ') : 'Dashboard';
    document.title = `${page} — Ecomai Admin`;
  }, [location.pathname]);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-gray-800/50 ${collapsed ? 'justify-center px-3' : ''}`}>
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">E</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white tracking-tight">Ecomai</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Commerce</p>
          </div>
        )}
      </div>

      {/* Shop selector for super_admin */}
      {isSuperAdmin && !collapsed && shopList.length > 0 && (
        <div className="px-3 py-3 border-b border-gray-800/50">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 px-2 mb-1.5 block">Viewing Shop</label>
          <select
            value={selectedShop || ''}
            onChange={(e) => { selectShop(e.target.value); window.location.reload(); }}
            className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          >
            {shopList.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      {isSuperAdmin && collapsed && shopList.length > 0 && (
        <div className="px-2 py-3 border-b border-gray-800/50 flex justify-center">
          <div className="w-8 h-8 bg-primary-600/20 rounded-lg flex items-center justify-center text-primary-400 text-xs font-bold" title={currentShop?.name || 'Shop'}>
            {(currentShop?.name || 'S')[0].toUpperCase()}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg text-sm transition-all duration-150 ${
                      collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-primary-600/15 text-primary-400 font-semibold shadow-sm shadow-primary-500/5'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{icons[item.icon]}</span>
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center py-3 border-t border-gray-800/50 text-gray-500 hover:text-gray-300 transition"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? icons.expand : icons.collapse}
      </button>

      {/* User section */}
      <div className={`border-t border-gray-800/50 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <Dropdown
            align="left"
            trigger={
              <button className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold hover:bg-primary-500 transition">
                {user?.email?.[0]?.toUpperCase()}
              </button>
            }
          >
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
              <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ')}</p>
            </div>
            <DropdownItem onClick={logout} danger>Sign out</DropdownItem>
          </Dropdown>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <Avatar name={user?.email} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition"
              title="Sign out"
            >
              {icons.logout}
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar - mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-950 text-white flex flex-col transform transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Sidebar - desktop */}
      <aside className={`hidden lg:flex flex-col bg-gray-950 text-white flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition">
            {icons.menu}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">E</span>
            </div>
            <span className="font-bold text-gray-900">Ecomai</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

/* ═══════════════════════════════════════════════════════
   TOAST NOTIFICATION SYSTEM
   ═══════════════════════════════════════════════════════ */
const ToastContext = createContext(null);
let _toastFn = () => {};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    if (duration > 0) setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);
  _toastFn = add;

  const icons = {
    success: (
      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
  };

  const bgMap = { success: 'bg-emerald-50 border-emerald-200', error: 'bg-red-50 border-red-200', warning: 'bg-amber-50 border-amber-200', info: 'bg-blue-50 border-blue-200' };

  return (
    <ToastContext.Provider value={add}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 pointer-events-none" style={{ maxWidth: 380 }}>
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm ${bgMap[t.type] || bgMap.info}`}
            style={{ animation: 'slideIn 0.3s ease-out' }}>
            {icons[t.type] || icons.info}
            <p className="text-sm font-medium text-gray-800 flex-1">{t.msg}</p>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx || _toastFn;
}
export const toast = (msg, type, duration) => _toastFn(msg, type, duration);

/* ═══════════════════════════════════════════════════════
   PAGE HEADER
   ═══════════════════════════════════════════════════════ */
export function PageHeader({ title, description, children, breadcrumbs }) {
  return (
    <div className="mb-8">
      {breadcrumbs && (
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-3">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
              {b.href ? <a href={b.href} className="hover:text-gray-600 transition">{b.label}</a> : <span className="text-gray-600 font-medium">{b.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CARD
   ═══════════════════════════════════════════════════════ */
export function Card({ children, className = '', hover = false, onClick }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${hover ? 'hover:shadow-md hover:border-gray-300 transition-all cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STAT CARD
   ═══════════════════════════════════════════════════════ */
export function StatCard({ label, value, icon, color = 'primary', trend, trendLabel }) {
  const colors = {
    primary: 'bg-indigo-50 text-indigo-600',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${colors[color]}`}>
            {icon}
          </div>
          {trend !== undefined && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {trendLabel && <p className="text-xs text-gray-400 mt-1">{trendLabel}</p>}
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════
   BADGE
   ═══════════════════════════════════════════════════════ */
export function Badge({ children, variant = 'default', dot = false, size = 'md' }) {
  const styles = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    danger: 'bg-red-50 text-red-700 ring-1 ring-red-600/10',
    info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10',
    purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/10',
  };
  const dotColors = {
    default: 'bg-gray-400', success: 'bg-emerald-500', warning: 'bg-amber-500',
    danger: 'bg-red-500', info: 'bg-blue-500', purple: 'bg-purple-500',
  };
  const sizes = { sm: 'px-1.5 py-0.5 text-[10px]', md: 'px-2.5 py-0.5 text-xs' };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${styles[variant]} ${sizes[size]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   BUTTON
   ═══════════════════════════════════════════════════════ */
export function Button({ children, variant = 'primary', size = 'md', className = '', loading: isLoading = false, icon, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-400 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm',
    ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-400',
    soft: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:ring-indigo-400',
  };
  const sizes = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {icon && !isLoading && icon}
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   TABLE
   ═══════════════════════════════════════════════════════ */
export function Table({ columns, data, onRowClick, emptyMessage = 'No data found', emptyIcon, loading: isLoading = false }) {
  if (isLoading) {
    return (
      <Card>
        <div className="p-6 space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse flex gap-4">
              {columns.map((_, j) => <div key={j} className="h-4 bg-gray-200 rounded flex-1" />)}
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <div className="p-12 text-center">
          <div className="text-4xl mb-3 opacity-40">{emptyIcon || '📭'}</div>
          <p className="text-gray-500 font-medium">{emptyMessage}</p>
          <p className="text-sm text-gray-400 mt-1">Get started by creating your first item.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              {columns.map((col) => (
                <th key={col.key} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, i) => (
              <tr key={row.id || i} className={`${onRowClick ? 'cursor-pointer' : ''} hover:bg-indigo-50/40 transition-colors`} onClick={() => onRowClick?.(row)}>
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3.5 text-sm text-gray-700">{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════
   MODAL
   ═══════════════════════════════════════════════════════ */
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} style={{ animation: 'fadeIn 0.15s ease-out' }} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[85vh] overflow-y-auto`} style={{ animation: 'slideUp 0.2s ease-out' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur-sm rounded-t-2xl">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CONFIRM DIALOG
   ═══════════════════════════════════════════════════════ */
export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmText = 'Confirm', variant = 'danger', loading: isLoading = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm" style={{ animation: 'slideUp 0.2s ease-out' }}>
        <div className="p-6 text-center">
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'}`}>
            <svg className={`w-6 h-6 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          {message && <p className="text-sm text-gray-500 mb-6">{message}</p>}
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant={variant} onClick={onConfirm} loading={isLoading}>{confirmText}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FORM COMPONENTS
   ═══════════════════════════════════════════════════════ */
export function FormField({ label, children, error, hint }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm bg-white placeholder:text-gray-400 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm bg-white placeholder:text-gray-400 ${className}`}
      rows={3}
      {...props}
    />
  );
}

/* ═══════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════ */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 overflow-x-auto mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
            active === tab.id
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab.icon && <span className="text-base">{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${active === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGINATION
   ═══════════════════════════════════════════════════════ */
export function Pagination({ page, totalPages, total, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-gray-500">{total} result{total !== 1 ? 's' : ''}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        {start > 1 && <span className="px-2 text-gray-400 text-sm">...</span>}
        {pages.map((p) => (
          <button key={p} onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition font-medium ${p === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}`}>
            {p}
          </button>
        ))}
        {end < totalPages && <span className="px-2 text-gray-400 text-sm">...</span>}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SEARCH INPUT
   ═══════════════════════════════════════════════════════ */
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition text-sm bg-white placeholder:text-gray-400"
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════ */
export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-4 opacity-30">{icon || '📦'}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title || 'Nothing here yet'}</h3>
      {message && <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">{message}</p>}
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOADING SKELETON
   ═══════════════════════════════════════════════════════ */
export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="h-4 w-72 bg-gray-100 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 h-24" />)}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
        {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 bg-gray-100 rounded" />)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AVATAR
   ═══════════════════════════════════════════════════════ */
export function Avatar({ name, size = 'md', className = '' }) {
  const sizes = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-10 h-10 text-base', xl: 'w-12 h-12 text-lg' };
  const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-amber-600', 'bg-red-600', 'bg-purple-600', 'bg-pink-600', 'bg-teal-600'];
  const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;

  return (
    <div className={`${sizes[size]} ${colors[idx]} rounded-full flex items-center justify-center text-white font-semibold ${className}`}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PROGRESS BAR
   ═══════════════════════════════════════════════════════ */
export function ProgressBar({ value = 0, max = 100, color = 'indigo', className = '' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colorMap = { indigo: 'bg-indigo-600', emerald: 'bg-emerald-600', amber: 'bg-amber-600', red: 'bg-red-600' };
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${colorMap[color] || colorMap.indigo}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SWITCH / TOGGLE
   ═══════════════════════════════════════════════════════ */
export function Switch({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}>
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

/* ═══════════════════════════════════════════════════════
   DIVIDER
   ═══════════════════════════════════════════════════════ */
export function Divider({ label }) {
  if (!label) return <hr className="border-gray-200 my-6" />;
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
      <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400 uppercase tracking-wider">{label}</span></div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ALERT
   ═══════════════════════════════════════════════════════ */
export function Alert({ type = 'info', children, onClose }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };
  const icons = {
    info: <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    success: <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    warning: <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    error: <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${styles[type]}`}>
      {icons[type]}
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="opacity-50 hover:opacity-80 transition flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DROPDOWN MENU
   ═══════════════════════════════════════════════════════ */
export function Dropdown({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div className={`absolute z-50 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ animation: 'fadeIn 0.15s ease-out' }}>
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ onClick, children, danger = false }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm transition ${danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`}>
      {children}
    </button>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { invoices as api, orders as ordersApi } from '../api';
import { useAdmin } from '../contexts/AdminContext';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-500',
  refunded: 'bg-purple-100 text-purple-700',
};

const STATUS_LABELS = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid', partially_paid: 'Partial',
  overdue: 'Overdue', cancelled: 'Cancelled', refunded: 'Refunded',
};

const TRANSITIONS = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'partially_paid', 'overdue', 'cancelled'],
  partially_paid: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'partially_paid', 'cancelled'],
  paid: ['refunded'],
  cancelled: [],
  refunded: [],
};

function Badge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function currency(n) { return `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`; }

export default function Invoices() {
  const { isSuperAdmin } = useAdmin();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showFromOrder, setShowFromOrder] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showPayment, setShowPayment] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = isSuperAdmin
        ? await api.listAll({ page, status, search })
        : await api.list({ page, status, search });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [page, status, search, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(id, newStatus) {
    try {
      await api.updateStatus(id, newStatus);
      load();
    } catch (e) { alert(e.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this invoice?')) return;
    try { await api.delete(id); load(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">{total} invoice{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFromOrder(true)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            From Order
          </button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
            + New Invoice
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text" placeholder="Search invoices…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Statuses</option>
          {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Invoice #</th>
                {isSuperAdmin && <th className="px-4 py-3 text-left">Shop</th>}
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-left">Issue Date</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={isSuperAdmin ? 9 : 8} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={isSuperAdmin ? 9 : 8} className="px-4 py-12 text-center text-gray-400">No invoices found</td></tr>
              ) : items.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <button onClick={() => setShowDetail(inv.id)} className="text-primary-600 hover:underline">
                      {inv.invoice_number}
                    </button>
                  </td>
                  {isSuperAdmin && <td className="px-4 py-3 text-gray-500">{inv.shop_name || '—'}</td>}
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{inv.customer_name || '—'}</div>
                    <div className="text-xs text-gray-400">{inv.customer_email || ''}</div>
                  </td>
                  <td className="px-4 py-3"><Badge status={inv.status} /></td>
                  <td className="px-4 py-3 text-right font-medium">{currency(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right">{currency(inv.amount_paid)}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {TRANSITIONS[inv.status]?.length > 0 && (
                        <select
                          value="" onChange={e => e.target.value && handleStatusChange(inv.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-1 py-0.5"
                        >
                          <option value="">Status →</option>
                          {TRANSITIONS[inv.status].map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      )}
                      {['sent', 'partially_paid', 'overdue'].includes(inv.status) && (
                        <button onClick={() => setShowPayment(inv)} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded hover:bg-green-100">Pay</button>
                      )}
                      {['draft', 'cancelled'].includes(inv.status) && (
                        <button onClick={() => handleDelete(inv.id)} className="text-xs px-2 py-0.5 bg-red-50 text-red-700 rounded hover:bg-red-100">Del</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreate && <CreateInvoiceModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {showFromOrder && <FromOrderModal onClose={() => setShowFromOrder(false)} onCreated={load} />}
      {showDetail && <InvoiceDetailModal invoiceId={showDetail} onClose={() => setShowDetail(null)} onUpdated={load} />}
      {showPayment && <RecordPaymentModal invoice={showPayment} onClose={() => setShowPayment(null)} onPaid={load} />}
    </div>
  );
}

/* ── Create Invoice Modal ── */
function CreateInvoiceModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    customer_name: '', customer_email: '', customer_phone: '',
    due_date: '', notes: '', payment_terms: 'Due on receipt', currency: 'BDT',
    discount_amount: 0, shipping_amount: 0, tax_amount: 0,
    items: [{ description: '', quantity: 1, unit_price: 0 }],
  });
  const [saving, setSaving] = useState(false);

  function addItem() {
    setForm(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0 }] }));
  }
  function removeItem(idx) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }
  function updateItem(idx, key, val) {
    setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: val } : it) }));
  }

  const subtotal = form.items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unit_price)), 0);
  const total = subtotal + Number(form.tax_amount) + Number(form.shipping_amount) - Number(form.discount_amount);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      const items = form.items.map(it => ({
        description: it.description, quantity: Number(it.quantity),
        unit_price: Number(it.unit_price), line_total: Number(it.quantity) * Number(it.unit_price),
      }));
      await api.create({
        ...form, items,
        discount_amount: Number(form.discount_amount),
        shipping_amount: Number(form.shipping_amount),
        tax_amount: Number(form.tax_amount),
      });
      onCreated(); onClose();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">New Invoice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
              <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.customer_email} onChange={e => setForm(f => ({ ...f, customer_email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
              <input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>BDT</option><option>USD</option><option>EUR</option>
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-gray-700">Line Items</label>
              <button type="button" onClick={addItem} className="text-xs text-primary-600 hover:underline">+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input placeholder="Description" value={it.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                    className="col-span-5 px-2 py-1.5 border rounded text-sm" />
                  <input type="number" min="1" value={it.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                    className="col-span-2 px-2 py-1.5 border rounded text-sm text-right" placeholder="Qty" />
                  <input type="number" step="0.01" min="0" value={it.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                    className="col-span-3 px-2 py-1.5 border rounded text-sm text-right" placeholder="Price" />
                  <div className="col-span-1 text-sm text-right text-gray-500">{currency(Number(it.quantity) * Number(it.unit_price))}</div>
                  <button type="button" onClick={() => removeItem(idx)}
                    className="col-span-1 text-red-400 hover:text-red-600 text-center">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tax</label>
              <input type="number" step="0.01" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Shipping</label>
              <input type="number" step="0.01" value={form.shipping_amount} onChange={e => setForm(f => ({ ...f, shipping_amount: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discount</label>
              <input type="number" step="0.01" value={form.discount_amount} onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">Subtotal: {currency(subtotal)}</span>
            <span className="text-lg font-bold">Total: {currency(total)}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── From Order Modal ── */
function FromOrderModal({ onClose, onCreated }) {
  const [orderId, setOrderId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!orderId.trim()) { alert('Enter an order ID'); return; }
    setSaving(true);
    try {
      await api.generateFromOrder(orderId.trim(), { due_date: dueDate || undefined, notes: notes || undefined });
      onCreated(); onClose();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">Generate Invoice from Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Order ID</label>
            <input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Paste order UUID"
              className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date (optional)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Generating…' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Invoice Detail Modal ── */
function InvoiceDetailModal({ invoiceId, onClose, onUpdated }) {
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get(invoiceId);
        setInv(data);
      } catch (e) { alert(e.message); onClose(); }
      setLoading(false);
    })();
  }, [invoiceId]);

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
    </div>
  );
  if (!inv) return null;

  const lineItems = inv.line_items || [];
  const allowed = TRANSITIONS[inv.status] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{inv.invoice_number}</h2>
            <p className="text-xs text-gray-400">Created {new Date(inv.created_at).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge status={inv.status} />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer + Dates */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Bill To</h3>
              <p className="text-sm font-medium">{inv.customer_name || '—'}</p>
              <p className="text-sm text-gray-500">{inv.customer_email}</p>
              {inv.customer_phone && <p className="text-sm text-gray-500">{inv.customer_phone}</p>}
            </div>
            <div className="text-right">
              <div className="text-sm"><span className="text-gray-500">Issue Date:</span> {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '—'}</div>
              <div className="text-sm"><span className="text-gray-500">Due Date:</span> {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</div>
              {inv.payment_terms && <div className="text-sm"><span className="text-gray-500">Terms:</span> {inv.payment_terms}</div>}
              {inv.order_id && <div className="text-sm mt-1"><span className="text-gray-500">Order:</span> <span className="font-mono text-xs">{inv.order_id.slice(0, 8)}…</span></div>}
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-gray-500 uppercase">
                <th className="py-2 text-left">Description</th>
                <th className="py-2 text-right w-20">Qty</th>
                <th className="py-2 text-right w-28">Unit Price</th>
                <th className="py-2 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lineItems.map((it, idx) => (
                <tr key={idx}>
                  <td className="py-2">{it.description}</td>
                  <td className="py-2 text-right">{it.quantity}</td>
                  <td className="py-2 text-right">{currency(it.unit_price)}</td>
                  <td className="py-2 text-right font-medium">{currency(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="border-t pt-4 space-y-1 text-sm text-right">
            <div>Subtotal: <span className="font-medium ml-4">{currency(inv.subtotal)}</span></div>
            {Number(inv.tax_amount) > 0 && <div>Tax: <span className="ml-4">{currency(inv.tax_amount)}</span></div>}
            {Number(inv.shipping_amount) > 0 && <div>Shipping: <span className="ml-4">{currency(inv.shipping_amount)}</span></div>}
            {Number(inv.discount_amount) > 0 && <div>Discount: <span className="ml-4 text-red-600">-{currency(inv.discount_amount)}</span></div>}
            <div className="text-lg font-bold pt-1 border-t">Total: {currency(inv.total_amount)}</div>
            <div className="text-green-600">Paid: {currency(inv.amount_paid)}</div>
            {Number(inv.total_amount) - Number(inv.amount_paid) > 0 && (
              <div className="text-red-600 font-medium">Balance Due: {currency(Number(inv.total_amount) - Number(inv.amount_paid))}</div>
            )}
          </div>

          {inv.notes && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{inv.notes}</p>
            </div>
          )}

          {/* Status Actions */}
          {allowed.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-gray-500">Change Status:</span>
              {allowed.map(s => (
                <button key={s} onClick={async () => {
                  try { await api.updateStatus(inv.id, s); const data = await api.get(invoiceId); setInv(data); onUpdated(); }
                  catch (e) { alert(e.message); }
                }} className={`px-3 py-1 text-sm rounded-lg border ${s === 'cancelled' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-primary-200 text-primary-600 hover:bg-primary-50'}`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Record Payment Modal ── */
function RecordPaymentModal({ invoice, onClose, onPaid }) {
  const [amount, setAmount] = useState(Number(invoice.total_amount) - Number(invoice.amount_paid));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.recordPayment(invoice.id, Number(amount));
      onPaid(); onClose();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Record Payment</h2>
          <p className="text-sm text-gray-500">{invoice.invoice_number} — Balance: {currency(Number(invoice.total_amount) - Number(invoice.amount_paid))}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
            <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

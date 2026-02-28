import { useState, useEffect, useCallback } from 'react';
import { earnings as api } from '../api';
import { useAdmin } from '../contexts/AdminContext';

const TYPE_LABELS = { sale: 'Sale', refund: 'Refund', adjustment: 'Adjustment', withdrawal: 'Withdrawal', commission: 'Commission' };
const TYPE_COLORS = { sale: 'text-green-600', refund: 'text-red-600', adjustment: 'text-blue-600', withdrawal: 'text-orange-600', commission: 'text-purple-600' };
const W_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-blue-100 text-blue-700', processing: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500',
};
const W_STATUS_LABELS = { pending: 'Pending', approved: 'Approved', processing: 'Processing', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled' };

function currency(n) { return `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`; }
function Badge({ status, colors, labels }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
}

export default function Earnings() {
  const { isSuperAdmin } = useAdmin();
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnPage, setTxnPage] = useState(1);
  const [txnPages, setTxnPages] = useState(1);
  const [txnType, setTxnType] = useState('');
  const [withdrawals, setWithdrawals] = useState([]);
  const [wTotal, setWTotal] = useState(0);
  const [wPage, setWPage] = useState(1);
  const [wPages, setWPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);

  const loadSummary = useCallback(async () => {
    try { const s = await api.summary(); setSummary(s); } catch (e) { setError(e.message); }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const r = await api.transactions({ page: txnPage, type: txnType || undefined });
      setTransactions(r.items); setTxnTotal(r.total); setTxnPages(r.totalPages);
    } catch (e) { setError(e.message); }
  }, [txnPage, txnType]);

  const loadWithdrawals = useCallback(async () => {
    try {
      const r = await api.withdrawals({ page: wPage });
      setWithdrawals(r.items); setWTotal(r.total); setWPages(r.totalPages);
    } catch (e) { setError(e.message); }
  }, [wPage]);

  useEffect(() => { setLoading(true); Promise.all([loadSummary(), loadTransactions(), loadWithdrawals()]).finally(() => setLoading(false)); }, []);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);
  useEffect(() => { loadWithdrawals(); }, [loadWithdrawals]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings & Withdrawals</h1>
          <p className="text-sm text-gray-500 mt-1">Online payment earnings (Cash on Delivery managed by you)</p>
        </div>
        {!isSuperAdmin && (
          <button onClick={() => setShowWithdraw(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
            Request Withdrawal
          </button>
        )}
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Available Balance" value={currency(summary.available_balance)} accent="text-primary-600" />
          <SummaryCard label="Total Earned (Net)" value={currency(summary.total_net_earned)} accent="text-green-600" />
          <SummaryCard label="Commission Paid" value={currency(summary.total_commission)} accent="text-orange-500" />
          <SummaryCard label="Total Withdrawn" value={currency(summary.total_withdrawn)} accent="text-blue-600" />
          <SummaryCard label="Gross Sales" value={currency(summary.total_gross)} />
          <SummaryCard label="Refunded" value={currency(summary.total_refunded)} accent="text-red-500" />
          <SummaryCard label="Sales Count" value={summary.sale_count} />
          <SummaryCard label="Commission Rate" value={`${(Number(summary.commission_rate) * 100).toFixed(1)}%`} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {['overview', 'withdrawals'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'overview' ? 'Transactions' : 'Withdrawals'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div className="flex gap-3 mb-3">
            <select value={txnType} onChange={e => { setTxnType(e.target.value); setTxnPage(1); }}
              className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-right">Net</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No transactions yet</td></tr>
                ) : transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><span className={`font-medium ${TYPE_COLORS[t.type] || ''}`}>{TYPE_LABELS[t.type] || t.type}</span></td>
                    <td className="px-4 py-3 text-gray-600">{t.description || '—'}</td>
                    <td className="px-4 py-3 text-right">{currency(t.gross_amount)}</td>
                    <td className="px-4 py-3 text-right text-orange-500">{Number(t.commission_amount) > 0 ? `-${currency(t.commission_amount)}` : '—'}</td>
                    <td className={`px-4 py-3 text-right font-medium ${Number(t.net_amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Number(t.net_amount) >= 0 ? '+' : ''}{currency(t.net_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {txnPages > 1 && <Pagination page={txnPage} totalPages={txnPages} onPage={setTxnPage} />}
        </div>
      )}

      {tab === 'withdrawals' && (
        <div>
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-left">Reference</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No withdrawal requests yet</td></tr>
                ) : withdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right font-medium">{currency(w.amount)}</td>
                    <td className="px-4 py-3 capitalize">{w.payment_method?.replace('_', ' ')}</td>
                    <td className="px-4 py-3"><Badge status={w.status} colors={W_STATUS_COLORS} labels={W_STATUS_LABELS} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{w.admin_notes || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono">{w.reference_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {wPages > 1 && <Pagination page={wPage} totalPages={wPages} onPage={setWPage} />}
        </div>
      )}

      {showWithdraw && <WithdrawModal summary={summary} onClose={() => setShowWithdraw(false)} onDone={() => { setShowWithdraw(false); loadSummary(); loadWithdrawals(); }} />}
    </div>
  );
}

function SummaryCard({ label, value, accent = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <button onClick={() => onPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Prev</button>
        <button onClick={() => onPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}

function WithdrawModal({ summary, onClose, onDone }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bkash');
  const [details, setDetails] = useState({ account_name: '', account_number: '' });
  const [saving, setSaving] = useState(false);

  const maxAmount = Number(summary?.available_balance || 0);
  const minAmount = Number(summary?.min_withdrawal || 500);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.requestWithdrawal({
        amount: Number(amount),
        payment_method: method,
        account_details: details,
      });
      onDone();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Request Withdrawal</h2>
          <p className="text-xs text-gray-500">Available: {currency(maxAmount)} · Min: {currency(minAmount)}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (BDT)</label>
            <input type="number" step="0.01" min={minAmount} max={maxAmount} value={amount}
              onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="rocket">Rocket</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
            <input value={details.account_name} onChange={e => setDetails(d => ({ ...d, account_name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
            <input value={details.account_number} onChange={e => setDetails(d => ({ ...d, account_number: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          {method === 'bank_transfer' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                <input value={details.bank_name || ''} onChange={e => setDetails(d => ({ ...d, bank_name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Branch / Routing</label>
                <input value={details.branch || ''} onChange={e => setDetails(d => ({ ...d, branch: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

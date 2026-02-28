import { useState, useEffect, useCallback } from 'react';
import { earnings as api } from '../api';

const W_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-blue-100 text-blue-700', processing: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-500',
};
const W_STATUS_LABELS = { pending: 'Pending', approved: 'Approved', processing: 'Processing', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled' };
const TYPE_LABELS = { sale: 'Sale', refund: 'Refund', adjustment: 'Adjustment', withdrawal: 'Withdrawal' };
const TYPE_COLORS = { sale: 'text-green-600', refund: 'text-red-600', adjustment: 'text-blue-600', withdrawal: 'text-orange-600' };

function currency(n) { return `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}`; }
function Badge({ status }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${W_STATUS_COLORS[status] || 'bg-gray-100'}`}>{W_STATUS_LABELS[status] || status}</span>;
}

export default function PlatformEarnings() {
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [balances, setBalances] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wStatus, setWStatus] = useState('');
  const [wPage, setWPage] = useState(1);
  const [wPages, setWPages] = useState(1);
  const [txnPage, setTxnPage] = useState(1);
  const [txnPages, setTxnPages] = useState(1);
  const [txnType, setTxnType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);
  const [showCommission, setShowCommission] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [actionRef, setActionRef] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [s, b] = await Promise.all([api.platformSummary(), api.shopBalances()]);
      setSummary(s); setBalances(b.items);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  const loadWithdrawals = useCallback(async () => {
    try {
      const r = await api.allWithdrawals({ page: wPage, status: wStatus || undefined });
      setWithdrawals(r.items); setWPages(r.totalPages);
    } catch (e) { setError(e.message); }
  }, [wPage, wStatus]);

  const loadTransactions = useCallback(async () => {
    try {
      const r = await api.allTransactions({ page: txnPage, type: txnType || undefined });
      setTransactions(r.items); setTxnPages(r.totalPages);
    } catch (e) { setError(e.message); }
  }, [txnPage, txnType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadWithdrawals(); }, [loadWithdrawals]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  async function handleWithdrawalAction(id, action) {
    try {
      if (action === 'approve') await api.approveWithdrawal(id, { notes: actionNote || undefined });
      else if (action === 'reject') {
        if (!actionNote) { alert('Please add a reason for rejection'); return; }
        await api.rejectWithdrawal(id, { notes: actionNote });
      }
      else if (action === 'process') await api.processWithdrawal(id, { reference_id: actionRef || undefined, notes: actionNote || undefined });
      else if (action === 'complete') await api.completeWithdrawal(id, { reference_id: actionRef || undefined, notes: actionNote || undefined });
      setActionNote(''); setActionRef('');
      loadWithdrawals(); load();
    } catch (e) { alert(e.message); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Earnings</h1>
          <p className="text-sm text-gray-500 mt-1">Commission revenue, shop balances & withdrawal management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCommission(true)} className="px-4 py-2 bg-white border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Commission Settings</button>
          <button onClick={() => setShowAdjust(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">+ Adjustment</button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      {/* Platform Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card label="Gross Sales" value={currency(summary.total_gross_sales)} accent="text-gray-900" />
          <Card label="Commission Earned" value={currency(summary.total_commission_earned)} accent="text-primary-600" />
          <Card label="Shop Earnings" value={currency(summary.total_shop_earnings)} accent="text-green-600" />
          <Card label="Total Withdrawn" value={currency(summary.total_withdrawn)} accent="text-orange-600" />
          <Card label="Total Sales" value={summary.total_sales} />
          <Card label="Active Shops" value={summary.active_shops} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {[['overview', 'Shop Balances'], ['withdrawals', 'Withdrawals'], ['transactions', 'All Transactions']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Shop Balances */}
      {tab === 'overview' && (
        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Shop</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-right">Gross Earned</th>
              <th className="px-4 py-3 text-right">Commission</th>
              <th className="px-4 py-3 text-right">Withdrawn</th>
              <th className="px-4 py-3 text-right">Sales</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {balances.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No earning data yet</td></tr>
              ) : balances.map(b => (
                <tr key={b.shop_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{b.shop_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-400">{b.shop_slug}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-primary-600">{currency(b.balance)}</td>
                  <td className="px-4 py-3 text-right">{currency(b.gross_earned)}</td>
                  <td className="px-4 py-3 text-right text-orange-500">{currency(b.commission_paid)}</td>
                  <td className="px-4 py-3 text-right text-blue-600">{currency(b.withdrawn)}</td>
                  <td className="px-4 py-3 text-right">{b.sale_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Withdrawal Requests */}
      {tab === 'withdrawals' && (
        <div>
          <div className="flex gap-3 mb-3">
            <select value={wStatus} onChange={e => { setWStatus(e.target.value); setWPage(1); }} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Statuses</option>
              {Object.entries(W_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Shop</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Details</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawals.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No withdrawal requests</td></tr>
                ) : withdrawals.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><div className="font-medium">{w.shop_name || '—'}</div><div className="text-xs text-gray-400">{w.requested_by_email}</div></td>
                    <td className="px-4 py-3 text-right font-bold">{currency(w.amount)}</td>
                    <td className="px-4 py-3 capitalize text-xs">{w.payment_method?.replace('_', ' ')}</td>
                    <td className="px-4 py-3"><Badge status={w.status} /></td>
                    <td className="px-4 py-3 text-xs">
                      {w.account_details && (
                        <div className="text-gray-500">
                          {w.account_details.account_name && <div>{w.account_details.account_name}</div>}
                          {w.account_details.account_number && <div className="font-mono">{w.account_details.account_number}</div>}
                          {w.account_details.bank_name && <div>{w.account_details.bank_name}</div>}
                        </div>
                      )}
                      {w.reference_id && <div className="mt-1 text-blue-500 font-mono">Ref: {w.reference_id}</div>}
                      {w.admin_notes && <div className="mt-1 text-gray-400 italic">{w.admin_notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <WithdrawalActions withdrawal={w} onAction={(action) => handleWithdrawalAction(w.id, action)}
                        note={actionNote} setNote={setActionNote} refId={actionRef} setRef={setActionRef} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {wPages > 1 && <Pagination page={wPage} totalPages={wPages} onPage={setWPage} />}
        </div>
      )}

      {/* All Transactions */}
      {tab === 'transactions' && (
        <div>
          <div className="flex gap-3 mb-3">
            <select value={txnType} onChange={e => { setTxnType(e.target.value); setTxnPage(1); }} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Shop</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-right">Net</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No transactions yet</td></tr>
                ) : transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs">{t.shop_name || '—'}</td>
                    <td className="px-4 py-3"><span className={`font-medium ${TYPE_COLORS[t.type] || ''}`}>{TYPE_LABELS[t.type] || t.type}</span></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.description || '—'}</td>
                    <td className="px-4 py-3 text-right">{currency(t.gross_amount)}</td>
                    <td className="px-4 py-3 text-right text-orange-500">{Number(t.commission_amount) > 0 ? currency(t.commission_amount) : '—'}</td>
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

      {showAdjust && <AdjustmentModal onClose={() => setShowAdjust(false)} onDone={() => { setShowAdjust(false); load(); loadTransactions(); }} />}
      {showCommission && <CommissionModal onClose={() => setShowCommission(false)} onDone={() => { setShowCommission(false); load(); }} />}
    </div>
  );
}

function Card({ label, value, accent = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${accent}`}>{value}</p>
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

function WithdrawalActions({ withdrawal, onAction, note, setNote, refId, setRef }) {
  const [expanded, setExpanded] = useState(false);
  const s = withdrawal.status;

  const actions = [];
  if (s === 'pending') actions.push(['approve', 'Approve', 'bg-green-50 text-green-700 hover:bg-green-100'], ['reject', 'Reject', 'bg-red-50 text-red-700 hover:bg-red-100']);
  if (s === 'approved') actions.push(['process', 'Process', 'bg-blue-50 text-blue-700 hover:bg-blue-100']);
  if (s === 'approved' || s === 'processing') actions.push(['complete', 'Complete', 'bg-green-50 text-green-700 hover:bg-green-100']);

  if (actions.length === 0) return <span className="text-xs text-gray-400">—</span>;

  return (
    <div>
      {!expanded ? (
        <button onClick={() => setExpanded(true)} className="text-xs text-primary-600 hover:underline">Manage</button>
      ) : (
        <div className="space-y-2 text-left">
          <input placeholder="Note/reason…" value={note} onChange={e => setNote(e.target.value)}
            className="w-full text-xs px-2 py-1 border rounded" />
          {(s === 'approved' || s === 'processing') && (
            <input placeholder="Reference ID" value={refId} onChange={e => setRef(e.target.value)}
              className="w-full text-xs px-2 py-1 border rounded" />
          )}
          <div className="flex gap-1 flex-wrap">
            {actions.map(([action, label, cls]) => (
              <button key={action} onClick={() => { onAction(action); setExpanded(false); }}
                className={`text-xs px-2 py-0.5 rounded ${cls}`}>{label}</button>
            ))}
            <button onClick={() => setExpanded(false)} className="text-xs px-2 py-0.5 text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdjustmentModal({ onClose, onDone }) {
  const [shopId, setShopId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.adjustment({ shop_id: shopId, amount: Number(amount), description: desc });
      onDone();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b"><h2 className="text-lg font-bold">Manual Adjustment</h2></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Shop ID</label>
            <input value={shopId} onChange={e => setShopId(e.target.value)} placeholder="UUID" className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (positive = credit, negative = debit)</label>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Apply'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CommissionModal({ onClose, onDone }) {
  const [rate, setRate] = useState('5');
  const [minW, setMinW] = useState('500');
  const [cycle, setCycle] = useState('on_request');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getCommission().then(s => {
      setRate(String(Number(s.commission_rate) * 100));
      setMinW(String(s.min_withdrawal));
      setCycle(s.payout_cycle);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.updateCommission({
        commission_rate: Number(rate) / 100,
        min_withdrawal: Number(minW),
        payout_cycle: cycle,
      });
      onDone();
    } catch (e) { alert(e.message); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b"><h2 className="text-lg font-bold">Commission Settings (Global)</h2></div>
        {!loaded ? <div className="p-8 text-center text-gray-400">Loading…</div> : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Commission Rate (%)</label>
              <input type="number" step="0.1" min="0" max="100" value={rate} onChange={e => setRate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Minimum Withdrawal (BDT)</label>
              <input type="number" step="1" min="0" value={minW} onChange={e => setMinW(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payout Cycle</label>
              <select value={cycle} onChange={e => setCycle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="on_request">On Request</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded-lg">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

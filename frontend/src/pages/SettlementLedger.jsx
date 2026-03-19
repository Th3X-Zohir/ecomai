/**
 * Settlement Ledger Page
 * Immutable transaction ledger showing all escrow/release events
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { settlements } from '../api';
import { PageHeader, Card, Badge, Button, useToast, PageSkeleton } from '../components/UI';

const fmt = (n) => Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TXN_TYPE_COLORS = {
  payment_hold: { bg: '#fef3c7', text: '#92400e' },
  refund_hold: { bg: '#fee2e2', text: '#991b1b' },
  refund_from_balance: { bg: '#fee2e2', text: '#991b1b' },
  payout_debit: { bg: '#dbeafe', text: '#1e40af' },
  release: { bg: '#dcfce7', text: '#166534' },
};

function TxnBadge({ type }) {
  const labels = {
    payment_hold: 'Payment Hold',
    refund_hold: 'Refund (Held)',
    refund_from_balance: 'Refund',
    payout_debit: 'Payout',
    release: 'Released',
  };
  const c = TXN_TYPE_COLORS[type] || { bg: '#f3f4f6', text: '#374151' };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {labels[type] || type?.replace(/_/g, ' ')}
    </span>
  );
}

export default function SettlementLedger() {
  const navigate = useNavigate();
  const toast = useToast();
  const [balance, setBalance] = useState(null);
  const [ledger, setLedger] = useState({ items: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      settlements.getBalance(),
      settlements.getLedger({ page, type: filter || undefined }),
    ]).then(([bal, lg]) => {
      setBalance(bal);
      setLedger(lg);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, filter]);

  if (loading && !balance) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlement Ledger"
        description="Immutable record of all escrow transactions"
        action={
          <Button variant="secondary" onClick={() => navigate('/admin/settlements/config')}>
            ← Escrow Settings
          </Button>
        }
      />

      {/* Balance Summary */}
      {balance && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl border bg-white border-amber-200">
            <p className="text-xs font-medium uppercase tracking-wide mb-1 text-amber-700">Held (Escrow)</p>
            <p className="text-2xl font-bold text-amber-600">৳{fmt(balance.held_balance)}</p>
          </div>
          <div className="p-5 rounded-xl border bg-white border-teal-200">
            <p className="text-xs font-medium uppercase tracking-wide mb-1 text-teal-700">Releasable</p>
            <p className="text-2xl font-bold text-teal-600">৳{fmt(balance.releasable_balance)}</p>
          </div>
          <div className="p-5 rounded-xl border bg-white border-green-200">
            <p className="text-xs font-medium uppercase tracking-wide mb-1 text-green-700">Available</p>
            <p className="text-2xl font-bold text-green-600">৳{fmt(balance.available_balance)}</p>
          </div>
          <div className="p-5 rounded-xl border bg-white border-blue-200">
            <p className="text-xs font-medium uppercase tracking-wide mb-1 text-blue-700">In Payout</p>
            <p className="text-2xl font-bold text-blue-600">৳{fmt(balance.payouts_processing)}</p>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="rounded-xl border overflow-hidden bg-white">
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Transactions</h3>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="">All Types</option>
              <option value="payment_hold">Payment Hold</option>
              <option value="refund_hold">Refund (Held)</option>
              <option value="refund_from_balance">Refund from Balance</option>
              <option value="payout_debit">Payout</option>
            </select>
            <span className="text-sm text-gray-500">{ledger.total} total</span>
          </div>
        </div>

        {ledger.items.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No transactions found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">Description</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-500">Reference</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Amount</th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase text-gray-500">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledger.items.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm text-gray-500">
                    {new Date(entry.created_at).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3"><TxnBadge type={entry.transaction_type} /></td>
                  <td className="px-5 py-3 text-sm text-gray-700 max-w-xs truncate">{entry.description || '—'}</td>
                  <td className="px-5 py-3 text-xs font-mono text-gray-400">{entry.reference_id ? entry.reference_id.slice(0, 12) + '…' : '—'}</td>
                  <td className={`px-5 py-3 text-sm font-semibold text-right ${Number(entry.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(entry.amount) >= 0 ? '+' : ''}৳{fmt(Math.abs(entry.amount))}
                  </td>
                  <td className="px-5 py-3 text-sm text-right font-medium text-gray-700">
                    ৳{fmt(entry.balance_after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {ledger.totalPages > 1 && (
          <div className="px-5 py-4 flex items-center justify-between border-t border-gray-200">
            <span className="text-sm text-gray-500">Page {ledger.page} of {ledger.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Previous</button>
              <button onClick={() => setPage(p => Math.min(ledger.totalPages, p + 1))} disabled={page >= ledger.totalPages}
                className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

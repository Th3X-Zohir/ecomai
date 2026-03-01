import { useState, useEffect, useCallback } from 'react';
import { newsletter as newsletterAPI, getAccessToken } from '../api';

export default function Newsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState({ active: 0, unsubscribed: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (statusFilter) params.status = statusFilter;
      const [data, statsData] = await Promise.all([
        newsletterAPI.list(params),
        newsletterAPI.stats(),
      ]);
      setSubscribers(data.items || []);
      setTotalPages(data.totalPages || 1);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load newsletter:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleUnsubscribe = async (id) => {
    await newsletterAPI.unsubscribe(id);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subscriber permanently?')) return;
    await newsletterAPI.remove(id);
    load();
  };

  const handleExport = () => {
    const url = newsletterAPI.exportUrl();
    const token = getAccessToken();
    // Open in new tab with auth header via fetch + blob
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'newsletter-subscribers.csv';
        link.click();
        URL.revokeObjectURL(link.href);
      })
      .catch(err => console.error('Export failed:', err));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Newsletter Subscribers</h1>
        <button onClick={handleExport} style={{
          padding: '.5rem 1.25rem', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: '#10b981', color: '#fff', fontWeight: 600, fontSize: '.9rem',
        }}>📥 Export CSV</button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#6366f1' },
          { label: 'Active', value: stats.active, color: '#10b981' },
          { label: 'Unsubscribed', value: stats.unsubscribed, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: 12, padding: '1rem 1.25rem',
            boxShadow: '0 1px 3px rgba(0,0,0,.08)', borderLeft: `4px solid ${s.color}`,
          }}>
            <div style={{ fontSize: '.8rem', color: '#64748b', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['', 'active', 'unsubscribed'].map(v => (
          <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }}
            style={{
              padding: '.5rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '.85rem',
              background: statusFilter === v ? '#6366f1' : '#f1f5f9', color: statusFilter === v ? '#fff' : '#334155',
            }}>
            {v === '' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Subscribers Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading...</div>
      ) : subscribers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No subscribers yet</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '.85rem', color: '#475569' }}>Email</th>
                <th style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '.85rem', color: '#475569' }}>Status</th>
                <th style={{ padding: '.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '.85rem', color: '#475569' }}>Subscribed</th>
                <th style={{ padding: '.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '.85rem', color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map(s => (
                <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '.75rem 1rem', fontWeight: 500 }}>{s.email}</td>
                  <td style={{ padding: '.75rem 1rem' }}>
                    <span style={{
                      padding: '.2rem .6rem', borderRadius: 20, fontSize: '.75rem', fontWeight: 600,
                      background: s.status === 'active' ? '#dcfce7' : '#fee2e2',
                      color: s.status === 'active' ? '#166534' : '#991b1b',
                    }}>{s.status}</span>
                  </td>
                  <td style={{ padding: '.75rem 1rem', color: '#64748b', fontSize: '.85rem' }}>
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end' }}>
                      {s.status === 'active' && (
                        <button onClick={() => handleUnsubscribe(s.id)} style={{
                          padding: '.3rem .6rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: '#f59e0b', color: '#fff', fontSize: '.75rem', fontWeight: 500,
                        }}>Unsubscribe</button>
                      )}
                      <button onClick={() => handleDelete(s.id)} style={{
                        padding: '.3rem .6rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                        background: '#ef4444', color: '#fff', fontSize: '.75rem', fontWeight: 500,
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '.5rem', marginTop: '1.5rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ padding: '.5rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>← Prev</button>
          <span style={{ padding: '.5rem 1rem', color: '#64748b' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding: '.5rem 1rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>Next →</button>
        </div>
      )}
    </div>
  );
}

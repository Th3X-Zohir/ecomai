import { useState, useEffect, useCallback } from 'react';
import { reviews as reviewsAPI } from '../api';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0, avg_rating: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const [data, statsData] = await Promise.all([
        reviewsAPI.list(params),
        reviewsAPI.stats(),
      ]);
      setReviews(data.items || []);
      setTotalPages(data.totalPages || 1);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id) => {
    await reviewsAPI.approve(id);
    load();
  };

  const handleReject = async (id) => {
    await reviewsAPI.reject(id);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this review permanently?')) return;
    await reviewsAPI.remove(id);
    load();
  };

  const starDisplay = (rating) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>Product Reviews</h1>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#6366f1' },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'Approved', value: stats.approved, color: '#10b981' },
          { label: 'Avg Rating', value: stats.avg_rating ? `${stats.avg_rating} ★` : '—', color: '#8b5cf6' },
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
        {['', 'pending', 'approved'].map(v => (
          <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }}
            style={{
              padding: '.5rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '.85rem',
              background: statusFilter === v ? '#6366f1' : '#f1f5f9', color: statusFilter === v ? '#fff' : '#334155',
            }}>
            {v === '' ? 'All' : v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>No reviews found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map(r => (
            <div key={r.id} style={{
              background: '#fff', borderRadius: 12, padding: '1.25rem',
              boxShadow: '0 1px 3px rgba(0,0,0,.06)',
              borderLeft: `4px solid ${r.is_approved ? '#10b981' : '#f59e0b'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.customer_name || 'Anonymous'}</div>
                  <div style={{ color: '#f59e0b', fontSize: '1.1rem', letterSpacing: 2 }}>{starDisplay(r.rating)}</div>
                  {r.product_name && (
                    <div style={{ fontSize: '.8rem', color: '#64748b', marginTop: 4 }}>on {r.product_name}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0 }}>
                  {!r.is_approved && (
                    <button onClick={() => handleApprove(r.id)} style={{
                      padding: '.35rem .75rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: '#10b981', color: '#fff', fontSize: '.8rem', fontWeight: 500,
                    }}>Approve</button>
                  )}
                  {r.is_approved && (
                    <button onClick={() => handleReject(r.id)} style={{
                      padding: '.35rem .75rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: '#f59e0b', color: '#fff', fontSize: '.8rem', fontWeight: 500,
                    }}>Unpublish</button>
                  )}
                  <button onClick={() => handleDelete(r.id)} style={{
                    padding: '.35rem .75rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: '#ef4444', color: '#fff', fontSize: '.8rem', fontWeight: 500,
                  }}>Delete</button>
                </div>
              </div>
              {r.title && <div style={{ fontWeight: 600, marginTop: '.75rem' }}>{r.title}</div>}
              {r.body && <div style={{ color: '#475569', marginTop: '.25rem', lineHeight: 1.5 }}>{r.body}</div>}
              <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: '.75rem' }}>
                {new Date(r.created_at).toLocaleDateString()} • {r.is_approved ? '✅ Approved' : '⏳ Pending approval'}
              </div>
            </div>
          ))}
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

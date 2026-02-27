import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { storeApi } from '../../api-public';
import { useStore } from '../../contexts/StoreContext';
import { resolveTokens } from '../templates';

export default function StoreLogin() {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const { shop, theme, tokens } = useStore();
  const t = resolveTokens(theme, tokens);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await storeApi.login(shopSlug, form);
      localStorage.setItem(`customer_token_${shopSlug}`, result.token);
      localStorage.setItem(`customer_${shopSlug}`, JSON.stringify(result.customer));
      navigate(`/store/${shopSlug}/account`);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const inputStyle = { backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: t.radius, color: t.text };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${t.primary}15` }}>
            <svg className="w-7 h-7" style={{ color: t.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: t.text }}>Welcome back</h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>Sign in to your {shop?.name || 'store'} account</p>
        </div>

        {/* Form card */}
        <div className="p-8" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
          {error && (
            <div className="mb-5 p-3 rounded-lg text-sm font-medium" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>Email address</label>
              <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>Password</label>
              <input type="password" required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Enter your password"
                className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50 mt-2"
              style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm" style={{ color: t.textMuted }}>
          Don't have an account?{' '}
          <Link to={`/store/${shopSlug}/auth/register`} className="font-semibold hover:underline" style={{ color: t.primary }}>Create one</Link>
        </p>
        <p className="mt-2 text-center text-sm" style={{ color: t.textMuted }}>
          <Link to={`/store/${shopSlug}/products`} className="hover:underline" style={{ color: t.textMuted }}>← Continue shopping</Link>
        </p>
      </div>
    </div>
  );
}

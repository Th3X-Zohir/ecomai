import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { register, setTokens } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    shop_name: '', slug: '', email: '', password: '', full_name: '', phone: '',
    industry: '', plan: searchParams.get('plan') || 'free',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'shop_name' ? { slug: handleSlug(value) } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await register.create(form);
      setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-gray-50 focus:bg-white text-sm";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'1\'%3E%3Cpath d=\'M0 0h1v1H0zm20 0h1v1h-1zm0 20h1v1h-1zM0 20h1v1H0z\'/%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="relative text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-2xl font-bold">Ecomai</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">Launch your online store in under 2 minutes</h2>
          <p className="text-white/70 text-lg leading-relaxed mb-10">
            Join 10,000+ store owners selling online with beautiful storefronts, secure payments, and powerful tools.
          </p>
          <div className="space-y-4">
            {[
              { icon: '✓', text: 'No credit card required' },
              { icon: '✓', text: 'Free plan available forever' },
              { icon: '✓', text: '14-day money-back guarantee on paid plans' },
              { icon: '✓', text: 'Full access to all templates' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{item.icon}</div>
                <span className="text-white/90">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-start justify-center bg-white px-4 sm:px-8 py-8 lg:py-12 overflow-y-auto">
        <div className="w-full max-w-lg">
          {/* Mobile header */}
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Ecomai</span>
            </Link>
            <div className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700 transition">Sign in</Link>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Your Store</h1>
            <p className="text-gray-500 mt-2">Set up your online shop and start selling today.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelCls}>Shop Name *</label>
              <input name="shop_name" value={form.shop_name} onChange={handleChange} required
                className={inputCls} placeholder="My Awesome Store" />
            </div>
            <div>
              <label className={labelCls}>Store URL</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition">
                <span className="px-4 py-3 text-gray-400 text-sm border-r border-gray-200 bg-gray-100 whitespace-nowrap">ecomai.com/store/</span>
                <input name="slug" value={form.slug} onChange={handleChange} required
                  className="flex-1 px-3 py-3 focus:outline-none bg-transparent text-sm" placeholder="my-store" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Full Name</label>
                <input name="full_name" value={form.full_name} onChange={handleChange}
                  className={inputCls} placeholder="John Doe" />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange}
                  className={inputCls} placeholder="+880 1XXXXXXXXX" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                className={inputCls} placeholder="you@example.com" />
            </div>
            <div>
              <label className={labelCls}>Password *</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6}
                className={inputCls} placeholder="At least 6 characters" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Industry</label>
                <select name="industry" value={form.industry} onChange={handleChange} className={inputCls}>
                  <option value="">Select industry</option>
                  <option value="fashion">Fashion & Apparel</option>
                  <option value="electronics">Electronics</option>
                  <option value="food">Food & Beverage</option>
                  <option value="health">Health & Beauty</option>
                  <option value="home">Home & Garden</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Plan</label>
                <select name="plan" value={form.plan} onChange={handleChange} className={inputCls}>
                  <option value="free">Free</option>
                  <option value="starter">Starter — ৳999/mo</option>
                  <option value="growth">Growth — ৳2,499/mo</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Creating your store...
                </span>
              ) : (
                <>
                  Create Store & Start Selling
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-indigo-600 hover:text-indigo-700 transition">Terms of Service</a> and{' '}
            <a href="#" className="text-indigo-600 hover:text-indigo-700 transition">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

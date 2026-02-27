import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { email: 'admin@coffee.dev', password: 'password123', label: 'Shop Admin', desc: 'Demo Coffee', icon: '☕' },
    { email: 'staff@coffee.dev', password: 'password123', label: 'Shop Staff', desc: 'Demo Coffee', icon: '👤' },
    { email: 'super@ecomai.dev', password: 'password123', label: 'Super Admin', desc: 'Platform', icon: '⚡' },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left side - brand panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-teal-500 to-emerald-400 relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'1\'%3E%3Cpath d=\'M0 0h1v1H0zm20 0h1v1h-1zm0 20h1v1h-1zM0 20h1v1H0z\'/%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="relative text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-2xl font-bold">Ecomai</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">Welcome back to your commerce dashboard</h2>
          <p className="text-white/70 text-lg leading-relaxed">Manage your products, orders, payments, and customers — all in one place.</p>
          <div className="mt-12 grid grid-cols-2 gap-6">
            {[{ v: '10K+', l: 'Active Stores' }, { v: '99.9%', l: 'Uptime' }, { v: '24/7', l: 'Support' }, { v: '2M+', l: 'Orders' }].map((s, i) => (
              <div key={i}>
                <div className="text-2xl font-bold">{s.v}</div>
                <div className="text-sm text-white/60">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 sm:px-8 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent">Ecomai</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sign in to your account</h1>
            <p className="text-gray-500 mt-2">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 font-medium hover:text-primary-700 transition">Create one free</Link>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-gray-50 focus:bg-white"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-gray-50 focus:bg-white"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-500 font-medium uppercase tracking-wider">Demo Accounts</span></div>
            </div>
            <div className="mt-4 space-y-2">
              {demoAccounts.map((demo) => (
                <button
                  key={demo.email}
                  onClick={() => { setEmail(demo.email); setPassword(demo.password); }}
                  className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-primary-50 hover:border-primary-200 border border-gray-100 rounded-xl transition-all text-sm flex items-center gap-3 group"
                >
                  <span className="text-lg">{demo.icon}</span>
                  <span className="flex-1">
                    <span className="font-semibold text-gray-800 group-hover:text-primary-700 transition">{demo.label}</span>
                    <span className="text-gray-400 ml-1.5">— {demo.desc}</span>
                  </span>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-primary-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

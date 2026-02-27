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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-indigo-600">Ecomai</Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Already have an account?</span>
            <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-700">Login</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Store</h1>
        <p className="text-gray-500 mb-8">Set up your online shop in under 2 minutes.</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name *</label>
            <input name="shop_name" value={form.shop_name} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="My Awesome Store" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Store URL</label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <span className="bg-gray-50 px-4 py-3 text-gray-500 text-sm border-r">ecomai.com/store/</span>
              <input name="slug" value={form.slug} onChange={handleChange} required
                className="flex-1 px-3 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="my-store" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input name="full_name" value={form.full_name} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+880 1XXXXXXXXX" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <select name="industry" value={form.industry} onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="">Select industry</option>
              <option value="fashion">Fashion & Apparel</option>
              <option value="electronics">Electronics</option>
              <option value="food">Food & Beverage</option>
              <option value="health">Health & Beauty</option>
              <option value="home">Home & Garden</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50">
            {loading ? 'Creating your store...' : 'Create Store & Start Selling'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

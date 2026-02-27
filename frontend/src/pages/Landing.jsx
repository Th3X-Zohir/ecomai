import { Link } from 'react-router-dom';

const features = [
  { icon: '🏪', title: 'Your Own Online Store', desc: 'Launch a beautiful storefront in minutes with customizable templates.' },
  { icon: '📦', title: 'Product Management', desc: 'Manage products, variants, categories, and inventory with ease.' },
  { icon: '💳', title: 'Secure Payments', desc: 'Accept payments via SSLCommerz with built-in checkout flow.' },
  { icon: '🚚', title: 'Delivery Tracking', desc: 'Assign drivers, track deliveries, and keep customers informed.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Monitor orders, revenue, and customer insights in real-time.' },
  { icon: '📣', title: 'Marketing Tools', desc: 'Create campaigns across email, SMS, and social channels.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-indigo-600">Ecomai</Link>
          <div className="flex items-center gap-6">
            <Link to="/pricing" className="text-gray-600 hover:text-gray-900 font-medium">Pricing</Link>
            <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">Login</Link>
            <Link to="/signup" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
          Launch Your <span className="text-indigo-600">E-Commerce</span><br />Business Today
        </h1>
        <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto">
          Everything you need to sell online — beautiful storefront, secure payments, order management, delivery tracking, and marketing tools. All in one platform.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/signup" className="bg-indigo-600 text-white px-8 py-3.5 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
            Start Free Trial
          </Link>
          <Link to="/pricing" className="border-2 border-gray-200 text-gray-700 px-8 py-3.5 rounded-lg text-lg font-semibold hover:border-gray-300 transition">
            View Pricing
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-400">No credit card required. Set up in under 2 minutes.</p>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Everything You Need to Sell Online</h2>
        <p className="text-center text-gray-500 mb-12 max-w-lg mx-auto">Powerful tools designed for growing businesses in Bangladesh and beyond.</p>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-8 hover:shadow-lg transition">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to grow your business?</h2>
          <p className="text-indigo-100 text-lg mb-8">Join thousands of shop owners who trust Ecomai to power their online stores.</p>
          <Link to="/signup" className="bg-white text-indigo-600 px-8 py-3.5 rounded-lg text-lg font-semibold hover:bg-gray-50 transition">
            Create Your Store Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold text-white">Ecomai</div>
          <div className="flex gap-6 text-sm">
            <Link to="/pricing" className="hover:text-white">Pricing</Link>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Privacy</a>
          </div>
          <p className="text-sm">&copy; {new Date().getFullYear()} Ecomai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../api';

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    register.plans().then(data => setPlans(data.items || [])).catch(() => {
      // Fallback plans if API unavailable
      setPlans([
        { slug: 'free', name: 'Free', price_monthly: 0, features: ['Basic storefront', '5 templates', 'Email support'] },
        { slug: 'starter', name: 'Starter', price_monthly: 999, features: ['Everything in Free', 'SSLCommerz payments', 'Custom CSS', 'Priority email support'] },
        { slug: 'growth', name: 'Growth', price_monthly: 2499, features: ['Everything in Starter', 'Unlimited products', 'Unlimited orders', 'API access'] },
        { slug: 'enterprise', name: 'Enterprise', price_monthly: 0, features: ['Everything in Growth', 'Custom integrations', 'Dedicated support', 'SLA guarantee'] },
      ]);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-indigo-600">Ecomai</Link>
          <div className="flex items-center gap-6">
            <Link to="/pricing" className="text-indigo-600 font-medium">Pricing</Link>
            <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">Login</Link>
            <Link to="/signup" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-4">Simple, Transparent Pricing</h1>
        <p className="text-center text-gray-500 mb-12 max-w-lg mx-auto">Start free and scale as you grow. No hidden fees.</p>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : (
          <div className="grid md:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div key={plan.slug} className={`rounded-xl border-2 p-8 flex flex-col ${plan.slug === 'growth' ? 'border-indigo-600 shadow-xl shadow-indigo-100 relative' : 'border-gray-200'}`}>
                {plan.slug === 'growth' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">POPULAR</div>
                )}
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-4 mb-6">
                  {plan.slug === 'enterprise' ? (
                    <>
                      <span className="text-4xl font-extrabold text-gray-900">Custom</span>
                      <span className="text-gray-500 block text-sm mt-1">Contact us for pricing</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-gray-900">৳{plan.price_monthly?.toLocaleString()}</span>
                      <span className="text-gray-500">/month</span>
                    </>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-gray-600">
                  {Array.isArray(plan.features)
                    ? plan.features.map((f, i) => <li key={i}>✓ {f}</li>)
                    : (
                      <>
                        <li>✓ {plan.features?.products_limit === -1 ? 'Unlimited' : plan.features?.products_limit?.toLocaleString()} products</li>
                        <li>✓ {plan.features?.orders_limit === -1 ? 'Unlimited' : plan.features?.orders_limit?.toLocaleString()} orders/month</li>
                        <li>✓ Custom storefront</li>
                        <li>✓ SSLCommerz payments</li>
                        {plan.features?.priority_support && <li>✓ Priority support</li>}
                        {plan.features?.api_access && <li>✓ API access</li>}
                      </>
                    )
                  }
                </ul>
                <Link
                  to={`/signup?plan=${plan.slug}`}
                  className={`w-full text-center py-3 rounded-lg font-semibold transition ${plan.slug === 'growth' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {plan.slug === 'enterprise' ? 'Contact Sales' : plan.price_monthly === 0 ? 'Start Free' : 'Get Started'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xl font-bold text-white">Ecomai</div>
          <p className="text-sm">&copy; {new Date().getFullYear()} Ecomai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

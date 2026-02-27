import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../api';

/* ─── Static plan data (always available, API data merges on top) ─── */
const PLANS = [
  {
    slug: 'free', name: 'Free', price_monthly: 0, price_yearly: 0,
    tagline: 'For hobby sellers and side projects',
    features: ['Up to 25 products', '50 orders / month', 'Basic storefront', '5 templates', 'Email support', 'SSL included'],
  },
  {
    slug: 'starter', name: 'Starter', price_monthly: 999, price_yearly: 9990,
    tagline: 'For small businesses getting started',
    features: ['Up to 250 products', '500 orders / month', 'SSLCommerz payments', 'Custom CSS', 'Priority email support', 'Basic analytics', 'Discount codes'],
  },
  {
    slug: 'growth', name: 'Growth', price_monthly: 2499, price_yearly: 24990, popular: true,
    tagline: 'For growing stores and brands',
    features: ['Unlimited products', 'Unlimited orders', 'All payment gateways', 'API access', 'Advanced analytics', 'Marketing campaigns', 'Custom domain', 'Priority chat support'],
  },
  {
    slug: 'enterprise', name: 'Enterprise', price_monthly: 0, price_yearly: 0,
    tagline: 'For large-scale & custom deployments',
    features: ['Everything in Growth', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee', 'Custom development', 'On-premise option', 'SSO / SAML', 'Phone support'],
  },
];

const comparisonRows = [
  { label: 'Products', free: '25', starter: '250', growth: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Orders / month', free: '50', starter: '500', growth: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Staff accounts', free: '1', starter: '3', growth: '10', enterprise: 'Unlimited' },
  { label: 'Templates', free: '5', starter: '5', growth: 'All', enterprise: 'All + Custom' },
  { label: 'Custom domain', free: false, starter: false, growth: true, enterprise: true },
  { label: 'SSLCommerz / bKash', free: false, starter: true, growth: true, enterprise: true },
  { label: 'Custom CSS', free: false, starter: true, growth: true, enterprise: true },
  { label: 'Analytics', free: false, starter: 'Basic', growth: 'Advanced', enterprise: 'Advanced' },
  { label: 'Marketing tools', free: false, starter: false, growth: true, enterprise: true },
  { label: 'API access', free: false, starter: false, growth: true, enterprise: true },
  { label: 'Support', free: 'Email', starter: 'Priority Email', growth: 'Chat + Email', enterprise: 'Dedicated + Phone' },
  { label: 'SLA guarantee', free: false, starter: false, growth: false, enterprise: true },
];

const faqs = [
  { q: 'Can I start for free?', a: 'Absolutely! Our Free plan gives you everything you need to launch your first store. No credit card required.' },
  { q: 'Can I switch plans at any time?', a: 'Yes. Upgrade or downgrade your plan at any time. Changes take effect immediately and are prorated.' },
  { q: 'What payment methods do you accept?', a: 'We accept bKash, Nagad, SSLCommerz, and international credit/debit cards for subscription payments.' },
  { q: 'Is there a long-term contract?', a: 'No contracts. All plans are month-to-month or yearly with a discount. Cancel anytime.' },
  { q: 'Do you offer refunds?', a: 'Yes, we offer a 14-day money-back guarantee on all paid plans. No questions asked.' },
  { q: 'What happens if I exceed my plan limits?', a: "We'll notify you when you're approaching limits and suggest an upgrade. Your store will continue to work — we never cut you off mid-sale." },
];

function Check() {
  return <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
}
function Cross() {
  return <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
}

function CellValue({ val }) {
  if (val === true) return <Check />;
  if (val === false) return <Cross />;
  return <span className="text-sm text-gray-700 font-medium">{val}</span>;
}

export default function Pricing() {
  const [billing, setBilling] = useState('monthly');
  const [plans, setPlans] = useState(PLANS);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    register.plans()
      .then(data => {
        if (data.items?.length) {
          setPlans(prev => prev.map(p => {
            const api = data.items.find(a => a.slug === p.slug);
            return api ? { ...p, ...api, features: p.features } : p;
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getPrice = (plan) => billing === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const yearly = billing === 'yearly';

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ─── Navbar (matches Landing) ─── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-white border-b border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent">Ecomai</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Home</Link>
            <Link to="/pricing" className="text-sm font-medium text-primary-600">Pricing</Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Sign In</Link>
            <Link to="/signup" className="bg-gradient-to-r from-primary-600 to-teal-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-primary-200 transition-all hover:-translate-y-0.5">
              Get Started Free
            </Link>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition" aria-label="Menu">
            <div className="w-5 h-5 relative">
              <span className={`absolute left-0 w-5 h-0.5 bg-gray-700 rounded transition-all duration-300 ${mobileOpen ? 'top-2.5 rotate-45' : 'top-1'}`} />
              <span className={`absolute left-0 top-2.5 w-5 h-0.5 bg-gray-700 rounded transition-all duration-300 ${mobileOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`absolute left-0 w-5 h-0.5 bg-gray-700 rounded transition-all duration-300 ${mobileOpen ? 'top-2.5 -rotate-45' : 'top-4'}`} />
            </div>
          </button>
        </div>
        <div className={`md:hidden overflow-hidden transition-all duration-300 bg-white/95 backdrop-blur-xl ${mobileOpen ? 'max-h-64 border-b border-gray-100' : 'max-h-0'}`}>
          <div className="px-4 py-4 space-y-3">
            <Link to="/" className="block text-sm font-medium text-gray-700 py-2">Home</Link>
            <Link to="/pricing" className="block text-sm font-medium text-primary-600 py-2">Pricing</Link>
            <Link to="/login" className="block text-sm font-medium text-gray-700 py-2">Sign In</Link>
            <Link to="/signup" className="block text-center bg-gradient-to-r from-primary-600 to-teal-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-28 pb-4 sm:pt-36 sm:pb-8 text-center relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #4a9aed 0%, transparent 70%)' }} />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5 mb-6">
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span className="text-xs font-semibold text-emerald-700">14-day money-back guarantee on all plans</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
            Simple, Transparent<br />
            <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-400 bg-clip-text text-transparent">Pricing</span>
          </h1>
          <p className="mt-5 text-lg sm:text-xl text-gray-500 max-w-xl mx-auto">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Billing toggle */}
          <div className="mt-10 inline-flex items-center gap-3 bg-gray-100 rounded-full p-1">
            <button onClick={() => setBilling('monthly')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billing === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Monthly
            </button>
            <button onClick={() => setBilling('yearly')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${billing === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Yearly
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">SAVE 17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── Plan Cards ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const price = getPrice(plan);
              const isPopular = plan.popular;
              const isEnterprise = plan.slug === 'enterprise';
              return (
                <div key={plan.slug} className={`relative rounded-2xl border-2 p-8 flex flex-col transition-all duration-300 hover:shadow-xl ${isPopular ? 'border-primary-500 shadow-lg shadow-primary-100 bg-white scale-[1.02]' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 to-teal-500 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg shadow-primary-200">
                      MOST POPULAR
                    </div>
                  )}
                  <div className="mb-5">
                    <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{plan.tagline}</p>
                  </div>
                  <div className="mb-6">
                    {isEnterprise ? (
                      <>
                        <span className="text-4xl font-extrabold text-gray-900">Custom</span>
                        <span className="block text-sm text-gray-500 mt-1">Let's talk about your needs</span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold text-gray-900">৳{(yearly ? Math.round(price / 12) : price).toLocaleString()}</span>
                        <span className="text-gray-500 text-sm"> / month</span>
                        {yearly && price > 0 && (
                          <span className="block text-xs text-gray-400 mt-1">৳{price.toLocaleString()} billed yearly</span>
                        )}
                        {price === 0 && <span className="block text-xs text-gray-400 mt-1">Free forever</span>}
                      </>
                    )}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <Check />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={isEnterprise ? '#' : `/signup?plan=${plan.slug}${yearly ? '&billing=yearly' : ''}`}
                    className={`w-full text-center py-3 rounded-xl font-semibold transition-all duration-200 ${
                      isPopular
                        ? 'bg-gradient-to-r from-primary-600 to-teal-500 text-white hover:shadow-lg hover:shadow-primary-200 hover:-translate-y-0.5'
                        : isEnterprise
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isEnterprise ? 'Contact Sales' : price === 0 ? 'Start Free' : 'Get Started'}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Feature Comparison Table ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-2">Compare Plans</h2>
        <p className="text-center text-gray-500 mb-12 max-w-lg mx-auto">See exactly what you get with each plan.</p>

        {/* Desktop table */}
        <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-sm font-semibold text-gray-900 py-4 px-6 w-1/5">Feature</th>
                {['Free', 'Starter', 'Growth', 'Enterprise'].map(n => (
                  <th key={n} className="text-center text-sm font-semibold text-gray-900 py-4 px-4">{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                  <td className="text-sm text-gray-700 py-3.5 px-6 font-medium">{row.label}</td>
                  {['free', 'starter', 'growth', 'enterprise'].map(slug => (
                    <td key={slug} className="text-center py-3.5 px-4"><CellValue val={row[slug]} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile comparison (accordion-style cards) */}
        <div className="md:hidden space-y-4">
          {plans.map(plan => (
            <details key={plan.slug} className="group rounded-xl border border-gray-200 overflow-hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer bg-white hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <span className={`font-semibold text-gray-900 ${plan.popular ? 'text-primary-600' : ''}`}>{plan.name}</span>
                  {plan.popular && <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">POPULAR</span>}
                </div>
                <svg className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                {comparisonRows.map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5">
                    <span className="text-sm text-gray-600">{row.label}</span>
                    <CellValue val={row[plan.slug]} />
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 sm:py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary-50 rounded-full px-4 py-1.5 mb-4">
              <span className="text-xs font-semibold text-primary-700">FAQ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900 pr-4">{faq.q}</span>
                  <svg className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 pb-5' : 'max-h-0'}`}>
                  <p className="px-5 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary-600 via-teal-500 to-emerald-400 p-10 sm:p-16 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
            <h2 className="relative text-2xl sm:text-4xl font-bold text-white mb-4">Still Have Questions?</h2>
            <p className="relative text-lg text-white/80 max-w-xl mx-auto mb-8">Our team is here to help. Start a free trial or chat with us anytime.</p>
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="w-full sm:w-auto bg-white text-primary-700 px-8 py-3.5 rounded-full text-base font-semibold hover:bg-gray-50 hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                Start Free Trial
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <a href="mailto:support@ecomai.dev" className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-3.5 rounded-full text-base font-semibold hover:bg-white/10 transition-all flex items-center justify-center">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-950 text-gray-400 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-gray-800">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <span className="text-lg font-bold text-white">Ecomai</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">The all-in-one e-commerce platform built for Bangladesh and beyond.</p>
            </div>
            {[
              { title: 'Product', links: [['Features', '/'], ['Pricing', '/pricing'], ['Templates', '#']] },
              { title: 'Company', links: [['About', '#'], ['Blog', '#'], ['Contact', '#']] },
              { title: 'Resources', links: [['Documentation', '#'], ['Help Center', '#'], ['API Reference', '#']] },
              { title: 'Legal', links: [['Privacy Policy', '#'], ['Terms of Service', '#']] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(([label, href], j) => (
                    <li key={j}>
                      {href.startsWith('/') ? (
                        <Link to={href} className="text-sm hover:text-white transition">{label}</Link>
                      ) : (
                        <a href={href} className="text-sm hover:text-white transition">{label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
            <p className="text-sm">&copy; {new Date().getFullYear()} Ecomai. All rights reserved.</p>
            <p className="text-xs text-gray-600">Built with love in Bangladesh</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

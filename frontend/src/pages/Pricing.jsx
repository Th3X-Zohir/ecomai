import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../api';

/* ════════════════════════════════════════════════════════════════
   HOOKS
   ════════════════════════════════════════════════════════════════ */

function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ════════════════════════════════════════════════════════════════
   DATA — Icons & comparison template (all plan data from API)
   ════════════════════════════════════════════════════════════════ */

const PLAN_ICONS = { free: '🌱', starter: '🚀', growth: '⚡', enterprise: '🏢' };

const COMPARISON_TEMPLATE = [
  { label: 'Products', getter: p => p.product_limit === -1 ? 'Unlimited' : String(p.product_limit ?? 0) },
  { label: 'Orders / month', getter: p => p.order_limit === -1 ? 'Unlimited' : String(p.order_limit ?? 0) },
  { label: 'Staff accounts', getter: p => p.staff_limit === -1 ? 'Unlimited' : String(p.staff_limit ?? 1) },
  { label: 'Images / product', getter: p => p.image_limit_per_product === -1 ? 'Unlimited' : String(p.image_limit_per_product ?? 5) },
  { label: 'Custom domain', feature: 'custom_domain' },
  { label: 'Analytics', variants: [['advanced_analytics', 'Advanced'], ['basic_analytics', 'Basic']] },
  { label: 'Marketing tools', feature: 'marketing_tools' },
  { label: 'API access', feature: 'api_access' },
  { label: 'Dedicated manager', feature: 'dedicated_account_manager' },
  { label: 'SLA guarantee', feature: 'sla' },
  { label: 'White label', feature: 'white_label' },
  { label: 'Support', variants: [['priority_support', 'Priority'], ['email_support', 'Email']] },
];

function parseFeatures(plan) {
  return typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);
}

function buildDisplayFeatures(plan) {
  const out = [];
  const keys = parseFeatures(plan);
  if (plan.product_limit === -1) out.push('Unlimited products');
  else out.push(`Up to ${plan.product_limit ?? 0} products`);
  if (plan.order_limit === -1) out.push('Unlimited orders');
  else out.push(`${plan.order_limit ?? 0} orders / month`);
  if (plan.staff_limit === -1) out.push('Unlimited staff');
  else if ((plan.staff_limit ?? 1) > 1) out.push(`${plan.staff_limit} staff accounts`);
  else out.push('1 staff account');
  if (keys.includes('advanced_analytics')) out.push('Advanced analytics');
  else if (keys.includes('basic_analytics')) out.push('Basic analytics');
  if (keys.includes('custom_domain')) out.push('Custom domain');
  if (keys.includes('api_access')) out.push('API access');
  if (keys.includes('marketing_tools')) out.push('Marketing campaigns');
  if (keys.includes('priority_support')) out.push('Priority support');
  else if (keys.includes('email_support')) out.push('Email support');
  if (keys.includes('dedicated_account_manager')) out.push('Dedicated manager');
  if (keys.includes('sla')) out.push('SLA guarantee');
  if (keys.includes('white_label')) out.push('White label');
  out.push('SSL included');
  return out;
}

function buildComparisonRows(plans) {
  return COMPARISON_TEMPLATE.map(tmpl => {
    const row = { label: tmpl.label };
    for (const p of plans) {
      const keys = parseFeatures(p);
      if (tmpl.getter) {
        row[p.slug] = tmpl.getter(p);
      } else if (tmpl.variants) {
        let v = false;
        for (const [k, text] of tmpl.variants) { if (keys.includes(k)) { v = text; break; } }
        row[p.slug] = v;
      } else {
        row[p.slug] = keys.includes(tmpl.feature);
      }
    }
    return row;
  });
}

const faqs = [
  { q: 'Can I start for free?', a: 'Absolutely! Our Free plan gives you everything you need to launch your first store. No credit card required. Upgrade anytime as your business grows.' },
  { q: 'Can I switch plans at any time?', a: 'Yes. Upgrade or downgrade your plan at any time. Changes take effect immediately and unused credits are prorated to your account.' },
  { q: 'What payment methods do you accept?', a: 'We accept bKash, Nagad, SSLCommerz, and international credit/debit cards (Visa, Mastercard, Amex) for subscription payments.' },
  { q: 'Is there a long-term contract?', a: 'No contracts. All plans are month-to-month or yearly with a 17% discount. Cancel anytime with one click.' },
  { q: 'Do you offer refunds?', a: 'Yes, we offer a 14-day money-back guarantee on all paid plans. No questions asked — email us and we\'ll process it within 24 hours.' },
  { q: 'What happens if I exceed my plan limits?', a: 'We\'ll notify you when you\'re approaching limits and suggest an upgrade. Your store will continue to work — we never cut you off mid-sale.' },
  { q: 'Can I import my existing products?', a: 'Yes! We support CSV/Excel import for bulk product uploads. Our team can also help with data migration from other platforms.' },
  { q: 'Do you provide custom development?', a: 'Enterprise plan customers get access to custom development services. Contact our sales team to discuss your specific requirements.' },
];

const trustSignals = [
  { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Bank-grade security' },
  { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: '99.9% uptime SLA' },
  { icon: 'M3 10h18M7 14h2m4 0h4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z', label: 'No hidden fees' },
  { icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', label: '14-day money-back' },
];

/* ════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ════════════════════════════════════════════════════════════════ */

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

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */

export default function Pricing() {
  const [billing, setBilling] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [compRows, setCompRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [heroRef, heroVis] = useReveal(0.1);
  const [cardsRef, cardsVis] = useReveal(0.05);
  const [trustRef, trustVis] = useReveal();
  const [tableRef, tableVis] = useReveal(0.05);
  const [faqRef, faqVis] = useReveal();
  const [ctaRef, ctaVis] = useReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    register.plans()
      .then(data => {
        const items = data.items || [];
        if (items.length) {
          const processed = items.map(p => ({
            ...p,
            price_monthly: Number(p.price_monthly) || 0,
            price_yearly: Number(p.price_yearly) || 0,
            features: parseFeatures(p),
            displayFeatures: buildDisplayFeatures(p),
            icon: PLAN_ICONS[p.slug] || '📦',
          }));
          setPlans(processed);
          setCompRows(buildComparisonRows(processed));
        }
      })
      .catch((err) => {
        console.error('[Pricing] Failed to load plans:', err);
        setLoadError('Failed to load pricing plans. Please refresh the page.');
      })
      .finally(() => setLoading(false));
  }, []);

  const getPrice = (plan) => billing === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const yearly = billing === 'yearly';

  const reveal = (vis, delay = 0) => ({
    opacity: vis ? 1 : 0,
    transform: vis ? 'translateY(0)' : 'translateY(36px)',
    transition: `opacity 0.7s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.7s cubic-bezier(.16,1,.3,1) ${delay}s`,
  });

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ═══════════════════ NAVBAR ═══════════════════ */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/80 backdrop-blur-2xl shadow-lg shadow-gray-200/40 border-b border-gray-200/50' : 'bg-white/90 backdrop-blur-md border-b border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center shadow-lg shadow-primary-200/50 group-hover:shadow-primary-300/60 transition-shadow">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent">Ecomai</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="relative text-sm font-medium text-gray-600 hover:text-gray-900 transition group">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-500 to-teal-500 rounded-full group-hover:w-full transition-all duration-300" />
            </Link>
            <Link to="/pricing" className="text-sm font-semibold text-primary-600">Pricing</Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Sign In</Link>
            <Link to="/signup" className="relative bg-gradient-to-r from-primary-600 to-teal-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-primary-200/50 hover:shadow-xl hover:shadow-primary-300/50 transition-all hover:-translate-y-0.5 overflow-hidden group">
              <span className="relative z-10">Get Started Free</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition" aria-label="Menu">
            <div className="w-5 h-5 relative">
              <span className={`absolute left-0 w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? 'top-2 rotate-45' : 'top-0.5'}`} />
              <span className={`absolute left-0 top-2 w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-0' : 'opacity-100'}`} />
              <span className={`absolute left-0 w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? 'top-2 -rotate-45' : 'top-3.5'}`} />
            </div>
          </button>
        </div>
        <div className={`md:hidden overflow-hidden transition-all duration-400 bg-white/95 backdrop-blur-2xl ${mobileOpen ? 'max-h-64 border-b border-gray-100 shadow-xl' : 'max-h-0'}`}>
          <div className="px-4 py-5 space-y-1">
            {[['Home', '/'], ['Pricing', '/pricing'], ['Sign In', '/login']].map(([l, h]) => (
              <Link key={l} to={h} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition">{l}</Link>
            ))}
            <Link to="/signup" className="block text-center bg-gradient-to-r from-primary-600 to-teal-500 text-white px-5 py-3 rounded-xl text-sm font-semibold mt-2">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section ref={heroRef} className="pt-28 pb-6 sm:pt-36 sm:pb-10 text-center relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary-200/20 rounded-full blur-[100px] animate-[morph-blob_20s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-teal-200/15 rounded-full blur-[80px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #1a73e8 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div style={reveal(heroVis)} className="inline-flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-full px-5 py-2 mb-8 shadow-sm">
            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <span className="text-xs font-semibold text-emerald-700">14-day money-back guarantee on all plans</span>
          </div>

          <h1 style={reveal(heroVis, 0.1)} className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
            Simple, Transparent
            <br />
            <span className="bg-gradient-to-r from-primary-600 via-teal-500 to-emerald-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient-x_4s_ease_infinite]">Pricing</span>
          </h1>

          <p style={reveal(heroVis, 0.2)} className="mt-6 text-lg sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Billing toggle */}
          <div style={reveal(heroVis, 0.3)} className="mt-10 inline-flex items-center gap-1 bg-gray-100 rounded-2xl p-1.5 shadow-inner">
            <button
              onClick={() => setBilling('monthly')}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${billing === 'monthly' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${billing === 'yearly' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Yearly
              <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">-17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════ PLAN CARDS ═══════════════════ */}
      <section ref={cardsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" /></div>
        ) : loadError ? (
          <div className="text-center py-20">
            <p className="text-red-600 font-medium mb-4">{loadError}</p>
            <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">Retry</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, idx) => {
              const price = getPrice(plan);
              const isPopular = plan.is_popular;
              const isEnterprise = plan.slug === 'enterprise';
              return (
                <div
                  key={plan.slug}
                  className={`group relative rounded-2xl border-2 p-8 flex flex-col transition-all duration-500 hover:-translate-y-2 ${
                    isPopular
                      ? 'border-primary-500 bg-white shadow-xl shadow-primary-100/60 scale-[1.02] hover:shadow-2xl hover:shadow-primary-200/60'
                      : 'border-gray-200 bg-white hover:border-primary-200 hover:shadow-xl hover:shadow-gray-200/60'
                  }`}
                  style={reveal(cardsVis, 0.05 + idx * 0.08)}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 to-teal-500 text-white text-xs font-bold px-6 py-2 rounded-full shadow-lg shadow-primary-200/50 animate-[bounce-subtle_3s_ease-in-out_infinite]">
                      ⚡ MOST POPULAR
                    </div>
                  )}

                  {/* Plan icon & name */}
                  <div className="mb-6">
                    <div className="text-3xl mb-3">{plan.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-7">
                    {isEnterprise ? (
                      <>
                        <span className="text-4xl font-extrabold text-gray-900">Custom</span>
                        <span className="block text-sm text-gray-500 mt-1">Let's talk about your needs</span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-gray-500">৳</span>
                          <span className="text-5xl font-extrabold text-gray-900 tabular-nums transition-all duration-500">
                            {(yearly ? Math.round(price / 12) : price).toLocaleString()}
                          </span>
                          <span className="text-gray-500 text-sm font-medium"> / mo</span>
                        </div>
                        {yearly && price > 0 && (
                          <span className="block text-xs text-gray-400 mt-1.5">৳{price.toLocaleString()} billed yearly</span>
                        )}
                        {price === 0 && <span className="block text-xs text-emerald-500 font-semibold mt-1.5">Free forever</span>}
                      </>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3.5 mb-8 flex-1">
                    {(plan.displayFeatures || []).map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                        <Check />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  <Link
                    to={isEnterprise ? '#' : `/signup?plan=${plan.slug}${yearly ? '&billing=yearly' : ''}`}
                    className={`relative w-full text-center py-3.5 rounded-xl font-semibold transition-all duration-300 overflow-hidden group/btn ${
                      isPopular
                        ? 'bg-gradient-to-r from-primary-600 to-teal-500 text-white shadow-lg shadow-primary-200/50 hover:shadow-xl hover:shadow-primary-300/50 hover:-translate-y-0.5'
                        : isEnterprise
                          ? 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md'
                    }`}
                  >
                    <span className="relative z-10">
                      {isEnterprise ? 'Contact Sales' : price === 0 ? 'Start Free' : 'Get Started'}
                    </span>
                    {isPopular && <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-teal-600 opacity-0 group-hover/btn:opacity-100 transition-opacity" />}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══════════════════ TRUST SIGNALS ═══════════════════ */}
      <section ref={trustRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trustSignals.map((t, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100" style={reveal(trustVis, i * 0.08)}>
              <svg className="w-5 h-5 text-primary-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
              </svg>
              <span className="text-xs font-semibold text-gray-600">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ COMPARISON TABLE ═══════════════════ */}
      <section ref={tableRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-14" style={reveal(tableVis)}>
          <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-full px-4 py-1.5 mb-5">
            <span className="text-xs font-semibold text-primary-700">Detailed Comparison</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Compare Plans</h2>
          <p className="text-gray-500 mt-3 max-w-lg mx-auto">See exactly what you get with each plan. All plans include SSL, hosting, and basic support.</p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-hidden rounded-2xl border border-gray-200 shadow-sm" style={reveal(tableVis, 0.1)}>
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-50/50 border-b border-gray-200">
                <th className="text-left text-sm font-bold text-gray-900 py-5 px-6 w-1/5">Feature</th>
                {plans.map(p => (
                  <th key={p.slug} className={`text-center text-sm font-bold py-5 px-4 ${p.is_popular ? 'text-primary-600 bg-primary-50/50' : 'text-gray-900'}`}>
                    {p.name}
                    {p.is_popular && <span className="ml-2 text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Popular</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compRows.map((row, i) => (
                <tr key={i} className={`border-b border-gray-100 transition-colors hover:bg-gray-50/50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <td className="text-sm text-gray-700 py-4 px-6 font-medium">{row.label}</td>
                  {plans.map(p => (
                    <td key={p.slug} className={`text-center py-4 px-4 ${p.is_popular ? 'bg-primary-50/20' : ''}`}>
                      <div className="flex justify-center"><CellValue val={row[p.slug]} /></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile comparison */}
        <div className="md:hidden space-y-4" style={reveal(tableVis, 0.1)}>
          {plans.map(plan => (
            <details key={plan.slug} className="group rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <summary className="flex items-center justify-between p-5 cursor-pointer bg-white hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{plan.icon}</span>
                  <span className={`font-bold text-gray-900 ${plan.is_popular ? 'text-primary-600' : ''}`}>{plan.name}</span>
                  {plan.is_popular && <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-2.5 py-0.5 rounded-full">POPULAR</span>}
                </div>
                <svg className="w-5 h-5 text-gray-400 transition-transform duration-300 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-5 pb-5 space-y-2.5 border-t border-gray-100 pt-4 bg-gray-50/50">
                {compRows.map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{row.label}</span>
                    <CellValue val={row[plan.slug]} />
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ═══════════════════ FAQ ═══════════════════ */}
      <section ref={faqRef} className="py-16 sm:py-24 bg-gray-50/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14" style={reveal(faqVis)}>
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-full px-4 py-1.5 mb-5">
              <span className="text-xs font-semibold text-amber-700">FAQ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="text-gray-500 mt-3">Can't find what you're looking for? <a href="mailto:support@ecomai.dev" className="text-primary-600 font-semibold hover:underline">Contact our team</a>.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`bg-white rounded-xl border overflow-hidden transition-all duration-300 ${openFaq === i ? 'border-primary-200 shadow-lg shadow-primary-50' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
                style={reveal(faqVis, 0.05 + i * 0.03)}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left group"
                >
                  <span className={`text-sm font-semibold pr-4 transition-colors ${openFaq === i ? 'text-primary-700' : 'text-gray-900 group-hover:text-primary-700'}`}>{faq.q}</span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${openFaq === i ? 'bg-primary-100 rotate-180' : 'bg-gray-100 group-hover:bg-primary-50'}`}>
                    <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                <div className={`overflow-hidden transition-all duration-400 ease-out ${openFaq === i ? 'max-h-48 pb-5' : 'max-h-0'}`}>
                  <p className="px-5 text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section ref={ctaRef} className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[2rem] overflow-hidden p-12 sm:p-16 text-center" style={reveal(ctaVis)}>
            {/* Animated gradient BG */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-teal-500 to-emerald-500 bg-[length:200%_200%] animate-[gradient-x_6s_ease_infinite]" />
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20 blur-3xl bg-white" />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-15 blur-3xl bg-white" />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <h2 className="relative text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Still Have Questions?
            </h2>
            <p className="relative text-lg text-white/80 max-w-xl mx-auto mb-10">
              Our team is here to help. Start a free trial or chat with us anytime.
            </p>
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="group w-full sm:w-auto bg-white text-primary-700 px-8 py-4 rounded-2xl text-base font-semibold hover:bg-gray-50 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex items-center justify-center gap-2.5">
                Start Free Trial
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <a href="mailto:support@ecomai.dev" className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-2xl text-base font-semibold hover:bg-white/10 hover:border-white/50 transition-all flex items-center justify-center">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="bg-gray-950 text-gray-400 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-8 pb-14 border-b border-gray-800/80">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center shadow-lg shadow-primary-900/30">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <span className="text-xl font-extrabold text-white">Ecomai</span>
              </div>
              <p className="text-sm leading-relaxed mb-6 max-w-xs">The all-in-one e-commerce platform built for Bangladesh and beyond.</p>
              <div className="flex gap-3">
                {[
                  { label: 'Twitter', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                  { label: 'Facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                  { label: 'LinkedIn', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                ].map((s, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-xl bg-gray-800/80 hover:bg-primary-600 flex items-center justify-center transition-all hover:scale-110 hover:shadow-lg hover:shadow-primary-900/30" aria-label={s.label}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={s.path} /></svg>
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Product', links: [['Features', '/'], ['Pricing', '/pricing'], ['Templates', '#']] },
              { title: 'Company', links: [['About', '#'], ['Blog', '#'], ['Contact', '#']] },
              { title: 'Resources', links: [['Documentation', '#'], ['Help Center', '#'], ['API Reference', '#']] },
              { title: 'Legal', links: [['Privacy Policy', '#'], ['Terms of Service', '#'], ['GDPR', '#']] },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-sm font-semibold text-white mb-4 tracking-wide">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map(([label, href], j) => (
                    <li key={j}>
                      {href.startsWith('/') ? (
                        <Link to={href} className="text-sm hover:text-white transition-colors">{label}</Link>
                      ) : (
                        <a href={href} className="text-sm hover:text-white transition-colors">{label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
            <p className="text-sm">&copy; {new Date().getFullYear()} Ecomai. All rights reserved.</p>
            <div className="flex items-center gap-6 text-xs text-gray-600">
              <span>Built with ❤️ in Bangladesh</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

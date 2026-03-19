import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { register, setTokens } from '../api';
import { useAuth } from '../contexts/AuthContext';

/* ════════════════════════════════════════════════════════════════
   FEATURE PARSING — same logic as Pricing.jsx, mirrored here
   since plan data comes from the same API endpoint
   ════════════════════════════════════════════════════════════════ */

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
  if (plan.image_limit_per_product === -1) out.push('Unlimited images / product');
  else if ((plan.image_limit_per_product ?? 5) > 5) out.push(`${plan.image_limit_per_product} images / product`);
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

/* ════════════════════════════════════════════════════════════════
   UI HELPERS
   ════════════════════════════════════════════════════════════════ */

function CheckIcon({ className = 'w-4 h-4 text-emerald-400 shrink-0' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['Too weak', 'Weak', 'Fair', 'Strong'];
  const colors = ['bg-red-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-400'];
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      <p className={`text-xs ${score > 0 ? colors[score - 1].replace('bg-', 'text-').replace('-400', '-600') : 'text-gray-400'}`}>
        {labels[Math.max(0, score - 1)]}
      </p>
    </div>
  );
}

/* Plan card shown in the selector */
function PlanCard({ plan, selected, onSelect }) {
  const price = plan.price_monthly;
  const hasTrial = plan.trial_days > 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(plan)}
      className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
        selected
          ? 'border-primary-500 bg-primary-50/70 shadow-md'
          : 'border-gray-100 hover:border-gray-200 bg-white hover:shadow-sm'
      }`}
    >
      {plan.is_popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 to-teal-500 text-white text-[10px] font-bold px-4 py-1 rounded-full shadow-sm">
          MOST POPULAR
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-gray-900">{plan.name}</p>
          {plan.tagline && (
            <p className="text-xs text-gray-500 mt-0.5">{plan.tagline}</p>
          )}
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-gray-900">
          {price === 0 ? 'Free' : `৳${Number(price).toLocaleString()}`}
        </span>
        {price > 0 && <span className="text-sm font-medium text-gray-400">/mo</span>}
      </div>

      {hasTrial && price > 0 && (
        <p className="text-xs text-amber-600 font-medium mt-1">{plan.trial_days}-day free trial</p>
      )}
      {price === 0 && (
        <p className="text-xs text-emerald-600 font-medium mt-1">No credit card required</p>
      )}
    </button>
  );
}

/* Plan perk summary — shown after a plan is selected */
function PlanPerks({ plan }) {
  const perks = buildDisplayFeatures(plan);
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <CheckIcon className="w-4 h-4 text-primary-500" />
        <p className="text-xs font-semibold text-gray-700">
          Your <span className="text-primary-600">{plan.name}</span> plan includes:
        </p>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {perks.map((perk, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
            <CheckIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {perk}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */

export default function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({
    shop_name: '',
    slug: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    industry: '',
    plan: searchParams.get('plan') || 'free',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [planOptions, setPlanOptions] = useState([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [entered, setEntered] = useState(false);

  useEffect(() => { setEntered(true); }, []);

  useEffect(() => {
    register.plans()
      .then(data => {
        const items = (data.items || [])
          .filter(p => p.is_active !== false)
          .map(p => ({
            ...p,
            price_monthly: Number(p.price_monthly) || 0,
            price_yearly: Number(p.price_yearly) || 0,
            displayFeatures: buildDisplayFeatures(p),
          }))
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        if (items.length) setPlanOptions(items);
      })
      .catch(() => {})
      .finally(() => setPlansLoaded(true));
  }, []);

  const handleSlug = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 40);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'shop_name' ? { slug: handleSlug(value) } : {}),
    }));
  };

  const handleSelectPlan = (plan) => {
    setForm(prev => ({ ...prev, plan: plan.slug }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    setError('');
    setLoading(true);
    try {
      const result = await register.create(form);
      if (result.requiresPayment && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      setStep(2);
      setLoading(false);
    }
  };

  const selectedPlan = planOptions.find(p => p.slug === form.plan);
  const isPaidPlan = selectedPlan ? selectedPlan.price_monthly > 0 : false;

  const inputCls = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm";
  const labelCls = "block text-sm font-semibold text-gray-700 mb-1.5";

  const leftFeatures = [
    { title: 'Accept Every Payment', desc: 'bKash, Nagad, SSLCommerz, and cash on delivery — all from one dashboard.' },
    { title: 'Automated Settlements', desc: 'Your money goes directly to your bank or mobile wallet on your schedule.' },
    { title: 'Delivery Integration', desc: 'Connect with Pathao and manage shipments without leaving Ecomai.' },
    { title: 'Real-Time Analytics', desc: "Know exactly what's selling, what's in stock, and where your revenue comes from." },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-gray-50">

      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[46%] bg-gradient-to-br from-primary-700 via-primary-600 to-teal-600 relative items-center justify-center p-12 xl:p-16">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />

        <div className="relative text-white max-w-md">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight">Ecomai</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Everything you need<br />to sell online in Bangladesh.
          </h2>
          <p className="text-white/65 text-base leading-relaxed mb-10">
            Powerful storefronts, secure payments, automated settlements, and real-time analytics — all in one platform.
          </p>

          <div className="space-y-5">
            {leftFeatures.map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white mb-0.5">{f.title}</div>
                  <div className="text-xs text-white/55 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-3 gap-4">
            {[
              { v: 'Free', l: 'Plan available' },
              { v: 'No CC', l: 'Required' },
              { v: '24hr', l: 'Setup time' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-xl font-bold text-white">{s.v}</div>
                <div className="text-xs text-white/45 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-start justify-center bg-white px-6 sm:px-10 py-10 lg:py-14 overflow-y-auto">
        <div className={`w-full max-w-lg transition-all duration-700 ${entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>

          {/* Mobile header */}
          <div className="flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent">Ecomai</span>
            </Link>
            <div className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition">Sign in</Link>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {step > s ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                <span className={`text-xs font-medium ${step >= s ? 'text-primary-600' : 'text-gray-400'}`}>
                  {s === 1 ? 'Store Details' : 'Account'}
                </span>
                {s < 2 && <div className={`w-8 h-px ${step >= 2 ? 'bg-primary-400' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {step === 1 ? 'Name your store' : 'Create your account'}
            </h1>
            <p className="text-gray-500 mt-1.5 text-sm">
              {step === 1
                ? "Choose a name, pick your plan, and we'll set everything up."
                : 'Set your login credentials to access your dashboard.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {step === 1 ? (
              <>
                {/* Shop Name */}
                <div>
                  <label className={labelCls}>Shop Name *</label>
                  <input
                    name="shop_name"
                    value={form.shop_name}
                    onChange={handleChange}
                    required
                    className={inputCls}
                    placeholder="e.g. Rahim's Electronics"
                  />
                </div>

                {/* Store URL */}
                <div>
                  <label className={labelCls}>Store URL</label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition">
                    <span className="px-4 py-3 text-gray-400 text-sm border-r border-gray-200 bg-gray-100 whitespace-nowrap font-medium">
                      ecomai.com/store/
                    </span>
                    <input
                      name="slug"
                      value={form.slug}
                      onChange={handleChange}
                      required
                      className="flex-1 px-3 py-3 focus:outline-none bg-transparent text-sm"
                      placeholder="your-store"
                      pattern="[a-z0-9-]+"
                      title="Lowercase letters, numbers, and hyphens only"
                    />
                  </div>
                  {form.slug && (
                    <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                      your store will be live at ecomai.com/store/{form.slug}
                    </p>
                  )}
                </div>

                {/* Industry */}
                <div>
                  <label className={labelCls}>Industry</label>
                  <select name="industry" value={form.industry} onChange={handleChange} className={inputCls}>
                    <option value="">Select your industry</option>
                    <option value="fashion">Fashion & Apparel</option>
                    <option value="electronics">Electronics & Gadgets</option>
                    <option value="food">Food & Beverage</option>
                    <option value="health">Health & Beauty</option>
                    <option value="home">Home & Living</option>
                    <option value="services">Services</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Plan selector */}
                <div>
                  <label className={labelCls}>Choose your plan</label>
                  {!plansLoaded ? (
                    <div className="flex justify-center py-6">
                      <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {planOptions.filter(p => p.slug !== 'enterprise').map(p => (
                        <PlanCard
                          key={p.slug}
                          plan={p}
                          selected={form.plan === p.slug}
                          onSelect={handleSelectPlan}
                        />
                      ))}
                      {/* Enterprise — contact sales */}
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, plan: 'enterprise' }))}
                        className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-300 ${
                          form.plan === 'enterprise'
                            ? 'border-primary-500 bg-primary-50/70 shadow-md'
                            : 'border-gray-100 hover:border-gray-200 bg-white hover:shadow-sm'
                        }`}
                      >
                        <p className="text-sm font-bold text-gray-900 mb-1">Enterprise</p>
                        <p className="text-xs text-gray-500 mb-2">For large operations</p>
                        <p className="text-lg font-extrabold text-gray-900">Custom</p>
                        <p className="text-xs text-gray-400 mt-0.5">Talk to sales</p>
                      </button>
                    </div>
                  )}
                </div>

                {/* Plan perks — shown after plan is selected */}
                {selectedPlan && (
                  <PlanPerks plan={selectedPlan} />
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-200/60 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm"
                >
                  Continue
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {/* Full Name + Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input
                      name="full_name"
                      value={form.full_name}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="John Doe"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      className={inputCls}
                      placeholder="+880 1XXXXXXXXX"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className={labelCls}>Email *</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className={inputCls}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className={labelCls}>Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm"
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <PasswordStrength password={form.password} />
                </div>

                {/* Plan summary */}
                {selectedPlan && (
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    <div>
                      <span className="text-sm font-semibold text-gray-800">{selectedPlan.name}</span>
                      {selectedPlan.price_monthly > 0 ? (
                        <span className="text-sm text-gray-500 ml-2">
                          ৳{Number(selectedPlan.price_monthly).toLocaleString()}/month
                        </span>
                      ) : (
                        <span className="text-sm text-emerald-600 font-medium ml-2">Free forever</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-primary-600 font-medium hover:text-primary-700"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Payment notice for paid plans */}
                {isPaidPlan && (
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                    </svg>
                    <div>
                      <p className="text-xs text-amber-700 font-medium leading-relaxed">
                        You'll be redirected to SSLCommerz to complete payment.
                      </p>
                      {selectedPlan?.trial_days > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          You won't be charged until your {selectedPlan.trial_days}-day trial ends.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all text-sm"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-3.5 bg-gradient-to-r from-primary-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-primary-200/60 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2 text-sm"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {isPaidPlan ? 'Redirecting...' : 'Creating store...'}
                      </>
                    ) : (
                      <>
                        {isPaidPlan ? 'Continue to Payment' : 'Create My Store'}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            By creating an account, you agree to our{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 transition">Terms of Service</a> and{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 transition">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* ─── Intersection Observer hook for scroll reveal ─── */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─── Data ─── */
const stats = [
  { value: '10,000+', label: 'Active Stores' },
  { value: '2M+', label: 'Orders Processed' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '24/7', label: 'Expert Support' },
];

const features = [
  { icon: 'store', title: 'Beautiful Storefronts', desc: 'Launch a stunning online store in minutes with 5+ designer templates and full customization.' },
  { icon: 'box', title: 'Product Management', desc: 'Manage products, variants, categories, and inventory from a powerful admin dashboard.' },
  { icon: 'card', title: 'Secure Payments', desc: 'Accept payments via SSLCommerz, bKash, and more with PCI-compliant checkout.' },
  { icon: 'truck', title: 'Delivery Tracking', desc: 'Built-in driver assignment, real-time tracking, and customer delivery notifications.' },
  { icon: 'chart', title: 'Analytics & Insights', desc: 'Track revenue, orders, and customer behavior with real-time analytics dashboards.' },
  { icon: 'megaphone', title: 'Marketing Tools', desc: 'Create email/SMS campaigns, popups, countdown timers, and discount codes.' },
  { icon: 'palette', title: 'Website Settings', desc: '15+ customization panels: branding, SEO, currency, analytics, popups, and more.' },
  { icon: 'shield', title: 'Enterprise Security', desc: 'Multi-tenant isolation, rate limiting, helmet headers, and encrypted credentials.' },
];

const steps = [
  { num: '01', title: 'Create Your Store', desc: 'Sign up in 30 seconds. Choose a template, set your brand colors, and add your logo.' },
  { num: '02', title: 'Add Products', desc: 'Upload products with variants, images, and pricing. Organize into categories.' },
  { num: '03', title: 'Start Selling', desc: 'Share your store link. Accept payments, fulfill orders, and grow your business.' },
];

const testimonials = [
  { name: 'Amina Rahman', role: 'Founder, Dhaka Delights', text: 'Ecomai transformed my home bakery into a real online business. The setup took less than 10 minutes and I got my first order the same day.', rating: 5 },
  { name: 'Karim Ahmed', role: 'CEO, TechGadgets BD', text: 'The multi-tenant architecture is brilliant. I manage 3 different stores from one dashboard. The delivery tracking alone saved us hours every week.', rating: 5 },
  { name: 'Sarah Chen', role: 'Owner, Artisan Coffee Co', text: 'Best e-commerce platform for Bangladesh. SSLCommerz integration works flawlessly and the storefront templates are beautiful on mobile.', rating: 5 },
];

/* ─── SVG Icons ─── */
function FeatureIcon({ type }) {
  const icons = {
    store: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M3 3h18l-2 13H5L3 3zm3 13a2 2 0 104 0m6 0a2 2 0 10-4 0" />,
    box: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
    card: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 14h2m4 0h4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />,
    truck: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10m10 0H3m10 0a2 2 0 104 0m-4 0h4m-4 0a2 2 0 10-4 0m-6 0a2 2 0 104 0M1 16h2m13-10h2l3 5v5h-2" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0h6m-6 0H3m12 0v-9a2 2 0 012-2h2a2 2 0 012 2v9m-6 0h6" />,
    megaphone: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />,
    palette: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />,
    shield: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  };
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icons[type]}</svg>;
}

function Stars({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
      ))}
    </div>
  );
}

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroRef, heroVisible] = useReveal(0.1);
  const [statsRef, statsVisible] = useReveal();
  const [featRef, featVisible] = useReveal(0.05);
  const [stepsRef, stepsVisible] = useReveal();
  const [testRef, testVisible] = useReveal();
  const [ctaRef, ctaVisible] = useReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const revealStyle = (visible, delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(32px)',
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  });

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Ecomai</span>
          </Link>
          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">How It Works</a>
            <Link to="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Pricing</Link>
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Sign In</Link>
            <Link to="/signup" className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all hover:-translate-y-0.5">
              Get Started Free
            </Link>
          </div>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition" aria-label="Menu">
            <div className="w-5 h-5 relative">
              <span className={`absolute left-0 w-5 h-0.5 bg-gray-700 rounded transition-all duration-300 ${mobileOpen ? 'top-2.5 rotate-45' : 'top-1'}`} />
              <span className={`absolute left-0 top-2.5 w-5 h-0.5 bg-gray-700 rounded transition-all duration-300 ${mobileOpen ? 'opacity-0' : 'opacity-100'}`} />
              <span className={`absolute left-0 w-5 h-0.5 bg-gray-700 rounded transition-all duration-300 ${mobileOpen ? 'top-2.5 -rotate-45' : 'top-4'}`} />
            </div>
          </button>
        </div>
        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 bg-white/95 backdrop-blur-xl ${mobileOpen ? 'max-h-80 border-b border-gray-100' : 'max-h-0'}`}>
          <div className="px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Features</a>
            <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-700 py-2">How It Works</a>
            <Link to="/pricing" className="block text-sm font-medium text-gray-700 py-2">Pricing</Link>
            <Link to="/login" className="block text-sm font-medium text-gray-700 py-2">Sign In</Link>
            <Link to="/signup" className="block text-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section ref={heroRef} className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000\' fill-opacity=\'1\'%3E%3Cpath d=\'M0 0h1v1H0zm20 0h1v1h-1zm0 20h1v1h-1zM0 20h1v1H0z\'/%3E%3C/g%3E%3C/svg%3E")' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div style={revealStyle(heroVisible, 0)}>
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mb-6">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>
              <span className="text-xs font-semibold text-indigo-700">Now in Public Beta — Free to try</span>
            </div>
          </div>

          <h1 style={revealStyle(heroVisible, 0.1)} className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
            Build Your Online Store<br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">In Minutes, Not Months</span>
          </h1>

          <p style={revealStyle(heroVisible, 0.2)} className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Everything you need to launch, manage, and scale your e-commerce business. Beautiful storefronts, secure payments, delivery tracking, and marketing tools — all in one platform.
          </p>

          <div style={revealStyle(heroVisible, 0.3)} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3.5 rounded-full text-base font-semibold hover:shadow-xl hover:shadow-indigo-200 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
              Start Free Trial
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto border-2 border-gray-200 bg-white text-gray-700 px-8 py-3.5 rounded-full text-base font-semibold hover:border-gray-300 hover:shadow-md transition-all flex items-center justify-center gap-2">
              View Pricing
            </Link>
          </div>

          <p style={revealStyle(heroVisible, 0.4)} className="mt-5 text-sm text-gray-400">No credit card required. Set up in under 2 minutes.</p>

          {/* Dashboard Preview */}
          <div style={revealStyle(heroVisible, 0.5)} className="mt-16 mx-auto max-w-4xl">
            <div className="relative rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-200/60 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/80">
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400"></div><div className="w-3 h-3 rounded-full bg-amber-400"></div><div className="w-3 h-3 rounded-full bg-green-400"></div></div>
                <div className="flex-1 flex justify-center"><div className="bg-gray-200 rounded-md px-4 py-1 text-xs text-gray-500 font-mono">ecomai.dev/admin</div></div>
              </div>
              <div className="p-6 sm:p-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[{ l: 'Revenue', v: '৳87,450', c: 'text-emerald-600', bg: 'bg-emerald-50' }, { l: 'Orders', v: '142', c: 'text-indigo-600', bg: 'bg-indigo-50' }, { l: 'Customers', v: '89', c: 'text-purple-600', bg: 'bg-purple-50' }, { l: 'Products', v: '18', c: 'text-amber-600', bg: 'bg-amber-50' }].map((s, i) => (
                    <div key={i} className={`${s.bg} rounded-xl p-4 text-left`}>
                      <p className="text-xs font-medium text-gray-500">{s.l}</p>
                      <p className={`text-xl sm:text-2xl font-bold ${s.c} mt-1`}>{s.v}</p>
                    </div>
                  ))}
                </div>
                {/* Mini chart bars */}
                <div className="flex items-end gap-2 h-32 px-2">
                  {[40, 55, 35, 65, 80, 60, 90, 75, 95, 70, 85, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500 to-purple-400 transition-all duration-1000" style={{ height: heroVisible ? `${h}%` : '0%', transitionDelay: `${0.8 + i * 0.05}s` }} />
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-gray-400 px-2">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => <span key={m}>{m}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Bar ─── */}
      <section ref={statsRef} className="py-12 border-y border-gray-100 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center" style={revealStyle(statsVisible, i * 0.1)}>
                <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" ref={featRef} className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" style={revealStyle(featVisible, 0)}>
            <div className="inline-flex items-center gap-2 bg-indigo-50 rounded-full px-4 py-1.5 mb-4">
              <span className="text-xs font-semibold text-indigo-700">Powerful Features</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything You Need to Sell Online</h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">Powerful tools designed for growing businesses. From storefront to delivery, we've got you covered.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group relative rounded-2xl border border-gray-100 bg-white p-6 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300" style={revealStyle(featVisible, 0.05 * i)}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:text-white group-hover:border-transparent transition-all duration-300 mb-4">
                  <FeatureIcon type={f.icon} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" ref={stepsRef} className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" style={revealStyle(stepsVisible, 0)}>
            <div className="inline-flex items-center gap-2 bg-indigo-50 rounded-full px-4 py-1.5 mb-4">
              <span className="text-xs font-semibold text-indigo-700">Simple Setup</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Up and Running in 3 Steps</h2>
            <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">No technical skills needed. Go from zero to selling in minutes.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((s, i) => (
              <div key={i} className="relative text-center" style={revealStyle(stepsVisible, 0.15 * i)}>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-indigo-200" />
                )}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-xl font-bold mb-5 relative z-10 shadow-lg shadow-indigo-200">
                  {s.num}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section ref={testRef} className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" style={revealStyle(testVisible, 0)}>
            <div className="inline-flex items-center gap-2 bg-indigo-50 rounded-full px-4 py-1.5 mb-4">
              <span className="text-xs font-semibold text-indigo-700">Testimonials</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Loved by Business Owners</h2>
            <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">Join thousands of entrepreneurs who trust Ecomai to power their online stores.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-100 transition-all duration-300" style={revealStyle(testVisible, 0.15 * i)}>
                <Stars count={t.rating} />
                <p className="mt-4 text-gray-600 leading-relaxed text-sm">"{t.text}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section ref={ctaRef} className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-10 sm:p-16 text-center" style={revealStyle(ctaVisible)}>
            {/* Glow decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />

            <h2 className="relative text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Ready to Grow Your<br />Business Online?
            </h2>
            <p className="relative text-lg text-white/80 max-w-xl mx-auto mb-8">
              Join thousands of store owners who trust Ecomai. Start your free trial today — no credit card required.
            </p>
            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="w-full sm:w-auto bg-white text-indigo-700 px-8 py-3.5 rounded-full text-base font-semibold hover:bg-gray-50 hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                Create Your Store Now
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <Link to="/pricing" className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-3.5 rounded-full text-base font-semibold hover:bg-white/10 transition-all flex items-center justify-center">
                See Pricing Plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-gray-950 text-gray-400 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-gray-800">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <span className="text-lg font-bold text-white">Ecomai</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">The all-in-one e-commerce platform built for Bangladesh and beyond.</p>
              <div className="flex gap-3">
                {/* Social icons */}
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition" aria-label="Twitter">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition" aria-label="Facebook">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-indigo-600 flex items-center justify-center transition" aria-label="LinkedIn">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
              </div>
            </div>
            {/* Links */}
            {[
              { title: 'Product', links: [['Features', '#features'], ['Pricing', '/pricing'], ['Templates', '#'], ['Integrations', '#']] },
              { title: 'Company', links: [['About', '#'], ['Blog', '#'], ['Careers', '#'], ['Contact', '#']] },
              { title: 'Resources', links: [['Documentation', '#'], ['Help Center', '#'], ['API Reference', '#'], ['Status', '#']] },
              { title: 'Legal', links: [['Privacy Policy', '#'], ['Terms of Service', '#'], ['Cookie Policy', '#']] },
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

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

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

function useCounter(target, duration = 1800) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, duration]);
  return [ref, count];
}

/* ════════════════════════════════════════════════════════════════
   DATA
   ════════════════════════════════════════════════════════════════ */

const PLATFORM_STATS = [
  { value: 5000, suffix: '+', label: 'Active Merchants', icon: 'M19 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14m14 0h2m-2 0h-2m-2 0a2 2 0 01-2-2V8m0 0a2 2 0 012-2h2m0 0H7m2 0v8a2 2 0 002 2h2m2 0h2M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z' },
  { value: 99, suffix: '.9%', label: 'Platform Uptime', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { value: 50, suffix: '+', label: 'Cities Covered', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { value: 4, suffix: '.9★', label: 'Merchant Rating', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
];

const VALUE_PROPS = [
  {
    icon: 'M3 10h18M7 14h2m4 0h4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z',
    title: 'Accept Every Payment Method',
    desc: 'SSLCommerz, bKash, Nagad, Rocket, and card payments — all integrated with automatic settlement. No payment reconciliation headaches.',
    color: '#1a73e8',
    bg: '#eff6ff',
  },
  {
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    title: 'Built for COD Commerce',
    desc: 'Cash-on-delivery is how Bangladesh shops. Full COD workflow — driver assignment, collection tracking, and automatic reconciliation.',
    color: '#059669',
    bg: '#ecfdf5',
  },
  {
    icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
    title: 'Automated Delivery Tracking',
    desc: 'Built-in delivery requests with Pathao, Steadfast, and manual courier support. Real-time status for every order.',
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
  {
    icon: 'M9 3v2m6-2v2m6 2v2M5 9H3m10 0h2M5 15H3m10 0h2M5 5l1 14a2 2 0 002 2h8a2 2 0 002-2L19 5H5z',
    title: 'Instant Settlements',
    desc: 'Automatic escrow with configurable hold periods. Funds release to your account automatically after delivery confirmation.',
    color: '#d97706',
    bg: '#fffbeb',
  },
  {
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    title: 'Smart Refund Management',
    desc: 'Customer refund requests with approval workflows. Disputes tracked and resolved without losing money.',
    color: '#dc2626',
    bg: '#fef2f2',
  },
  {
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0h6m-6 0H3m12 0v-9a2 2 0 012-2h2a2 2 0 012 2v9m-6 0h6',
    title: 'Real-Time Business Dashboard',
    desc: 'Revenue, orders, and customer insights updated live. Know exactly how your store is performing — any time of day.',
    color: '#0891b2',
    bg: '#ecfeff',
  },
];

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Create Your Store',
    desc: 'Register in seconds. Choose your store name, upload your logo, and set your brand colors. No technical knowledge required.',
    icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
  },
  {
    num: '02',
    title: 'Add Products & Accept Orders',
    desc: 'List your products with photos, variants, and pricing. Share your store link on social media and WhatsApp.',
    icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    num: '03',
    title: 'Fulfill & Get Paid',
    desc: 'Process orders from your dashboard, track deliveries in real-time, and receive settlements directly to your account.',
    icon: 'M13 7l5 5m0 0l-5 5m5-5H6',
  },
];

const WHY_ECOMAI = [
  {
    icon: 'M9 12l2 2 4-4m6.165 1.69a9.953 9.953 0 010 1.69M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z',
    title: 'Local-First Platform',
    desc: 'Designed for how commerce actually works in Bangladesh. Every feature accounts for local payment habits and delivery realities.',
  },
  {
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    title: 'Enterprise-Grade Security',
    desc: 'Multi-tenant isolation, encrypted credentials, rate limiting, and helmet security headers. Your data and your customers\' data are protected.',
  },
  {
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    title: 'Zero Setup Fee',
    desc: 'Start selling immediately. No upfront costs, no contracts, and transparent pricing. Pay only for what you use.',
  },
];

const MERCHANT_TYPES = [
  {
    title: 'Individual Sellers',
    desc: 'Home bakers, boutique owners, and independent creators. Sell directly through your own branded storefront without marketplace fees.',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 100-14 7 7 0 000 14z',
  },
  {
    title: 'Growing Brands',
    desc: 'Established businesses scaling online. Multi-channel order management, automated fulfillment, and real-time financial reporting.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    title: 'Multi-Store Operators',
    desc: 'Manage multiple storefronts or franchises from a single dashboard. One login, complete visibility across all your stores.',
    icon: 'M19 21V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14m14 0h2m-2 0h-2m-2 0a2 2 0 01-2-2V8m0 0a2 2 0 012-2h2m0 0H7m2 0v8a2 2 0 002 2h2m2 0h2M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5z',
  },
];

const INTEGRATIONS = [
  { name: 'SSLCommerz', desc: 'Payment Gateway', color: '#1a73e8', abbr: 'SSL' },
  { name: 'bKash', desc: 'Mobile Banking', color: '#e2136e', abbr: 'BK' },
  { name: 'Nagad', desc: 'Digital Wallet', color: '#f6921e', abbr: 'NG' },
  { name: 'Rocket', desc: 'P2P Payments', color: '#8dc351', abbr: 'RK' },
  { name: 'Pathao', desc: 'Delivery Partner', color: '#21bf73', abbr: 'PT' },
  { name: 'Steadfast', desc: 'Courier Service', color: '#ff6b35', abbr: 'SF' },
  { name: 'Google', desc: 'Analytics & Ads', color: '#4285f4', abbr: 'G' },
  { name: 'WhatsApp', desc: 'Customer Chat', color: '#25d366', abbr: 'WA' },
];

/* ════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ════════════════════════════════════════════════════════════════ */

function CountUp({ target, suffix = '', prefix = '' }) {
  const [ref, count] = useCounter(target);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */

export default function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dashRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  /* reveal refs */
  const [heroRef, heroVis] = useReveal(0.1);
  const [trustRef, trustVis] = useReveal();
  const [statsRef, statsVis] = useReveal();
  const [valueRef, valueVis] = useReveal(0.05);
  const [whyRef, whyVis] = useReveal();
  const [stepsRef, stepsVis] = useReveal();
  const [typesRef, typesVis] = useReveal();
  const [intRef, intVis] = useReveal();
  const [ctaRef, ctaVis] = useReveal();

  /* scroll listener */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* 3-D tilt on dashboard */
  const handleMouseMove = useCallback((e) => {
    if (!dashRef.current) return;
    const r = dashRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / r.width;
    const y = (e.clientY - r.top - r.height / 2) / r.height;
    setTilt({ x: y * -4, y: x * 6 });
  }, []);
  const resetTilt = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  const reveal = (vis, delay = 0) => ({
    opacity: vis ? 1 : 0,
    transform: vis ? 'translateY(0)' : 'translateY(32px)',
    transition: `opacity 0.65s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.65s cubic-bezier(.16,1,.3,1) ${delay}s`,
  });

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ═══════════════════ NAVBAR ═══════════════════ */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100/80' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center shadow-lg shadow-primary-200/50">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent">Ecomai</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              ['Features', '#features'],
              ['How It Works', '#how-it-works'],
              ['Integrations', '#integrations'],
            ].map(([l, h]) => (
              <a key={l} href={h} className="relative text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group">
                {l}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-500 to-teal-500 rounded-full group-hover:w-full transition-all duration-300" />
              </a>
            ))}
            <Link to="/pricing" className="relative text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group">
              Pricing
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary-500 to-teal-500 rounded-full group-hover:w-full transition-all duration-300" />
            </Link>
          </div>

          {/* Auth CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">Sign In</Link>
            <Link to="/signup" className="relative bg-gradient-to-r from-primary-600 to-teal-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-primary-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden group">
              <span className="relative z-10">Start Free</span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition" aria-label="Menu">
            <div className="w-5 h-5 relative">
              <span className={`absolute left-0 w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? 'top-2 rotate-45' : 'top-0.5'}`} />
              <span className={`absolute left-0 top-2 w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? 'opacity-0 scale-0' : 'opacity-100'}`} />
              <span className={`absolute left-0 w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 ${mobileOpen ? 'top-2 -rotate-45' : 'top-3.5'}`} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-400 bg-white/95 backdrop-blur-xl ${mobileOpen ? 'max-h-96 border-b border-gray-100 shadow-xl' : 'max-h-0'}`}>
          <div className="px-4 py-5 space-y-1">
            {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Integrations', '#integrations'], ['Pricing', '/pricing']].map(([l, h]) => (
              <a key={l} href={h} onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-gray-700 py-2.5 px-3 rounded-lg hover:bg-gray-50 transition">{l}</a>
            ))}
            <div className="pt-3 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block text-center text-sm font-medium text-gray-600 py-2.5 px-4 rounded-lg border border-gray-200">Sign In</Link>
              <Link to="/signup" onClick={() => setMobileOpen(false)} className="block text-center bg-gradient-to-r from-primary-600 to-teal-500 text-white py-2.5 px-4 rounded-xl text-sm font-semibold">Start Free</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section ref={heroRef} className="relative pt-24 pb-12 sm:pt-32 sm:pb-16 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-[15%] -left-[8%] w-[550px] h-[550px] bg-primary-100/40 rounded-full blur-[120px]" />
          <div className="absolute top-[5%] right-[5%] w-[400px] h-[400px] bg-teal-100/30 rounded-full blur-[100px]" />
          <div className="absolute -bottom-[10%] right-[20%] w-[350px] h-[350px] bg-emerald-100/20 rounded-full blur-[80px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #1a73e8 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Trust badge */}
            <div style={reveal(heroVis, 0)} className="inline-flex items-center gap-2.5 bg-white border border-gray-200 rounded-full px-5 py-2 mb-8 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-gray-600 tracking-wide">Now accepting new merchants across Bangladesh</span>
            </div>

            {/* Headline */}
            <h1 style={reveal(heroVis, 0.1)} className="text-4xl sm:text-5xl md:text-[3.5rem] font-extrabold tracking-tight text-gray-900 leading-[1.1]">
              The E-Commerce Platform
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-primary-600 to-teal-500 bg-clip-text text-transparent"> Built for Bangladesh</span>
            </h1>

            {/* Subtitle */}
            <p style={reveal(heroVis, 0.2)} className="mt-6 text-lg sm:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
              Accept bKash, Nagad, SSLCommerz, and COD from a single storefront. Automated settlements, real-time tracking, and zero setup fee.
            </p>

            {/* CTAs */}
            <div style={reveal(heroVis, 0.3)} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup" className="group w-full sm:w-auto bg-gradient-to-r from-primary-600 to-teal-500 text-white px-8 py-4 rounded-2xl text-base font-semibold shadow-xl shadow-primary-200/50 hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2.5 overflow-hidden relative">
                <span className="relative z-10">Create Your Free Store</span>
                <svg className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link to="/pricing" className="w-full sm:w-auto bg-white border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-2xl text-base font-semibold hover:border-gray-300 hover:shadow-lg transition-all flex items-center justify-center gap-2">
                View Pricing
              </Link>
            </div>

            {/* Reassurance */}
            <p style={reveal(heroVis, 0.35)} className="mt-5 text-sm text-gray-400 flex items-center justify-center gap-5 flex-wrap">
              <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>No credit card required</span>
              <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Free plan available</span>
              <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Setup in 5 minutes</span>
            </p>
          </div>

          {/* Dashboard Preview */}
          <div style={reveal(heroVis, 0.5)} className="mt-16 mx-auto max-w-5xl relative" onMouseMove={handleMouseMove} onMouseLeave={resetTilt}>
            <div ref={dashRef} className="relative rounded-2xl border border-gray-200/80 bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)] overflow-hidden transition-transform duration-200 ease-out" style={{ transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-50/50">
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-amber-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
                <div className="flex-1 flex justify-center"><div className="bg-gray-200/70 rounded-lg px-6 py-1 text-xs text-gray-500 font-mono">yourstore.com/admin</div></div>
              </div>
              {/* Dashboard content */}
              <div className="p-6 sm:p-8">
                {/* KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { l: 'Today\'s Revenue', v: '৳23,450', d: '+18.2%', c: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { l: 'New Orders', v: '14', d: '+3 today', c: 'text-primary-600', bg: 'bg-primary-50' },
                    { l: 'Pending Shipments', v: '7', d: 'Needs action', c: 'text-amber-600', bg: 'bg-amber-50' },
                    { l: 'COD Collected', v: '৳8,200', d: 'This week', c: 'text-violet-600', bg: 'bg-violet-50' },
                  ].map((s, i) => (
                    <div key={i} className={`${s.bg} rounded-xl p-4 text-left`}>
                      <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{s.l}</p>
                      <p className={`text-xl sm:text-2xl font-bold ${s.c} mt-0.5`}>{s.v}</p>
                      <p className="text-[11px] font-medium text-gray-400 mt-0.5">{s.d}</p>
                    </div>
                  ))}
                </div>
                {/* Revenue chart */}
                <div className="flex items-end gap-1.5 sm:gap-2 h-28 px-2 mb-2">
                  {[38, 52, 33, 68, 77, 58, 89, 73, 92, 68, 83, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-primary-500 to-teal-300 transition-all duration-[1000ms] ease-out hover:from-primary-600 hover:to-teal-400" style={{ height: heroVis ? `${h}%` : '0%', transitionDelay: `${0.8 + i * 0.05}s` }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 px-2 font-medium">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => <span key={m}>{m}</span>)}
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="hidden lg:block absolute -left-10 top-1/4 z-10" style={{ opacity: heroVis ? 1 : 0, transition: 'opacity 0.5s ease 1.4s' }}>
              <div className="bg-white rounded-xl border border-gray-100 shadow-xl px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg></div>
                <div><div className="text-xs text-gray-500">bKash Payment</div><div className="text-sm font-bold text-gray-900">+৳4,250 just now</div></div>
              </div>
            </div>
            <div className="hidden lg:block absolute -right-10 top-1/2 z-10" style={{ opacity: heroVis ? 1 : 0, transition: 'opacity 0.5s ease 1.6s' }}>
              <div className="bg-white rounded-xl border border-gray-100 shadow-xl px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center"><svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg></div>
                <div><div className="text-xs text-gray-500">New Order</div><div className="text-sm font-bold text-gray-900">COD — ৳3,800</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ TRUST STRIP ═══════════════════ */}
      <section ref={trustRef} className="py-10 border-y border-gray-100 bg-gray-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={reveal(trustVis)} className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'SSL Secured' },
              { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', label: 'Encrypted Data' },
              { icon: 'M3 10h18M7 14h2m4 0h4M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z', label: 'PCI-Compliant Checkout' },
              { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'GDPR Ready' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-center gap-2.5">
                <svg className="w-5 h-5 text-primary-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={item.icon} /></svg>
                <span className="text-sm font-medium text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ PLATFORM STATS ═══════════════════ */}
      <section ref={statsRef} className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12" style={reveal(statsVis)}>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest">The Platform in Numbers</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900">Trusted by merchants across Bangladesh</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {PLATFORM_STATS.map((s, i) => (
              <div key={i} className="text-center group" style={reveal(statsVis, i * 0.1)}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-teal-50 border border-primary-100/50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary-100 transition-all duration-300">
                  <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={s.icon} /></svg>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  <CountUp target={s.value} suffix={s.suffix} />
                </div>
                <div className="text-sm text-gray-500 mt-1.5 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ VALUE PROPOSITIONS ═══════════════════ */}
      <section id="features" ref={valueRef} className="py-20 sm:py-28 bg-gray-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-xl mx-auto" style={reveal(valueVis)}>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest">Platform Capabilities</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-gray-900 leading-tight">Everything you need to sell online in Bangladesh</h2>
            <p className="mt-4 text-lg text-gray-500">Built specifically for local commerce — payment gateways, delivery partners, and settlement workflows that actually work.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALUE_PROPS.map((f, i) => (
              <div key={i} className="group rounded-2xl border border-gray-200/80 bg-white p-7 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-0.5 transition-all duration-500" style={reveal(valueVis, 0.05 + i * 0.05)}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300" style={{ backgroundColor: f.bg }}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={f.color} strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2.5">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ WHY ECOMAI ═══════════════════ */}
      <section ref={whyRef} className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div style={reveal(whyVis)}>
              <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest">Why Ecomai</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">Not another generic SaaS tool</h2>
              <p className="mt-4 text-lg text-gray-500">Most e-commerce platforms were built for US or European markets. Ecomai was designed from day one for how commerce actually works in Bangladesh — with the payment methods your customers use and the delivery networks that reach their addresses.</p>
              <div className="mt-10 space-y-6">
                {WHY_ECOMAI.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={item.icon} /></svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{item.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Link to="/signup" className="inline-flex items-center gap-2 text-primary-600 font-semibold text-sm hover:gap-3 transition-all">
                  Start your free store
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              </div>
            </div>

            {/* Right: visual */}
            <div className="relative" style={reveal(whyVis, 0.2)}>
              <div className="bg-gradient-to-br from-primary-600 to-teal-500 rounded-3xl p-8 sm:p-10 text-white">
                {/* Payment methods row */}
                <div className="mb-8">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-4">Accepted Payments</p>
                  <div className="flex flex-wrap gap-3">
                    {['SSLCommerz', 'bKash', 'Nagad', 'Rocket', 'Visa', 'Mastercard'].map(name => (
                      <span key={name} className="px-3 py-1.5 bg-white/20 rounded-lg text-sm font-medium backdrop-blur-sm">{name}</span>
                    ))}
                  </div>
                </div>
                {/* Delivery row */}
                <div className="mb-8">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-4">Delivery Partners</p>
                  <div className="flex flex-wrap gap-3">
                    {['Pathao', 'Steadfast', 'RedX', 'Paperfly', 'SSL Commerce'].map(name => (
                      <span key={name} className="px-3 py-1.5 bg-white/20 rounded-lg text-sm font-medium backdrop-blur-sm">{name}</span>
                    ))}
                  </div>
                </div>
                {/* Settlement info */}
                <div className="pt-6 border-t border-white/20">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-2">Settlement</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-2xl font-extrabold">T+2</p>
                      <p className="text-xs opacity-70 mt-0.5">Average settlement cycle</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold">BDT 1:1</p>
                      <p className="text-xs opacity-70 mt-0.5">No currency conversion</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary-100/60 rounded-full blur-2xl" />
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-teal-100/60 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section id="how-it-works" ref={stepsRef} className="py-20 sm:py-28 bg-gray-50/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" style={reveal(stepsVis)}>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest">Simple Setup</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-gray-900">Go from zero to selling<br className="hidden sm:block" /> in under 10 minutes</h2>
            <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto">No documentation marathon, no developer needed. Three steps and you're accepting orders.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-[18%] right-[18%] h-0.5">
              <div className="w-full h-full bg-gradient-to-r from-primary-200 via-teal-200 to-emerald-200 rounded-full" style={{ opacity: stepsVis ? 1 : 0, transition: 'opacity 1s ease 0.4s' }} />
            </div>

            {HOW_IT_WORKS.map((s, i) => (
              <div key={i} className="relative text-center" style={reveal(stepsVis, 0.2 + i * 0.15)}>
                <div className="relative z-10 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-600 to-teal-500 text-white text-2xl font-extrabold mb-6 shadow-xl shadow-primary-200/50 group-hover:scale-110 group-hover:shadow-2xl transition-all duration-500">
                  <span>{s.num}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ MERCHANT TYPES ═══════════════════ */}
      <section ref={typesRef} className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" style={reveal(typesVis)}>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest">Built For Everyone</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-gray-900">One platform. Any business model.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {MERCHANT_TYPES.map((t, i) => (
              <div key={i} className="rounded-2xl border border-gray-200/80 p-8 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-500" style={reveal(typesVis, 0.1 + i * 0.12)}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-teal-50 border border-primary-100/50 flex items-center justify-center mb-6">
                  <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={t.icon} /></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{t.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ INTEGRATIONS ═══════════════════ */}
      <section id="integrations" ref={intRef} className="py-20 sm:py-28 bg-gray-50/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" style={reveal(intVis)}>
            <p className="text-sm font-semibold text-primary-600 uppercase tracking-widest">Integrations</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-extrabold text-gray-900">Works with the tools<br className="hidden sm:block" />you already use</h2>
            <p className="mt-5 text-lg text-gray-500 max-w-xl mx-auto">Pre-built integrations with Bangladesh's leading payment gateways and delivery services.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {INTEGRATIONS.map((item, i) => (
              <div key={i} className="group bg-white rounded-2xl border border-gray-200/80 p-6 text-center hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-0.5 transition-all duration-500" style={reveal(intVis, 0.05 + i * 0.05)}>
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-lg shadow-lg" style={{ backgroundColor: item.color, boxShadow: `0 8px 30px ${item.color}30` }}>
                  {item.abbr}
                </div>
                <div className="text-sm font-bold text-gray-900">{item.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA ═══════════════════ */}
      <section ref={ctaRef} className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[2rem] overflow-hidden p-12 sm:p-20 text-center" style={reveal(ctaVis)}>
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-teal-500 to-emerald-500" />
            {/* Glows */}
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20 blur-3xl bg-white" />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-15 blur-3xl bg-white" />
            {/* Dot grid */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
                Start selling online<br />in Bangladesh today
              </h2>
              <p className="mt-5 text-lg text-white/80 max-w-lg mx-auto">
                Join thousands of merchants who use Ecomai to run their online business. Free to start, scales with you.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup" className="group w-full sm:w-auto bg-white text-primary-700 px-8 py-4 rounded-2xl text-base font-semibold hover:bg-gray-50 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                  Create Your Free Store
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
                <Link to="/pricing" className="w-full sm:w-auto border-2 border-white/30 text-white px-8 py-4 rounded-2xl text-base font-semibold hover:bg-white/10 hover:border-white/50 transition-all flex items-center justify-center">
                  View Pricing
                </Link>
              </div>
              <p className="mt-6 text-sm text-white/60">No credit card required. Free plan available. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="bg-gray-950 text-gray-400 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-14 border-b border-gray-800/80">
            {/* Brand */}
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <span className="text-xl font-extrabold text-white">Ecomai</span>
              </div>
              <p className="text-sm leading-relaxed mb-6 max-w-xs">The all-in-one e-commerce platform built for Bangladesh. Accept payments, manage orders, and grow your online business.</p>
              <div className="flex gap-3">
                {[
                  { label: 'Facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                  { label: 'LinkedIn', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                ].map((s, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-xl bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-all hover:scale-110" aria-label={s.label}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={s.path} /></svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Link cols */}
            {[
              { title: 'Product', links: [['Features', '#features'], ['Pricing', '/pricing'], ['Integrations', '#integrations']] },
              { title: 'Company', links: [['About', '/#'], ['Blog', '/#'], ['Contact', '/#']] },
              { title: 'Resources', links: [['Help Center', '/#'], ['Documentation', '/#']] },
              { title: 'Legal', links: [['Privacy Policy', '/#'], ['Terms of Service', '/#']] },
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
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                All systems operational
              </span>
              <span>Built in Bangladesh</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

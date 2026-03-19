import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';
import { StarIcon, ShippingIcon, SecureIcon, ReturnIcon, SupportIcon } from '../icons';

/* ── Animated counter ── */
function AnimatedCounter({ end, duration = 1500, suffix = '' }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!end) return;
    let start = 0;
    const step = Math.max(1, Math.floor(end / (duration / 30)));
    const id = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(id); }
      else setVal(start);
    }, 30);
    return () => clearInterval(id);
  }, [end, duration]);
  return <>{val.toLocaleString()}{suffix}</>;
}

/* ── Product Badge Component ── */
function ProductBadge({ product, storeConfig }) {
  const badges = storeConfig?.badges || {};
  const list = [];
  if (badges.show_sale !== false && product.compare_at_price && Number(product.compare_at_price) > Number(product.base_price)) {
    const pct = Math.round((1 - Number(product.base_price) / Number(product.compare_at_price)) * 100);
    list.push({ label: `-${pct}%`, bg: '#ef4444', color: '#fff' });
  }
  if (badges.show_new !== false && product.created_at) {
    const days = badges.new_days || 14;
    const created = new Date(product.created_at);
    if ((Date.now() - created.getTime()) / 86400000 < days) {
      list.push({ label: 'New', bg: '#3b82f6', color: '#fff' });
    }
  }
  if (badges.show_low_stock && product.stock_quantity !== null && product.stock_quantity !== undefined) {
    const threshold = badges.low_stock_threshold || 5;
    if (product.stock_quantity > 0 && product.stock_quantity <= threshold) {
      list.push({ label: `Only ${product.stock_quantity} left`, bg: '#f59e0b', color: '#fff' });
    }
  }
  if (list.length === 0) return null;
  return (
    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
      {list.map((b, i) => (
        <span key={i} className="px-2 py-0.5 text-[10px] font-bold rounded-full shadow-sm"
          style={{ backgroundColor: b.bg, color: b.color }}>{b.label}</span>
      ))}
    </div>
  );
}

/* ── Hero Slider ── */
function HeroSlider({ homepage, t, theme, shopSlug }) {
  const slides = homepage?.hero?.slides;
  const singleHero = !slides || slides.length === 0;
  const heroSlides = singleHero ? [{
    image_url: homepage?.hero?.image_url,
    headline: homepage?.hero?.headline,
    subtitle: homepage?.hero?.subtitle,
    cta: homepage?.hero?.cta,
    cta_link: homepage?.hero?.cta_link,
    overlay_color: homepage?.hero?.overlay_color,
    overlay_opacity: homepage?.hero?.overlay_opacity,
  }] : slides;

  const [current, setCurrent] = useState(0);
  const autoRotate = homepage?.hero?.auto_rotate !== false;
  const interval = homepage?.hero?.interval || 5000;

  useEffect(() => {
    if (heroSlides.length <= 1 || !autoRotate) return;
    const id = setInterval(() => setCurrent(c => (c + 1) % heroSlides.length), interval);
    return () => clearInterval(id);
  }, [heroSlides.length, autoRotate, interval]);

  const slide = heroSlides[current] || heroSlides[0];

  // A/B Test: randomly assign variant (persisted in sessionStorage per shop)
  const abTest = homepage?.ab_test;
  const abVariant = (() => {
    if (!abTest?.enabled || !Array.isArray(abTest.variants) || abTest.variants.length === 0) return null;
    const key = `ecomai_ab_${shopSlug}`;
    let idx = sessionStorage.getItem(key);
    if (idx === null || idx === undefined) {
      idx = Math.floor(Math.random() * abTest.variants.length);
      try { sessionStorage.setItem(key, idx); } catch {}
    }
    return abTest.variants[Number(idx)] || null;
  })();

  const headline = abVariant?.headline || slide?.headline || `Welcome to ${shopSlug}`;
  const subtitle = abVariant?.subtitle || slide?.subtitle || 'Discover our curated collection of premium products.';
  const cta = abVariant?.cta || slide?.cta || 'Shop Now';
  const ctaLink = slide?.cta_link || `/store/${shopSlug}/products`;

  return (
    <section className="relative overflow-hidden"
      style={{
        background: slide?.image_url
          ? `url(${slide.image_url}) center/cover no-repeat`
          : t.heroGradient,
      }}>
      {slide?.image_url && (
        <div className="absolute inset-0" style={{
          backgroundColor: slide.overlay_color || '#000',
          opacity: (slide.overlay_opacity ?? 50) / 100,
        }} />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight transition-opacity duration-500"
            style={{ color: theme === 'modern_luxe' ? t.primary : '#ffffff' }}>
            {headline}
          </h1>
          <p className="text-lg md:text-xl mb-8 opacity-90"
            style={{ color: theme === 'modern_luxe' ? t.textMuted : 'rgba(255,255,255,0.8)' }}>
            {subtitle}
          </p>
          <Link to={ctaLink}
            className="inline-flex items-center px-8 py-3.5 text-base font-semibold transition-all hover:scale-105"
            style={{
              backgroundColor: theme === 'modern_luxe' ? t.primary : '#ffffff',
              color: theme === 'modern_luxe' ? t.bg : t.primary,
              borderRadius: t.buttonRadius,
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            }}>
            {cta}
            <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
      {/* Decorative shapes */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-white" />
        <div className="absolute bottom-10 right-40 w-40 h-40 rounded-full bg-white" />
      </div>
      {/* Slide dots */}
      {heroSlides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {heroSlides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{
                backgroundColor: i === current ? '#fff' : 'rgba(255,255,255,0.4)',
                transform: i === current ? 'scale(1.3)' : 'scale(1)',
              }} />
          ))}
        </div>
      )}
      {/* Prev/Next arrows */}
      {heroSlides.length > 1 && (
        <>
          <button onClick={() => setCurrent((current - 1 + heroSlides.length) % heroSlides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => setCurrent((current + 1) % heroSlides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
    </section>
  );
}

/* ═════════════════════════════════════════
   MAIN STORE HOME
   ═════════════════════════════════════════ */
export default function StoreHome() {
  const { shop, shopSlug, theme, tokens, homepage, trustBadges, formatPrice, formatSecondaryPrice, storeConfig, storePolicies, businessInfo, socialLinks } = useStore();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState(''); // 'success' | 'error' | ''

  const t = resolveTokens(theme, tokens);

  useEffect(() => {
    Promise.all([
      storeApi.getProducts(shopSlug),
      storeApi.getCategories(shopSlug).catch(() => []),
      storeApi.getStats(shopSlug).catch(() => null),
    ]).then(([prodData, catData, statsData]) => {
      let prods = prodData.items || [];
      const featuredIds = homepage?.featured_product_ids;
      if (Array.isArray(featuredIds) && featuredIds.length > 0) {
        const idSet = new Set(featuredIds);
        const featured = prods.filter(p => idSet.has(p.id));
        prods = featuredIds.map(id => featured.find(p => p.id === id)).filter(Boolean);
        if (prods.length === 0) prods = (prodData.items || []).slice(0, 8);
      } else {
        prods = prods.slice(0, 8);
      }
      setProducts(prods);
      setCategories((catData || []).slice(0, 6));
      if (statsData) setStats(statsData);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [shopSlug, homepage?.featured_product_ids]);

  const handleQuickAdd = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, null, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    try {
      await storeApi.subscribeNewsletter(shopSlug, newsletterEmail);
      setNewsletterStatus('success');
      setNewsletterEmail('');
      setTimeout(() => setNewsletterStatus(''), 4000);
    } catch {
      setNewsletterStatus('error');
      setTimeout(() => setNewsletterStatus(''), 4000);
    }
  };

  const defaultBadges = [
    { icon: '🚀', title: 'Fast Shipping', text: 'Free delivery on orders over ৳5,000' },
    { icon: '🔒', title: 'Secure Checkout', text: '100% secure payment processing' },
    { icon: '💬', title: '24/7 Support', text: 'Dedicated support for every customer' },
  ];
  const badges = (trustBadges && trustBadges.length > 0) ? trustBadges : defaultBadges;

  /* ── FAQ Accordion Item ── */
  const FaqItem = ({ q, a, t: tok }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="border-b" style={{ borderColor: tok.border }}>
        <button onClick={() => setOpen(!open)} className="w-full text-left py-4 px-1 flex items-center justify-between gap-4 group">
          <span className="font-semibold text-sm" style={{ color: tok.text }}>{q}</span>
          <svg className={`w-5 h-5 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} style={{ color: tok.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {open && <div className="pb-4 px-1 text-sm leading-relaxed" style={{ color: tok.textMuted }}>{a}</div>}
      </div>
    );
  };

  // Section content from settings (fall back to defaults if not set)
  const howItWorksData = homepage?.how_it_works;
  const brandValuesData = homepage?.brand_values;
  const testimonialsData = homepage?.testimonials;
  const faqData = homepage?.faq;

  /* ── Section Components ── */
  const sections = {
    hero: () => <HeroSlider key="hero" homepage={homepage} t={t} theme={theme} shopSlug={shopSlug} />,

    /* ── Brand Promise Bar ── */
    brand_promise: () => (
      <section key="brand_promise" className="border-b" style={{ backgroundColor: t.surface, borderColor: t.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x" style={{ borderColor: t.border }}>
            {[
              { icon: <ShippingIcon size={22} />, label: 'Free Shipping', sub: 'On orders over ৳5,000' },
              { icon: <SecureIcon size={22} />, label: 'Secure Payment', sub: '256-bit SSL encryption' },
              { icon: <ReturnIcon size={22} />, label: 'Easy Returns', sub: '30-day return policy' },
              { icon: <SupportIcon size={22} />, label: '24/7 Support', sub: 'Dedicated help center' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-4 px-4 md:px-6 md:justify-center">
                <div className="shrink-0" style={{ color: t.primary }}>{item.icon}</div>
                <div>
                  <p className="text-xs font-bold leading-tight" style={{ color: t.text }}>{item.label}</p>
                  <p className="text-[10px] leading-tight mt-0.5 hidden sm:block" style={{ color: t.textMuted }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    /* ── Social Proof Counters ── */
    social_proof: () => (
      <section key="social_proof" className="py-10 border-b" style={{ backgroundColor: t.bg, borderColor: t.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { end: stats?.total_customers || 0, suffix: '+', label: 'Happy Customers', icon: '😊' },
              { end: stats?.total_products || products.length, suffix: '+', label: 'Products', icon: '🛍️' },
              { end: stats?.total_orders || 0, suffix: '+', label: 'Orders Delivered', icon: '📦' },
              { end: 99, suffix: '%', label: 'Satisfaction Rate', icon: '⭐' },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-3xl md:text-4xl font-extrabold tabular-nums" style={{ color: t.primary }}><AnimatedCounter end={item.end} suffix={item.suffix} /></p>
                <p className="text-xs font-semibold uppercase tracking-wider mt-2" style={{ color: t.textMuted }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    /* ── Categories ── */
    categories: () => categories.length > 0 ? (
      <section key="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: t.primary }}>Browse</p>
            <h2 className="text-2xl font-bold" style={{ color: t.text }}>Shop by Category</h2>
            <p className="text-sm mt-1" style={{ color: t.textMuted }}>Find exactly what you're looking for</p>
          </div>
          <Link to={`/store/${shopSlug}/categories`} className="text-sm font-semibold hover:opacity-70 transition hidden sm:inline-flex items-center gap-1" style={{ color: t.primary }}>
            View All <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/store/${shopSlug}/products?category=${cat.id}`}
              className="group p-5 text-center transition-all hover:shadow-lg hover:-translate-y-1"
              style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
              <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: t.primary + '15' }}>
                {cat.icon || '📁'}
              </div>
              <p className="text-sm font-semibold truncate" style={{ color: t.text }}>{cat.name}</p>
              {cat.product_count > 0 && (
                <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>{cat.product_count} items</p>
              )}
            </Link>
          ))}
        </div>
      </section>
    ) : null,

    /* ── Featured Products ── */
    featured: () => (
      <section key="featured" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.primary }}>Hand-picked</p>
          <h2 className="text-3xl font-bold mb-3" style={{ color: t.text }}>
            {homepage?.featured_title || 'Featured Products'}
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: t.textMuted }}>
            {homepage?.featured_subtitle || 'Discover our most popular items, chosen for quality and style.'}
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: t.primary }} />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12" style={{ color: t.textMuted }}>
            <p className="text-lg">No products available yet.</p>
            <p className="text-sm mt-2">Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <Link key={product.id} to={`/store/${shopSlug}/products/${product.id}`} className="group block">
                <div className="overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1"
                  style={{ backgroundColor: t.surface, borderRadius: t.radius, boxShadow: t.cardShadow, border: `1px solid ${t.border}` }}>
                  <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: t.border + '40' }}>
                    <ProductBadge product={product} storeConfig={storeConfig} />
                    {product.images?.length > 0 ? (
                      <img src={product.images.find(i => i.is_primary)?.url || product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <button onClick={(e) => handleQuickAdd(e, product)}
                        className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 backdrop-blur-md transition"
                        style={{ backgroundColor: addedId === product.id ? '#16a34a' : t.primary + 'ee', color: t.bg || '#fff' }}>
                        {addedId === product.id ? (
                          <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Added!</>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Quick Add</>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-1 group-hover:opacity-70 transition line-clamp-1" style={{ color: t.text }}>{product.name}</h3>
                    {product.category && (
                      <p className="text-xs mb-2" style={{ color: t.textMuted }}>{product.category}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-bold" style={{ color: t.primary }}>{formatPrice(product.base_price)}</p>
                      {product.compare_at_price && Number(product.compare_at_price) > Number(product.base_price) && (
                        <p className="text-sm line-through" style={{ color: t.textMuted }}>{formatPrice(product.compare_at_price)}</p>
                      )}
                      {formatSecondaryPrice && (
                        <p className="text-xs" style={{ color: t.textMuted }}>≈ {formatSecondaryPrice(product.base_price)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {products.length > 0 && (
          <div className="text-center mt-10">
            <Link to={`/store/${shopSlug}/products`}
              className="inline-flex items-center px-8 py-3.5 font-semibold text-sm transition hover:opacity-80 hover:shadow-md"
              style={{ color: t.primary, border: `2px solid ${t.primary}`, borderRadius: t.buttonRadius }}>
              View All Products
              <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}
      </section>
    ),

    /* ── How It Works (Process Steps) ── */
    how_it_works: () => {
      const steps = howItWorksData && howItWorksData.length > 0 ? howItWorksData : [
        { step: '01', icon: '🔍', title: 'Browse & Discover', description: 'Explore our curated collection of premium products.' },
        { step: '02', icon: '🛒', title: 'Add to Cart & Checkout', description: 'Select items and complete your purchase securely.' },
        { step: '03', icon: '🚀', title: 'Fast Delivery', description: 'Carefully packed and delivered to your doorstep.' },
      ];
      return (
        <section key="how_it_works" className="py-16" style={{ backgroundColor: t.surface }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.primary }}>Simple Process</p>
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: t.text }}>How It Works</h2>
              <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: t.textMuted }}>Shopping with us is easy, fast, and secure.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {steps.map((item, i) => (
                <div key={i} className="relative text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ backgroundColor: t.primary + '12' }}>
                    {item.icon}
                  </div>
                  <div className="absolute top-4 right-1/2 translate-x-20 text-5xl font-black opacity-5 select-none" style={{ color: t.text }}>{item.step}</div>
                  <h3 className="font-bold text-base mb-2" style={{ color: t.text }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: t.textMuted }}>{item.description}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 -right-4 w-8">
                      <svg className="w-full" style={{ color: t.border }} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    },

    /* ── Trust Badges (enhanced) ── */
    trust_badges: () => (
      <section key="trust_badges" className="py-16" style={{ backgroundColor: t.bg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.primary }}>Our Commitment</p>
            <h2 className="text-2xl font-bold" style={{ color: t.text }}>Why Customers Trust Us</h2>
          </div>
          <div className={`grid grid-cols-1 gap-6 ${badges.length >= 4 ? 'sm:grid-cols-2 md:grid-cols-4' : badges.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {badges.map((badge, idx) => (
              <div key={idx} className="p-6 text-center transition-all hover:shadow-lg hover:-translate-y-1"
                style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: t.primary + '12' }}>
                  {badge.icon}
                </div>
                <h3 className="font-bold text-sm mb-2" style={{ color: t.text }}>{badge.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: t.textMuted }}>{badge.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    /* ── Brand Values / Guarantee ── */
    brand_values: () => (
      <section key="brand_values" className="py-16" style={{ background: t.heroGradient }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3 opacity-70"
                style={{ color: theme === 'modern_luxe' ? t.primary : '#fff' }}>Our Promise</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight"
                style={{ color: theme === 'modern_luxe' ? t.primary : '#fff' }}>
                Quality You Can Trust, Service You'll Love
              </h2>
              <p className="text-base leading-relaxed mb-8 opacity-80"
                style={{ color: theme === 'modern_luxe' ? t.textMuted : 'rgba(255,255,255,0.85)' }}>
                We're committed to bringing you the finest products with exceptional customer service. Every item in our store is carefully selected and quality-checked before it reaches you.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {(brandValuesData && brandValuesData.length > 0 ? brandValuesData : [
                  { emoji: '✅', text: '100% Authentic Products' },
                  { emoji: '🛡️', text: 'Buyer Protection Guarantee' },
                  { emoji: '🔄', text: 'Hassle-Free Returns' },
                  { emoji: '⚡', text: 'Express Delivery Available' },
                ]).map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-lg">{item.emoji}</span>
                    <span className="text-sm font-medium" style={{ color: theme === 'modern_luxe' ? t.text : '#fff' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="relative w-72 h-72">
                <div className="absolute inset-0 rounded-full opacity-20" style={{ backgroundColor: theme === 'modern_luxe' ? t.primary : '#fff' }} />
                <div className="absolute inset-4 rounded-full opacity-15" style={{ backgroundColor: theme === 'modern_luxe' ? t.primary : '#fff' }} />
                <div className="absolute inset-10 rounded-full flex items-center justify-center opacity-80" style={{ backgroundColor: theme === 'modern_luxe' ? t.primary + '20' : 'rgba(255,255,255,0.15)' }}>
                  <div className="text-center">
                    <div className="text-5xl mb-2">🏆</div>
                    <p className="text-xl font-extrabold" style={{ color: theme === 'modern_luxe' ? t.primary : '#fff' }}>100%</p>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-80" style={{ color: theme === 'modern_luxe' ? t.textMuted : 'rgba(255,255,255,0.8)' }}>Satisfaction</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    ),

    /* ── Testimonials (enhanced) ── */
    testimonials: () => {
      const testimonialsData = homepage?.testimonials;
      if (!Array.isArray(testimonialsData) || testimonialsData.length === 0) {
        // Show default testimonials for professionalism
        const defaults = [
          { name: 'Satisfied Customer', text: 'Excellent product quality and super fast delivery. Will definitely order again!', rating: 5 },
          { name: 'Happy Shopper', text: 'Great customer service and the products are exactly as described. Highly recommended!', rating: 5 },
          { name: 'Repeat Buyer', text: 'This is my go-to store now. Competitive prices and reliable shipping every time.', rating: 5 },
        ];
        return (
          <section key="testimonials" className="py-16" style={{ backgroundColor: t.surface }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.primary }}>Reviews</p>
                <h2 className="text-2xl font-bold" style={{ color: t.text }}>What Our Customers Say</h2>
                <p className="text-sm mt-2" style={{ color: t.textMuted }}>Real feedback from real customers</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {defaults.map((item, idx) => (
                  <div key={idx} className="p-6 relative" style={{ backgroundColor: t.bg, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                    <div className="absolute -top-3 left-6 text-3xl opacity-10" style={{ color: t.primary }}>"</div>
                    <div className="flex items-center gap-0.5 mb-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon key={i} size={14} filled={i < (item.rating || 5)} style={{ color: '#f59e0b' }} />
                      ))}
                    </div>
                    <p className="text-sm mb-4 leading-relaxed" style={{ color: t.textMuted }}>"{item.text}"</p>
                    <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: t.border }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: t.primary + '15', color: t.primary }}>
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-semibold block" style={{ color: t.text }}>{item.name}</span>
                        <span className="text-[10px]" style={{ color: t.textMuted }}>Verified Buyer</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      }
      return (
        <section key="testimonials" className="py-16" style={{ backgroundColor: t.surface }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.primary }}>Reviews</p>
              <h2 className="text-2xl font-bold" style={{ color: t.text }}>What Our Customers Say</h2>
              <p className="text-sm mt-2" style={{ color: t.textMuted }}>Real feedback from real customers</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonialsData.slice(0, 6).map((item, idx) => (
                <div key={idx} className="p-6 relative" style={{ backgroundColor: t.bg, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                  <div className="absolute -top-3 left-6 text-3xl opacity-10" style={{ color: t.primary }}>"</div>
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} size={14} filled={i < (item.rating || 5)} style={{ color: '#f59e0b' }} />
                    ))}
                  </div>
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: t.textMuted }}>"{item.text}"</p>
                  <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: t.border }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: t.primary + '15', color: t.primary }}>
                        {item.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-semibold block" style={{ color: t.text }}>{item.name}</span>
                      <span className="text-[10px]" style={{ color: t.textMuted }}>Verified Buyer</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    },

    /* ── Satisfaction Guarantee ── */
    guarantee: () => (
      <section key="guarantee" className="py-16" style={{ backgroundColor: t.bg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 md:p-12 text-center" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `2px solid ${t.primary}20` }}>
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: t.primary + '10' }}>
              <svg className="w-10 h-10" style={{ color: t.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: t.text }}>100% Satisfaction Guarantee</h2>
            <p className="text-base max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: t.textMuted }}>
              We stand behind every product we sell. If you're not completely satisfied with your purchase, we'll make it right — no questions asked.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {[
                { icon: '🔒', text: 'Secure Checkout' },
                { icon: '📦', text: 'Quality Packaging' },
                { icon: '🔄', text: '30-Day Returns' },
                { icon: '💳', text: 'Money Back Guarantee' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ backgroundColor: t.primary + '08', border: `1px solid ${t.primary}20` }}>
                  <span className="text-base">{item.icon}</span>
                  <span className="text-xs font-semibold" style={{ color: t.text }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    ),

    /* ── FAQ Section ── */
    faq: () => {
      const faqData = homepage?.faq;
      const defaultFaq = [
        { q: 'How long does shipping take?', a: 'We typically process orders within 1-2 business days. Standard delivery takes 3-7 business days depending on your location. Express shipping options are available at checkout.' },
        { q: 'What is your return policy?', a: 'We offer a hassle-free 30-day return policy. If you\'re not satisfied with your purchase, simply contact our support team and we\'ll arrange a return or exchange.' },
        { q: 'Is my payment information secure?', a: 'Absolutely! We use industry-standard 256-bit SSL encryption to protect all transactions. We never store your complete payment details on our servers.' },
        { q: 'Do you ship internationally?', a: 'Currently we serve customers within our primary market. We are actively working on expanding our delivery network. Contact us for special international orders.' },
        { q: 'How can I track my order?', a: 'Once your order ships, you\'ll receive a tracking number via email. You can also check your order status anytime from your account dashboard.' },
      ];
      const items = Array.isArray(faqData) && faqData.length > 0 ? faqData : defaultFaq;
      return (
        <section key="faq" className="py-16" style={{ backgroundColor: t.surface }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.primary }}>Got Questions?</p>
              <h2 className="text-2xl font-bold" style={{ color: t.text }}>Frequently Asked Questions</h2>
              <p className="text-sm mt-2" style={{ color: t.textMuted }}>Everything you need to know before you shop</p>
            </div>
            <div className="p-6 md:p-8" style={{ backgroundColor: t.bg, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
              {items.map((item, i) => <FaqItem key={i} q={item.q} a={item.a} t={t} />)}
            </div>
            {storePolicies?.return_policy && (
              <div className="text-center mt-6">
                <Link to={`/store/${shopSlug}/policy/return`} className="text-sm font-semibold hover:opacity-70 transition" style={{ color: t.primary }}>
                  Read our full return policy →
                </Link>
              </div>
            )}
          </div>
        </section>
      );
    },

    /* ── Featured Banner / Promo CTA ── */
    promo_banner: () => (
      <section key="promo_banner" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-8 md:p-10 flex items-center" style={{ background: `linear-gradient(135deg, ${t.primary}15, ${t.secondary}15)`, borderRadius: t.radius, border: `1px solid ${t.primary}20` }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.primary }}>New Collection</p>
              <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: t.text }}>Fresh Arrivals Just Dropped</h3>
              <p className="text-sm mb-4" style={{ color: t.textMuted }}>Explore the latest additions to our catalog.</p>
              <Link to={`/store/${shopSlug}/products`} className="inline-flex items-center text-sm font-semibold hover:opacity-70 transition" style={{ color: t.primary }}>
                Shop New Arrivals <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
          <div className="p-8 md:p-10 flex items-center" style={{ background: `linear-gradient(135deg, ${t.accent}15, ${t.primary}10)`, borderRadius: t.radius, border: `1px solid ${t.accent}20` }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: t.accent || t.secondary }}>Best Sellers</p>
              <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: t.text }}>Customer Favorites</h3>
              <p className="text-sm mb-4" style={{ color: t.textMuted }}>See what everyone's talking about.</p>
              <Link to={`/store/${shopSlug}/products`} className="inline-flex items-center text-sm font-semibold hover:opacity-70 transition" style={{ color: t.accent || t.secondary }}>
                See Top Picks <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    ),

    /* ── Newsletter (enhanced) ── */
    newsletter: () => (
      <section key="newsletter" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl p-8 md:p-12 relative overflow-hidden" style={{ background: t.heroGradient }}>
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: theme === 'modern_luxe' ? t.primary : '#fff' }}>
              ✉️ Newsletter
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-4"
              style={{ color: theme === 'modern_luxe' ? t.primary : '#ffffff' }}>
              {homepage?.cta?.headline || 'Stay in the Loop'}
            </h2>
            <p className="text-base mb-8 opacity-80 max-w-md mx-auto" style={{ color: theme === 'modern_luxe' ? t.textMuted : 'rgba(255,255,255,0.8)' }}>
              {homepage?.cta?.subtitle || 'Subscribe to get exclusive offers, new arrivals, and insider-only discounts delivered to your inbox.'}
            </p>
            {newsletterStatus === 'success' ? (
              <div className="text-sm font-semibold py-3 px-6 rounded-lg inline-flex items-center gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#16a34a' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                You're subscribed! Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <input type="email" required placeholder="Enter your email address" value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="w-full sm:flex-1 px-4 py-3.5 text-sm outline-none shadow-lg"
                  style={{ borderRadius: t.buttonRadius, backgroundColor: 'rgba(255,255,255,0.95)', color: '#1e293b' }} />
                <button type="submit"
                  className="w-full sm:w-auto px-6 py-3.5 font-semibold text-sm transition hover:opacity-80 shadow-lg"
                  style={{ backgroundColor: theme === 'modern_luxe' ? t.primary : '#ffffff', color: theme === 'modern_luxe' ? t.bg : t.primary, borderRadius: t.buttonRadius }}>
                  Subscribe →
                </button>
              </form>
            )}
            {newsletterStatus === 'error' && (
              <p className="text-xs mt-3 opacity-80" style={{ color: 'rgba(255,255,255,0.9)' }}>Something went wrong. Please try again.</p>
            )}
            <p className="text-[10px] mt-4 opacity-50" style={{ color: theme === 'modern_luxe' ? t.textMuted : '#fff' }}>No spam, unsubscribe anytime. We respect your privacy.</p>
          </div>
        </div>
      </section>
    ),

    /* ── "As Featured In" Credibility Bar ── */
    credibility: () => (
      <section key="credibility" className="py-10 border-y" style={{ backgroundColor: t.surface, borderColor: t.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: t.textMuted }}>Trusted By Thousands of Happy Customers</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-40">
            {['⭐ 4.9/5 Rating', '🏆 Top Rated Store', '✅ Verified Seller', '🔒 SSL Secured', '📦 10K+ Orders'].map((item, i) => (
              <span key={i} className="text-sm font-bold whitespace-nowrap" style={{ color: t.text }}>{item}</span>
            ))}
          </div>
        </div>
      </section>
    ),

    /* ── Final CTA ── */
    final_cta: () => (
      <section key="final_cta" className="py-16" style={{ backgroundColor: t.bg }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: t.text }}>Ready to Start Shopping?</h2>
          <p className="text-base mb-8" style={{ color: t.textMuted }}>Join thousands of satisfied customers. Browse our collection and find something you'll love.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to={`/store/${shopSlug}/products`}
              className="inline-flex items-center px-8 py-3.5 font-semibold text-sm transition hover:opacity-80 hover:shadow-lg"
              style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}>
              Browse Products
              <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
            {(businessInfo?.whatsapp || socialLinks?.whatsapp) && (
              <a href={`https://wa.me/${(businessInfo.whatsapp || socialLinks.whatsapp).replace(/[^0-9]/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3.5 font-semibold text-sm transition hover:opacity-80"
                style={{ color: t.text, border: `2px solid ${t.border}`, borderRadius: t.buttonRadius }}>
                💬 Chat With Us
              </a>
            )}
          </div>
        </div>
      </section>
    ),
  };

  /* ── Section Order (configurable via homepage.section_order) ── */
  const defaultOrder = [
    'hero', 'brand_promise', 'social_proof', 'categories', 'promo_banner',
    'featured', 'how_it_works', 'brand_values', 'trust_badges', 'testimonials',
    'guarantee', 'faq', 'credibility', 'newsletter', 'final_cta',
  ];
  const sectionOrder = homepage?.section_order || defaultOrder;
  const visibleSections = homepage?.sections_visible || {};

  return (
    <div>
      {sectionOrder.map((sectionId) => {
        if (visibleSections[sectionId] === false) return null;
        const renderFn = sections[sectionId];
        if (!renderFn) return null;
        return renderFn();
      })}
      {/* Render any default sections not in the order list */}
      {defaultOrder.filter(s => !sectionOrder.includes(s)).map((sectionId) => {
        if (visibleSections[sectionId] === false) return null;
        const renderFn = sections[sectionId];
        if (!renderFn) return null;
        return renderFn();
      })}
    </div>
  );
}

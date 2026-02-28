import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';
import { StarIcon } from '../icons';

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
  const headline = slide?.headline || `Welcome to ${shopSlug}`;
  const subtitle = slide?.subtitle || 'Discover our curated collection of premium products.';
  const cta = slide?.cta || 'Shop Now';
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
  const { shop, shopSlug, theme, tokens, homepage, trustBadges, formatPrice, storeConfig } = useStore();
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

  /* ── Section Components ── */
  const sections = {
    hero: () => <HeroSlider key="hero" homepage={homepage} t={t} theme={theme} shopSlug={shopSlug} />,

    social_proof: () => (
      <section key="social_proof" className="py-6 border-b" style={{ backgroundColor: t.surface, borderColor: t.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: t.primary }}><AnimatedCounter end={stats?.total_customers || 0} suffix="+" /></p>
              <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: t.textMuted }}>Happy Customers</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: t.primary }}><AnimatedCounter end={stats?.total_products || products.length} suffix="+" /></p>
              <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: t.textMuted }}>Products</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: t.primary }}><AnimatedCounter end={stats?.total_orders || 0} suffix="+" /></p>
              <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: t.textMuted }}>Orders Fulfilled</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: t.primary }}><AnimatedCounter end={stats?.total_categories || categories.length} /></p>
              <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: t.textMuted }}>Categories</p>
            </div>
          </div>
        </div>
      </section>
    ),

    categories: () => categories.length > 0 ? (
      <section key="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: t.text }}>Shop by Category</h2>
            <p className="text-sm mt-1" style={{ color: t.textMuted }}>Find exactly what you're looking for</p>
          </div>
          <Link to={`/store/${shopSlug}/products`} className="text-sm font-semibold hover:opacity-70 transition hidden sm:block" style={{ color: t.primary }}>
            View All →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/store/${shopSlug}/products?category=${cat.id}`}
              className="group p-5 text-center transition hover:shadow-md"
              style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
              <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center text-xl transition-transform group-hover:scale-110"
                style={{ backgroundColor: t.primary + '12' }}>
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

    featured: () => (
      <section key="featured" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3" style={{ color: t.text }}>
            {homepage?.featured_title || 'Featured Products'}
          </h2>
          <p className="text-base" style={{ color: t.textMuted }}>
            {homepage?.featured_subtitle || 'Hand-picked just for you'}
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
                <div className="overflow-hidden transition-shadow hover:shadow-lg"
                  style={{ backgroundColor: t.surface, borderRadius: t.radius, boxShadow: t.cardShadow, border: `1px solid ${t.border}` }}>
                  <div className="aspect-square overflow-hidden relative" style={{ backgroundColor: t.border + '40' }}>
                    <ProductBadge product={product} storeConfig={storeConfig} />
                    {product.images?.length > 0 ? (
                      <img src={product.images.find(i => i.is_primary)?.url || product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold" style={{ color: t.primary }}>{formatPrice(product.base_price)}</p>
                      {product.compare_at_price && Number(product.compare_at_price) > Number(product.base_price) && (
                        <p className="text-sm line-through" style={{ color: t.textMuted }}>{formatPrice(product.compare_at_price)}</p>
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
              className="inline-flex items-center px-6 py-3 font-semibold text-sm transition hover:opacity-80"
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

    trust_badges: () => (
      <section key="trust_badges" className="py-16" style={{ backgroundColor: t.surface }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid grid-cols-1 gap-8 text-center ${badges.length >= 4 ? 'md:grid-cols-4' : badges.length === 3 ? 'md:grid-cols-3' : badges.length === 2 ? 'md:grid-cols-2' : ''}`}>
            {badges.map((badge, idx) => (
              <div key={idx} className="p-6">
                <div className="text-3xl mb-3">{badge.icon}</div>
                <h3 className="font-semibold mb-2" style={{ color: t.text }}>{badge.title}</h3>
                <p className="text-sm" style={{ color: t.textMuted }}>{badge.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    testimonials: () => {
      const testimonialsData = homepage?.testimonials;
      if (!Array.isArray(testimonialsData) || testimonialsData.length === 0) return null;
      return (
        <section key="testimonials" className="py-16" style={{ backgroundColor: t.bg }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-10" style={{ color: t.text }}>What Our Customers Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonialsData.slice(0, 6).map((item, idx) => (
                <div key={idx} className="p-6" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                  <div className="flex items-center gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} size={14} filled={i < (item.rating || 5)} className={i < (item.rating || 5) ? '' : 'opacity-30'} style={{ color: '#f59e0b' }} />
                    ))}
                  </div>
                  <p className="text-sm mb-4 leading-relaxed italic" style={{ color: t.textMuted }}>"{item.text}"</p>
                  <div className="flex items-center gap-3">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-8 h-8 rounded-full object-cover" />}
                    <span className="text-sm font-semibold" style={{ color: t.text }}>{item.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    },

    newsletter: () => (
      <section key="newsletter" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl p-8 md:p-12 text-center" style={{ background: t.heroGradient }}>
          <h2 className="text-2xl md:text-3xl font-bold mb-4"
            style={{ color: theme === 'modern_luxe' ? t.primary : '#ffffff' }}>
            {homepage?.cta?.headline || 'Stay in the Loop'}
          </h2>
          <p className="text-base mb-6 opacity-80" style={{ color: theme === 'modern_luxe' ? t.textMuted : 'rgba(255,255,255,0.8)' }}>
            {homepage?.cta?.subtitle || 'Subscribe for exclusive offers and new arrivals.'}
          </p>
          {newsletterStatus === 'success' ? (
            <div className="text-sm font-semibold py-3 px-6 rounded-lg inline-block" style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#16a34a' }}>
              ✓ You're subscribed! Thank you.
            </div>
          ) : (
            <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
              <input type="email" required placeholder="Enter your email" value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="w-full sm:flex-1 px-4 py-3 text-sm outline-none"
                style={{ borderRadius: t.buttonRadius, backgroundColor: 'rgba(255,255,255,0.9)', color: '#1e293b' }} />
              <button type="submit"
                className="w-full sm:w-auto px-6 py-3 font-semibold text-sm transition hover:opacity-80"
                style={{ backgroundColor: theme === 'modern_luxe' ? t.primary : '#ffffff', color: theme === 'modern_luxe' ? t.bg : t.primary, borderRadius: t.buttonRadius }}>
                Subscribe
              </button>
            </form>
          )}
          {newsletterStatus === 'error' && (
            <p className="text-xs mt-3 opacity-80" style={{ color: 'rgba(255,255,255,0.9)' }}>Something went wrong. Please try again.</p>
          )}
        </div>
      </section>
    ),
  };

  /* ── Section Order (configurable via homepage.section_order) ── */
  const defaultOrder = ['hero', 'social_proof', 'categories', 'featured', 'trust_badges', 'testimonials', 'newsletter'];
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

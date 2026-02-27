import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';

/* Animated counter */
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

export default function StoreHome() {
  const { shop, shopSlug, theme, tokens, homepage, trustBadges, formatPrice } = useStore();
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);

  const t = resolveTokens(theme, tokens);

  useEffect(() => {
    Promise.all([
      storeApi.getProducts(shopSlug),
      storeApi.getCategories(shopSlug).catch(() => []),
    ]).then(([prodData, catData]) => {
      setProducts(prodData.items.slice(0, 8));
      setCategories((catData || []).slice(0, 6));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [shopSlug]);

  const handleQuickAdd = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, null, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const heroHeadline = homepage?.hero?.headline || `Welcome to ${shop?.name}`;
  const heroSubtitle =
    homepage?.hero?.subtitle || 'Discover our curated collection of premium products.';
  const heroCta = homepage?.hero?.cta || 'Shop Now';

  const defaultBadges = [
    { icon: '🚀', title: 'Fast Shipping', text: 'Free delivery on orders over ৳5,000' },
    { icon: '🔒', title: 'Secure Checkout', text: '100% secure payment processing' },
    { icon: '💬', title: '24/7 Support', text: 'Dedicated support for every customer' },
  ];
  const badges = (trustBadges && trustBadges.length > 0) ? trustBadges : defaultBadges;

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{
          background: homepage?.hero?.image_url
            ? `url(${homepage.hero.image_url}) center/cover no-repeat`
            : t.heroGradient,
        }}
      >
        {/* Dark overlay for hero image */}
        {homepage?.hero?.image_url && (
          <div className="absolute inset-0" style={{
            backgroundColor: homepage.hero.overlay_color || '#000',
            opacity: (homepage.hero.overlay_opacity ?? 50) / 100,
          }} />
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
          <div className="max-w-2xl">
            <h1
              className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
              style={{ color: theme === 'modern_luxe' ? t.primary : '#ffffff' }}
            >
              {heroHeadline}
            </h1>
            <p
              className="text-lg md:text-xl mb-8 opacity-90"
              style={{ color: theme === 'modern_luxe' ? t.textMuted : 'rgba(255,255,255,0.8)' }}
            >
              {heroSubtitle}
            </p>
            <Link
              to={`/store/${shopSlug}/products`}
              className="inline-flex items-center px-8 py-3.5 text-base font-semibold transition-all hover:scale-105"
              style={{
                backgroundColor: theme === 'modern_luxe' ? t.primary : '#ffffff',
                color: theme === 'modern_luxe' ? t.bg : t.primary,
                borderRadius: t.buttonRadius,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
            >
              {heroCta}
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
      </section>

      {/* Social Proof Bar */}
      <section className="py-6 border-b" style={{ backgroundColor: t.surface, borderColor: t.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: t.primary }}><AnimatedCounter end={products.length * 12} suffix="+" /></p>
              <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: t.textMuted }}>Happy Customers</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: t.primary }}><AnimatedCounter end={products.length || 50} suffix="+" /></p>
              <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: t.textMuted }}>Products</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: t.primary }}>4.9</p>
              <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: t.textMuted }}>⭐ Avg. Rating</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold" style={{ color: t.primary }}><AnimatedCounter end={24} /></p>
              <p className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: t.textMuted }}>Hour Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
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
              <Link
                key={cat.id}
                to={`/store/${shopSlug}/products?category=${cat.id}`}
                className="group p-5 text-center transition hover:shadow-md"
                style={{
                  backgroundColor: t.surface,
                  borderRadius: t.radius,
                  border: `1px solid ${t.border}`,
                }}
              >
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
      )}

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
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
              <Link
                key={product.id}
                to={`/store/${shopSlug}/products/${product.id}`}
                className="group block"
              >
                <div
                  className="overflow-hidden transition-shadow hover:shadow-lg"
                  style={{
                    backgroundColor: t.surface,
                    borderRadius: t.radius,
                    boxShadow: t.cardShadow,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  {/* Product image with quick add overlay */}
                  <div
                    className="aspect-square overflow-hidden relative"
                    style={{ backgroundColor: t.border + '40' }}
                  >
                    {product.images?.length > 0 ? (
                      <img src={product.images.find(i => i.is_primary)?.url || product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>
                    )}
                    {/* Quick add-to-cart overlay */}
                    <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <button
                        onClick={(e) => handleQuickAdd(e, product)}
                        className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 backdrop-blur-md transition"
                        style={{
                          backgroundColor: addedId === product.id ? '#16a34a' : t.primary + 'ee',
                          color: t.bg || '#fff',
                        }}
                      >
                        {addedId === product.id ? (
                          <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Added!</>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> Quick Add</>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-1 group-hover:opacity-70 transition line-clamp-1" style={{ color: t.text }}>
                      {product.name}
                    </h3>
                    {product.category && (
                      <p className="text-xs mb-2" style={{ color: t.textMuted }}>
                        {product.category}
                      </p>
                    )}
                    <p className="text-lg font-bold" style={{ color: t.primary }}>
                      {formatPrice(product.base_price)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {products.length > 0 && (
          <div className="text-center mt-10">
            <Link
              to={`/store/${shopSlug}/products`}
              className="inline-flex items-center px-6 py-3 font-semibold text-sm transition hover:opacity-80"
              style={{
                color: t.primary,
                border: `2px solid ${t.primary}`,
                borderRadius: t.buttonRadius,
              }}
            >
              View All Products
              <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}
      </section>

      {/* Trust / Social proof section */}
      <section className="py-16" style={{ backgroundColor: t.surface }}>
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

      {/* Newsletter / CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="rounded-2xl p-8 md:p-12 text-center"
          style={{ background: t.heroGradient }}
        >
          <h2
            className="text-2xl md:text-3xl font-bold mb-4"
            style={{ color: theme === 'modern_luxe' ? t.primary : '#ffffff' }}
          >
            {homepage?.cta?.headline || 'Stay in the Loop'}
          </h2>
          <p className="text-base mb-6 opacity-80" style={{ color: theme === 'modern_luxe' ? t.textMuted : 'rgba(255,255,255,0.8)' }}>
            {homepage?.cta?.subtitle || 'Subscribe for exclusive offers and new arrivals.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full sm:flex-1 px-4 py-3 text-sm outline-none"
              style={{
                borderRadius: t.buttonRadius,
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: '#1e293b',
              }}
            />
            <button
              className="w-full sm:w-auto px-6 py-3 font-semibold text-sm transition hover:opacity-80"
              style={{
                backgroundColor: theme === 'modern_luxe' ? t.primary : '#ffffff',
                color: theme === 'modern_luxe' ? t.bg : t.primary,
                borderRadius: t.buttonRadius,
              }}
            >
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

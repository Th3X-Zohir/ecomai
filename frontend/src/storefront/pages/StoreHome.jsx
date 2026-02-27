import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';

export default function StoreHome() {
  const { shop, shopSlug, theme, tokens, homepage, trustBadges } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = resolveTokens(theme, tokens);

  useEffect(() => {
    storeApi
      .getProducts(shopSlug)
      .then((data) => setProducts(data.items.slice(0, 8)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopSlug]);

  const heroHeadline = homepage?.hero?.headline || `Welcome to ${shop?.name}`;
  const heroSubtitle =
    homepage?.hero?.subtitle || 'Discover our curated collection of premium products.';
  const heroCta = homepage?.hero?.cta || 'Shop Now';

  const defaultBadges = [
    { icon: '🚀', title: 'Fast Shipping', text: 'Free delivery on orders over $50' },
    { icon: '🔒', title: 'Secure Checkout', text: '100% secure payment processing' },
    { icon: '💬', title: '24/7 Support', text: 'Dedicated support for every customer' },
  ];
  const badges = (trustBadges && trustBadges.length > 0) ? trustBadges : defaultBadges;

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{ background: t.heroGradient }}
      >
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/store/${shopSlug}/products/${product.id}`}
                className="group block transition-transform hover:-translate-y-1"
              >
                <div
                  className="overflow-hidden"
                  style={{
                    backgroundColor: t.surface,
                    borderRadius: t.radius,
                    boxShadow: t.cardShadow,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  {/* Product image placeholder */}
                  <div
                    className="aspect-square flex items-center justify-center text-6xl"
                    style={{ backgroundColor: t.border + '40' }}
                  >
                    {product.category === 'fashion' ? '👗' :
                     product.category === 'electronics' ? '💻' :
                     product.category === 'food_beverage' ? '☕' :
                     '📦'}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-1 group-hover:opacity-70 transition" style={{ color: t.text }}>
                      {product.name}
                    </h3>
                    {product.category && (
                      <p className="text-xs mb-2" style={{ color: t.textMuted }}>
                        {product.category}
                      </p>
                    )}
                    <p className="text-lg font-bold" style={{ color: t.primary }}>
                      ${Number(product.base_price).toFixed(2)}
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
          <div className={`grid grid-cols-1 md:grid-cols-${Math.min(badges.length, 4)} gap-8 text-center`}>
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

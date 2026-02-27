import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';

export default function StoreProductDetail() {
  const { productId } = useParams();
  const { shopSlug, theme, tokens } = useStore();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const t = resolveTokens(theme, tokens);

  useEffect(() => {
    storeApi
      .getProduct(shopSlug, productId)
      .then((data) => {
        setProduct(data);
        if (data.variants?.length > 0) setSelectedVariant(data.variants[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopSlug, productId]);

  const handleAdd = () => {
    if (!product) return;
    addItem(product, selectedVariant, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: t.primary }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center" style={{ color: t.textMuted }}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: t.text }}>Product not found</h2>
        <Link to={`/store/${shopSlug}/products`} style={{ color: t.primary }}>
          ← Back to products
        </Link>
      </div>
    );
  }

  const price = selectedVariant ? Number(selectedVariant.price) : Number(product.base_price);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm mb-8 flex items-center gap-2" style={{ color: t.textMuted }}>
        <Link to={`/store/${shopSlug}`} className="hover:opacity-70 transition">Home</Link>
        <span>/</span>
        <Link to={`/store/${shopSlug}/products`} className="hover:opacity-70 transition">Products</Link>
        <span>/</span>
        <span style={{ color: t.text }}>{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Product image */}
        <div
          className="aspect-square flex items-center justify-center text-8xl"
          style={{
            backgroundColor: t.surface,
            borderRadius: t.radius,
            border: `1px solid ${t.border}`,
          }}
        >
          {product.category === 'fashion' ? '👗' :
           product.category === 'electronics' ? '💻' :
           product.category === 'food_beverage' ? '☕' :
           product.category === 'Beverages' ? '☕' :
           '📦'}
        </div>

        {/* Product info */}
        <div>
          {product.category && (
            <span
              className="inline-block text-xs font-medium px-3 py-1 mb-3"
              style={{
                backgroundColor: t.primary + '15',
                color: t.primary,
                borderRadius: t.buttonRadius,
              }}
            >
              {product.category}
            </span>
          )}

          <h1 className="text-3xl font-bold mb-2" style={{ color: t.text }}>
            {product.name}
          </h1>

          <p className="text-3xl font-bold mb-6" style={{ color: t.primary }}>
            ${price.toFixed(2)}
          </p>

          {product.description && (
            <p className="text-base mb-6 leading-relaxed" style={{ color: t.textMuted }}>
              {product.description}
            </p>
          )}

          {/* Variants picker */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block" style={{ color: t.text }}>
                Variant
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className="px-4 py-2 text-sm font-medium transition"
                    style={{
                      borderRadius: t.buttonRadius,
                      border: `2px solid ${selectedVariant?.id === v.id ? t.primary : t.border}`,
                      backgroundColor: selectedVariant?.id === v.id ? t.primary + '10' : 'transparent',
                      color: selectedVariant?.id === v.id ? t.primary : t.text,
                    }}
                  >
                    {v.title} — ${Number(v.price).toFixed(2)}
                    {v.inventory_qty <= 0 && (
                      <span className="ml-1 text-xs opacity-50">(Out of stock)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block" style={{ color: t.text }}>
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center text-lg font-bold transition hover:opacity-70"
                style={{
                  border: `1px solid ${t.border}`,
                  borderRadius: t.radius,
                  color: t.text,
                }}
              >
                −
              </button>
              <span className="text-lg font-semibold w-10 text-center" style={{ color: t.text }}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center text-lg font-bold transition hover:opacity-70"
                style={{
                  border: `1px solid ${t.border}`,
                  borderRadius: t.radius,
                  color: t.text,
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAdd}
            className="w-full py-3.5 text-base font-semibold transition hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              backgroundColor: added ? '#16a34a' : t.primary,
              color: t.bg,
              borderRadius: t.buttonRadius,
            }}
          >
            {added ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Added to Cart!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                Add to Cart — ${(price * quantity).toFixed(2)}
              </>
            )}
          </button>

          {/* Quick info */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
              <span>🚀</span> Fast Shipping
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
              <span>🔒</span> Secure Checkout
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
              <span>↩️</span> Easy Returns
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
              <span>💬</span> 24/7 Support
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

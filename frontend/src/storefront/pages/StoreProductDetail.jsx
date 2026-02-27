import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';

export default function StoreProductDetail() {
  const { productId } = useParams();
  const { shopSlug, theme, tokens, formatPrice } = useStore();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const t = resolveTokens(theme, tokens);

  useEffect(() => {
    storeApi
      .getProduct(shopSlug, productId)
      .then((data) => {
        setProduct(data);
        if (data.variants?.length > 0) setSelectedVariant(data.variants[0]);
        const primary = data.images?.find(i => i.is_primary) || data.images?.[0] || null;
        setSelectedImage(primary);
        // Load related products from same category
        storeApi.getProducts(shopSlug).then((res) => {
          setRelated(res.items.filter(p => p.id !== data.id && p.category_id === data.category_id).slice(0, 4));
        }).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopSlug, productId]);

  const isOutOfStock = selectedVariant
    ? selectedVariant.inventory_qty <= 0
    : (product?.stock_quantity !== undefined && product?.stock_quantity <= 0);

  const handleAdd = () => {
    if (!product || isOutOfStock) return;
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
        {/* Product image gallery */}
        <div>
          <div
            className="aspect-square overflow-hidden mb-3"
            style={{
              backgroundColor: t.surface,
              borderRadius: t.radius,
              border: `1px solid ${t.border}`,
            }}
          >
            {selectedImage ? (
              <img src={selectedImage.url} alt={selectedImage.alt_text || product.name} className="w-full h-full object-cover" />
            ) : product.images?.length > 0 ? (
              <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">📦</div>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img)}
                  className="w-16 h-16 shrink-0 overflow-hidden transition"
                  style={{
                    borderRadius: t.radius,
                    border: selectedImage?.id === img.id ? `2px solid ${t.primary}` : `1px solid ${t.border}`,
                    opacity: selectedImage?.id === img.id ? 1 : 0.7,
                  }}
                >
                  <img src={img.url} alt={img.alt_text || ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
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
            {formatPrice(price)}
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
                    {v.title} — {formatPrice(v.price)}
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
            disabled={isOutOfStock}
            className="w-full py-3.5 text-base font-semibold transition hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isOutOfStock ? '#9ca3af' : added ? '#16a34a' : t.primary,
              color: t.bg,
              borderRadius: t.buttonRadius,
            }}
          >
            {isOutOfStock ? (
              'Out of Stock'
            ) : added ? (
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
                Add to Cart — {formatPrice(price * quantity)}
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

          {/* Share buttons */}
          <div className="mt-6 pt-6 border-t flex items-center gap-3" style={{ borderColor: t.border }}>
            <span className="text-xs font-medium" style={{ color: t.textMuted }}>Share:</span>
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition hover:scale-110" style={{ backgroundColor: t.border + '60', color: t.textMuted }} title="Copy link">🔗</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(product.name + ' ' + window.location.href)}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition hover:scale-110" style={{ backgroundColor: '#25d36615', color: '#25d366' }} title="WhatsApp">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition hover:scale-110" style={{ backgroundColor: '#1877f215', color: '#1877f2' }} title="Facebook">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16 pt-12 border-t" style={{ borderColor: t.border }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: t.text }}>You May Also Like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {related.map((rp) => (
              <Link key={rp.id} to={`/store/${shopSlug}/products/${rp.id}`} className="group block">
                <div className="overflow-hidden transition-shadow hover:shadow-lg" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                  <div className="aspect-square overflow-hidden" style={{ backgroundColor: t.border + '40' }}>
                    {rp.images?.length > 0 ? (
                      <img src={rp.images.find(i => i.is_primary)?.url || rp.images[0].url} alt={rp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold line-clamp-1" style={{ color: t.text }}>{rp.name}</h3>
                    <p className="text-sm font-bold mt-1" style={{ color: t.primary }}>{formatPrice(rp.base_price)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sticky mobile add-to-cart bar */}
      <div className="fixed bottom-0 inset-x-0 p-3 border-t backdrop-blur-lg lg:hidden z-40" style={{ backgroundColor: t.bg + 'ee', borderColor: t.border }}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: t.text }}>{product.name}</p>
            <p className="text-sm font-bold" style={{ color: t.primary }}>{formatPrice(price)}</p>
          </div>
          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            className="px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            style={{ backgroundColor: isOutOfStock ? '#9ca3af' : added ? '#16a34a' : t.primary, color: t.bg, borderRadius: t.buttonRadius }}
          >
            {isOutOfStock ? 'Sold Out' : added ? '✓ Added' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

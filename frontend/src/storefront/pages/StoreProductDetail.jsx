import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';
import { ShippingIcon, SecureIcon, ReturnIcon, SupportIcon, StarIcon, HeartIcon } from '../icons';

/* ── Review Stars Input ── */
function StarRatingInput({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <StarIcon size={20} filled={n <= value} style={{ color: n <= value ? '#f59e0b' : '#d1d5db' }} />
        </button>
      ))}
    </div>
  );
}

export default function StoreProductDetail() {
  const { productId } = useParams();
  const { shopSlug, theme, tokens, formatPrice, formatSecondaryPrice, storeConfig } = useStore();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('description');
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ count: 0, average: 0 });
  const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, title: '', body: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');
  const [wishlisted, setWishlisted] = useState(false);

  const t = resolveTokens(theme, tokens);

  useEffect(() => {
    setLoading(true);
    storeApi.getProduct(shopSlug, productId).then((data) => {
      setProduct(data);
      if (data.variants?.length > 0) setSelectedVariant(data.variants[0]);
      const primary = data.images?.find(i => i.is_primary) || data.images?.[0] || null;
      setSelectedImage(primary);
      storeApi.getProducts(shopSlug).then((res) => {
        const others = (res.items || []).filter(p => p.id !== data.id);
        // Smart related: same category first, then similar price range, then rest
        const sameCategory = others.filter(p => p.category_id === data.category_id);
        const basePrice = Number(data.base_price) || 0;
        const priceRange = others.filter(p => {
          const pp = Number(p.base_price) || 0;
          return p.category_id !== data.category_id && pp >= basePrice * 0.5 && pp <= basePrice * 1.5;
        });
        const rest = others.filter(p => p.category_id !== data.category_id && !priceRange.includes(p));
        setRelated([...sameCategory, ...priceRange, ...rest].slice(0, 4));
      }).catch(() => {});
    }).catch(() => {}).finally(() => setLoading(false));
    // Load reviews
    storeApi.getProductReviews(shopSlug, productId).then(({ reviews: r, summary }) => {
      setReviews(r || []);
      setReviewSummary(summary || { count: 0, average: 0 });
    }).catch(() => {});
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

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewSubmitting(true);
    try {
      const token = localStorage.getItem(`customer_token_${shopSlug}`);
      await storeApi.submitReview(shopSlug, productId, {
        customer_name: reviewForm.name, rating: reviewForm.rating, title: reviewForm.title, body: reviewForm.body,
      }, token || undefined);
      setReviewMsg('Review submitted! It will appear after approval.');
      setReviewForm({ name: '', rating: 5, title: '', body: '' });
    } catch (err) {
      setReviewMsg(err.message || 'Failed to submit review');
    }
    setReviewSubmitting(false);
    setTimeout(() => setReviewMsg(''), 5000);
  };

  const toggleWishlist = async () => {
    const token = localStorage.getItem(`customer_token_${shopSlug}`);
    if (!token) { alert('Please log in to use your wishlist'); return; }
    try {
      if (wishlisted) {
        await storeApi.removeFromWishlist(shopSlug, productId, token);
        setWishlisted(false);
      } else {
        await storeApi.addToWishlist(shopSlug, productId, token);
        setWishlisted(true);
      }
    } catch { /* ignore */ }
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
        <Link to={`/store/${shopSlug}/products`} style={{ color: t.primary }}>← Back to products</Link>
      </div>
    );
  }

  const price = selectedVariant ? Number(selectedVariant.price) : Number(product.base_price);
  const tabs = [
    { id: 'description', label: 'Description' },
    { id: 'reviews', label: `Reviews (${reviewSummary.count})` },
    { id: 'shipping', label: 'Shipping & Returns' },
  ];
  if (product.specifications || product.specs) tabs.splice(1, 0, { id: 'specs', label: 'Specifications' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* JSON-LD Product Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        ...(product.description ? { description: product.description.slice(0, 200) } : {}),
        ...(selectedImage?.url || product.image_url ? { image: selectedImage?.url || product.image_url } : {}),
        offers: {
          '@type': 'Offer',
          price: price,
          priceCurrency: storeConfig?.currency_code || 'BDT',
          availability: isOutOfStock ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        },
        ...(reviewSummary.count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: reviewSummary.average, reviewCount: reviewSummary.count } } : {}),
      }) }} />

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

          <div className="mb-6">
            <p className="text-3xl font-bold" style={{ color: t.primary }}>
              {formatPrice(price)}
            </p>
            {formatSecondaryPrice && (
              <p className="text-sm mt-1" style={{ color: t.textMuted }}>≈ {formatSecondaryPrice(price)}</p>
            )}
          </div>

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
              <ShippingIcon size={16} /> Fast Shipping
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
              <SecureIcon size={16} /> Secure Checkout
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
              <ReturnIcon size={16} /> Easy Returns
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
              <SupportIcon size={16} /> 24/7 Support
            </div>
          </div>

          {/* Wishlist + Share */}
          <div className="mt-6 pt-6 border-t flex items-center gap-3" style={{ borderColor: t.border }}>
            <button onClick={toggleWishlist} className="flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70" style={{ color: wishlisted ? '#ef4444' : t.textMuted }}>
              <HeartIcon size={18} filled={wishlisted} /> {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
            </button>
            <span style={{ color: t.border }}>|</span>
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

      {/* Tabbed Content Section */}
      <div className="mt-12 border-t pt-8" style={{ borderColor: t.border }}>
        <div className="flex border-b gap-0" style={{ borderColor: t.border }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-5 py-3 text-sm font-medium transition-colors -mb-px"
              style={{
                borderBottom: activeTab === tab.id ? `2px solid ${t.primary}` : '2px solid transparent',
                color: activeTab === tab.id ? t.primary : t.textMuted,
              }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="py-8">
          {activeTab === 'description' && (
            <div className="prose max-w-none text-sm leading-relaxed" style={{ color: t.textMuted }}>
              {product.description ? (
                <p style={{ whiteSpace: 'pre-wrap' }}>{product.description}</p>
              ) : (
                <p>No description available.</p>
              )}
            </div>
          )}
          {activeTab === 'specs' && (
            <div className="text-sm" style={{ color: t.textMuted }}>
              {(product.specifications || product.specs) ? (
                typeof (product.specifications || product.specs) === 'object' ? (
                  <table className="w-full">
                    <tbody>
                      {Object.entries(product.specifications || product.specs).map(([k, v]) => (
                        <tr key={k} className="border-b" style={{ borderColor: t.border }}>
                          <td className="py-2 pr-4 font-medium" style={{ color: t.text }}>{k}</td>
                          <td className="py-2">{String(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p style={{ whiteSpace: 'pre-wrap' }}>{String(product.specifications || product.specs)}</p>
              ) : <p>No specifications available.</p>}
            </div>
          )}
          {activeTab === 'reviews' && (
            <div>
              {/* Review Summary */}
              <div className="flex items-center gap-4 mb-6">
                <div className="text-center">
                  <p className="text-4xl font-bold" style={{ color: t.text }}>{reviewSummary.average || '—'}</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1,2,3,4,5].map(i => (
                      <StarIcon key={i} size={14} filled={i <= Math.round(reviewSummary.average)} style={{ color: '#f59e0b' }} />
                    ))}
                  </div>
                  <p className="text-xs mt-1" style={{ color: t.textMuted }}>{reviewSummary.count} review{reviewSummary.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {/* Review List */}
              {reviews.length > 0 ? (
                <div className="space-y-4 mb-8">
                  {reviews.map(r => (
                    <div key={r.id} className="p-4" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <StarIcon key={i} size={12} filled={i <= r.rating} style={{ color: '#f59e0b' }} />)}</div>
                        <span className="text-xs font-semibold" style={{ color: t.text }}>{r.customer_name}</span>
                        <span className="text-xs" style={{ color: t.textMuted }}>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {r.title && <p className="text-sm font-semibold mb-1" style={{ color: t.text }}>{r.title}</p>}
                      {r.body && <p className="text-sm" style={{ color: t.textMuted }}>{r.body}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm mb-6" style={{ color: t.textMuted }}>No reviews yet. Be the first!</p>
              )}
              {/* Write a Review */}
              <div className="p-5" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                <h3 className="font-semibold mb-4" style={{ color: t.text }}>Write a Review</h3>
                {reviewMsg && <p className="text-sm mb-3 p-2 rounded" style={{ backgroundColor: t.primary + '15', color: t.primary }}>{reviewMsg}</p>}
                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: t.text }}>Rating</label>
                    <StarRatingInput value={reviewForm.rating} onChange={(v) => setReviewForm(p => ({...p, rating: v}))} />
                  </div>
                  <input type="text" required placeholder="Your Name" value={reviewForm.name}
                    onChange={(e) => setReviewForm(p => ({...p, name: e.target.value}))}
                    className="w-full px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius, backgroundColor: t.bg, color: t.text }} />
                  <input type="text" placeholder="Review Title (optional)" value={reviewForm.title}
                    onChange={(e) => setReviewForm(p => ({...p, title: e.target.value}))}
                    className="w-full px-3 py-2 text-sm outline-none" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius, backgroundColor: t.bg, color: t.text }} />
                  <textarea placeholder="Your review..." value={reviewForm.body} rows={3}
                    onChange={(e) => setReviewForm(p => ({...p, body: e.target.value}))}
                    className="w-full px-3 py-2 text-sm outline-none resize-none" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius, backgroundColor: t.bg, color: t.text }} />
                  <button type="submit" disabled={reviewSubmitting}
                    className="px-5 py-2 text-sm font-semibold transition hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}>
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              </div>
            </div>
          )}
          {activeTab === 'shipping' && (
            <div className="text-sm leading-relaxed space-y-4" style={{ color: t.textMuted }}>
              <div className="flex items-start gap-3">
                <ShippingIcon size={20} />
                <div>
                  <p className="font-semibold" style={{ color: t.text }}>Shipping</p>
                  <p>{storeConfig?.shipping_display?.text || 'Standard delivery within 3-7 business days. Free shipping on qualifying orders.'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ReturnIcon size={20} />
                <div>
                  <p className="font-semibold" style={{ color: t.text }}>Returns</p>
                  <p>Easy returns within 7 days of delivery. Items must be unused and in original packaging.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <SecureIcon size={20} />
                <div>
                  <p className="font-semibold" style={{ color: t.text }}>Secure Payment</p>
                  <p>All transactions are secured with SSL encryption. We accept bKash, Nagad, and all major cards.</p>
                </div>
              </div>
            </div>
          )}
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

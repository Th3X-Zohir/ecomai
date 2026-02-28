import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';

/* Quick View Modal */
function QuickViewModal({ product, onClose, t, formatPrice, onAdd, shopSlug }) {
  const [variant, setVariant] = useState(product.variants?.[0] || null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const price = variant ? Number(variant.price) : Number(product.base_price);
  const img = product.images?.find(i => i.is_primary)?.url || product.images?.[0]?.url;

  const handleAdd = () => {
    onAdd(product, variant, qty);
    setAdded(true);
    setTimeout(() => { setAdded(false); onClose(); }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}
        style={{ backgroundColor: t.bg, borderRadius: t.radius, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-70" style={{ backgroundColor: t.surface, color: t.text }}>✕</button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          <div className="aspect-square" style={{ backgroundColor: t.surface }}>
            {img ? <img src={img} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-7xl">📦</div>}
          </div>
          <div className="p-6 flex flex-col">
            {product.category && <span className="text-xs font-medium mb-1" style={{ color: t.primary }}>{product.category}</span>}
            <h2 className="text-xl font-bold mb-2" style={{ color: t.text }}>{product.name}</h2>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl font-bold" style={{ color: t.primary }}>{formatPrice(price)}</span>
              {product.compare_at_price && Number(product.compare_at_price) > Number(product.base_price) && (
                <span className="text-sm line-through" style={{ color: t.textMuted }}>{formatPrice(product.compare_at_price)}</span>
              )}
            </div>
            {product.description && <p className="text-sm mb-4 line-clamp-3" style={{ color: t.textMuted }}>{product.description}</p>}
            {product.variants?.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-medium mb-1 block" style={{ color: t.text }}>Variant</label>
                <div className="flex flex-wrap gap-1.5">
                  {product.variants.map(v => (
                    <button key={v.id} onClick={() => setVariant(v)} className="px-3 py-1 text-xs font-medium transition"
                      style={{ borderRadius: t.buttonRadius, border: `1.5px solid ${variant?.id === v.id ? t.primary : t.border}`, backgroundColor: variant?.id === v.id ? t.primary + '10' : 'transparent', color: variant?.id === v.id ? t.primary : t.text }}>
                      {v.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-8 h-8 flex items-center justify-center text-sm font-bold" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius, color: t.text }}>−</button>
              <span className="text-sm font-semibold w-8 text-center" style={{ color: t.text }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-8 h-8 flex items-center justify-center text-sm font-bold" style={{ border: `1px solid ${t.border}`, borderRadius: t.radius, color: t.text }}>+</button>
            </div>
            <div className="mt-auto flex gap-2">
              <button onClick={handleAdd} className="flex-1 py-2.5 text-sm font-semibold transition hover:opacity-90" style={{ backgroundColor: added ? '#16a34a' : t.primary, color: t.bg, borderRadius: t.buttonRadius }}>
                {added ? '✓ Added!' : `Add to Cart — ${formatPrice(price * qty)}`}
              </button>
              <Link to={`/store/${shopSlug}/products/${product.id}`} onClick={onClose} className="px-4 py-2.5 text-sm font-medium transition hover:opacity-70 flex items-center" style={{ border: `1px solid ${t.border}`, borderRadius: t.buttonRadius, color: t.text }}>
                Details
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Skeleton card for loading state */
function ProductSkeleton({ t }) {
  return (
    <div className="animate-pulse" style={{ borderRadius: t.radius, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
      <div className="aspect-square" style={{ backgroundColor: t.border + '60' }} />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded w-3/4" style={{ backgroundColor: t.border }} />
        <div className="h-3 rounded w-1/2" style={{ backgroundColor: t.border + '80' }} />
        <div className="h-5 rounded w-1/3" style={{ backgroundColor: t.border }} />
      </div>
    </div>
  );
}

export default function StoreProducts() {
  const { shopSlug, theme, tokens, formatPrice, formatSecondaryPrice, storeConfig } = useStore();
  const { addItem } = useCart();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const defaultSort = storeConfig?.default_sort || 'newest';
  const [sort, setSort] = useState(defaultSort);
  const [addedId, setAddedId] = useState(null);
  const perPage = storeConfig?.products_per_page || 12;
  const [page, setPage] = useState(1);
  const gridCols = storeConfig?.grid_columns || 4;
  const showOutOfStock = storeConfig?.show_out_of_stock !== false;
  const [quickView, setQuickView] = useState(null);

  const t = resolveTokens(theme, tokens);

  useEffect(() => {
    Promise.all([
      storeApi.getProducts(shopSlug),
      storeApi.getCategories(shopSlug),
    ])
      .then(([prodData, catData]) => {
        setProducts(prodData.items);
        setCategories(catData || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopSlug]);

  const handleQuickAdd = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, null, 1);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !category || p.category_id === category || p.category_name === category || p.category === category;
    const matchStock = showOutOfStock || (p.stock_quantity === undefined || p.stock_quantity === null || p.stock_quantity > 0);
    return matchSearch && matchCategory && matchStock;
  }).sort((a, b) => {
    switch (sort) {
      case 'price-asc': return Number(a.base_price) - Number(b.base_price);
      case 'price-desc': return Number(b.base_price) - Number(a.base_price);
      case 'name': return a.name.localeCompare(b.name);
      default: return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice(0, page * perPage);
  const hasMore = paginated.length < filtered.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <style>{`
        .store-product-grid { display: grid; gap: 1.25rem; grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 640px) { .store-product-grid { grid-template-columns: repeat(${Math.min(gridCols, 3)}, 1fr); } }
        @media (min-width: 1024px) { .store-product-grid { grid-template-columns: repeat(${gridCols}, 1fr); } }
      `}</style>
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold" style={{ color: t.text }}>
          All Products
        </h1>
        <p className="text-sm mt-1" style={{ color: t.textMuted }}>
          {filtered.length} product{filtered.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: t.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm outline-none transition"
            style={{
              backgroundColor: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: t.radius,
              color: t.text,
            }}
          />
        </div>
        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2.5 text-sm outline-none cursor-pointer"
            style={{
              backgroundColor: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: t.radius,
              color: t.text,
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.product_count ? ` (${c.product_count})` : ''}</option>
            ))}
          </select>
        )}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-4 py-2.5 text-sm outline-none cursor-pointer"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            color: t.text,
          }}
        >
          <option value="newest">Newest First</option>
          <option value="price-asc">Price: Low → High</option>
          <option value="price-desc">Price: High → Low</option>
          <option value="name">Name: A-Z</option>
        </select>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="store-product-grid">
          {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} t={t} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: t.textMuted }}>
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: t.text }}>No products found</h2>
          <p className="text-sm">Try adjusting your search or filter.</p>
          {(search || category) && (
            <button onClick={() => { setSearch(''); setCategory(''); }} className="mt-4 text-sm font-semibold hover:opacity-70 transition" style={{ color: t.primary }}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="store-product-grid">
          {paginated.map((product) => (
            <Link
              key={product.id}
              to={`/store/${shopSlug}/products/${product.id}`}
              className="group block"
            >
              <div
                className="overflow-hidden h-full flex flex-col transition-shadow hover:shadow-lg"
                style={{
                  backgroundColor: t.surface,
                  borderRadius: t.radius,
                  boxShadow: t.cardShadow,
                  border: `1px solid ${t.border}`,
                }}
              >
                <div
                  className="aspect-square overflow-hidden relative"
                  style={{ backgroundColor: t.border + '40' }}
                >
                  {product.images?.length > 0 ? (
                    <img src={product.images.find(i => i.is_primary)?.url || product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>
                  )}
                  {/* Quick add overlay */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex">
                    <button
                      onClick={(e) => handleQuickAdd(e, product)}
                      className="flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 backdrop-blur-md"
                      style={{
                        backgroundColor: addedId === product.id ? '#16a34a' : t.primary + 'ee',
                        color: t.bg || '#fff',
                      }}
                    >
                      {addedId === product.id ? '✓ Added!' : '+ Quick Add'}
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setQuickView(product); }}
                      className="px-3 py-2.5 text-xs font-semibold backdrop-blur-md border-l flex items-center"
                      style={{ backgroundColor: t.surface + 'ee', color: t.text, borderColor: t.border }} title="Quick View">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-sm mb-1 group-hover:opacity-70 transition line-clamp-1" style={{ color: t.text }}>
                    {product.name}
                  </h3>
                  {(product.category_name || product.category) && (
                    <span
                      className="inline-block text-xs px-2 py-0.5 mb-2 w-fit"
                      style={{
                        backgroundColor: t.primary + '15',
                        color: t.primary,
                        borderRadius: t.buttonRadius,
                      }}
                    >
                      {product.category_name || product.category}
                    </span>
                  )}
                  {product.description && (
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: t.textMuted }}>
                      {product.description}
                    </p>
                  )}
                  <div className="mt-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-bold" style={{ color: t.primary }}>
                        {formatPrice(product.base_price)}
                      </p>
                      {product.compare_at_price && Number(product.compare_at_price) > Number(product.base_price) && (
                        <p className="text-xs line-through" style={{ color: t.textMuted }}>{formatPrice(product.compare_at_price)}</p>
                      )}
                      {formatSecondaryPrice && (
                        <p className="text-xs" style={{ color: t.textMuted }}>≈ {formatSecondaryPrice(product.base_price)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load More / Pagination */}
      {!loading && hasMore && (
        <div className="text-center mt-10">
          <button
            onClick={() => setPage(p => p + 1)}
            className="inline-flex items-center px-8 py-3 font-semibold text-sm transition hover:opacity-80"
            style={{ color: t.primary, border: `2px solid ${t.primary}`, borderRadius: t.buttonRadius }}
          >
            Load More Products ({filtered.length - paginated.length} remaining)
          </button>
        </div>
      )}

      {/* Quick View Modal */}
      {quickView && (
        <QuickViewModal product={quickView} onClose={() => setQuickView(null)} t={t} formatPrice={formatPrice} shopSlug={shopSlug}
          onAdd={(p, v, q) => { addItem(p, v, q); setAddedId(p.id); setTimeout(() => setAddedId(null), 1500); }} />
      )}
    </div>
  );
}

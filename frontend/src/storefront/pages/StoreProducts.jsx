import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';

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
  const { shopSlug, theme, tokens, formatPrice } = useStore();
  const { addItem } = useCart();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sort, setSort] = useState('newest');
  const [addedId, setAddedId] = useState(null);

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
    return matchSearch && matchCategory;
  }).sort((a, b) => {
    switch (sort) {
      case 'price-asc': return Number(a.base_price) - Number(b.base_price);
      case 'price-desc': return Number(b.base_price) - Number(a.base_price);
      case 'name': return a.name.localeCompare(b.name);
      default: return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product) => (
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
                  <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <button
                      onClick={(e) => handleQuickAdd(e, product)}
                      className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 backdrop-blur-md"
                      style={{
                        backgroundColor: addedId === product.id ? '#16a34a' : t.primary + 'ee',
                        color: t.bg || '#fff',
                      }}
                    >
                      {addedId === product.id ? '✓ Added!' : '+ Quick Add'}
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
                    <p className="text-lg font-bold" style={{ color: t.primary }}>
                      {formatPrice(product.base_price)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

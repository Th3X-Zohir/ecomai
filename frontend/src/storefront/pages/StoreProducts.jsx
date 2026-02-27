import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';

export default function StoreProducts() {
  const { shopSlug, theme, tokens } = useStore();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const t = resolveTokens(theme, tokens);

  useEffect(() => {
    storeApi
      .getProducts(shopSlug)
      .then((data) => setProducts(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopSlug]);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !category || p.category === category;
    return matchSearch && matchCategory;
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
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 text-sm outline-none transition"
          style={{
            backgroundColor: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: t.radius,
            color: t.text,
          }}
        />
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
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: t.primary }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: t.textMuted }}>
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: t.text }}>No products found</h2>
          <p className="text-sm">Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <Link
              key={product.id}
              to={`/store/${shopSlug}/products/${product.id}`}
              className="group block transition-transform hover:-translate-y-1"
            >
              <div
                className="overflow-hidden h-full flex flex-col"
                style={{
                  backgroundColor: t.surface,
                  borderRadius: t.radius,
                  boxShadow: t.cardShadow,
                  border: `1px solid ${t.border}`,
                }}
              >
                <div
                  className="aspect-square flex items-center justify-center text-6xl"
                  style={{ backgroundColor: t.border + '40' }}
                >
                  {product.category === 'fashion' ? '👗' :
                   product.category === 'electronics' ? '💻' :
                   product.category === 'food_beverage' ? '☕' :
                   product.category === 'Beverages' ? '☕' :
                   '📦'}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-sm mb-1 group-hover:opacity-70 transition" style={{ color: t.text }}>
                    {product.name}
                  </h3>
                  {product.category && (
                    <span
                      className="inline-block text-xs px-2 py-0.5 mb-2 w-fit"
                      style={{
                        backgroundColor: t.primary + '15',
                        color: t.primary,
                        borderRadius: t.buttonRadius,
                      }}
                    >
                      {product.category}
                    </span>
                  )}
                  {product.description && (
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: t.textMuted }}>
                      {product.description}
                    </p>
                  )}
                  <div className="mt-auto">
                    <p className="text-lg font-bold" style={{ color: t.primary }}>
                      ${Number(product.base_price).toFixed(2)}
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

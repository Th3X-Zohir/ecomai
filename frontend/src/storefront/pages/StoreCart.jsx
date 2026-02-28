import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { resolveTokens } from '../templates';

export default function StoreCart() {
  const { shopSlug, theme, tokens, formatPrice, storeConfig } = useStore();
  const { items, removeItem, updateQuantity, total, count } = useCart();
  const navigate = useNavigate();

  const t = resolveTokens(theme, tokens);
  const minOrder = Number(storeConfig?.min_order_amount) || 0;
  const belowMinimum = minOrder > 0 && total < minOrder;

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="text-6xl mb-6">🛒</div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: t.text }}>Your cart is empty</h1>
        <p className="text-sm mb-6" style={{ color: t.textMuted }}>
          Browse our products and find something you love.
        </p>
        <Link
          to={`/store/${shopSlug}/products`}
          className="inline-flex items-center px-6 py-3 font-semibold text-sm transition hover:opacity-80"
          style={{
            backgroundColor: t.primary,
            color: t.bg,
            borderRadius: t.buttonRadius,
          }}
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-2" style={{ color: t.text }}>Shopping Cart</h1>
      <p className="text-sm mb-8" style={{ color: t.textMuted }}>
        {count} item{count !== 1 ? 's' : ''} in your cart
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-4 p-4"
              style={{
                backgroundColor: t.surface,
                borderRadius: t.radius,
                border: `1px solid ${t.border}`,
              }}
            >
              {/* Thumbnail */}
              <div
                className="w-20 h-20 shrink-0 overflow-hidden"
                style={{
                  backgroundColor: t.border + '40',
                  borderRadius: t.radius,
                }}
              >
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate" style={{ color: t.text }}>
                  {item.name}
                </h3>
                {item.variant_title && (
                  <p className="text-xs" style={{ color: t.textMuted }}>
                    Variant: {item.variant_title}
                  </p>
                )}
                <p className="text-sm font-bold mt-1" style={{ color: t.primary }}>
                  {formatPrice(item.price)}
                </p>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.key, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center text-sm font-bold transition hover:opacity-70"
                  style={{
                    border: `1px solid ${t.border}`,
                    borderRadius: t.radius,
                    color: t.text,
                  }}
                >
                  −
                </button>
                <span className="text-sm font-semibold w-8 text-center" style={{ color: t.text }}>
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.key, item.quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center text-sm font-bold transition hover:opacity-70"
                  style={{
                    border: `1px solid ${t.border}`,
                    borderRadius: t.radius,
                    color: t.text,
                  }}
                >
                  +
                </button>
              </div>

              {/* Line total */}
              <div className="text-right">
                <p className="font-bold text-sm" style={{ color: t.text }}>
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeItem(item.key)}
                className="text-sm transition hover:opacity-70"
                style={{ color: '#ef4444' }}
                title="Remove"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div>
          <div
            className="sticky top-20 p-6"
            style={{
              backgroundColor: t.surface,
              borderRadius: t.radius,
              border: `1px solid ${t.border}`,
            }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>Order Summary</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span style={{ color: t.textMuted }}>Subtotal ({count} items)</span>
                <span className="font-medium" style={{ color: t.text }}>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: t.textMuted }}>Shipping</span>
                <span className="font-medium" style={{ color: '#16a34a' }}>Free</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: t.textMuted }}>Tax</span>
                <span className="font-medium" style={{ color: t.text }}>Calculated at checkout</span>
              </div>
              <hr style={{ borderColor: t.border }} />
              <div className="flex justify-between">
                <span className="font-bold" style={{ color: t.text }}>Total</span>
                <span className="text-xl font-bold" style={{ color: t.primary }}>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/store/${shopSlug}/checkout`)}
              disabled={belowMinimum}
              className="w-full py-3.5 text-base font-semibold transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: t.primary,
                color: t.bg,
                borderRadius: t.buttonRadius,
              }}
            >
              Proceed to Checkout
            </button>

            {belowMinimum && (
              <p className="text-center text-xs mt-2" style={{ color: '#ef4444' }}>
                Minimum order amount is {formatPrice(minOrder)}. Add {formatPrice(minOrder - total)} more.
              </p>
            )}

            <Link
              to={`/store/${shopSlug}/products`}
              className="block text-center text-sm mt-4 transition hover:opacity-70"
              style={{ color: t.primary }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

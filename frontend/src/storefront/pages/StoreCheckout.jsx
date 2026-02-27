import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';

export default function StoreCheckout() {
  const { shopSlug, theme, tokens } = useStore();
  const { items, total, count, clearCart } = useCart();
  const t = resolveTokens(theme, tokens);

  const [form, setForm] = useState({
    email: '',
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await storeApi.checkout(shopSlug, {
        customer_email: form.email,
        customer_name: form.name,
        customer_phone: form.phone,
        items: items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          quantity: i.quantity,
        })),
        shipping_address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zip: form.zip,
          country: form.country,
        },
      });
      setOrder(result);
      clearCart();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Order confirmed
  if (order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-bold mb-3" style={{ color: t.text }}>
          Order Confirmed!
        </h1>
        <p className="text-base mb-4" style={{ color: t.textMuted }}>
          Thank you for your purchase. Your order has been placed successfully.
        </p>
        <div
          className="p-5 mb-8 text-left"
          style={{
            backgroundColor: t.surface,
            borderRadius: t.radius,
            border: `1px solid ${t.border}`,
          }}
        >
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span style={{ color: t.textMuted }}>Order ID</span>
            <span className="font-mono text-xs font-medium" style={{ color: t.text }}>
              {order.id}
            </span>
            <span style={{ color: t.textMuted }}>Total</span>
            <span className="font-bold" style={{ color: t.primary }}>
              ${Number(order.total_amount).toFixed(2)}
            </span>
            <span style={{ color: t.textMuted }}>Items</span>
            <span style={{ color: t.text }}>{order.items?.length || 0}</span>
            <span style={{ color: t.textMuted }}>Status</span>
            <span className="font-medium" style={{ color: '#f59e0b' }}>
              {order.status}
            </span>
          </div>
        </div>
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

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: t.text }}>Cart is empty</h1>
        <p className="text-sm mb-6" style={{ color: t.textMuted }}>
          Add items to your cart before checking out.
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
          Browse Products
        </Link>
      </div>
    );
  }

  const inputStyle = {
    backgroundColor: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: t.radius,
    color: t.text,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-8" style={{ color: t.text }}>Checkout</h1>

      {error && (
        <div className="mb-6 p-4 text-sm font-medium" style={{
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          borderRadius: t.radius,
          border: '1px solid #fecaca',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact */}
            <div
              className="p-6"
              style={{
                backgroundColor: t.surface,
                borderRadius: t.radius,
                border: `1px solid ${t.border}`,
              }}
            >
              <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>Contact Information</h2>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address *"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  required
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={inputStyle}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Full name *"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    required
                    className="w-full px-4 py-3 text-sm outline-none"
                    style={inputStyle}
                  />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    className="w-full px-4 py-3 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div
              className="p-6"
              style={{
                backgroundColor: t.surface,
                borderRadius: t.radius,
                border: `1px solid ${t.border}`,
              }}
            >
              <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>Shipping Address</h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Street address *"
                  value={form.street}
                  onChange={(e) => update('street', e.target.value)}
                  required
                  className="w-full px-4 py-3 text-sm outline-none"
                  style={inputStyle}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="City *"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    required
                    className="w-full px-4 py-3 text-sm outline-none"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                    className="w-full px-4 py-3 text-sm outline-none"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="ZIP code *"
                    value={form.zip}
                    onChange={(e) => update('zip', e.target.value)}
                    required
                    className="w-full px-4 py-3 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
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
                {items.map((item) => (
                  <div key={item.key} className="flex justify-between text-sm">
                    <span style={{ color: t.textMuted }}>
                      {item.name} {item.variant_title ? `(${item.variant_title})` : ''} × {item.quantity}
                    </span>
                    <span className="font-medium" style={{ color: t.text }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <hr style={{ borderColor: t.border }} />
                <div className="flex justify-between text-sm">
                  <span style={{ color: t.textMuted }}>Subtotal</span>
                  <span className="font-medium" style={{ color: t.text }}>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: t.textMuted }}>Shipping</span>
                  <span className="font-medium" style={{ color: '#16a34a' }}>Free</span>
                </div>
                <hr style={{ borderColor: t.border }} />
                <div className="flex justify-between">
                  <span className="font-bold" style={{ color: t.text }}>Total</span>
                  <span className="text-xl font-bold" style={{ color: t.primary }}>${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-base font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: t.primary,
                  color: t.bg,
                  borderRadius: t.buttonRadius,
                }}
              >
                {loading ? 'Placing Order...' : `Place Order — $${total.toFixed(2)}`}
              </button>

              <p className="text-xs text-center mt-3" style={{ color: t.textMuted }}>
                🔒 Secure checkout. Your data is encrypted.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

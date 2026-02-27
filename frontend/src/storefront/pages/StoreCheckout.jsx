import { useState, useEffect } from 'react';
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
    country: 'BD',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Pre-fill checkout form if customer is already logged in
  useEffect(() => {
    const token = localStorage.getItem(`customer_token_${shopSlug}`);
    if (token) {
      setIsLoggedIn(true);
      storeApi.getProfile(shopSlug, token).then((p) => {
        setForm((prev) => ({
          ...prev,
          email: p.email || prev.email,
          name: p.full_name || prev.name,
          phone: p.phone || prev.phone,
        }));
        const addrs = Array.isArray(p.addresses) ? p.addresses : [];
        if (addrs.length > 0) {
          const last = addrs[addrs.length - 1];
          setForm((prev) => ({
            ...prev,
            street: last.street || prev.street,
            city: last.city || prev.city,
            state: last.state || prev.state,
            zip: last.zip || prev.zip,
            country: last.country || prev.country,
          }));
        }
      }).catch(() => {});
    }
  }, [shopSlug]);

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

      // Auto-login: save the customer token returned from checkout
      if (result.customerToken) {
        localStorage.setItem(`customer_token_${shopSlug}`, result.customerToken);
        if (result.customer) {
          localStorage.setItem(`customer_${shopSlug}`, JSON.stringify(result.customer));
        }
      }

      // SSLCommerz flow: redirect to payment gateway
      if (result.payment?.gatewayUrl) {
        clearCart();
        window.location.href = result.payment.gatewayUrl;
        return;
      }

      // Fallback: direct order confirmation
      setOrder(result.order || result);
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
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: `${t.primary}15` }}>
          <svg className="w-10 h-10" style={{ color: t.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ color: t.text }}>Order Confirmed!</h1>
        <p className="text-base mb-6" style={{ color: t.textMuted }}>
          Thank you for your purchase. Your order has been placed successfully.
        </p>
        <div className="p-6 mb-8 text-left" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span style={{ color: t.textMuted }}>Order ID</span>
            <span className="font-mono text-xs font-medium" style={{ color: t.text }}>{order.id?.slice(0, 8)}...</span>
            <span style={{ color: t.textMuted }}>Total</span>
            <span className="font-bold" style={{ color: t.primary }}>৳{Number(order.total_amount).toLocaleString()}</span>
            <span style={{ color: t.textMuted }}>Items</span>
            <span style={{ color: t.text }}>{order.items?.length || 0}</span>
            <span style={{ color: t.textMuted }}>Status</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>{order.status}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to={`/store/${shopSlug}/account`} className="inline-flex items-center px-6 py-3 font-semibold text-sm transition hover:opacity-80" style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}>
            View My Orders
          </Link>
          <Link to={`/store/${shopSlug}/products`} className="inline-flex items-center px-6 py-3 font-semibold text-sm transition hover:opacity-80" style={{ border: `1px solid ${t.border}`, color: t.text, borderRadius: t.buttonRadius }}>
            Continue Shopping
          </Link>
        </div>
        <p className="text-xs mt-6" style={{ color: t.textMuted }}>
          An account has been created for you. You can track your orders anytime.
        </p>
      </div>
    );
  }

  // Empty cart
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${t.primary}10` }}>
          <svg className="w-10 h-10" style={{ color: t.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-3" style={{ color: t.text }}>Cart is empty</h1>
        <p className="text-sm mb-6" style={{ color: t.textMuted }}>Add items to your cart before checking out.</p>
        <Link to={`/store/${shopSlug}/products`} className="inline-flex items-center px-6 py-3 font-semibold text-sm transition hover:opacity-80" style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}>
          Browse Products
        </Link>
      </div>
    );
  }

  const inputStyle = { backgroundColor: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius, color: t.text };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-2" style={{ color: t.text }}>Checkout</h1>
      {isLoggedIn ? (
        <p className="text-sm mb-6" style={{ color: t.textMuted }}>Your information has been pre-filled from your account.</p>
      ) : (
        <p className="text-sm mb-6" style={{ color: t.textMuted }}>
          Already have an account?{' '}
          <Link to={`/store/${shopSlug}/auth/login`} className="font-medium hover:underline" style={{ color: t.primary }}>Sign in</Link>{' '}for faster checkout.
        </p>
      )}

      {error && (
        <div className="mb-6 p-4 text-sm font-medium" style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: t.radius, border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Contact */}
            <div className="p-6" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: t.primary, color: t.bg }}>1</div>
                <h2 className="text-lg font-bold" style={{ color: t.text }}>Contact Information</h2>
              </div>
              <div className="space-y-3">
                <input type="email" placeholder="Email address *" value={form.email} onChange={(e) => update('email', e.target.value)} required className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" placeholder="Full name *" value={form.name} onChange={(e) => update('name', e.target.value)} required className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                  <input type="tel" placeholder="Phone number" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="p-6" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: t.primary, color: t.bg }}>2</div>
                <h2 className="text-lg font-bold" style={{ color: t.text }}>Shipping Address</h2>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Street address *" value={form.street} onChange={(e) => update('street', e.target.value)} required className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" placeholder="City *" value={form.city} onChange={(e) => update('city', e.target.value)} required className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                  <input type="text" placeholder="State" value={form.state} onChange={(e) => update('state', e.target.value)} className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                  <input type="text" placeholder="ZIP code *" value={form.zip} onChange={(e) => update('zip', e.target.value)} required className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <div className="sticky top-20 p-6" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>Order Summary</h2>
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.key} className="flex justify-between text-sm">
                    <span style={{ color: t.textMuted }}>{item.name} {item.variant_title ? `(${item.variant_title})` : ''} × {item.quantity}</span>
                    <span className="font-medium" style={{ color: t.text }}>৳{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <hr style={{ borderColor: t.border }} />
                <div className="flex justify-between text-sm">
                  <span style={{ color: t.textMuted }}>Subtotal</span>
                  <span className="font-medium" style={{ color: t.text }}>৳{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: t.textMuted }}>Shipping</span>
                  <span className="font-medium" style={{ color: '#16a34a' }}>Free</span>
                </div>
                <hr style={{ borderColor: t.border }} />
                <div className="flex justify-between">
                  <span className="font-bold" style={{ color: t.text }}>Total</span>
                  <span className="text-xl font-bold" style={{ color: t.primary }}>৳{total.toFixed(2)}</span>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-3.5 text-base font-semibold transition hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}>
                {loading ? 'Proceeding to Payment...' : `Pay Now — ৳${total.toFixed(2)}`}
              </button>

              <div className="flex items-center justify-center gap-2 mt-4">
                <svg className="w-4 h-4" style={{ color: t.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-xs" style={{ color: t.textMuted }}>Secure checkout via SSLCommerz</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

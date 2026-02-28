import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../contexts/StoreContext';
import { useCart } from '../../contexts/CartContext';
import { storeApi } from '../../api-public';
import { resolveTokens } from '../templates';

/* ── Step indicator ── */
function StepIndicator({ steps, current, t }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                style={{
                  backgroundColor: done ? t.primary : active ? t.primary : t.border,
                  color: done || active ? (t.bg || '#fff') : t.textMuted,
                  boxShadow: active ? `0 0 0 4px ${t.primary}25` : 'none',
                }}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                ) : i + 1}
              </div>
              <span className="text-xs mt-1.5 font-medium hidden sm:block" style={{ color: active ? t.primary : t.textMuted }}>{step}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-12 sm:w-20 h-0.5 mx-2" style={{ backgroundColor: done ? t.primary : t.border }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function StoreCheckout() {
  const { shopSlug, theme, tokens, formatPrice, storeConfig } = useStore();
  const { items, total, count, clearCart } = useCart();
  const t = resolveTokens(theme, tokens);

  const [step, setStep] = useState(0); // 0=info, 1=shipping, 2=review
  const [form, setForm] = useState({
    email: '', name: '', phone: '', password: '',
    street: '', city: '', state: '', zip: '', country: 'BD', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(null); // holds validated coupon info
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(''); setCouponLoading(true);
    try {
      const res = await storeApi.validateCoupon(shopSlug, couponCode.trim(), total);
      setCouponDiscount(res.discount || 0);
      setCouponApplied(res);
    } catch (err) {
      setCouponError(err.message || 'Invalid coupon');
      setCouponDiscount(0);
      setCouponApplied(null);
    } finally { setCouponLoading(false); }
  };

  const handleRemoveCoupon = () => {
    setCouponCode(''); setCouponDiscount(0); setCouponApplied(null); setCouponError('');
  };

  const canProceedStep0 = form.email && form.name;
  const canProceedStep1 = form.street && form.city && form.zip;

  const handleSubmit = async () => {
    setError(''); setLoading(true);
    try {
      const payload = {
        customer_email: form.email,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_password: form.password || undefined,
        order_notes: form.notes || undefined,
        coupon_code: couponApplied ? couponCode.trim() : undefined,
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
      };
      const result = await storeApi.checkout(shopSlug, payload);

      if (result.customerToken) {
        localStorage.setItem(`customer_token_${shopSlug}`, result.customerToken);
        if (result.customer) localStorage.setItem(`customer_${shopSlug}`, JSON.stringify(result.customer));
      }
      if (result.payment?.gatewayUrl) { window.location.href = result.payment.gatewayUrl; return; }
      setOrder(result.order || result);
      clearCart();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  // Guest checkout guard
  const guestCheckoutAllowed = storeConfig?.guest_checkout !== false;
  if (!guestCheckoutAllowed && !isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold mb-3" style={{ color: t.text }}>Account Required</h2>
        <p className="text-sm mb-6" style={{ color: t.textMuted }}>Please sign in or create an account to proceed with checkout.</p>
        <Link to={`/store/${shopSlug}/auth/login`} className="inline-block px-6 py-3 font-semibold text-sm transition hover:opacity-80"
          style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}>
          Sign In to Continue
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

  // ── Order confirmed ──
  if (order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center animate-[bounceIn_0.5s_ease]" style={{ backgroundColor: '#dcfce7' }}>
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ color: t.text }}>Order Confirmed!</h1>
        <p className="text-base mb-8" style={{ color: t.textMuted }}>
          Thank you, {form.name}! Your order has been placed successfully.
        </p>
        <div className="p-6 mb-8 text-left" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <span style={{ color: t.textMuted }}>Order ID</span>
            <span className="font-mono text-xs font-medium" style={{ color: t.text }}>{order.id?.slice(0, 8)}...</span>
            <span style={{ color: t.textMuted }}>Total</span>
            <span className="font-bold" style={{ color: t.primary }}>{formatPrice(order.total_amount)}</span>
            <span style={{ color: t.textMuted }}>Items</span>
            <span style={{ color: t.text }}>{order.items?.length || count}</span>
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

  // ── Empty cart ──
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold mb-2 text-center" style={{ color: t.text }}>Checkout</h1>
      {!isLoggedIn && (
        <p className="text-sm mb-6 text-center" style={{ color: t.textMuted }}>
          Already have an account?{' '}
          <Link to={`/store/${shopSlug}/auth/login`} className="font-medium hover:underline" style={{ color: t.primary }}>Sign in</Link>{' '}for faster checkout.
        </p>
      )}

      <StepIndicator steps={['Your Info', 'Shipping', 'Review & Pay']} current={step} t={t} />

      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 text-sm font-medium" style={{ backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: t.radius, border: '1px solid #fecaca' }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* STEP 0: Contact Information */}
          {step === 0 && (
            <div className="p-6 animate-[fadeIn_0.3s_ease]" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: t.primary + '12' }}>👤</div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: t.text }}>Contact Information</h2>
                  <p className="text-xs" style={{ color: t.textMuted }}>We'll use this to send your order updates</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: t.textMuted }}>Email *</label>
                  <input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => update('email', e.target.value)} required className="w-full px-4 py-3 text-sm outline-none transition focus:ring-2" style={{ ...inputStyle, '--tw-ring-color': t.primary + '40' }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: t.textMuted }}>Full Name *</label>
                    <input type="text" placeholder="John Doe" value={form.name} onChange={(e) => update('name', e.target.value)} required className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: t.textMuted }}>Phone</label>
                    <input type="tel" placeholder="+880 1XXX XXX XXX" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                  </div>
                </div>
                {!isLoggedIn && (
                  <div className="p-4 mt-2" style={{ backgroundColor: t.primary + '08', borderRadius: t.radius, border: `1px dashed ${t.primary}30` }}>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: t.primary }}>Create Password (optional)</label>
                    <input type="password" placeholder="Set a password to track orders" value={form.password} onChange={(e) => update('password', e.target.value)} className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                    <p className="text-xs mt-2" style={{ color: t.textMuted }}>We'll create an account so you can track your orders. Leave blank to skip.</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end mt-6 pt-4 border-t" style={{ borderColor: t.border }}>
                <button
                  onClick={() => canProceedStep0 && setStep(1)}
                  disabled={!canProceedStep0}
                  className="px-8 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
                  style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}
                >
                  Continue to Shipping
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Shipping Address */}
          {step === 1 && (
            <div className="p-6 animate-[fadeIn_0.3s_ease]" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: t.primary + '12' }}>📦</div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: t.text }}>Shipping Address</h2>
                  <p className="text-xs" style={{ color: t.textMuted }}>Where should we deliver your order?</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: t.textMuted }}>Street Address *</label>
                  <input type="text" placeholder="123 Main St, Apt 4B" value={form.street} onChange={(e) => update('street', e.target.value)} required className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: t.textMuted }}>City *</label>
                    <input type="text" placeholder="Dhaka" value={form.city} onChange={(e) => update('city', e.target.value)} required className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: t.textMuted }}>State/Division</label>
                    <input type="text" placeholder="Dhaka" value={form.state} onChange={(e) => update('state', e.target.value)} className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: t.textMuted }}>ZIP Code *</label>
                    <input type="text" placeholder="1205" value={form.zip} onChange={(e) => update('zip', e.target.value)} required className="w-full px-4 py-3 text-sm outline-none transition" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: t.textMuted }}>Order Notes (optional)</label>
                  <textarea placeholder="Special delivery instructions, gift message, etc." value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} className="w-full px-4 py-3 text-sm outline-none transition resize-none" style={inputStyle} />
                </div>
              </div>
              <div className="flex justify-between mt-6 pt-4 border-t" style={{ borderColor: t.border }}>
                <button onClick={() => setStep(0)} className="px-6 py-3 text-sm font-medium transition hover:opacity-70 flex items-center gap-2" style={{ color: t.textMuted }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
                  Back
                </button>
                <button
                  onClick={() => canProceedStep1 && setStep(2)}
                  disabled={!canProceedStep1}
                  className="px-8 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
                  style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}
                >
                  Review Order
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Review & Pay */}
          {step === 2 && (
            <div className="space-y-4 animate-[fadeIn_0.3s_ease]">
              {/* Contact summary */}
              <div className="p-5 flex items-start justify-between" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>Contact</h3>
                  <p className="text-sm font-medium" style={{ color: t.text }}>{form.name}</p>
                  <p className="text-xs" style={{ color: t.textMuted }}>{form.email} {form.phone ? `· ${form.phone}` : ''}</p>
                </div>
                <button onClick={() => setStep(0)} className="text-xs font-medium hover:underline" style={{ color: t.primary }}>Edit</button>
              </div>
              {/* Shipping summary */}
              <div className="p-5 flex items-start justify-between" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>Ship To</h3>
                  <p className="text-sm font-medium" style={{ color: t.text }}>{form.street}</p>
                  <p className="text-xs" style={{ color: t.textMuted }}>{form.city}{form.state ? `, ${form.state}` : ''} {form.zip}</p>
                </div>
                <button onClick={() => setStep(1)} className="text-xs font-medium hover:underline" style={{ color: t.primary }}>Edit</button>
              </div>
              {form.notes && (
                <div className="p-5" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: t.textMuted }}>Notes</h3>
                  <p className="text-sm" style={{ color: t.text }}>{form.notes}</p>
                </div>
              )}
              {/* Items list */}
              <div className="p-5" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: t.textMuted }}>Items ({count})</h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.key} className="flex items-center gap-3">
                      <div className="w-12 h-12 shrink-0 overflow-hidden" style={{ borderRadius: t.radius, backgroundColor: t.border + '40' }}>
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: t.text }}>{item.name}</p>
                        <p className="text-xs" style={{ color: t.textMuted }}>Qty: {item.quantity}{item.variant_title ? ` · ${item.variant_title}` : ''}</p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: t.text }}>{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="px-6 py-3 text-sm font-medium transition hover:opacity-70 flex items-center gap-2" style={{ color: t.textMuted }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary (sticky sidebar) */}
        <div>
          <div className="sticky top-20 p-6" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>Order Summary</h2>
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.key} className="flex justify-between text-sm">
                  <span className="truncate pr-2" style={{ color: t.textMuted }}>{item.name} {item.variant_title ? `(${item.variant_title})` : ''} × {item.quantity}</span>
                  <span className="font-medium shrink-0" style={{ color: t.text }}>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <hr style={{ borderColor: t.border }} />
              <div className="flex justify-between text-sm">
                <span style={{ color: t.textMuted }}>Subtotal</span>
                <span className="font-medium" style={{ color: t.text }}>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: t.textMuted }}>Shipping</span>
                <span className="font-medium" style={{ color: '#16a34a' }}>Free</span>
              </div>

              {/* Coupon code input */}
              <div className="pt-1">
                {couponApplied ? (
                  <div className="flex items-center justify-between p-2.5" style={{ backgroundColor: '#f0fdf4', borderRadius: t.radius, border: '1px solid #bbf7d0' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 text-sm">🎟️</span>
                      <span className="text-sm font-medium text-green-700">{couponCode.toUpperCase()}</span>
                    </div>
                    <button onClick={handleRemoveCoupon} className="text-xs text-red-500 hover:underline font-medium">Remove</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                        className="flex-1 px-3 py-2 text-sm outline-none transition"
                        style={inputStyle}
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={couponLoading || !couponCode.trim()}
                        className="px-4 py-2 text-xs font-semibold transition hover:opacity-90 disabled:opacity-40 shrink-0"
                        style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}
                      >
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs mt-1.5 text-red-500">{couponError}</p>}
                  </div>
                )}
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: '#16a34a' }}>Discount</span>
                  <span className="font-medium" style={{ color: '#16a34a' }}>−{formatPrice(couponDiscount)}</span>
                </div>
              )}

              <hr style={{ borderColor: t.border }} />
              <div className="flex justify-between">
                <span className="font-bold" style={{ color: t.text }}>Total</span>
                <span className="text-xl font-bold" style={{ color: t.primary }}>{formatPrice(total - couponDiscount)}</span>
              </div>
            </div>

            {step === 2 ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3.5 text-base font-semibold transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: t.primary, color: t.bg, borderRadius: t.buttonRadius }}
              >
                {loading ? (
                  <><svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Processing...</>
                ) : (
                  <>🔒 Pay Now — {formatPrice(total - couponDiscount)}</>  
                )}
              </button>
            ) : (
              <div className="text-center py-3 text-sm" style={{ color: t.textMuted }}>
                Complete all steps to place order
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mt-4">
              <svg className="w-4 h-4" style={{ color: t.textMuted }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-xs" style={{ color: t.textMuted }}>Secure checkout via SSLCommerz</p>
            </div>

            {/* Trust signals */}
            <div className="mt-5 pt-4 border-t grid grid-cols-2 gap-3" style={{ borderColor: t.border }}>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
                <span>🚀</span> Fast Delivery
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
                <span>🔒</span> SSL Secured
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
                <span>↩️</span> Easy Returns
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
                <span>💬</span> 24/7 Support
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

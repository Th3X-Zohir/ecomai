import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { storeApi } from '../../api-public';
import { useStore } from '../../contexts/StoreContext';
import { resolveTokens } from '../templates';

/* ── Status color map ── */
const statusColor = (s) => {
  const map = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    confirmed: { bg: '#dbeafe', text: '#1e40af' },
    processing: { bg: '#e0e7ff', text: '#3730a3' },
    shipped: { bg: '#ede9fe', text: '#5b21b6' },
    in_transit: { bg: '#cffafe', text: '#0e7490' },
    out_for_delivery: { bg: '#fef9c3', text: '#854d0e' },
    delivered: { bg: '#dcfce7', text: '#166534' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
    refunded: { bg: '#fce7f3', text: '#9d174d' },
    failed: { bg: '#fee2e2', text: '#991b1b' },
  };
  return map[s] || { bg: '#f3f4f6', text: '#374151' };
};

const StatusBadge = ({ status }) => {
  const c = statusColor(status);
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize"
      style={{ backgroundColor: c.bg, color: c.text }}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
};

/* ── Step icons ── */
const STEP_ICONS = {
  completed: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  current: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  ),
  pending: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  ),
};

const TIMELINE_STEPS = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export default function StoreOrderTracking() {
  const { shopSlug } = useParams();
  const { theme, tokens } = useStore();
  const t = resolveTokens(theme, tokens);

  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tracking, setTracking] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderId) return;
    setError(null);
    setLoading(true);
    try {
      const res = await storeApi.trackOrder(shopSlug, {
        order_id: orderId,
        email: email || undefined,
        phone: phone || undefined,
      });
      setTracking(res);
    } catch (err) {
      setError(err.message || 'Order not found. Please check your order ID and email/phone.');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIdx = tracking
    ? TIMELINE_STEPS.findIndex(s => s.key === tracking.status)
    : -1;

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2" style={{ color: t.text }}>Track Your Order</h1>
        <p className="" style={{ color: t.textMuted }}>Enter your order ID and email or phone to see delivery status</p>
      </div>

      {/* Search Form */}
      <div className="p-6 mb-8" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
        <form onSubmit={handleTrack} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>Order ID</label>
            <input
              type="text"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder="e.g. 1234abcd-..."
              required
              className="w-full px-4 py-2.5 rounded-lg outline-none transition"
              style={{ backgroundColor: t.inputBg, color: t.text, border: `1px solid ${t.border}` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 rounded-lg outline-none transition"
                style={{ backgroundColor: t.inputBg, color: t.text, border: `1px solid ${t.border}` }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: t.text }}>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-2.5 rounded-lg outline-none transition"
                style={{ backgroundColor: t.inputBg, color: t.text, border: `1px solid ${t.border}` }}
              />
            </div>
          </div>
          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-semibold rounded-lg transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: t.primary, color: t.bg }}
          >
            {loading ? 'Tracking...' : 'Track Order'}
          </button>
        </form>
      </div>

      {/* Tracking Results */}
      {tracking && (
        <div className="space-y-6">
          {/* Order Header */}
          <div className="p-6" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm" style={{ color: t.textMuted }}>Order Number</p>
                <p className="text-xl font-bold" style={{ color: t.text }}>#{tracking.orderNumber}</p>
              </div>
              <StatusBadge status={tracking.status} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs" style={{ color: t.textMuted }}>Order Total</p>
                <p className="font-semibold" style={{ color: t.text }}>৳{tracking.summary.totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: t.textMuted }}>Payment</p>
                <p className="font-medium capitalize" style={{ color: t.text }}>{tracking.paymentMethod || tracking.paymentStatus}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: t.textMuted }}>Placed On</p>
                <p className="font-medium" style={{ color: t.text }}>{new Date(tracking.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Delivery Timeline */}
          <div className="p-6" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
            <h2 className="text-lg font-semibold mb-6" style={{ color: t.text }}>Delivery Progress</h2>
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, i) => {
                const stepState = i < currentStepIdx ? 'completed' : i === currentStepIdx ? 'current' : 'pending';
                const isLast = i === TIMELINE_STEPS.length - 1;
                return (
                  <div key={step.key} className="flex items-start gap-4">
                    {/* Connector line */}
                    <div className="flex flex-col items-center">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: stepState === 'completed' ? '#16a34a' : stepState === 'current' ? t.primary : t.border,
                          color: stepState === 'pending' ? t.textMuted : '#fff',
                        }}
                      >
                        {STEP_ICONS[stepState]}
                      </div>
                      {!isLast && (
                        <div
                          className="w-0.5 flex-1 my-1"
                          style={{ backgroundColor: i < currentStepIdx ? '#16a34a' : t.border, minHeight: 24 }}
                        />
                      )}
                    </div>
                    {/* Step content */}
                    <div className="pb-6 flex-1">
                      <p
                        className="font-medium"
                        style={{ color: stepState === 'pending' ? t.textMuted : t.text }}
                      >
                        {step.label}
                      </p>
                      {stepState === 'current' && tracking.status !== 'delivered' && (
                        <p className="text-xs mt-0.5" style={{ color: t.textMuted }}>In progress</p>
                      )}
                      {stepState === 'completed' && (
                        <p className="text-xs mt-0.5" style={{ color: '#16a34a' }}>Completed</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Details */}
          {tracking.delivery && (
            <div className="p-6" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: t.text }}>Delivery Details</h2>
              <div className="space-y-3">
                {tracking.delivery.driverName && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${t.primary}15` }}>
                      <svg className="w-4 h-4" style={{ color: t.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: t.text }}>{tracking.delivery.driverName}</p>
                      <p className="text-xs" style={{ color: t.textMuted }}>Your delivery driver</p>
                    </div>
                  </div>
                )}
                {tracking.delivery.estimatedDelivery && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${t.primary}15` }}>
                      <svg className="w-4 h-4" style={{ color: t.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: t.text }}>
                        {new Date(tracking.delivery.estimatedDelivery).toLocaleDateString('en-BD', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </p>
                      <p className="text-xs" style={{ color: t.textMuted }}>Estimated delivery</p>
                    </div>
                  </div>
                )}
                {tracking.delivery.scheduledTimeSlot && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${t.primary}15` }}>
                      <svg className="w-4 h-4" style={{ color: t.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: t.text }}>{tracking.delivery.scheduledTimeSlot}</p>
                      <p className="text-xs" style={{ color: t.textMuted }}>Preferred time slot</p>
                    </div>
                  </div>
                )}
                {tracking.delivery.failureReason && (
                  <div className="p-3 rounded-lg" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                    <p className="text-sm font-medium">Delivery issue: {tracking.delivery.failureReason}</p>
                    <p className="text-xs mt-0.5">Attempt {tracking.delivery.attemptCount}. The merchant has been notified.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="p-6" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: t.text }}>Order Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: t.textMuted }}>Subtotal</span>
                <span style={{ color: t.text }}>৳{tracking.summary.subtotal.toFixed(2)}</span>
              </div>
              {tracking.summary.shippingAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: t.textMuted }}>Shipping</span>
                  <span style={{ color: t.text }}>৳{tracking.summary.shippingAmount.toFixed(2)}</span>
                </div>
              )}
              {tracking.summary.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: t.textMuted }}>Discount</span>
                  <span style={{ color: '#16a34a' }}>-৳{tracking.summary.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {tracking.summary.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: t.textMuted }}>Tax</span>
                  <span style={{ color: t.text }}>৳{tracking.summary.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2" style={{ borderTop: `1px solid ${t.border}` }}>
                <span style={{ color: t.text }}>Total</span>
                <span style={{ color: t.text }}>৳{tracking.summary.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          {tracking.shippingAddress && (
            <div className="p-6" style={{ backgroundColor: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}` }}>
              <h2 className="text-lg font-semibold mb-3" style={{ color: t.text }}>Delivery Address</h2>
              <p className="text-sm" style={{ color: t.textMuted }}>
                {[tracking.shippingAddress.address1, tracking.shippingAddress.city, tracking.shippingAddress.region, tracking.shippingAddress.postal_code, tracking.shippingAddress.country]
                  .filter(Boolean).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Help text */}
      <p className="text-center text-sm mt-8" style={{ color: t.textMuted }}>
        Need help?{' '}
        <Link to={`/store/${shopSlug}`} className="underline" style={{ color: t.primary }}>
          Contact the shop
        </Link>
      </p>
    </div>
  );
}

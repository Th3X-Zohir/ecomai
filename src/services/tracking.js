/**
 * Order Tracking Service
 * Public-facing order tracking for customers (no auth required)
 * Returns order status, payment status, and delivery timeline
 */
const orderRepo = require('../repositories/orders');
const paymentRepo = require('../repositories/payments');
const deliveryRepo = require('../repositories/delivery-requests');
const { DomainError } = require('../errors/domain-error');

const DELIVERY_STEPS = [
  { key: 'pending',        label: 'Order Placed',           icon: '📋' },
  { key: 'confirmed',      label: 'Order Confirmed',        icon: '✅' },
  { key: 'processing',     label: 'Processing',             icon: '⚙️' },
  { key: 'shipped',        label: 'Shipped',                icon: '📦' },
  { key: 'in_transit',     label: 'In Transit',             icon: '🚚' },
  { key: 'out_for_delivery', label: 'Out for Delivery',     icon: '🚴' },
  { key: 'delivered',      label: 'Delivered',              icon: '🏠' },
];

const STATUS_PROGRESSION = ['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'];

/**
 * Build a visual timeline of order steps with completed/current/pending states.
 */
function buildTimeline(currentStatus) {
  const currentIdx = STATUS_PROGRESSION.indexOf(currentStatus);
  return DELIVERY_STEPS.map((step, i) => ({
    ...step,
    status: i < currentIdx ? 'completed' : i === currentIdx ? 'current' : 'pending',
  }));
}

/**
 * Public order tracking by order ID + email verification.
 * Does NOT require authentication — customer provides order ID and email/phone.
 */
async function trackOrderById({ shopId, orderId, email, phone }) {
  const order = await orderRepo.findById(orderId);
  if (!order || (shopId && order.shop_id !== shopId)) {
    throw new DomainError('NOT_FOUND', 'Order not found', 404);
  }

  // Verify ownership via email or phone
  if (email || phone) {
    const customer = await require('../repositories/customers').findById(order.customer_id);
    const emailMatch = email && customer?.email?.toLowerCase() === email.toLowerCase();
    const phoneMatch = phone && customer?.phone === phone;
    if (!emailMatch && !phoneMatch) {
      throw new DomainError('FORBIDDEN', 'You do not have access to this order', 403);
    }
  }

  return assembleTrackingData(order);
}

/**
 * Assemble full tracking data for an order.
 */
async function assembleTrackingData(order) {
  const payments = await paymentRepo.listByOrder(order.id);
  const completedPayment = payments.find(p => p.status === 'completed');

  // Get delivery request if exists
  const deliveryRequests = await deliveryRepo.listByShop(order.shop_id, { status: undefined, search: order.id });
  const delivery = deliveryRequests.items?.find(d => d.order_id === order.id);

  // Build timeline
  const timeline = buildTimeline(order.status);

  // Get last location if available
  let lastLocation = null;
  if (delivery?.location_updates?.length > 0) {
    const updates = typeof delivery.location_updates === 'string'
      ? JSON.parse(delivery.location_updates)
      : delivery.location_updates;
    const last = updates[updates.length - 1];
    lastLocation = { lat: last.lat, lng: last.lng, updatedAt: last.updated_at };
  }

  // Estimate delivery if shipped
  let estimatedDelivery = null;
  if (delivery?.estimated_delivery) {
    estimatedDelivery = delivery.estimated_delivery;
  } else if (delivery?.scheduled_date) {
    estimatedDelivery = delivery.scheduled_date;
  }

  return {
    orderId: order.id,
    orderNumber: String(order.id).split('-')[0].toUpperCase(),
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: completedPayment?.method || null,
    timeline,
    summary: {
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.tax_amount || 0),
      shippingAmount: Number(order.shipping_amount || 0),
      discountAmount: Number(order.discount_amount || 0),
      totalAmount: Number(order.total_amount),
      currency: 'BDT',
    },
    delivery: delivery ? {
      id: delivery.id,
      status: delivery.status,
      estimatedDelivery,
      scheduledDate: delivery.scheduled_date,
      scheduledTimeSlot: delivery.scheduled_time_slot,
      driverName: delivery.driver_name || null,
      driverPhone: null, // Don't expose driver phone publicly for safety
      lastLocation,
      failureReason: delivery.failure_code ? getFailureLabel(delivery.failure_code) : null,
      attemptCount: delivery.attempt_count || 0,
      trackingUrl: null, // Could be third-party tracking URL if integrated
    } : null,
    shippingAddress: order.shipping_address,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

function getFailureLabel(code) {
  const labels = {
    customer_unavailable: 'Customer unavailable',
    wrong_address: 'Wrong address',
    address_incomplete: 'Address incomplete',
    refused: 'Delivery refused',
    not_home: 'No one at home',
    business_closed: 'Business closed',
    flooded_area: 'Area flooded',
    area_out_of_delivery_zone: 'Outside delivery zone',
    package_damaged: 'Package damaged',
    lost: 'Package lost',
    other: 'Other issue',
  };
  return labels[code] || code;
}

module.exports = {
  trackOrderById,
  assembleTrackingData,
  buildTimeline,
};

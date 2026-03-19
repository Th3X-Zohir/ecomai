/**
 * Notifications Service — in-app + email merchant notifications.
 * All notification sending is fire-and-forget — never blocks the calling flow.
 */
const notificationRepo = require('../repositories/notifications');
const emailService = require('./email');
const config = require('../config');
const { DomainError } = require('../errors/domain-error');

// ─── Notification Types ──────────────────────────────────────
//
// 'new_order'         — New order placed
// 'order_shipped'     — Order shipped
// 'order_delivered'   — Order delivered
// 'refund_request'   — Customer requested refund
// 'refund_approved'   — Refund approved
// 'refund_rejected'   — Refund rejected
// 'withdrawal_request' — Shop withdrawal request submitted
// 'new_customer'      — New customer registered
// 'affiliate_signup'  — New affiliate signup
// 'low_stock'         — Product stock running low

/**
 * Dispatch a notification to the right channels based on shop preferences.
 * @param {object} params
 */
async function notify({
  shopId,
  shopName = 'Your Shop',
  shopSlug,
  userId = null,
  type,
  title,
  body,
  data = {},
  emailOverride = null,  // explicit email address (e.g., super admin)
}) {
  // Get preferences
  let prefs;
  try {
    prefs = await notificationRepo.getPreferences(shopId, userId);
  } catch (_) { prefs = null; }

  const inAppEnabled = prefs ? getInAppEnabled(prefs, type) : true;
  const emailEnabled = prefs ? getEmailEnabled(prefs, type) : true;

  // Always create in-app notification
  if (inAppEnabled) {
    try {
      await notificationRepo.createNotification({
        shopId, userId, type, title, body, data,
        deliveryMethod: emailEnabled ? 'both' : 'in_app',
      });
    } catch (_) { /* non-critical */ }
  } else if (emailEnabled) {
    try {
      await notificationRepo.createNotification({
        shopId, userId, type, title, body, data, deliveryMethod: 'email',
      });
    } catch (_) { /* non-critical */ }
  }

  // Send email if enabled
  if (emailEnabled && emailOverride) {
    const shopUrl = shopSlug ? `${config.appUrl}/shops/${shopSlug}` : config.appUrl;
    emailTemplate(type, { to: emailOverride, title, body, shopName, shopUrl, data })
      .catch(() => {});
  }
}

function getInAppEnabled(prefs, type) {
  const map = {
    new_order: prefs.notify_new_order,
    order_shipped: prefs.notify_order_shipped,
    order_delivered: prefs.notify_order_shipped,
    refund_request: prefs.notify_refund_request,
    refund_approved: prefs.notify_refund_approved,
    refund_rejected: prefs.notify_refund_approved,
    withdrawal_request: prefs.notify_withdrawal_request,
    new_customer: prefs.notify_new_customer,
    affiliate_signup: prefs.notify_affiliate_signup,
    low_stock: prefs.notify_low_stock,
  };
  return !!map[type];
}

function getEmailEnabled(prefs, type) {
  const map = {
    new_order: prefs.notify_email_order,
    order_shipped: prefs.notify_email_order,
    order_delivered: prefs.notify_email_order,
    refund_request: prefs.notify_email_refund,
    refund_approved: prefs.notify_email_refund,
    refund_rejected: prefs.notify_email_refund,
    withdrawal_request: prefs.notify_email_withdrawal,
    new_customer: false,
    affiliate_signup: false,
    low_stock: false,
  };
  return !!map[type];
}

// ─── Email Template Router ───────────────────────────────────

async function emailTemplate(type, { to, title, body, shopName, shopUrl, data }) {
  const wrapped = (content) => `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px;">
${content}
<footer style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">© ${new Date().getFullYear()} ${shopName} — Powered by <a href="${config.appUrl}" style="color: #6366f1;">Ecomai</a></footer>
</body></html>`;

  const html = wrapped(`
    <h2 style="color: #1a1a2e; margin-bottom: 8px;">${title}</h2>
    <p style="color: #4b5563;">${body}</p>
    ${data.orderId ? `<p style="color: #6b7280; font-size: 13px;">Order ID: ${String(data.orderId).slice(0, 8)}</p>` : ''}
    <p style="margin-top: 24px;"><a href="${shopUrl}/dashboard" style="color: #6366f1;">View in dashboard →</a></p>
  `);

  return emailService.sendEmail({ to, subject: title, html });
}

// ─── Notification Dispatchers ──────────────────────────────
// Called by other services after events. All are fire-and-forget.

async function notifyNewOrder({ shopId, shopName, shopSlug, orderId, customerEmail, orderTotal }) {
  return notify({
    shopId, shopName, shopSlug,
    type: 'new_order',
    title: `New order received — ৳${Number(orderTotal).toFixed(2)}`,
    body: `You have a new order from ${customerEmail}. Order total: ৳${Number(orderTotal).toFixed(2)}`,
    data: { orderId, customerEmail, orderTotal },
  });
}

async function notifyOrderShipped({ shopId, shopName, shopSlug, orderId, customerEmail }) {
  return notify({
    shopId, shopName, shopSlug,
    type: 'order_shipped',
    title: 'Order shipped',
    body: `Order ${String(orderId).slice(0, 8)} has been marked as shipped. Customer: ${customerEmail}`,
    data: { orderId, customerEmail },
  });
}

async function notifyRefundRequested({ shopId, shopName, shopSlug, orderId, customerEmail, refundAmount, reason }) {
  return notify({
    shopId, shopName, shopSlug,
    type: 'refund_request',
    title: `Refund request — ৳${Number(refundAmount).toFixed(2)}`,
    body: `${customerEmail} requested a refund of ৳${Number(refundAmount).toFixed(2)} for order ${String(orderId).slice(0, 8)}. Reason: ${reason}`,
    data: { orderId, customerEmail, refundAmount, reason },
  });
}

async function notifyWithdrawalRequest({ shopId, shopName, shopSlug, withdrawalId, amount, method }) {
  return notify({
    shopId, shopName, shopSlug,
    type: 'withdrawal_request',
    title: `Withdrawal request — ৳${Number(amount).toFixed(2)}`,
    body: `A withdrawal of ৳${Number(amount).toFixed(2)} via ${method} has been requested and is awaiting your approval.`,
    data: { withdrawalId, amount, method },
  });
}

// ─── Query API ─────────────────────────────────────────────

async function getNotifications(shopId, opts) {
  return notificationRepo.listNotifications(shopId, opts);
}

async function getUnread(shopId) {
  return notificationRepo.getUnreadCount(shopId);
}

async function markRead(notificationId, shopId) {
  return notificationRepo.markAsRead(notificationId, shopId);
}

async function markAllRead(shopId, userId = null) {
  return notificationRepo.markAllAsRead(shopId, userId);
}

async function updatePreferences(shopId, userId, patch) {
  return notificationRepo.upsertPreferences(shopId, userId, patch);
}

async function getPreferences(shopId, userId = null) {
  return notificationRepo.getPreferences(shopId, userId);
}

module.exports = {
  notify,
  notifyNewOrder,
  notifyOrderShipped,
  notifyRefundRequested,
  notifyWithdrawalRequest,
  getNotifications,
  getUnread,
  markRead,
  markAllRead,
  updatePreferences,
  getPreferences,
};

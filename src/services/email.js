/**
 * Email Service — transactional email delivery.
 * Supports Resend (primary), SMTP (nodemailer), or console logging (dev).
 * All email sending is fire-and-forget — failures never block the calling flow.
 */
const config = require('../config');
const { DomainError } = require('../errors/domain-error');

// ─── Email Provider Interface ────────────────────────────────

/**
 * Send an email. Returns true on success, false on failure.
 * All errors are swallowed — email failures never propagate.
 */
async function sendEmail({ to, subject, html, text, from }) {
  try {
    if (config.emailProvider === 'resend' && config.resendApiKey) {
      return await sendViaResend({ to, subject, html, text, from });
    }
    if (config.emailProvider === 'smtp' && config.smtpHost) {
      return await sendViaSMTP({ to, subject, html, text, from });
    }
    // Dev: log to console
    console.log(`[EMAIL] To: ${to}\nSubject: ${subject}\n---`);
    return true;
  } catch (err) {
    console.error('[EMAIL] Send failed:', err.message);
    return false;
  }
}

// ─── Resend ──────────────────────────────────────────────────

async function sendViaResend({ to, subject, html, text, from }) {
  const { Resend } = require('resend');
  const resend = new Resend(config.resendApiKey);
  const fromAddress = from || config.emailFrom || 'Ecomai <noreply@ecomai.com>';
  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });
  if (error) {
    console.error('[EMAIL] Resend error:', error.message);
    return false;
  }
  console.log(`[EMAIL] Resend: ${data?.id}`);
  return true;
}

// ─── SMTP ────────────────────────────────────────────────────

async function sendViaSMTP({ to, subject, html, text, from }) {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort || 587,
    secure: config.smtpSecure || false,
    auth: config.smtpUser ? {
      user: config.smtpUser,
      pass: config.smtpPass,
    } : undefined,
  });
  const fromAddress = from || config.emailFrom || 'Ecomai <noreply@ecomai.com>';
  await transporter.sendMail({
    from: fromAddress,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    text,
  });
  return true;
}

// ─── Email Templates ─────────────────────────────────────────

function wrapHtml(content, title) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; max-width: 600px; margin: 0 auto; padding: 20px;">
${content}
<footer style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">
  <p>© ${new Date().getFullYear()} Ecomai — Powered by <a href="${config.appUrl}" style="color: #6366f1;">Ecomai</a></p>
</footer>
</body></html>`;
}

function button(text, href, color = '#6366f1') {
  return `<a href="${href}" style="display: inline-block; background: ${color}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">${text}</a>`;
}

/**
 * Order Confirmation Email
 * Sent when an order is successfully placed (online payment or COD).
 */
async function sendOrderConfirmation({ to, order, shopName, shopUrl }) {
  const items = Array.isArray(order.items)
    ? order.items.map(it => `<li>${it.item_name} × ${it.quantity} — ৳${Number(it.line_total).toFixed(2)}</li>`).join('')
    : '';

  const html = wrapHtml(`
    <h1 style="color: #1a1a2e; margin-bottom: 8px;">Order Confirmed! 🎉</h1>
    <p style="color: #4b5563;">Thank you for your order from <strong>${shopName}</strong>.</p>
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px;"><strong>Order ID:</strong> ${order.id?.slice(0, 8)}</p>
      <p style="margin: 0 0 8px;"><strong>Total:</strong> ৳${Number(order.total_amount).toFixed(2)}</p>
      <p style="margin: 0;"><strong>Status:</strong> ${order.payment_status === 'paid' ? 'Payment Confirmed' : 'Cash on Delivery'}</p>
    </div>
    ${items ? `<h3 style="margin-bottom: 8px;">Items</h3><ul style="color: #374151;">${items}</ul>` : ''}
    <p style="margin-top: 24px;"><a href="${shopUrl}/account/orders/${order.id}" style="color: #6366f1;">View order details →</a></p>
  `, `Order Confirmed — ${shopName}`);

  return sendEmail({ to, subject: `Order Confirmed — ${shopName}`, html });
}

/**
 * Order Shipped Email
 * Sent when an order status changes to 'shipped'.
 */
async function sendOrderShipped({ to, order, shopName, shopUrl, trackingInfo }) {
  const html = wrapHtml(`
    <h1 style="color: #1a1a2e; margin-bottom: 8px;">Your order is on its way! 📦</h1>
    <p style="color: #4b5563;">Great news! Your order from <strong>${shopName}</strong> has been shipped.</p>
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px;"><strong>Order ID:</strong> ${order.id?.slice(0, 8)}</p>
      ${trackingInfo ? `<p style="margin: 0;"><strong>Tracking:</strong> ${trackingInfo}</p>` : ''}
    </div>
    <p><a href="${shopUrl}/account/orders/${order.id}" style="color: #6366f1;">Track your order →</a></p>
  `, `Your Order is On the Way — ${shopName}`);

  return sendEmail({ to, subject: `Your Order is On the Way — ${shopName}`, html });
}

/**
 * Password Reset Email
 */
async function sendPasswordReset({ to, resetUrl, shopName }) {
  const html = wrapHtml(`
    <h1 style="color: #1a1a2e; margin-bottom: 8px;">Reset Your Password</h1>
    <p style="color: #4b5563;">We received a request to reset your password for <strong>${shopName}</strong>.</p>
    <p style="color: #4b5563;">Click the button below to reset it. This link expires in 15 minutes.</p>
    <div style="text-align: center; margin: 32px 0;">
      ${button('Reset Password', resetUrl)}
    </div>
    <p style="color: #6b7280; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
  `, 'Reset Your Password');

  return sendEmail({ to, subject: `Reset Your Password — ${shopName}`, html });
}

/**
 * Affiliate Commission Paid Email
 */
async function sendAffiliatePayout({ to, affiliate, amount, shopName }) {
  const html = wrapHtml(`
    <h1 style="color: #1a1a2e; margin-bottom: 8px;">You earned ৳${Number(amount).toFixed(2)}!</h1>
    <p style="color: #4b5563;">Great news! Your affiliate commission of <strong>৳${Number(amount).toFixed(2)}</strong> from <strong>${shopName}</strong> has been paid out.</p>
    <p style="color: #6b7280; font-size: 13px;">Check your earnings dashboard to see your updated balance.</p>
  `, `Affiliate Payout — ${shopName}`);

  return sendEmail({ to, subject: `Affiliate Payout — You earned ৳${Number(amount).toFixed(2)}!`, html });
}

/**
 * Weekly Merchant Digest (benchmark summary)
 */
async function sendMerchantDigest({ to, shopName, shopUrl, kpis, insights }) {
  const insightItems = insights.slice(0, 3).map(i => {
    const color = i.type === 'warning' ? '#f59e0b' : i.type === 'positive' ? '#10b981' : '#6366f1';
    return `<li style="color: ${color}; margin-bottom: 8px;"><strong>${i.title}</strong><br>${i.body}</li>`;
  }).join('');

  const html = wrapHtml(`
    <h1 style="color: #1a1a2e; margin-bottom: 8px;">Your Weekly Summary 📊</h1>
    <p style="color: #4b5563;">Here's how <strong>${shopName}</strong> performed this week.</p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
        <div style="font-size: 24px; font-weight: 700; color: #1a1a2e;">${kpis.orders || 0}</div>
        <div style="color: #6b7280; font-size: 13px;">Orders</div>
      </div>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; text-align: center;">
        <div style="font-size: 24px; font-weight: 700; color: #1a1a2e;">৳${(kpis.revenue || 0).toLocaleString('en-BD', { minimumFractionDigits: 0 })}</div>
        <div style="color: #6b7280; font-size: 13px;">Revenue</div>
      </div>
    </div>
    ${insightItems ? `<h3 style="margin-bottom: 8px;">Insights for You</h3><ul style="padding-left: 20px;">${insightItems}</ul>` : ''}
    <div style="text-align: center; margin: 24px 0;">
      ${button('View Full Dashboard', `${shopUrl}/dashboard`)}
    </div>
  `, `Your Weekly Summary — ${shopName}`);

  return sendEmail({ to, subject: `📊 Your Weekly Summary for ${shopName}`, html });
}

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendOrderShipped,
  sendPasswordReset,
  sendAffiliatePayout,
  sendMerchantDigest,
};

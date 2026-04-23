// Outbound email via Resend.
//
// One thin wrapper around the Resend SDK so the rest of the codebase never
// imports Resend directly. Each sender below uses a different "From" address
// tied to an OduDoc business mailbox (no-reply@, notifications@, admin@,
// hr@, promotion@) so replies land in the right cPanel inbox.
//
// Emails are only *actually* sent when the Resend domain is verified and
// RESEND_API_KEY is set. In dev / preview without those, send() no-ops and
// logs — this keeps local signup / withdrawal flows from exploding.

// We call the Resend REST API directly instead of using the SDK — the SDK's
// internal fetch intermittently fails on Vercel with "Unable to fetch data.
// The request could not be resolved." A plain fetch against the public REST
// endpoint works reliably from Vercel functions.
const API_KEY = process.env.RESEND_API_KEY?.trim();

const DOMAIN = "odudoc.com";
const BRAND = "OduDoc";
const SITE_URL = "https://www.odudoc.com";

export type Sender =
  | "no-reply"      // OTPs, password resets, verification
  | "notifications" // appointment confirms, reminders
  | "admin"         // system alerts, withdrawal decisions
  | "hr"            // career application replies
  | "promotion";    // marketing

const FROM: Record<Sender, string> = {
  "no-reply":      `${BRAND} <no-reply@${DOMAIN}>`,
  "notifications": `${BRAND} <notifications@${DOMAIN}>`,
  "admin":         `${BRAND} Admin <admin@${DOMAIN}>`,
  "hr":            `${BRAND} Careers <hr@${DOMAIN}>`,
  "promotion":     `${BRAND} <promotion@${DOMAIN}>`,
};

export interface SendEmailInput {
  from: Sender;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!API_KEY) {
    const { log } = await import("./log");
    log.warn("email.skipped_no_api_key", { from: input.from, to: input.to, subject: input.subject });
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM[input.from],
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        reply_to: input.replyTo,
      }),
    });

    const json = (await res.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!res.ok) {
      const msg = json?.message || `HTTP ${res.status}`;
      const { log } = await import("./log");
      log.error("email.send_failed", undefined, { error: msg, status: res.status });
      return { ok: false, error: msg };
    }
    return { ok: true, id: json?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const { log } = await import("./log");
    log.error("email.send_threw", err);
    return { ok: false, error: msg };
  }
}

// ---------- Template helper ----------
// Single branded shell so every email looks like OduDoc. Keep inline styles —
// email clients strip <style> tags and external CSS.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ShellOptions {
  preheader?: string; // hidden preview text shown in inbox list
  heading: string;
  bodyHtml: string;   // already-HTML content (paragraphs, lists, etc.)
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

function renderShell(opts: ShellOptions): string {
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>`
    : "";

  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `
        <tr>
          <td style="padding:24px 0 8px 0;">
            <a href="${opts.ctaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
              ${escapeHtml(opts.ctaLabel)}
            </a>
          </td>
        </tr>`
      : "";

  const footerNote = opts.footerNote
    ? `<p style="margin:16px 0 0 0;font-size:12px;color:#6b7280;">${opts.footerNote}</p>`
    : "";

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <tr>
        <td style="background:#2563eb;padding:20px 24px;">
          <a href="${SITE_URL}" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:18px;letter-spacing:-0.01em;">${BRAND}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 28px 24px 28px;">
          <h1 style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(opts.heading)}</h1>
          <div style="font-size:15px;line-height:1.6;color:#374151;">${opts.bodyHtml}</div>
          <table role="presentation" cellpadding="0" cellspacing="0">${cta}</table>
          ${footerNote}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
          <p style="margin:0;">© ${new Date().getFullYear()} ${BRAND}. Trusted online healthcare.</p>
          <p style="margin:4px 0 0 0;"><a href="${SITE_URL}" style="color:#2563eb;text-decoration:none;">${SITE_URL.replace("https://", "")}</a></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

// ---------- Ready-made templates ----------

export async function sendVerificationEmail(params: {
  to: string;
  name: string;
  verifyUrl: string;
  reason: "signup" | "reactivate";
}): Promise<SendEmailResult> {
  const isReactivate = params.reason === "reactivate";
  const heading = isReactivate
    ? "Confirm it's still you"
    : `Verify your email to activate your ${BRAND} account`;
  const subject = isReactivate
    ? `Confirm it's you – ${BRAND}`
    : `Verify your email – ${BRAND}`;

  const intro = isReactivate
    ? `<p>Hi ${escapeHtml(params.name)},</p>
       <p>It's been a while since you last signed in, so for your security we need you to confirm it's really you before continuing.</p>`
    : `<p>Hi ${escapeHtml(params.name)},</p>
       <p>Thanks for signing up for ${BRAND}. Please verify your email to finish setting up your account.</p>`;

  const html = renderShell({
    preheader: isReactivate
      ? "Quick security check before you sign back in."
      : "One click to activate your OduDoc account.",
    heading,
    bodyHtml: `
      ${intro}
      <p>Click the button below to verify. <strong>This link expires in 10 minutes.</strong></p>
    `,
    ctaLabel: isReactivate ? "Confirm and continue" : "Verify my email",
    ctaUrl: params.verifyUrl,
    footerNote: `If the button doesn't work, copy and paste this URL into your browser:<br><span style="word-break:break-all;color:#2563eb;">${escapeHtml(
      params.verifyUrl
    )}</span><br><br>If you didn't request this, you can safely ignore this email.`,
  });

  return sendEmail({
    from: "no-reply",
    to: params.to,
    subject,
    html,
  });
}

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}): Promise<SendEmailResult> {
  const html = renderShell({
    preheader: `Welcome to ${BRAND}, ${params.name}!`,
    heading: `Welcome to ${BRAND}, ${escapeHtml(params.name)} 👋`,
    bodyHtml: `
      <p>Thanks for signing up. Your patient account is ready.</p>
      <p>You can now book video consultations, manage prescriptions, and keep your health records in one place.</p>
    `,
    ctaLabel: "Go to Dashboard",
    ctaUrl: `${SITE_URL}/dashboard`,
    footerNote:
      "You're receiving this because you just created an OduDoc account. If this wasn't you, please reply so we can investigate.",
  });

  return sendEmail({
    from: "no-reply",
    to: params.to,
    subject: `Welcome to ${BRAND}`,
    html,
  });
}

export async function sendDoctorApplicationReceivedEmail(params: {
  to: string;
  fullName: string;
  applicationId: string;
  specialty: string;
}): Promise<SendEmailResult> {
  const html = renderShell({
    preheader: "We've received your OduDoc doctor application.",
    heading: `Thanks for applying, Dr. ${escapeHtml(params.fullName)} 🩺`,
    bodyHtml: `
      <p>We've received your application to practice <strong>${escapeHtml(params.specialty)}</strong> on ${BRAND}.</p>
      <p style="margin:14px 0;padding:12px 14px;background:#f3f4f6;border-radius:8px;font-family:monospace;font-size:14px;">
        <strong>Application ID:</strong> ${escapeHtml(params.applicationId)}
      </p>
      <p><strong>What happens next:</strong></p>
      <ol style="padding-left:20px;margin:8px 0;">
        <li>Our team verifies your medical license and submitted documents (usually 2–3 business days).</li>
        <li>We run a background check against the relevant authorities.</li>
        <li>Once approved, you'll receive an email with your login credentials and onboarding instructions.</li>
      </ol>
      <p>Save the Application ID above — you can use it to check your status any time.</p>
    `,
    ctaLabel: "Visit OduDoc",
    ctaUrl: SITE_URL,
    footerNote: "Questions about your application? Reply to this email and our admin team will help.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject: `We've received your doctor application – ${BRAND}`,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendDoctorApplicationStatusEmail(params: {
  to: string;
  fullName: string;
  status: "approved" | "rejected";
  adminNotes?: string;
}): Promise<SendEmailResult> {
  const notes = params.adminNotes
    ? `<p style="margin-top:12px;padding:12px;background:#f3f4f6;border-radius:8px;"><strong>Note from our team:</strong> ${escapeHtml(params.adminNotes)}</p>`
    : "";

  let heading: string;
  let subject: string;
  let bodyHtml: string;
  let ctaLabel: string;
  let ctaUrl: string;

  if (params.status === "approved") {
    heading = `You're approved to practice on ${BRAND} 🎉`;
    subject = `Your doctor application has been approved`;
    bodyHtml = `
      <p>Hi Dr. ${escapeHtml(params.fullName)},</p>
      <p>Great news — your application to practice on ${BRAND} has been <strong>approved</strong>. You can now sign in and start seeing patients via video consultations.</p>
      ${notes}
      <p>Check your inbox for a separate email with your login credentials and onboarding checklist.</p>
    `;
    ctaLabel = "Sign in";
    ctaUrl = `${SITE_URL}/auth/login`;
  } else {
    heading = "An update on your doctor application";
    subject = `Doctor application update – ${BRAND}`;
    bodyHtml = `
      <p>Hi Dr. ${escapeHtml(params.fullName)},</p>
      <p>Thank you for applying to practice on ${BRAND}. After reviewing your application, we're unable to approve it at this time.</p>
      ${notes}
      <p>If you'd like to resubmit with updated details, just reply to this email and our team will guide you through it.</p>
    `;
    ctaLabel = "Contact support";
    ctaUrl = `${SITE_URL}/contact`;
  }

  const html = renderShell({
    preheader: subject,
    heading,
    bodyHtml,
    ctaLabel,
    ctaUrl,
    footerNote: "Questions? Reply to this email and the admin team will help.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendCareerApplicationReceived(params: {
  to: string;
  firstName: string;
  jobTitle?: string;
}): Promise<SendEmailResult> {
  const roleLine = params.jobTitle
    ? `<p>We've received your application for <strong>${escapeHtml(params.jobTitle)}</strong>.</p>`
    : `<p>We've received your application.</p>`;

  const html = renderShell({
    preheader: "We've received your application — thanks for applying.",
    heading: `Thanks for applying, ${escapeHtml(params.firstName)}`,
    bodyHtml: `
      ${roleLine}
      <p>Our HR team will review your CV and get back to you within 5–7 business days. If your profile matches the role, we'll reach out to schedule a call.</p>
      <p>In the meantime, feel free to explore our platform and what we're building.</p>
    `,
    ctaLabel: "Visit OduDoc",
    ctaUrl: SITE_URL,
    footerNote: "If you have questions, simply reply to this email.",
  });

  return sendEmail({
    from: "hr",
    to: params.to,
    subject: `We've received your application – ${BRAND}`,
    html,
    replyTo: `hr@${DOMAIN}`,
  });
}

export async function sendCareerStatusUpdateEmail(params: {
  to: string;
  firstName: string;
  status: "reviewing" | "shortlisted" | "rejected" | "hired";
  jobTitle?: string;
}): Promise<SendEmailResult> {
  const roleSuffix = params.jobTitle
    ? ` for <strong>${escapeHtml(params.jobTitle)}</strong>`
    : "";

  let heading: string;
  let bodyHtml: string;
  let subject: string;

  switch (params.status) {
    case "reviewing":
      heading = "Your application is under review 👀";
      subject = `Application update – ${BRAND}`;
      bodyHtml = `
        <p>Hi ${escapeHtml(params.firstName)},</p>
        <p>Good news — our HR team is now reviewing your application${roleSuffix}. If your profile matches the role, we'll reach out shortly to schedule a call.</p>
        <p>No action is required from you right now. Thank you for your patience.</p>
      `;
      break;
    case "shortlisted":
      heading = "You've been shortlisted 🎉";
      subject = `You've been shortlisted – ${BRAND}`;
      bodyHtml = `
        <p>Hi ${escapeHtml(params.firstName)},</p>
        <p>Congratulations — you've been shortlisted${roleSuffix}! Our team will be in touch soon to arrange the next steps, which typically include an interview.</p>
        <p>Keep an eye on your inbox (and spam folder, just in case).</p>
      `;
      break;
    case "hired":
      heading = "Welcome to the team 🎊";
      subject = `Offer update – ${BRAND}`;
      bodyHtml = `
        <p>Hi ${escapeHtml(params.firstName)},</p>
        <p>We're thrilled to let you know we'd like to move forward with you${roleSuffix}. Our HR team will follow up shortly with the formal offer and next steps.</p>
        <p>Welcome aboard!</p>
      `;
      break;
    case "rejected":
    default:
      heading = "An update on your application";
      subject = `Application update – ${BRAND}`;
      bodyHtml = `
        <p>Hi ${escapeHtml(params.firstName)},</p>
        <p>Thank you for taking the time to apply${roleSuffix}. After careful review, we've decided not to move forward with your application at this time.</p>
        <p>We truly appreciate your interest in ${BRAND} and encourage you to apply for future roles that match your experience. We'll keep your profile on file.</p>
      `;
      break;
  }

  const html = renderShell({
    preheader: subject,
    heading,
    bodyHtml,
    ctaLabel: "View open roles",
    ctaUrl: `${SITE_URL}/careers`,
    footerNote: "If you have any questions, simply reply to this email.",
  });

  return sendEmail({
    from: "hr",
    to: params.to,
    subject,
    html,
    replyTo: `hr@${DOMAIN}`,
  });
}

export async function sendWithdrawalStatusEmail(params: {
  to: string;
  doctorName: string;
  amount: number;
  status: "approved" | "rejected" | "paid";
  adminNote?: string;
}): Promise<SendEmailResult> {
  const amount = `$${params.amount.toLocaleString()}`;
  const note = params.adminNote
    ? `<p style="margin-top:12px;padding:12px;background:#f3f4f6;border-radius:8px;"><strong>Note from admin:</strong> ${escapeHtml(params.adminNote)}</p>`
    : "";

  let heading: string;
  let bodyHtml: string;
  let subject: string;

  if (params.status === "approved") {
    heading = `Your withdrawal of ${amount} is approved ✅`;
    subject = `Withdrawal approved – ${amount}`;
    bodyHtml = `
      <p>Hi Dr. ${escapeHtml(params.doctorName)},</p>
      <p>Your withdrawal request for <strong>${amount}</strong> has been approved. The transfer will be sent to your selected account within <strong>1–2 working days</strong>.</p>
      <p>You'll receive another email once the payment is released.</p>
      ${note}
    `;
  } else if (params.status === "paid") {
    heading = `Payment sent: ${amount} 💸`;
    subject = `Your payout of ${amount} has been sent`;
    bodyHtml = `
      <p>Hi Dr. ${escapeHtml(params.doctorName)},</p>
      <p>Good news — your payout of <strong>${amount}</strong> has been released. It should reflect in your account shortly depending on your payment method.</p>
      ${note}
    `;
  } else {
    heading = `Withdrawal request could not be processed`;
    subject = `Withdrawal request update – ${amount}`;
    bodyHtml = `
      <p>Hi Dr. ${escapeHtml(params.doctorName)},</p>
      <p>We were unable to process your withdrawal request for <strong>${amount}</strong>. Your earnings balance has not been reduced.</p>
      ${note}
      <p>If you believe this was an error, reply to this email and our team will look into it.</p>
    `;
  }

  const html = renderShell({
    preheader: subject,
    heading,
    bodyHtml,
    ctaLabel: "View Earnings",
    ctaUrl: `${SITE_URL}/dashboard/doctor/earnings`,
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendAppointmentConfirmation(params: {
  to: string;
  patientName: string;
  doctorName: string;
  dateTime: string; // pre-formatted, e.g. "Apr 20, 2026 at 3:30 PM"
  joinUrl?: string;
}): Promise<SendEmailResult> {
  const html = renderShell({
    preheader: `Your appointment with ${params.doctorName} is confirmed.`,
    heading: `Appointment confirmed ✅`,
    bodyHtml: `
      <p>Hi ${escapeHtml(params.patientName)},</p>
      <p>Your consultation with <strong>Dr. ${escapeHtml(params.doctorName)}</strong> is confirmed for <strong>${escapeHtml(params.dateTime)}</strong>.</p>
      <p>We'll send a reminder 24 hours before. You can join the video call directly from your dashboard when it's time.</p>
    `,
    ctaLabel: params.joinUrl ? "Join Consultation" : "View Appointment",
    ctaUrl: params.joinUrl || `${SITE_URL}/dashboard`,
  });

  return sendEmail({
    from: "notifications",
    to: params.to,
    subject: `Appointment confirmed with Dr. ${params.doctorName}`,
    html,
  });
}

// ---------- Order emails ----------

interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
}

function renderOrderItemsTable(
  items: OrderEmailItem[],
  subtotal: number,
  shipping: number,
  total: number
): string {
  const rows = items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.name)} <span style="color:#6b7280;">× ${it.quantity}</span></td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">$${(it.price * it.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px;">
      ${rows}
      <tr>
        <td style="padding:8px 0;color:#6b7280;">Subtotal</td>
        <td style="padding:8px 0;text-align:right;color:#6b7280;">$${subtotal.toFixed(2)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#6b7280;">Shipping</td>
        <td style="padding:4px 0;text-align:right;color:#6b7280;">${shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:700;border-top:2px solid #111827;">Total</td>
        <td style="padding:8px 0;text-align:right;font-weight:700;border-top:2px solid #111827;">$${total.toFixed(2)}</td>
      </tr>
    </table>
  `;
}

export async function sendOrderConfirmationEmail(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  items: OrderEmailItem[];
  subtotal: number;
  shipping: number;
  total: number;
  shippingAddress: string;
}): Promise<SendEmailResult> {
  const html = renderShell({
    preheader: `Order ${params.orderNumber} confirmed — thanks for your order!`,
    heading: `Thanks for your order, ${escapeHtml(params.customerName)} 🛍️`,
    bodyHtml: `
      <p>We've received your order <strong>${escapeHtml(params.orderNumber)}</strong> and it's being prepared. You'll get another email the moment it ships.</p>
      ${renderOrderItemsTable(params.items, params.subtotal, params.shipping, params.total)}
      <p style="margin-top:20px;"><strong>Shipping to:</strong><br>${escapeHtml(params.shippingAddress)}</p>
    `,
    ctaLabel: "Track My Order",
    ctaUrl: `${SITE_URL}/dashboard/orders`,
    footerNote: "Questions about your order? Reply to this email and our team will help.",
  });

  return sendEmail({
    from: "notifications",
    to: params.to,
    subject: `Order confirmed – ${params.orderNumber}`,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendOrderStatusUpdateEmail(params: {
  to: string;
  customerName: string;
  orderNumber: string;
  status: "Processing" | "Shipped" | "Delivered" | "Cancelled";
  trackingNumber?: string;
}): Promise<SendEmailResult> {
  let heading: string;
  let subject: string;
  let bodyHtml: string;

  const greeting = `<p>Hi ${escapeHtml(params.customerName)},</p>`;
  const orderRef = `<strong>${escapeHtml(params.orderNumber)}</strong>`;

  switch (params.status) {
    case "Processing":
      heading = "Your order is being prepared 📦";
      subject = `Order ${params.orderNumber} is being processed`;
      bodyHtml = `${greeting}<p>Good news — your order ${orderRef} is now being prepared and packed. We'll email you again as soon as it ships.</p>`;
      break;
    case "Shipped":
      heading = "Your order is on the way 🚚";
      subject = `Order ${params.orderNumber} has shipped`;
      bodyHtml = `${greeting}<p>Your order ${orderRef} has been shipped and is on its way to you.</p>${
        params.trackingNumber
          ? `<p style="padding:12px;background:#f3f4f6;border-radius:8px;"><strong>Tracking number:</strong> ${escapeHtml(params.trackingNumber)}</p>`
          : ""
      }`;
      break;
    case "Delivered":
      heading = "Your order has been delivered ✅";
      subject = `Order ${params.orderNumber} delivered`;
      bodyHtml = `${greeting}<p>Your order ${orderRef} has been delivered. We hope everything arrived in great shape!</p><p>If anything's not right, just reply to this email and we'll make it right.</p>`;
      break;
    case "Cancelled":
    default:
      heading = "Your order has been cancelled";
      subject = `Order ${params.orderNumber} cancelled`;
      bodyHtml = `${greeting}<p>Your order ${orderRef} has been cancelled. If you were charged, a refund will be issued to your original payment method within 5–7 business days.</p>`;
      break;
  }

  const html = renderShell({
    preheader: subject,
    heading,
    bodyHtml,
    ctaLabel: "View Order",
    ctaUrl: `${SITE_URL}/dashboard/orders`,
    footerNote: "Questions? Reply to this email and we'll help.",
  });

  return sendEmail({
    from: "notifications",
    to: params.to,
    subject,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

// Admin-composed broadcast. Converts plain-text line breaks into paragraphs
// so admins don't have to write HTML, and stamps the OduDoc branded shell
// around the message. `from` picks which mailbox the reply goes to.
export async function sendAdminBroadcastEmail(params: {
  to: string;
  recipientName?: string;
  subject: string;
  message: string;
  from?: Sender;
  ctaLabel?: string;
  ctaUrl?: string;
}): Promise<SendEmailResult> {
  const paragraphs = params.message
    .split(/\n{2,}/)
    .map((block) =>
      `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  const greeting = params.recipientName
    ? `<p>Hi ${escapeHtml(params.recipientName)},</p>`
    : "";

  const fromSender: Sender = params.from || "admin";

  const html = renderShell({
    preheader: params.subject,
    heading: params.subject,
    bodyHtml: `${greeting}${paragraphs}`,
    ctaLabel: params.ctaLabel,
    ctaUrl: params.ctaUrl,
    footerNote:
      "This message was sent by an OduDoc admin. Reply to this email to get in touch.",
  });

  return sendEmail({
    from: fromSender,
    to: params.to,
    subject: params.subject,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendDoctorRemovedEmail(params: {
  to: string;
  name: string;
  reason?: string;
}): Promise<SendEmailResult> {
  const reasonBlock = params.reason
    ? `<p style="margin-top:12px;padding:12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;"><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>`
    : "";
  const html = renderShell({
    preheader: `Your ${BRAND} doctor account has been removed.`,
    heading: `Your ${BRAND} doctor account has been removed`,
    bodyHtml: `
      <p>Hi Dr. ${escapeHtml(params.name)},</p>
      <p>Our admin team has removed your doctor account from ${BRAND}. You can no longer sign in to see patients or accept new consultations.</p>
      ${reasonBlock}
      <p>Existing appointments with you have been cancelled and affected patients notified separately.</p>
      <p>If you believe this was a mistake, or you'd like to re-apply in the future, please reply to this email and our team will review.</p>
    `,
    ctaLabel: "Contact support",
    ctaUrl: `${SITE_URL}/contact`,
    footerNote: "This decision was made by the OduDoc admin team.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject: `Your ${BRAND} doctor account has been removed`,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendAccountBannedEmail(params: {
  to: string;
  name: string;
  reason: string;
}): Promise<SendEmailResult> {
  const html = renderShell({
    preheader: "Your OduDoc account has been suspended.",
    heading: "Your account has been banned",
    bodyHtml: `
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>Your ${BRAND} account has been suspended by our admin team and can no longer be used to sign in.</p>
      <p style="margin-top:12px;padding:12px;background:#fef2f2;border-left:3px solid #dc2626;border-radius:6px;"><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>
      <p>If you believe this was a mistake, please reply to this email and our team will review the decision.</p>
    `,
    ctaLabel: "Contact support",
    ctaUrl: `${SITE_URL}/contact`,
    footerNote: "This decision was made by the OduDoc admin team.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject: `Your ${BRAND} account has been banned`,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendAccountRestoredEmail(params: {
  to: string;
  name: string;
}): Promise<SendEmailResult> {
  const html = renderShell({
    preheader: "Your OduDoc account has been restored.",
    heading: "Welcome back — your account is active again",
    bodyHtml: `
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>Good news — your ${BRAND} account has been reinstated and you can sign in again.</p>
      <p>Please take a moment to review our terms of service to stay in good standing.</p>
    `,
    ctaLabel: "Sign in",
    ctaUrl: `${SITE_URL}/auth/login`,
    footerNote: "If you need help, just reply to this email.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject: `Your ${BRAND} account has been restored`,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendAccountWarningEmail(params: {
  to: string;
  name: string;
  message: string;
}): Promise<SendEmailResult> {
  const html = renderShell({
    preheader: "Important notice regarding your OduDoc account.",
    heading: "A notice from the OduDoc team",
    bodyHtml: `
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>We wanted to reach out directly about activity on your ${BRAND} account. Please read the following carefully:</p>
      <p style="margin-top:12px;padding:12px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;">${escapeHtml(params.message)}</p>
      <p>We value having you on OduDoc. Please take a moment to review our terms of service so we can keep things running smoothly for everyone.</p>
    `,
    ctaLabel: "Review our terms",
    ctaUrl: `${SITE_URL}/terms`,
    footerNote: "If you have questions or think this was sent in error, reply to this email.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject: `Important: a notice about your ${BRAND} account`,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendDoctorWelcomeEmail(params: {
  to: string;
  name: string;
  tempPassword: string;
  expiresAt: string;
}): Promise<SendEmailResult> {
  const expires = new Date(params.expiresAt);
  const expiresLabel = isNaN(expires.getTime())
    ? "7 days"
    : expires.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const html = renderShell({
    preheader: "Your OduDoc doctor account is ready.",
    heading: `Welcome to ${BRAND}, Dr. ${escapeHtml(params.name)}`,
    bodyHtml: `
      <p>An ${BRAND} admin has set up your doctor account. You can sign in right now with the credentials below:</p>
      <p style="margin:16px 0;padding:14px 18px;background:#f3f4f6;border:1px dashed #9ca3af;border-radius:8px;font-family:monospace;font-size:14px;line-height:1.8;">
        <strong>Username:</strong> ${escapeHtml(params.to)}<br/>
        <strong>Temporary password:</strong> ${escapeHtml(params.tempPassword)}
      </p>
      <p><strong>This password must be changed within 7 days</strong> (by ${escapeHtml(expiresLabel)}) or it will expire and you'll be locked out until an admin re-issues a new one.</p>
      <p>After signing in, go to your account settings and set a new password you'll remember. From there you can complete your public profile, set your availability, and start accepting consultations.</p>
    `,
    ctaLabel: "Sign in & change password",
    ctaUrl: `${SITE_URL}/auth/login`,
    footerNote: "If you weren't expecting this invitation, reply to this email and we'll investigate.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject: `Welcome to ${BRAND} — your doctor account is ready`,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendVendorWelcomeEmail(params: {
  to: string;
  name: string; // owner or vendor name
  vendorName?: string; // store/pharmacy name
  tempPassword: string;
  expiresAt: string;
}): Promise<SendEmailResult> {
  const expires = new Date(params.expiresAt);
  const expiresLabel = isNaN(expires.getTime())
    ? "7 days"
    : expires.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const storeLine = params.vendorName
    ? `Your store <strong>${escapeHtml(params.vendorName)}</strong> has been set up on the ${BRAND} marketplace.`
    : `Your vendor account has been set up on the ${BRAND} marketplace.`;

  const html = renderShell({
    preheader: "Your OduDoc vendor account is ready.",
    heading: `Welcome to ${BRAND}, ${escapeHtml(params.name)}`,
    bodyHtml: `
      <p>${storeLine} You can sign in right now with the credentials below:</p>
      <p style="margin:16px 0;padding:14px 18px;background:#f3f4f6;border:1px dashed #9ca3af;border-radius:8px;font-family:monospace;font-size:14px;line-height:1.8;">
        <strong>Username:</strong> ${escapeHtml(params.to)}<br/>
        <strong>Temporary password:</strong> ${escapeHtml(params.tempPassword)}
      </p>
      <p><strong>This password must be changed within 7 days</strong> (by ${escapeHtml(expiresLabel)}) or it will expire and you'll be locked out until an admin re-issues a new one.</p>
      <p>Once signed in you'll land on your vendor dashboard where you can list products, track orders, and manage payouts. You'll only see orders from your own store.</p>
    `,
    ctaLabel: "Sign in & change password",
    ctaUrl: `${SITE_URL}/auth/login`,
    footerNote: "If you weren't expecting this invitation, reply to this email and we'll investigate.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject: `Welcome to ${BRAND} — your vendor account is ready`,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendPasswordResetByAdminEmail(params: {
  to: string;
  name: string;
  tempPassword: string;
}): Promise<SendEmailResult> {
  const html = renderShell({
    preheader: "Your OduDoc password was reset by an admin.",
    heading: "Your password has been reset",
    bodyHtml: `
      <p>Hi ${escapeHtml(params.name)},</p>
      <p>An ${BRAND} admin has reset the password on your account. You can sign in right now using the temporary password below:</p>
      <p style="margin:16px 0;padding:14px 18px;background:#f3f4f6;border:1px dashed #9ca3af;border-radius:8px;font-family:monospace;font-size:16px;letter-spacing:0.5px;text-align:center;"><strong>${escapeHtml(params.tempPassword)}</strong></p>
      <p><strong>Please sign in and change this password immediately</strong> from your account settings. Anyone with this temporary password could access your account.</p>
    `,
    ctaLabel: "Sign in now",
    ctaUrl: `${SITE_URL}/auth/login`,
    footerNote: "If you didn't expect this reset, reply to this email and we'll investigate.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject: `Your ${BRAND} password has been reset`,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<SendEmailResult> {
  const html = renderShell({
    preheader: "Reset your OduDoc password",
    heading: "Reset your password",
    bodyHtml: `
      <p>We received a request to reset the password on your OduDoc account. Click the button below to choose a new one — the link expires in 30 minutes.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
    ctaLabel: "Reset Password",
    ctaUrl: params.resetUrl,
    footerNote:
      "For your security, this link can only be used once and expires in 30 minutes.",
  });

  return sendEmail({
    from: "no-reply",
    to: params.to,
    subject: `Reset your ${BRAND} password`,
    html,
  });
}

// ---------- Vendor / multivendor marketplace emails ----------

export async function sendVendorApplicationReceivedEmail(params: {
  to: string;
  ownerName: string;
  vendorName: string;
}): Promise<SendEmailResult> {
  const html = renderShell({
    preheader: "We've received your vendor application.",
    heading: `Thanks for applying, ${escapeHtml(params.ownerName)}`,
    bodyHtml: `
      <p>We've received the vendor application for <strong>${escapeHtml(params.vendorName)}</strong>.</p>
      <p>Our team typically reviews applications within 24 hours. Once your license is verified, we'll activate your vendor dashboard so you can start listing products.</p>
      <p>You'll receive another email the moment a decision is made.</p>
    `,
    ctaLabel: "View application status",
    ctaUrl: `${SITE_URL}/sell`,
    footerNote: "Reply to this email if you need to update any details.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject: `Vendor application received – ${BRAND}`,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendVendorStatusUpdateEmail(params: {
  to: string;
  ownerName: string;
  vendorName: string;
  status: "approved" | "suspended" | "rejected";
  reason?: string;
}): Promise<SendEmailResult> {
  const reasonBlock = params.reason
    ? `<p style="margin-top:12px;padding:12px;background:#f3f4f6;border-radius:8px;"><strong>Note from our team:</strong> ${escapeHtml(params.reason)}</p>`
    : "";

  let heading: string;
  let subject: string;
  let bodyHtml: string;
  let ctaLabel = "Open vendor dashboard";
  let ctaUrl = `${SITE_URL}/dashboard/vendor`;

  if (params.status === "approved") {
    heading = `You're approved to sell on ${BRAND} 🎉`;
    subject = `Vendor approved – ${escapeHtml(params.vendorName)}`;
    bodyHtml = `
      <p>Hi ${escapeHtml(params.ownerName)},</p>
      <p>Great news — <strong>${escapeHtml(params.vendorName)}</strong> has been approved as a vendor on ${BRAND}.</p>
      <p>You can now list products, manage stock, and receive orders directly from your dashboard. Payouts are issued after commission per your agreement.</p>
      ${reasonBlock}
    `;
  } else if (params.status === "suspended") {
    heading = "Your vendor account has been suspended";
    subject = `Vendor suspended – ${escapeHtml(params.vendorName)}`;
    bodyHtml = `
      <p>Hi ${escapeHtml(params.ownerName)},</p>
      <p>We've temporarily suspended <strong>${escapeHtml(params.vendorName)}</strong>. Your products have been hidden from the storefront while we review the account.</p>
      ${reasonBlock}
      <p>Please reply to this email if you'd like to resolve the issue.</p>
    `;
    ctaLabel = "Contact support";
    ctaUrl = `${SITE_URL}/contact`;
  } else {
    heading = "An update on your vendor application";
    subject = `Vendor application update – ${escapeHtml(params.vendorName)}`;
    bodyHtml = `
      <p>Hi ${escapeHtml(params.ownerName)},</p>
      <p>Thanks for applying to sell on ${BRAND}. After reviewing your application for <strong>${escapeHtml(params.vendorName)}</strong>, we're unable to approve it at this time.</p>
      ${reasonBlock}
      <p>If you believe this is a mistake or you'd like to resubmit with updated details, just reply to this email.</p>
    `;
    ctaLabel = "Contact support";
    ctaUrl = `${SITE_URL}/contact`;
  }

  const html = renderShell({
    preheader: subject,
    heading,
    bodyHtml,
    ctaLabel,
    ctaUrl,
    footerNote: "Questions? Reply to this email and the admin team will help.",
  });

  return sendEmail({
    from: "admin",
    to: params.to,
    subject,
    html,
    replyTo: `admin@${DOMAIN}`,
  });
}

export async function sendVendorNewOrderEmail(params: {
  to: string;
  ownerName: string;
  vendorName: string;
  orderNumber: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  vendorSubtotal: number;
  shippingAddress: string;
}): Promise<SendEmailResult> {
  const rows = params.items
    .map(
      (it) => `
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#111827;">${escapeHtml(it.name)} × ${it.quantity}</td>
          <td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">$${(it.price * it.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const html = renderShell({
    preheader: `New order ${params.orderNumber} for ${params.vendorName}`,
    heading: `New order: ${escapeHtml(params.orderNumber)} 📦`,
    bodyHtml: `
      <p>Hi ${escapeHtml(params.ownerName)},</p>
      <p>You have a new order on <strong>${escapeHtml(params.vendorName)}</strong>. Please prepare the following items for fulfillment:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid #e5e7eb;">
        ${rows}
        <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:10px;font-size:14px;font-weight:700;">
          Your subtotal (before commission): $${params.vendorSubtotal.toFixed(2)}
        </td></tr>
      </table>
      <p style="margin-top:18px;font-size:13px;color:#6b7280;">
        Ship to: ${escapeHtml(params.shippingAddress)}
      </p>
    `,
    ctaLabel: "Open vendor orders",
    ctaUrl: `${SITE_URL}/dashboard/vendor/orders`,
    footerNote: "Update the order status from your dashboard once you've shipped the item.",
  });

  return sendEmail({
    from: "notifications",
    to: params.to,
    subject: `New order ${params.orderNumber} – ${BRAND}`,
    html,
    replyTo: `notifications@${DOMAIN}`,
  });
}

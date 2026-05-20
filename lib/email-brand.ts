// Shared brand constants for every transactional email we send.
//
// Before this file existed each email module hard-coded its own header
// colour and wordmark, with the result that referral emails were
// cyan-700, blog digests were blue-600, and password-reset emails were
// also blue-600 — none of them matching the actual OduDoc brand
// (emerald → teal). Anyone receiving multiple emails saw three
// different visual identities.
//
// This file is the single source of truth. Every email template
// imports BRAND_COLORS and EMAIL_HEADER_HTML / EMAIL_FOOTER_HTML so
// that changing the brand once changes every email at the same time.
//
// Constraints:
//  - Inline styles only. Email clients (Gmail, Outlook, Apple Mail,
//    Yahoo, ProtonMail) strip <style> blocks aggressively.
//  - No external <img> for the logo — we draw the cross icon with a
//    nested-table technique so it renders even when "load remote
//    images" is off. Same shape and proportions as the canonical
//    components/Logo.tsx (rounded square with a white medical cross).
//  - Wordmark colour follows the dark header — always white text.

// SITE_URL is currently a const in each module rather than a shared
// export. Inlining here keeps email-brand.ts dependency-free.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
  process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") ||
  "https://www.odudoc.com";

export const BRAND = "OduDoc";

// V4 §1.2 brand palette. Email header is a SOLID teal (V4 §1.4 says
// "White on Teal" — no gradient on email headers). We keep the named
// emerald / teal keys for backwards-compatible imports, but both
// resolve to the V4 primaryTeal.
export const BRAND_COLORS = {
  emerald: "#0F6E56",      // V4 primaryTeal — kept name for back-compat
  teal: "#0F6E56",
  headerSolid: "#0F6E56",  // Email header bar
  navy: "#042C53",         // V4 secondaryNavy — secondary headings
  accentGreen: "#1D9E75",  // V4 success indicator
  ctaSolid: "#0F6E56",     // CTA button — same teal for consistency
  ctaHover: "#0A5942",     // 10% darker for hover (clients ignore but documented)
  // Neutral support palette used by surface chrome.
  page: "#F5F5F5",         // V4 background light
  card: "#FFFFFF",
  ink: "#111827",          // gray-900 — primary text
  inkMuted: "#444444",     // V4 neutralGrey — body text
  border: "#E5E7EB",       // gray-200
  footerInk: "#6B7280",    // gray-500 — disclaimer text
  footerBg: "#F9FAFB",     // gray-50
};

// Logo composed of HTML table cells. Email clients render this
// reliably because <table> + bgcolor is the lowest-common-denominator
// markup that hasn't broken in 20 years. The result matches the
// canonical Logo: 32×32 rounded gradient square with a white plus
// sign inside.
function logoMark(): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="32" height="32" style="background:linear-gradient(135deg,${BRAND_COLORS.emerald} 0%,${BRAND_COLORS.teal} 100%);background-color:${BRAND_COLORS.headerSolid};border-radius:9px;">
  <tr><td align="center" valign="middle" width="32" height="32" style="position:relative;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr><td width="6" height="20" style="background:#ffffff;border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
    <!-- The horizontal bar of the cross sits behind the wordmark cell
         on most clients; we render it via background-image fallback. -->
  </td></tr>
</table>`;
}

/**
 * Standard branded header used at the top of every email body. The
 * cross icon + wordmark + CTA gradient give us a consistent identity
 * across every outbound message — verification, prescription, refund,
 * referral, blog digest, password reset.
 *
 * Outlook desktop strips the CSS gradient, so we ALSO set
 * background-color so it falls back to the solid teal.
 */
export function emailHeaderHtml(): string {
  // V4 §1.4: email header is "White on Teal" — solid #0F6E56, no
  // gradient. Outlook + most older Yahoo strip gradients anyway, so
  // solid is the only choice that renders identically everywhere.
  return `
<tr><td style="background-color:${BRAND_COLORS.headerSolid};padding:18px 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td valign="middle" style="padding-right:12px;">
        <!-- 32×32 white plus on a rounded white-tint square: two
             white rects emulate the medical cross from the canonical
             Logo component. The outer table cell already provides
             the brand-coloured background. -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="32" height="32" style="background:#ffffff20;border:1px solid #ffffff40;border-radius:9px;">
          <tr>
            <td align="center" valign="middle" width="32" height="32">
              <div style="position:relative;width:18px;height:18px;">
                <div style="position:absolute;top:0;left:6px;width:6px;height:18px;background:#ffffff;border-radius:2px;"></div>
                <div style="position:absolute;top:6px;left:0;width:18px;height:6px;background:#ffffff;border-radius:2px;"></div>
              </div>
            </td>
          </tr>
        </table>
      </td>
      <td valign="middle">
        <a href="${SITE_URL}" style="color:#ffffff;text-decoration:none;font-weight:800;font-size:18px;letter-spacing:-0.5px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">${BRAND}</a>
      </td>
    </tr>
  </table>
</td></tr>`;
}

/**
 * Standard footer — disclaimer, publisher name, unsubscribe placeholder.
 * Centralising this means we can swap the legal-entity line in one
 * place if Sarjudas LLC ever restructures.
 */
export function emailFooterHtml(): string {
  return `
<tr><td style="background:${BRAND_COLORS.footerBg};padding:18px 28px;font-size:12px;line-height:1.5;color:${BRAND_COLORS.footerInk};font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  ${BRAND} — your health, our priority.<br/>
  Operated by Sarjudas Digital Trading and Escrow Services LLC,<br/>
  8 The Green, Ste A, Dover, DE 19901, US.
</td></tr>`;
}

/**
 * Inline CTA button using the canonical emerald solid fallback.
 * Pass label + href; emit ready-to-drop HTML. Email clients (especially
 * Outlook) don't render border-radius on <a>, so we keep the radius
 * but accept the squared-off look on those clients.
 */
export function emailCtaButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND_COLORS.ctaSolid};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">${label}</a>`;
}

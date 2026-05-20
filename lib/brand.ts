// Single source of truth for OduDoc brand tokens.
//
// V4 §1 of the Master Specification locks the palette below. Every
// surface — web chrome, dashboards, emails, PDFs, mobile apps, OG
// cards, store icons — must reference these constants rather than
// hard-coding hex values. If the brand ever changes, this file
// changes and everything else follows.
//
// V4 explicitly forbids:
//  - Stretching, rotating, skewing the logo
//  - Recolouring outside the defined variants
//  - Teal logo on dark backgrounds (use white variant)
//  - Logo over busy images without a clear backing
//  - Upscaling a raster version (use SVG)
//  - Logo width below 120px on screen / 30mm in print

export const BRAND = {
  name: "OduDoc",
  tagline: "Every Patient. Every Provider. Everywhere.",
  publisher: "Sarjudas Digital Trading and Escrow Services LLC",
  publisherAddress: "8 The Green, Ste A, Dover, DE 19901, US",
};

// V4 §1.2 fixed palette. Solid colors — no gradients on the wordmark.
// The earlier emerald (#22C98A) and the various blue/cyan email
// headers were drift; this file is the corrective.
export const COLORS = {
  primaryTeal: "#0F6E56",      // Logo, primary buttons, links, active states
  secondaryNavy: "#042C53",    // Secondary headings, dashboard sidebars
  accentGreen: "#1D9E75",      // Success, positive indicators
  gold: "#C9A84C",             // Premium / HNI badges
  errorRed: "#991B1B",         // Critical alerts, emergency
  neutralGrey: "#444444",      // Body text
  backgroundLight: "#F5F5F5",  // Page backgrounds, alternate rows
  white: "#FFFFFF",
};

// V5 §4.1 role colour coding — used by Odudoc Pro to tint each
// staff dashboard. Patient app uses primaryTeal.
export const ROLE_COLORS = {
  patient: COLORS.primaryTeal,
  doctor: COLORS.secondaryNavy,
  nurse: "#1E40AF",         // blue-700 — calmer than navy
  icu: COLORS.errorRed,     // red — emergency context
  er: COLORS.errorRed,
  pharma: "#854D0E",        // gold-brown — distinct from clinical
  lab: "#065F46",           // deep green
  admin: COLORS.secondaryNavy,
  hod: "#1E40AF",
  multiRole: "#5B21B6",     // violet — role switcher chrome
  housekeeping: "#444444",  // neutral grey
};

// V4 §1.5 typography stack.
export const FONTS = {
  ui: "Inter, Arial, system-ui, sans-serif",
  pdf: "Arial, Helvetica, sans-serif",
  mono: "'Courier New', monospace",
};

// V4 §1.4 minimum sizing rules.
export const LOGO_MIN_SIZE_PX = 120;
export const LOGO_MIN_SIZE_MM = 30;

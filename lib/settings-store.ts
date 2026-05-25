// Site settings — Postgres-backed via the app_kv key/value table that
// lib/persistent-array.ts already provisions. We keep an in-memory
// mirror for fast synchronous reads (every existing route handler
// pulls settings synchronously; rewriting all of them async would be
// a much larger change), and fire-and-forget a write-through on
// updateSettings. Boot-time hydration runs once on module load; while
// it's pending, callers see `defaults` (same as the pre-persistence
// behaviour) — once the row lands, the in-memory mirror swaps to the
// stored copy, so admin changes survive Vercel cold starts.

import { loadJson, saveJson } from "./persistent-array";
import { log } from "./log";

export interface CommonSettings {
  siteName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  copyright: string;
  footerText: string;
  timezone: string;
}

export interface CaptchaSettings {
  enabled: boolean;
  siteKey: string;
  secretKey: string;
  version: "v2" | "v3";
}

export interface PaymentGateway {
  id: string;
  name: string;
  enabled: boolean;
  mode: "test" | "live";
  publicKey: string;
  secretKey: string;
}

export interface ManualPaymentMethod {
  id: string;
  name: string;
  instructions: string;
  enabled: boolean;
}

export interface SmtpSettings {
  host: string;
  port: string;
  encryption: "none" | "ssl" | "tls";
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

export interface PageSettings {
  showBreadcrumb: boolean;
  showBackToTop: boolean;
  showCookieConsent: boolean;
  showLiveChat: boolean;
  enableBlog: boolean;
  enableShop: boolean;
  enableDepartments: boolean;
  enableDoctors: boolean;
  postsPerPage: number;
  productsPerPage: number;
}

export interface CurrencySettings {
  name: string;
  code: string;
  symbol: string;
  position: "left" | "right" | "left-space" | "right-space";
  decimalSeparator: string;
  decimals: number;
}

export interface LanguageEntry {
  id: string;
  code: string;
  name: string;
  native: string;
  default: boolean;
  enabled: boolean;
}

export interface TranslationEntry {
  key: string;
  en: string;
  translations: Record<string, string>; // lang code → translation
}

export interface InvoiceSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  taxRate: number;
  taxName: string;
  showTax: boolean;
  invoicePrefix: string;
  invoiceFooter: string;
  logoUrl: string;
}

export interface SocialProvider {
  id: string;
  name: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
}

// One row of the emergency-banner lookup table. The banner picks the row
// whose `country` matches the visitor's ISO-3166-1 alpha-2 code (resolved
// by Vercel from the request IP), falling back to the row where
// `country === "*"`. `localEmergency` is the dial-on-the-phone short
// code (911 / 112 / 999 / 000); `helpline` is OduDoc's own 24/7 line for
// that region — both are clickable tel: links in the banner.
export interface EmergencyNumberEntry {
  country: string;
  localEmergency: string;
  helpline: string;
}

export interface SiteSettings {
  common: CommonSettings;
  captcha: CaptchaSettings;
  paymentGateways: PaymentGateway[];
  manualPayments: ManualPaymentMethod[];
  smtp: SmtpSettings;
  page: PageSettings;
  currency: CurrencySettings;
  // Currency codes accepted at checkout in addition to the default.
  // Visitors get a switcher to pay in any of these. Pricing is still
  // stored/displayed in `currency.code` — conversion happens at the
  // payment step (see lib/currency-convert.ts). Optional for backwards
  // compatibility with any persisted blobs that predate this field.
  enabledCurrencies?: string[];
  languages: LanguageEntry[];
  translations: TranslationEntry[];
  invoice: InvoiceSettings;
  socialProviders: SocialProvider[];
  emergencyNumbers: EmergencyNumberEntry[];
  updatedAt: string;
}

const defaults: SiteSettings = {
  common: {
    siteName: "OduDoc",
    tagline: "Your Trusted Healthcare Platform",
    email: "contact@odudoc.com",
    phone: "+1 (302) 899-2625",
    address: "8 The Green, Ste A, Dover, DE 19901",
    copyright: "\u00a9 2026 OduDoc. All rights reserved.",
    footerText: "Dedicated to healthcare excellence.",
    timezone: "America/New_York",
  },
  captcha: { enabled: false, siteKey: "", secretKey: "", version: "v3" },
  paymentGateways: [
    { id: "stripe", name: "Stripe", enabled: true, mode: "live", publicKey: "pk_live_...", secretKey: "" },
    { id: "paypal", name: "PayPal", enabled: false, mode: "test", publicKey: "", secretKey: "" },
    { id: "razorpay", name: "Razorpay", enabled: false, mode: "test", publicKey: "", secretKey: "" },
    { id: "induspays", name: "IndusPays", enabled: false, mode: "test", publicKey: "", secretKey: "" },
    // PayU Biz (corporate.payu.com) — India-first hosted checkout. On this
    // gateway, publicKey = Merchant Key, secretKey = Merchant Salt.
    { id: "payu", name: "PayU", enabled: false, mode: "test", publicKey: "", secretKey: "" },
    // Tazapay — cross-border checkout for APAC / Africa / GCC. On this
    // gateway, publicKey = API Key, secretKey = API Secret.
    { id: "tazapay", name: "Tazapay", enabled: false, mode: "test", publicKey: "", secretKey: "" },
    // ConnectPay — hosted-checkout gateway (connectpay.com). On this
    // gateway, publicKey = Merchant ID / API Key, secretKey = API Secret
    // (used for HMAC-SHA256 request signing + webhook verification).
    { id: "connectpay", name: "ConnectPay", enabled: false, mode: "test", publicKey: "", secretKey: "" },
  ],
  manualPayments: [
    { id: "m1", name: "Bank Transfer", instructions: "Bank: OduDoc Bank\nAccount: 1234567890\nIFSC: ODUD0001234", enabled: true },
    { id: "m2", name: "Cash on Delivery", instructions: "Pay in cash when your order arrives.", enabled: true },
  ],
  smtp: {
    host: "smtp.gmail.com",
    port: "587",
    encryption: "tls",
    username: "noreply@odudoc.com",
    password: "",
    fromEmail: "noreply@odudoc.com",
    fromName: "OduDoc",
  },
  page: {
    showBreadcrumb: true,
    showBackToTop: true,
    showCookieConsent: true,
    showLiveChat: false,
    enableBlog: true,
    enableShop: true,
    enableDepartments: true,
    enableDoctors: true,
    postsPerPage: 9,
    productsPerPage: 12,
  },
  currency: {
    name: "Dollar",
    code: "USD",
    symbol: "$",
    position: "left",
    decimalSeparator: "1,234,567.89",
    decimals: 2,
  },
  // Seeded from the top of the language catalogue (see lib/languages-catalogue.ts).
  // Admins can extend this via the "Add from catalogue" picker on
  // /admin/settings \u2192 Languages.
  languages: [
    { id: "en", code: "en", name: "English",    native: "English",   default: true,  enabled: true },
    { id: "es", code: "es", name: "Spanish",    native: "Espa\u00f1ol", default: false, enabled: true },
    { id: "fr", code: "fr", name: "French",     native: "Fran\u00e7ais", default: false, enabled: true },
    { id: "ar", code: "ar", name: "Arabic",     native: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", default: false, enabled: true },
    { id: "hi", code: "hi", name: "Hindi",      native: "\u0939\u093f\u0928\u094d\u0926\u0940", default: false, enabled: true },
    { id: "zh", code: "zh", name: "Chinese",    native: "\u4e2d\u6587", default: false, enabled: true },
    { id: "pt", code: "pt", name: "Portuguese", native: "Portugu\u00eas", default: false, enabled: true },
    { id: "de", code: "de", name: "German",     native: "Deutsch",   default: false, enabled: true },
  ],
  enabledCurrencies: ["USD", "EUR", "GBP", "INR", "AED"],
  translations: [
    { key: "book_appointment", en: "Book Appointment", translations: { es: "Reservar Cita", fr: "Prendre rendez-vous" } },
    { key: "video_consult",    en: "Video Consult",    translations: { es: "Consulta por Video", fr: "Consultation vid\u00e9o" } },
    { key: "find_doctors",     en: "Find Doctors",     translations: { es: "Encontrar Doctores", fr: "Trouver des m\u00e9decins" } },
    { key: "sign_in",          en: "Sign in",          translations: { es: "Iniciar Sesi\u00f3n", fr: "Se connecter" } },
    { key: "create_account",   en: "Create an account", translations: { es: "Crear una cuenta", fr: "Cr\u00e9er un compte" } },
  ],
  invoice: {
    companyName: "OduDoc Inc.",
    companyAddress: "8 The Green, Ste A, Dover, DE 19901",
    companyPhone: "+1 (302) 899-2625",
    companyEmail: "billing@odudoc.com",
    taxRate: 8.5,
    taxName: "Sales Tax",
    showTax: true,
    invoicePrefix: "ODU-",
    invoiceFooter: "Thank you for choosing OduDoc. Payment due within 30 days.",
    logoUrl: "",
  },
  socialProviders: [
    { id: "google", name: "Google", enabled: true, clientId: "", clientSecret: "" },
    { id: "facebook", name: "Facebook", enabled: false, clientId: "", clientSecret: "" },
    { id: "apple", name: "Apple", enabled: false, clientId: "", clientSecret: "" },
    { id: "github", name: "GitHub", enabled: false, clientId: "", clientSecret: "" },
  ],
  // Region-specific emergency numbers shown in the top-of-page banner.
  // Resolved against the visitor's country via x-vercel-ip-country in
  // /api/emergency-numbers. "*" is the fallback when no row matches.
  // Admins manage this list at /admin/emergency-numbers.
  emergencyNumbers: [
    { country: "*",  localEmergency: "911", helpline: "+1 (302) 899-2625" },
    { country: "US", localEmergency: "911", helpline: "+1 (302) 899-2625" },
    { country: "CA", localEmergency: "911", helpline: "+1 (302) 899-2625" },
    { country: "GB", localEmergency: "999", helpline: "+1 (302) 899-2625" },
    { country: "IE", localEmergency: "112", helpline: "+1 (302) 899-2625" },
    { country: "AU", localEmergency: "000", helpline: "+1 (302) 899-2625" },
    { country: "NZ", localEmergency: "111", helpline: "+1 (302) 899-2625" },
    { country: "IN", localEmergency: "112", helpline: "+1 (302) 899-2625" },
    { country: "AE", localEmergency: "999", helpline: "+1 (302) 899-2625" },
    { country: "SA", localEmergency: "997", helpline: "+1 (302) 899-2625" },
    { country: "SG", localEmergency: "995", helpline: "+1 (302) 899-2625" },
    { country: "ZA", localEmergency: "10177", helpline: "+1 (302) 899-2625" },
    { country: "NG", localEmergency: "112", helpline: "+1 (302) 899-2625" },
    { country: "KE", localEmergency: "999", helpline: "+1 (302) 899-2625" },
    { country: "DE", localEmergency: "112", helpline: "+1 (302) 899-2625" },
    { country: "FR", localEmergency: "112", helpline: "+1 (302) 899-2625" },
    { country: "ES", localEmergency: "112", helpline: "+1 (302) 899-2625" },
    { country: "IT", localEmergency: "112", helpline: "+1 (302) 899-2625" },
    { country: "NL", localEmergency: "112", helpline: "+1 (302) 899-2625" },
    { country: "JP", localEmergency: "119", helpline: "+1 (302) 899-2625" },
    { country: "KR", localEmergency: "119", helpline: "+1 (302) 899-2625" },
    { country: "CN", localEmergency: "120", helpline: "+1 (302) 899-2625" },
    { country: "BR", localEmergency: "192", helpline: "+1 (302) 899-2625" },
    { country: "MX", localEmergency: "911", helpline: "+1 (302) 899-2625" },
  ],
  updatedAt: new Date().toISOString(),
};

let settings: SiteSettings = JSON.parse(JSON.stringify(defaults));

const STORE_KEY = "site-settings";

// Boot-time hydration. Fires once on first module load per Lambda;
// subsequent imports re-use whatever the in-memory mirror holds.
// Failures are logged and swallowed — we keep serving `defaults` so a
// transient Postgres outage doesn't take the site down. Calls to
// `getSettings()` made before hydration completes also see defaults,
// which matches the pre-persistence behaviour exactly.
let hydrated = false;
let hydrating: Promise<void> | null = null;

async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const stored = await loadJson<SiteSettings | null>(STORE_KEY, null);
      if (stored && typeof stored === "object") {
        // Shallow-merge stored over defaults so newly-added top-level
        // sections (e.g. `enabledCurrencies`) inherit defaults instead
        // of being undefined when an old DB row is hydrated.
        settings = {
          ...defaults,
          ...stored,
          // Always carry the freshest defaults shape for objects whose
          // keys we may have widened — but stored values win where
          // present.
          common: { ...defaults.common, ...(stored.common || {}) },
          captcha: { ...defaults.captcha, ...(stored.captcha || {}) },
          smtp: { ...defaults.smtp, ...(stored.smtp || {}) },
          page: { ...defaults.page, ...(stored.page || {}) },
          currency: { ...defaults.currency, ...(stored.currency || {}) },
          invoice: { ...defaults.invoice, ...(stored.invoice || {}) },
          // Backfill the seed list for blobs persisted before this section
          // existed — without this, the banner endpoint would return the
          // hard fallback and the admin page would render an empty table.
          emergencyNumbers:
            stored.emergencyNumbers && stored.emergencyNumbers.length > 0
              ? stored.emergencyNumbers
              : defaults.emergencyNumbers,
        };
      }
      hydrated = true;
    } catch (err) {
      log.error("settings_store.hydrate_failed", err);
    }
  })();
  return hydrating;
}

// Kick off hydration eagerly. Routes that need to be sure they read
// the persisted copy (rather than defaults) can `await ensureHydrated()`.
hydrate();

export async function ensureHydrated(): Promise<void> {
  await hydrate();
}

function persist(): void {
  // Fire-and-forget. Routes that mutate settings right before
  // responding can call `awaitAllFlushes()` from persistent-array.ts
  // to drain pending writes — but for the admin settings flow, the
  // user almost always re-reads via GET on the next page render, so
  // a sync POST→DB write isn't required for correctness.
  void saveJson(STORE_KEY, settings).catch((err) => {
    log.error("settings_store.persist_failed", err);
  });
}

export function getSettings(): SiteSettings {
  return settings;
}

// Merge a partial patch into settings. Top-level keys replace entirely when
// provided (so arrays replace rather than merge-by-id, which is simpler and
// matches how the admin UI sends the whole list back).
export function updateSettings(patch: Partial<SiteSettings>): SiteSettings {
  settings = {
    ...settings,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  persist();
  return settings;
}

export function resetSettings(): SiteSettings {
  settings = JSON.parse(JSON.stringify(defaults));
  persist();
  return settings;
}

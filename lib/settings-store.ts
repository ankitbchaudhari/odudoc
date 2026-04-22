// In-memory site settings.
//
// One flat object keyed by section. The admin settings page reads the whole
// blob on mount and PATCHes individual sections on save. Matches the
// in-memory pattern used for products / orders / blog / doctors / pages —
// will migrate to MySQL alongside the rest.

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

export interface SiteSettings {
  common: CommonSettings;
  captcha: CaptchaSettings;
  paymentGateways: PaymentGateway[];
  manualPayments: ManualPaymentMethod[];
  smtp: SmtpSettings;
  page: PageSettings;
  currency: CurrencySettings;
  languages: LanguageEntry[];
  translations: TranslationEntry[];
  invoice: InvoiceSettings;
  socialProviders: SocialProvider[];
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
  languages: [
    { id: "en", code: "en", name: "English", native: "English", default: true, enabled: true },
    { id: "es", code: "es", name: "Spanish", native: "Espa\u00f1ol", default: false, enabled: true },
    { id: "fr", code: "fr", name: "French", native: "Fran\u00e7ais", default: false, enabled: true },
    { id: "ar", code: "ar", name: "Arabic", native: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", default: false, enabled: true },
    { id: "hi", code: "hi", name: "Hindi", native: "\u0939\u093f\u0928\u094d\u0926\u0940", default: false, enabled: false },
  ],
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
  updatedAt: new Date().toISOString(),
};

let settings: SiteSettings = JSON.parse(JSON.stringify(defaults));

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
  return settings;
}

export function resetSettings(): SiteSettings {
  settings = JSON.parse(JSON.stringify(defaults));
  return settings;
}

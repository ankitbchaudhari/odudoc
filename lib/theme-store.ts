// In-memory theme / brand customization store.
//
// Persists the settings the admin can set from /admin/customize. A public
// slice is exposed via /api/theme so the storefront can hydrate itself with
// the current brand configuration at runtime.

export type HomepageLayout = "default" | "v2" | "v3" | "v4" | "v5";
export type HeroStyle = "default" | "stats" | "schedule" | "text-slider" | "minimal";
export type FontFamily = "inter" | "poppins" | "roboto" | "manrope" | "system";
export type ButtonShape = "rounded" | "pill" | "square";
export type HeaderStyle = "default" | "compact" | "transparent" | "centered";
export type SidebarStyle = "light" | "dark" | "brand";
export type CookieBanner = "off" | "simple" | "full";

export interface SocialLinks {
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
}

export interface AnnouncementBar {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkHref: string;
  background: string;
  textColor: string;
}

export interface FeatureToggles {
  blog: boolean;
  shop: boolean;
  reviews: boolean;
  comments: boolean;
  appointments: boolean;
  careers: boolean;
  chatWidget: boolean;
}

export interface SeoSettings {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  keywords: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  facebookPixelId: string;
  metaVerification: string;
  robotsIndex: boolean;
}

export interface ThemeSettings {
  // Brand
  siteName: string;
  logoText: string;
  tagline: string;
  logoUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;

  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;

  // Appearance
  enableDarkMode: boolean;
  defaultMode: "light" | "dark" | "auto";
  fontFamily: FontFamily;
  headingFontFamily: FontFamily;
  baseFontSize: number; // px
  borderRadius: number; // px, 0–24
  buttonShape: ButtonShape;

  // Layout
  homeLayout: HomepageLayout;
  heroStyle: HeroStyle;
  headerStyle: HeaderStyle;
  sidebarStyle: SidebarStyle;
  stickyHeader: boolean;
  showBreadcrumbs: boolean;
  footerText: string;
  footerColumns: number;

  // Announcement bar
  announcement: AnnouncementBar;

  // Feature toggles
  features: FeatureToggles;

  // Social links
  social: SocialLinks;

  // SEO & analytics
  seo: SeoSettings;

  // Advanced / integrations
  customCss: string;
  customHeadHtml: string;
  customFooterHtml: string;
  cookieBanner: CookieBanner;
  maintenanceMode: boolean;
  maintenanceMessage: string;

  updatedAt: string;
}

const defaults: ThemeSettings = {
  siteName: "OduDoc — Healthcare Platform",
  logoText: "OduDoc",
  tagline: "Your health, our priority",
  logoUrl: "",
  logoDarkUrl: "",
  faviconUrl: "",

  primaryColor: "#0E7490",
  secondaryColor: "#14B8A6",
  accentColor: "#F59E0B",
  backgroundColor: "#FFFFFF",
  textColor: "#111827",
  linkColor: "#0E7490",

  enableDarkMode: false,
  defaultMode: "light",
  fontFamily: "inter",
  headingFontFamily: "inter",
  baseFontSize: 16,
  borderRadius: 12,
  buttonShape: "rounded",

  homeLayout: "v4",
  heroStyle: "text-slider",
  headerStyle: "default",
  sidebarStyle: "light",
  stickyHeader: true,
  showBreadcrumbs: true,
  footerText: "© 2026 OduDoc. All rights reserved.",
  footerColumns: 4,

  announcement: {
    enabled: false,
    text: "Free shipping on orders over $50.",
    linkLabel: "Shop now",
    linkHref: "/shop",
    background: "#0E7490",
    textColor: "#FFFFFF",
  },

  features: {
    blog: true,
    shop: true,
    reviews: true,
    comments: true,
    appointments: true,
    careers: true,
    chatWidget: true,
  },

  social: {
    facebook: "https://facebook.com/odudoc",
    twitter: "https://twitter.com/odudoc",
    instagram: "https://instagram.com/odudoc",
    linkedin: "https://linkedin.com/company/odudoc",
    youtube: "",
    tiktok: "",
  },

  seo: {
    metaTitle: "OduDoc — Online Doctors, Pharmacy & Appointments",
    metaDescription: "Book video consultations, order prescriptions and manage your health with OduDoc.",
    ogImage: "",
    keywords: "telemedicine, doctors, online pharmacy, appointments",
    googleAnalyticsId: "",
    googleTagManagerId: "",
    facebookPixelId: "",
    metaVerification: "",
    robotsIndex: true,
  },

  customCss: "",
  customHeadHtml: "",
  customFooterHtml: "",
  cookieBanner: "simple",
  maintenanceMode: false,
  maintenanceMessage: "We're upgrading OduDoc — back shortly.",

  updatedAt: new Date().toISOString(),
};

let theme: ThemeSettings = structuredClone(defaults);

export function getTheme(): ThemeSettings {
  return theme;
}

// Deep-merge patch into current theme. Arrays and scalars are replaced;
// nested objects (announcement, features, social, seo) are merged field by
// field so the UI can PATCH a subset without clobbering everything else.
export function updateTheme(patch: Partial<ThemeSettings>): ThemeSettings {
  const next: ThemeSettings = { ...theme };
  for (const key of Object.keys(patch) as Array<keyof ThemeSettings>) {
    const val = patch[key];
    if (val === undefined) continue;
    const nextAny = next as unknown as Record<string, unknown>;
    if (
      val &&
      typeof val === "object" &&
      !Array.isArray(val) &&
      key !== "updatedAt"
    ) {
      nextAny[key] = {
        ...((theme[key] as object) || {}),
        ...(val as object),
      };
    } else {
      nextAny[key] = val;
    }
  }
  next.updatedAt = new Date().toISOString();
  theme = next;
  return theme;
}

export function resetTheme(): ThemeSettings {
  theme = structuredClone(defaults);
  return theme;
}

export function getPublicTheme() {
  return {
    siteName: theme.siteName,
    logoText: theme.logoText,
    tagline: theme.tagline,
    logoUrl: theme.logoUrl,
    logoDarkUrl: theme.logoDarkUrl,
    faviconUrl: theme.faviconUrl,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
    accentColor: theme.accentColor,
    backgroundColor: theme.backgroundColor,
    textColor: theme.textColor,
    linkColor: theme.linkColor,
    enableDarkMode: theme.enableDarkMode,
    defaultMode: theme.defaultMode,
    fontFamily: theme.fontFamily,
    headingFontFamily: theme.headingFontFamily,
    baseFontSize: theme.baseFontSize,
    borderRadius: theme.borderRadius,
    buttonShape: theme.buttonShape,
    homeLayout: theme.homeLayout,
    heroStyle: theme.heroStyle,
    headerStyle: theme.headerStyle,
    sidebarStyle: theme.sidebarStyle,
    stickyHeader: theme.stickyHeader,
    showBreadcrumbs: theme.showBreadcrumbs,
    footerText: theme.footerText,
    footerColumns: theme.footerColumns,
    announcement: theme.announcement,
    features: theme.features,
    social: theme.social,
    seo: theme.seo,
    cookieBanner: theme.cookieBanner,
    maintenanceMode: theme.maintenanceMode,
    maintenanceMessage: theme.maintenanceMessage,
  };
}

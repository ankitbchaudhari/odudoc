import type { Metadata } from "next";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { LanguageProvider } from "@/lib/language-context";
import CookieConsent from "@/components/CookieConsent";
import BackToTop from "@/components/BackToTop";
import GoogleTranslate from "@/components/GoogleTranslate";
import ExperimentBootstrap from "@/components/ExperimentBootstrap";
import Analytics from "@/components/Analytics";
import LoadingBar from "@/components/LoadingBar";
import ReferralAttribution from "@/components/ReferralAttribution";
import { OrganizationLd, WebsiteLd } from "@/components/StructuredData";

// AIChatbot is a 500+ line client component that ships on every page
// load but is only ever rendered as a floating bubble until a user
// clicks it. Defer its bundle off the critical path with next/dynamic
// so the main JS chunk shrinks and Largest Contentful Paint improves
// for first-time visitors. ssr:false because the chatbot has no SEO
// value — search crawlers don't need it in the initial HTML.
const AIChatbot = dynamic(() => import("@/components/AIChatbot"), {
  ssr: false,
});

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "OduDoc — Online Doctor Consultations, Lab Tests & Hospital Software",
    template: "%s | OduDoc",
  },
  description:
    "Book video consultations with verified doctors, order lab tests, and manage hospitals on OduDoc — a secure, multi-tenant healthcare platform trusted by clinics and patients.",
  keywords: [
    "online doctor consultation",
    "telemedicine",
    "video consultation",
    "book doctor appointment",
    "lab tests online",
    "hospital management software",
    "clinic software",
    "electronic health records",
    "EHR",
    "digital healthcare",
    "OduDoc",
  ],
  authors: [{ name: "OduDoc" }],
  creator: "OduDoc",
  publisher: "OduDoc",
  applicationName: "OduDoc",
  category: "health",
  alternates: {
    canonical: "/",
    // The app serves content in 11 languages via an in-page switcher backed by
    // the same URL — so hreflang points every locale at the same canonical
    // path plus x-default. Safe declaration that lets search engines surface
    // the page in the searcher's language.
    languages: {
      "x-default": "/",
      en: "/",
      es: "/",
      fr: "/",
      de: "/",
      pt: "/",
      zh: "/",
      ar: "/",
      ru: "/",
      sw: "/",
      ha: "/",
      am: "/",
    },
  },
  openGraph: {
    type: "website",
    siteName: "OduDoc",
    title: "OduDoc — Online Doctor Consultations, Lab Tests & Hospital Software",
    description:
      "Book video consultations with verified doctors, order lab tests, and manage hospitals on OduDoc.",
    url: SITE_URL,
    locale: "en_US",
    alternateLocale: [
      "es_ES",
      "fr_FR",
      "de_DE",
      "pt_PT",
      "zh_CN",
      "ar_AE",
      "ru_RU",
      "sw_KE",
      "ha_NG",
      "am_ET",
    ],
    // Image supplied by app/opengraph-image.tsx (dynamic, 1200×630).
  },
  twitter: {
    card: "summary_large_image",
    title: "OduDoc — Online Doctor Consultations, Lab Tests & Hospital Software",
    description:
      "Book video consultations with verified doctors, order lab tests, and manage hospitals on OduDoc.",
    creator: "@odudoc",
    // Image supplied by app/twitter-image.tsx.
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // icons + apple-icon supplied by app/icon.tsx and app/apple-icon.tsx.
  manifest: "/manifest.webmanifest",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Speed up handshake for origins we hit on almost every page load.
            preconnect opens the TCP/TLS connection eagerly; dns-prefetch is
            the cheaper fallback for browsers that ignore preconnect. */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <OrganizationLd />
        <WebsiteLd />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="OduDoc Blog"
          href="/feed.xml"
        />
      </head>
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <AuthProvider>
          <CartProvider>
            <LanguageProvider>
              <LoadingBar />
              <ReferralAttribution />
              <ConditionalLayout>{children}</ConditionalLayout>
              <CookieConsent />
              <AIChatbot />
              <BackToTop />
              <GoogleTranslate />
              <ExperimentBootstrap />
              <Analytics />
            </LanguageProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

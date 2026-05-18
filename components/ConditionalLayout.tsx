"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmergencyBanner from "@/components/EmergencyBanner";
import AnnouncementBar from "@/components/AnnouncementBar";
import OfferBanner from "@/components/OfferBanner";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  // /pilot is a single-purpose landing page for cold-outreach
  // prospects — no nav, no banners, no distractions. Keeps focus
  // on the value prop and the calendar booking CTA.
  const isPilot = pathname === "/pilot" || pathname.startsWith("/pilot/");
  // Post-login app surfaces — patient, doctor, clinic, corporate
  // dashboards. Suppress the public-site navbar / emergency banner /
  // footer so the dashboard feels like a focused app rather than a
  // website wrapper. Users who sign out land back on a public route
  // and immediately get the full chrome again.
  const isDashboard = pathname.startsWith("/dashboard");
  // Clinic staff pages are everything under /clinic/<id>/ (dashboard,
  // reception, insurance, pharmacy, referrals, login). The public
  // "/clinic" listing — if it ever ships — would live at /clinic
  // exactly, which doesn't match this prefix.
  const isClinicStaff = /^\/clinic\/[^/]+\//.test(pathname);
  // /corporate/login is the customer sign-in page; the /corporate
  // marketing page itself stays public.
  const isCorporateApp = pathname.startsWith("/corporate/login");

  if (isAdmin || isPilot || isDashboard || isClinicStaff || isCorporateApp) {
    // These surfaces render their own chrome (DashboardShell or
    // admin sidebar). Wrap the body in <main> so screen readers
    // still see the document landmark structure they expect.
    return <main id="main-content">{children}</main>;
  }

  return (
    <>
      {/* Skip link — visible only when keyboard-focused. Lets a non-mouse
          user jump past the header banners + nav to the page content. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>
      <AnnouncementBar />
      <OfferBanner />
      <EmergencyBanner />
      <Navbar />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

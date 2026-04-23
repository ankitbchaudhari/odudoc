import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Which /admin sub-paths a "staff" role is allowed to access. Anything not
// listed here falls back to admin-only. Keeping this list small and explicit
// is safer than trying to exclude sensitive routes — if we forget to exclude
// something, staff accidentally gets access.
const STAFF_ALLOWED_PREFIXES = [
  "/admin/products",
  "/admin/categories",
  "/admin/tags",
  "/admin/coupons",
  "/admin/reviews",
  "/admin/orders",
  "/admin/media",
];

// Admin pages that are SAAS-operator-only (marketing site CMS, platform
// leads, commerce, etc.) — tenant admins (hospital owners) must never see
// them even if they guess the URL. The sidebar hides these links, but
// middleware is the real gate. Matched by prefix so /admin/organizations/123
// is covered too.
const SUPER_ONLY_PREFIXES = [
  "/admin/doctors",
  "/admin/departments",
  "/admin/appointments",
  "/admin/prescriptions",
  "/admin/lab-tests",
  "/admin/timetable",
  "/admin/pages",
  "/admin/blog",
  "/admin/media",
  "/admin/testimonials",
  "/admin/gallery",
  "/admin/products",
  "/admin/vendors",
  "/admin/payouts",
  "/admin/categories",
  "/admin/tags",
  "/admin/coupons",
  "/admin/reviews",
  "/admin/orders",
  "/admin/withdrawals",
  "/admin/applications",
  "/admin/doctor-earnings",
  "/admin/letters",
  "/admin/organizations",
  "/admin/enterprise-leads",
  "/admin/platform-audit",
  "/admin/offers",
  "/admin/subscribers",
  "/admin/email",
  "/admin/tickets",
  "/admin/users",
  "/admin/careers",
  "/admin/customize",
  "/admin/settings",
];

// Env-driven super-admin list, mirrored from lib/tenant.ts so middleware
// can make the call without importing Node-only modules. Edge runtime can
// read process.env at cold-start time.
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isSuperEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  // Legacy bootstrap admin, matches lib/tenant.ts.
  if (e === "admin@odudoc.com") return true;
  return SUPER_ADMIN_EMAILS.includes(e);
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Staff should never see the patient dashboard — their home is the
    // e-commerce admin. Force them over even if a stale link lands them on
    // /dashboard. Vendors are the opposite: pin them to /dashboard/vendor so
    // they never wander into other dashboards or account pages they don't
    // own.
    if (pathname.startsWith("/dashboard")) {
      const role = token?.role as string | undefined;
      if (role === "staff") {
        return NextResponse.redirect(new URL("/admin/products", req.url));
      }
      if (role === "vendor" && !pathname.startsWith("/dashboard/vendor")) {
        return NextResponse.redirect(new URL("/dashboard/vendor", req.url));
      }
    }

    if (pathname.startsWith("/admin")) {
      const role = token?.role as string | undefined;
      const email = token?.email as string | undefined;
      const superAdmin = isSuperEmail(email);

      // SaaS-operator-only surfaces: even if a tenant admin is signed in,
      // these pages are gated. Bounce them back to /admin (their
      // hospital dashboard). Runs before the generic "admin gets
      // everything" rule below so the check actually applies.
      if (!superAdmin && SUPER_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return NextResponse.redirect(new URL("/admin", req.url));
      }

      // Admin — full access everywhere under /admin.
      if (role === "admin") return NextResponse.next();

      // Doctor — historically had /admin access for some legacy dashboards.
      // Keep that until we split them into /dashboard/doctor properly.
      if (role === "doctor") return NextResponse.next();

      // Staff — only the e-commerce modules. Landing on /admin itself bounces
      // them to the products page (the one they actually use).
      if (role === "staff") {
        if (pathname === "/admin") {
          return NextResponse.redirect(new URL("/admin/products", req.url));
        }
        if (STAFF_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL("/admin/products", req.url));
      }

      // Vendor — never allowed on /admin. Their home is /dashboard/vendor.
      if (role === "vendor") {
        return NextResponse.redirect(new URL("/dashboard/vendor", req.url));
      }

      // Anyone else (patient, unauthenticated slipping through) → login.
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/auth/login",
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*", "/admin/:path*"],
};

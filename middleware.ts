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

// Pharmacist — pharmacy-facing modules only. /admin/pharmacy is the
// role-specific landing dashboard built for pharmacists.
const PHARMACIST_ALLOWED_PREFIXES = [
  "/admin/pharmacy",
  "/admin/prescriptions",
  "/admin/dispensing",
  "/admin/pharmacy-inventory",
  "/admin/formulary",
  "/admin/hospital-rx",
  "/admin/orders",
];

// Support — customer-support surfaces only.
const SUPPORT_ALLOWED_PREFIXES = [
  "/admin/tickets",
  "/admin/feedback",
  "/admin/orders",
  "/admin/notifications",
];

// HR — hiring + people-ops.
const HR_ALLOWED_PREFIXES = [
  "/admin/careers",
  "/admin/applications",
  "/admin/staff",
  "/admin/staff-schedule",
  "/admin/roster",
  "/admin/credentialing",
  "/admin/employee-health",
];

// Admin pages that are SAAS-operator-only (marketing site CMS, platform
// leads, commerce, etc.) — tenant admins (hospital owners) must never see
// them even if they guess the URL. The sidebar hides these links, but
// middleware is the real gate. Matched by prefix so /admin/organizations/123
// is covered too.
// NOTE: /admin/appointments was previously listed here, which bounced
// every org admin off their own OPD scheduling page — see the
// reported "appointment button not working" regression. Appointments
// is a tenant-scoped hospital ops surface (hits /api/hospital/
// appointments, which is org-aware), so it must NOT be super-only.
const SUPER_ONLY_PREFIXES = [
  "/admin/doctors",
  "/admin/departments",
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
  "/admin/emergency-numbers",
  "/admin/regional-pricing",
  "/admin/fx-rates",
  "/admin/abdm",
  "/admin/doctor-invites",
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

// Marketing surfaces a logged-in user should never see. Spec: Cowork
// Build Handover Section 2 / v6.0 Section 2 — "logged-in users never
// see the home page or any marketing page". Match is by exact path or
// by direct prefix; we keep this list deliberately tight rather than
// "anything not /dashboard or /admin" because reference content like
// /doctors, /blog, /symptoms is legitimately useful post-login.
const MARKETING_PATHS = [
  "/",
  "/pricing",
  "/about",
  "/security",
  "/for-patients",
  "/for-doctors",
  "/for-corporates",
  "/signup",
  "/auth/login",
  "/auth/register",
];

function isMarketingPath(pathname: string): boolean {
  return MARKETING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Spec-locked routing rule: a logged-in user lands on /dashboard,
    // never on the home page or any marketing page — not via direct
    // URL, not via deep link, not via bookmark. Role-specific
    // dashboard routing happens inside /dashboard itself.
    if (token && isMarketingPath(pathname)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

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
      if (role === "pharmacist") {
        return NextResponse.redirect(new URL("/admin/pharmacy", req.url));
      }
      if (role === "support") {
        return NextResponse.redirect(new URL("/admin/tickets", req.url));
      }
      if (role === "hr") {
        return NextResponse.redirect(new URL("/admin/careers", req.url));
      }
      if (role === "vendor" && !pathname.startsWith("/dashboard/vendor")) {
        return NextResponse.redirect(new URL("/dashboard/vendor", req.url));
      }
    }

    if (pathname.startsWith("/admin")) {
      const role = token?.role as string | undefined;
      const email = token?.email as string | undefined;
      const superAdmin = isSuperEmail(email);

      // Admin — full access everywhere under /admin, EXCEPT SaaS-operator-
      // only surfaces (marketing CMS, platform leads, commerce catalog) which
      // even tenant admins must not see. Super-admins bypass this gate.
      // Scoped to role==="admin" so it doesn't fire for scoped roles below
      // and bounce them into a redirect loop.
      if (role === "admin") {
        if (
          !superAdmin &&
          SUPER_ONLY_PREFIXES.some(
            (p) => pathname === p || pathname.startsWith(p + "/"),
          )
        ) {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
        return NextResponse.next();
      }

      // Doctor — historically had /admin access for some legacy dashboards.
      // Keep that until we split them into /dashboard/doctor properly.
      if (role === "doctor") return NextResponse.next();

      // Scoped roles: each has a narrow allowlist. Landing on /admin itself
      // bounces them to their canonical home page. Anything outside the
      // allowlist also bounces home (never to /admin, which would loop).
      const scopedRoute = (
        home: string,
        allowed: string[],
      ): NextResponse => {
        if (pathname === "/admin" || pathname === home) {
          return pathname === home
            ? NextResponse.next()
            : NextResponse.redirect(new URL(home, req.url));
        }
        if (allowed.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
          return NextResponse.next();
        }
        return NextResponse.redirect(new URL(home, req.url));
      };

      if (role === "staff") {
        return scopedRoute("/admin/products", STAFF_ALLOWED_PREFIXES);
      }
      if (role === "pharmacist") {
        return scopedRoute("/admin/pharmacy", PHARMACIST_ALLOWED_PREFIXES);
      }
      if (role === "support") {
        return scopedRoute("/admin/tickets", SUPPORT_ALLOWED_PREFIXES);
      }
      if (role === "hr") {
        return scopedRoute("/admin/careers", HR_ALLOWED_PREFIXES);
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
      authorized: ({ token, req }) => {
        // Marketing paths must reach the middleware function for
        // unauthenticated visitors too — otherwise withAuth's gate
        // here would 302 them to /auth/login and they'd never see
        // the home page. The actual logged-in→/dashboard redirect
        // is inside the middleware function above.
        if (isMarketingPath(req.nextUrl.pathname)) return true;
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/admin/:path*",
    // Marketing paths included so the logged-in → /dashboard
    // redirect runs before the page renders.
    "/",
    "/pricing/:path*",
    "/about/:path*",
    "/security/:path*",
    "/for-patients/:path*",
    "/for-doctors/:path*",
    "/for-corporates/:path*",
    "/signup/:path*",
    "/auth/:path*",
  ],
};

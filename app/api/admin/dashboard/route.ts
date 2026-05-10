import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { countPosts } from "@/lib/blog-store";
import { listOrders } from "@/lib/orders-store";
import { listSubscribers, countSubscribers } from "@/lib/subscribers-store";
import { listComments, countComments } from "@/lib/comments-store";
import { countJsonArray } from "@/lib/persistent-array";
import { departments } from "@/lib/data";
import { getTenantContext } from "@/lib/tenant";
import { listStaff } from "@/lib/hospital/staff-store";
import { listAdmissions } from "@/lib/hospital/admissions-store";
import { listInvoices } from "@/lib/hospital/invoices-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

// Resilient wrapper: if one store throws (Postgres hiccup, missing table
// on a fresh deploy, etc.) we want the dashboard to still render the
// other tiles instead of the whole page 500'ing.
async function safe<T>(label: string, fn: () => T | Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    log.error("admin_dashboard.stat_failed", err, { stat: label });
    return fallback;
  }
}

export async function GET() {
  try {
    return await handler();
  } catch (err) {
    // Last-resort guard: make sure we always return JSON so the client
    // fetch doesn't explode with "Unexpected end of JSON input".
    log.error("admin_dashboard.handler_failed", err);
    return NextResponse.json(
      {
        stats: { posts: 0, users: 0, products: 0, doctors: 0, departments: 0, comments: 0, subscribers: 0, formResponses: 0, orders: 0, bookings: 0 },
        revenue: 0,
        subscribers: [],
        comments: [],
        recentOrders: [],
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 200 },
    );
  }
}

async function handler() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Multi-tenancy split — platform-wide counters bleed into an org
  // admin's view if we don't scope. Tenant admins (org-scoped) see
  // only their org's data; super-admin (no org context, or
  // explicitly viewing /admin without a selected org) sees the
  // platform aggregates.
  const tenant = await getTenantContext();
  const orgId = tenant.organization?.id;
  const isOrgScoped = !tenant.isSuperAdmin && !!orgId;

  if (isOrgScoped) {
    return await orgScopedHandler(orgId);
  }
  return await platformWideHandler();
}

/** Org admin sees only their hospital's data: own staff, own
 *  admissions, own invoices. No platform blog / public subscribers /
 *  marketing form submissions — those are the platform's, not theirs. */
async function orgScopedHandler(organizationId: string) {
  const [staff, admissions, invoices] = await Promise.all([
    safe("org_staff", () => listStaff({ organizationId }), []),
    safe("org_admissions", () => listAdmissions({ organizationId }), []),
    safe("org_invoices", () => listInvoices({ organizationId }), []),
  ]);

  const activeAdmissions = admissions.filter((a) => a.status === "admitted").length;
  const doctors = staff.filter((s) => s.role === "doctor").length;
  const nurses = staff.filter((s) => s.role === "nurse").length;
  const totalRevenue = invoices
    .filter((i) => i.status !== "void" && i.status !== "draft")
    .reduce((sum, i) => sum + (i.grandTotal || 0), 0);
  const outstandingBalance = invoices.reduce((sum, i) => sum + (i.balance || 0), 0);

  // Tile shape matches the platform-wide handler so the front-end
  // doesn't need to branch — it just renders whatever the API
  // returns. Non-applicable counters (posts, subscribers, comments)
  // are zeroed out and the front-end hides the cards when both
  // count + label are absent.
  return NextResponse.json({
    scope: "org",
    organizationId,
    stats: {
      // Hospital-relevant tiles
      staff: staff.length,
      doctors,
      nurses,
      activeAdmissions,
      invoices: invoices.length,
      outstandingBalance,
      // Zeroed platform-only tiles — front-end hides them when scope === "org"
      posts: 0,
      users: 0,
      products: 0,
      departments: 0,
      comments: 0,
      subscribers: 0,
      formResponses: 0,
      orders: 0,
      bookings: 0,
    },
    revenue: totalRevenue,
    subscribers: [],
    comments: [],
    recentOrders: [],
    // Org-only feed: most recent admissions + invoices for the
    // dashboard's "what's happening" pane.
    recentAdmissions: admissions.slice(0, 5),
    recentInvoices: invoices.slice(0, 5),
  });
}

/** Platform super-admin view — hydrates global stores. Same
 *  resilient counter-only approach as before so a transient store
 *  failure doesn't 500 the whole panel. */
async function platformWideHandler() {
  const [
    postCount,
    userCount,
    productCount,
    doctorCount,
    bookingCount,
    jobAppCount,
    orders,
    subscribers,
    comments,
    subscriberCount,
    commentCount,
  ] = await Promise.all([
    safe("posts", () => countPosts(), 0),
    safe("users", () => countJsonArray("users"), 0),
    safe("products", () => countJsonArray("products"), 0),
    safe("doctors", () => countJsonArray("doctors"), 0),
    safe("bookings", () => countJsonArray("bookings"), 0),
    safe("applications", () => countJsonArray("careers-applications"), 0),
    safe("orders", () => listOrders(), []),
    safe("subscribers", () => listSubscribers({ activeOnly: true, limit: 8 }), []),
    safe("comments", () => listComments({ limit: 5 }), []),
    safe("subscriberCount", () => countSubscribers(), 0),
    safe("commentCount", () => countComments(), 0),
  ]);

  const stats = {
    posts: postCount,
    users: userCount,
    products: productCount,
    doctors: doctorCount,
    departments: departments.length,
    comments: commentCount,
    subscribers: subscriberCount,
    formResponses: jobAppCount + bookingCount,
    orders: orders.length,
    bookings: bookingCount,
  };

  const revenue = orders
    .filter((o) => o.orderStatus !== "Cancelled")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return NextResponse.json({
    scope: "platform",
    stats,
    revenue,
    subscribers,
    comments,
    recentOrders: orders.slice(0, 5),
  });
}

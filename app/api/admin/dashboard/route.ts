import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { countPosts } from "@/lib/blog-store";
import { listOrders } from "@/lib/orders-store";
import { listSubscribers, countSubscribers } from "@/lib/subscribers-store";
import { listComments, countComments } from "@/lib/comments-store";
import { countJsonArray } from "@/lib/persistent-array";
import { departments } from "@/lib/data";
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

  // Previously this handler hydrated 10 full persistent-array stores just
  // to read `.length` off each — each hydrate pulls the entire JSON blob
  // out of Neon's `app_kv` table, which chews through the free-tier data
  // transfer quota in minutes. We now use `jsonb_array_length` counts for
  // the stats tiles, and only hydrate the three stores whose actual rows
  // we render (orders, subscribers, comments).
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
    stats,
    revenue,
    subscribers,
    comments,
    recentOrders: orders.slice(0, 5),
  });
}

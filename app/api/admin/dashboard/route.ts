import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPosts } from "@/lib/blog-store";
import { listUsers } from "@/lib/users-store";
import { listProducts } from "@/lib/products-store";
import { listDoctors } from "@/lib/doctors-store";
import { listOrders } from "@/lib/orders-store";
import { getBookings } from "@/lib/bookings-store";
import { getApplications } from "@/lib/careers-store";
import { listSubscribers, countSubscribers } from "@/lib/subscribers-store";
import { listComments, countComments } from "@/lib/comments-store";
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
    log.error("admin_dashboard.stat_failed", {
      stat: label,
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [posts, users, products, doctors, orders, bookings, applications, subscribers, comments, subscriberCount, commentCount] = await Promise.all([
    safe("posts", () => listPosts(), []),
    safe("users", () => listUsers(), []),
    safe("products", () => listProducts(), []),
    safe("doctors", () => listDoctors(), []),
    safe("orders", () => listOrders(), []),
    safe("bookings", () => getBookings(), []),
    safe("applications", () => getApplications(), []),
    safe("subscribers", () => listSubscribers({ activeOnly: true, limit: 8 }), []),
    safe("comments", () => listComments({ limit: 5 }), []),
    safe("subscriberCount", () => countSubscribers(), 0),
    safe("commentCount", () => countComments(), 0),
  ]);

  const stats = {
    posts: posts.length,
    users: users.length,
    products: products.length,
    doctors: doctors.length,
    departments: departments.length,
    comments: commentCount,
    subscribers: subscriberCount,
    formResponses: applications.length + bookings.length,
    orders: orders.length,
    bookings: bookings.length,
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

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

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [posts, users, products, doctors, orders, bookings, applications] = await Promise.all([
    listPosts(),
    Promise.resolve(listUsers()),
    Promise.resolve(listProducts()),
    Promise.resolve(listDoctors()),
    Promise.resolve(listOrders()),
    Promise.resolve(getBookings()),
    Promise.resolve(getApplications()),
  ]);

  const subscribers = listSubscribers({ activeOnly: true, limit: 8 });
  const comments = listComments({ limit: 5 });

  const stats = {
    posts: posts.length,
    users: users.length,
    products: products.length,
    doctors: doctors.length,
    departments: departments.length,
    comments: countComments(),
    subscribers: countSubscribers(),
    formResponses: applications.length + bookings.length,
    orders: orders.length,
    bookings: bookings.length,
  };

  // Lightweight revenue + recent orders for the dashboard
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

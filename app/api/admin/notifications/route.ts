import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listAdminNotifications,
  reloadAdminNotifications,
} from "@/lib/admin-notifications-store";

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
  await reloadAdminNotifications();
  const items = listAdminNotifications();
  const unread = items.filter((n) => !n.read).length;
  return NextResponse.json({ notifications: items, unread });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  reloadAdminNotifications,
} from "@/lib/admin-notifications-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { id?: string; all?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  await reloadAdminNotifications();
  if (body.all) {
    const count = markAllAdminNotificationsRead();
    return NextResponse.json({ ok: true, updated: count });
  }
  if (body.id) {
    const ok = markAdminNotificationRead(body.id);
    return NextResponse.json({ ok });
  }
  return NextResponse.json(
    { error: "Either { id } or { all: true } required" },
    { status: 400 }
  );
}

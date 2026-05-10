import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listAdminNotificationsForViewer,
  reloadAdminNotifications,
} from "@/lib/admin-notifications-store";
import { getTenantContext } from "@/lib/tenant";

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
  // Tenant-aware fan-out: org admins see only entries tagged with
  // their organizationId. Super-admins keep the firehose for SaaS
  // oversight. Pre-tenancy notifications without an orgId remain
  // platform-only and are hidden from org admins.
  const ctx = await getTenantContext();
  const items = listAdminNotificationsForViewer({
    isSuperAdmin: ctx.isSuperAdmin,
    organizationId: ctx.organization?.id ?? null,
  });
  const unread = items.filter((n) => !n.read).length;
  return NextResponse.json({ notifications: items, unread });
}

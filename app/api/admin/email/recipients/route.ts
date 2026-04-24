import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listUsers, type User } from "@/lib/users-store";
import { listOrders } from "@/lib/orders-store";

export const runtime = "nodejs";

// Role → audience key mapping used by the /admin/email page. Keep in sync
// with the Audience union in app/admin/email/page.tsx and app/api/admin/
// email/send/route.ts. Adding a new audience is a three-place edit:
//   1) audience union (client page)
//   2) this map (recipients API)
//   3) VALID_AUDIENCES + resolveRecipients switch (send API)
const ROLE_AUDIENCES: { key: string; role: User["role"] }[] = [
  { key: "patients", role: "patient" },
  { key: "doctors", role: "doctor" },
  { key: "staff", role: "staff" },
  { key: "vendors", role: "vendor" },
  { key: "pharmacists", role: "pharmacist" },
  { key: "support", role: "support" },
  { key: "hr", role: "hr" },
];

// Admin-only directory used by the /admin/email page to populate the
// "Send to" picker. Returns counts + preview of emails per audience so the
// admin can confirm who they're about to mail.
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const audiences: Record<string, { count: number; users: { name: string; email: string }[] }> = {};

  for (const { key, role: r } of ROLE_AUDIENCES) {
    const users = listUsers(r);
    audiences[key] = { count: users.length, users };
  }

  // Customers = anyone with an order, dedup'd by email. Includes guests who
  // don't have a user account.
  const customerEmails = new Map<string, { name: string; email: string }>();
  for (const o of listOrders()) {
    const key = o.email.toLowerCase();
    if (!customerEmails.has(key)) {
      customerEmails.set(key, { name: o.customer, email: o.email });
    }
  }
  audiences.customers = {
    count: customerEmails.size,
    users: Array.from(customerEmails.values()),
  };

  return NextResponse.json({ audiences });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listUsers } from "@/lib/users-store";
import { listOrders } from "@/lib/orders-store";

export const runtime = "nodejs";

// Admin-only directory used by the /admin/email page to populate the
// "Send to" picker. Returns counts + preview of emails per audience so the
// admin can confirm who they're about to mail.
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patients = listUsers("patient");
  const doctors = listUsers("doctor");
  const staff = listUsers("staff");

  // Customers = anyone with an order, dedup'd by email. Includes guests who
  // don't have a user account.
  const customerEmails = new Map<string, { name: string; email: string }>();
  for (const o of listOrders()) {
    const key = o.email.toLowerCase();
    if (!customerEmails.has(key)) {
      customerEmails.set(key, { name: o.customer, email: o.email });
    }
  }

  return NextResponse.json({
    audiences: {
      patients: { count: patients.length, users: patients },
      doctors: { count: doctors.length, users: doctors },
      staff: { count: staff.length, users: staff },
      customers: {
        count: customerEmails.size,
        users: Array.from(customerEmails.values()),
      },
    },
  });
}

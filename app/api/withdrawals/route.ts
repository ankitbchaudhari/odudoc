import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createWithdrawal,
  listWithdrawals,
  type WithdrawalRequest,
} from "@/lib/withdrawals-store";
import { addAdminNotification } from "@/lib/admin-notifications-store";

import { log } from "@/lib/log";
export const runtime = "nodejs";

const MAX_AMOUNT = 1_000_000; // sanity cap to reject obviously-bad inputs

// POST /api/withdrawals
// Doctor submits a new payout request. It starts in 'pending' state and must
// be approved/marked-paid by an admin before funds are released.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { email?: string; name?: string; role?: string }
    | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "doctor") {
    return NextResponse.json(
      { error: "Only doctors can request withdrawals" },
      { status: 403 }
    );
  }

  let body: {
    amount?: number;
    method?: WithdrawalRequest["method"];
    accountDetails?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const method = body.method;
  const accountDetails = (body.accountDetails || "").trim();

  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) {
    return NextResponse.json(
      { error: "Enter a valid withdrawal amount" },
      { status: 400 }
    );
  }
  if (!method || !["bank_transfer", "paypal", "stripe", "other"].includes(method)) {
    return NextResponse.json(
      { error: "Choose a payout method" },
      { status: 400 }
    );
  }
  if (!accountDetails) {
    return NextResponse.json(
      { error: "Account details are required" },
      { status: 400 }
    );
  }

  const record = createWithdrawal({
    doctorEmail: user.email.toLowerCase(),
    doctorName: user.name || user.email,
    amount: Math.round(amount * 100) / 100,
    method,
    accountDetails,
    notes: (body.notes || "").trim() || undefined,
  });

  try {
    addAdminNotification({
      type: "withdrawal_request",
      title: "New withdrawal request",
      body: `Dr. ${record.doctorName} requested $${record.amount.toLocaleString()}.`,
      link: "/admin/withdrawals",
    });
  } catch (err) {
    log.error("withdrawals.admin_notification_failed", err);
  }

  return NextResponse.json({ withdrawal: record }, { status: 201 });
}

// GET /api/withdrawals
// admin  → all requests
// doctor → just their own
// anyone else → 403
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "admin") {
    return NextResponse.json({ withdrawals: listWithdrawals() });
  }
  if (user.role === "doctor") {
    return NextResponse.json({
      withdrawals: listWithdrawals({ doctorEmail: user.email }),
    });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

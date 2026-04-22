// Doctor earnings — per-consultation ledger.
//
// GET
//   admin   → every earnings entry (optional ?doctorEmail= filter)
//   doctor  → entries keyed to the logged-in doctor's email, plus their
//             pending balance and period totals (today / week / month).
//
// PATCH (admin only) — mark one or many earnings as paid.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listEarnings,
  summarizeByDoctor,
  markManyEarningsPaid,
  getPendingBalance,
  getPeriodTotals,
} from "@/lib/doctor-earnings-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { email?: string; role?: string }
    | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "admin") {
    const doctorEmail = req.nextUrl.searchParams.get("doctorEmail") || undefined;
    return NextResponse.json({
      earnings: listEarnings({ doctorEmail }),
      summary: summarizeByDoctor(),
    });
  }

  if (user.role === "doctor") {
    const email = user.email.toLowerCase();
    return NextResponse.json({
      earnings: listEarnings({ doctorEmail: email }),
      pendingBalance: getPendingBalance(email),
      periods: getPeriodTotals(email),
    });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { ids?: string[]; withdrawalId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No earnings ids provided" }, { status: 400 });
  }

  const changed = markManyEarningsPaid(ids, body.withdrawalId);
  return NextResponse.json({ changed });
}

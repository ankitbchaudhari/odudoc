// GET /api/doctor/statements?period=month|quarter|year&year=2026&month=5&quarter=2
//
// Aggregate every invoice issued at the signed-in doctor's clinics
// over the requested period. Returns headline totals + the raw rows
// so the statement page can render both summary and detail.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/doctors-store";
import {
  listInvoicesInRange,
  statementTotals,
  reloadInvoices,
} from "@/lib/clinic-invoices-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email || user.role !== "doctor") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) return NextResponse.json({ error: "doctor_not_found" }, { status: 404 });

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") || "month") as "month" | "quarter" | "year";
  const now = new Date();
  const year = parseInt(url.searchParams.get("year") || String(now.getUTCFullYear()), 10);
  const month = parseInt(url.searchParams.get("month") || String(now.getUTCMonth() + 1), 10);
  const quarter = parseInt(url.searchParams.get("quarter") || String(Math.floor(now.getUTCMonth() / 3) + 1), 10);

  const { startIso, endIso, label } = resolveRange({ period, year, month, quarter });

  // Cross-Lambda freshness — see reloadInvoices() docstring.
  await reloadInvoices();
  const rows = listInvoicesInRange({ doctorId: doctor.id, startIso, endIso });
  const totals = statementTotals(rows);

  return NextResponse.json({
    period, year, month, quarter, label, startIso, endIso,
    totals,
    invoices: rows,
  });
}

/** Build [startIso, endIso) for the requested period. UTC throughout
 *  so a doctor in Mumbai and the API server (Vercel — usually US East)
 *  agree on which month a 23:59 IST invoice belongs to. */
function resolveRange(args: {
  period: "month" | "quarter" | "year";
  year: number;
  month: number;
  quarter: number;
}): { startIso: string; endIso: string; label: string } {
  if (args.period === "year") {
    const start = new Date(Date.UTC(args.year, 0, 1));
    const end = new Date(Date.UTC(args.year + 1, 0, 1));
    return { startIso: start.toISOString(), endIso: end.toISOString(), label: `FY ${args.year}` };
  }
  if (args.period === "quarter") {
    const q = Math.max(1, Math.min(4, args.quarter));
    const startMonth = (q - 1) * 3;
    const start = new Date(Date.UTC(args.year, startMonth, 1));
    const end = new Date(Date.UTC(args.year, startMonth + 3, 1));
    return { startIso: start.toISOString(), endIso: end.toISOString(), label: `Q${q} ${args.year}` };
  }
  // month
  const m = Math.max(1, Math.min(12, args.month));
  const start = new Date(Date.UTC(args.year, m - 1, 1));
  const end = new Date(Date.UTC(args.year, m, 1));
  const monthName = start.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return { startIso: start.toISOString(), endIso: end.toISOString(), label: `${monthName} ${args.year}` };
}

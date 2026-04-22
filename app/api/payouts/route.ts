import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listPayouts,
  markManyPaid,
  summarizeByVendor,
  type PayoutStatus,
} from "@/lib/payouts-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

// GET /api/payouts?status=pending|paid|all&vendorId=...&view=summary
//   Admin-only. `view=summary` returns per-vendor totals instead of rows.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const view = req.nextUrl.searchParams.get("view");
  if (view === "summary") {
    return NextResponse.json({ summary: summarizeByVendor() });
  }

  const status = req.nextUrl.searchParams.get("status") as PayoutStatus | "all" | null;
  const vendorId = req.nextUrl.searchParams.get("vendorId") || undefined;
  const payouts = listPayouts({ status: status || undefined, vendorId });
  return NextResponse.json({ payouts });
}

// POST /api/payouts  body: { ids: string[] }  — mark selected entries as paid
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "No ids provided" }, { status: 400 });
  }
  const changed = markManyPaid(ids);
  return NextResponse.json({ changed });
}

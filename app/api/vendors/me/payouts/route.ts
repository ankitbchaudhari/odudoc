import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorByEmail } from "@/lib/vendors-store";
import { listPayouts, reloadPayouts, type PayoutStatus } from "@/lib/payouts-store";

export const runtime = "nodejs";

// GET /api/vendors/me/payouts?status=pending|paid
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = getVendorByEmail(email);
  if (!vendor) return NextResponse.json({ error: "Not a vendor" }, { status: 404 });
  if (vendor.status !== "approved") {
    return NextResponse.json({ error: "Vendor not approved" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") as PayoutStatus | "all" | null;
  await reloadPayouts();
  const payouts = listPayouts({ vendorId: vendor.id, status: status || undefined });

  const pendingNet = payouts
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.netAmount, 0);
  const paidNet = payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.netAmount, 0);

  return NextResponse.json({
    payouts,
    pendingNet: Math.round(pendingNet * 100) / 100,
    paidNet: Math.round(paidNet * 100) / 100,
    commissionPercent: vendor.commissionPercent,
  });
}

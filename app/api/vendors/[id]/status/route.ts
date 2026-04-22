import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorById, setVendorStatus } from "@/lib/vendors-store";
import { sendVendorStatusUpdateEmail } from "@/lib/email";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// Admin-only: approve / suspend / reject a vendor.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { role?: string } | undefined) || {};
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status;
  if (!["pending", "approved", "suspended", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const prev = getVendorById(id);
  const v = setVendorStatus(id, status, typeof body.reason === "string" ? body.reason : undefined);
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Notify the vendor when the status actually changes to a meaningful state.
  if (
    prev &&
    prev.status !== v.status &&
    (v.status === "approved" || v.status === "suspended" || v.status === "rejected")
  ) {
    sendVendorStatusUpdateEmail({
      to: v.ownerEmail,
      ownerName: v.ownerName,
      vendorName: v.name,
      status: v.status,
      reason: v.statusReason,
    }).catch((err) => log.error("[vendors] status email failed:", err));
  }

  return NextResponse.json({ vendor: v });
}

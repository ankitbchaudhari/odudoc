import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorById } from "@/lib/vendors-store";
import { signUrl } from "@/lib/files-service";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// Admin-only: mint a short-lived signed URL for a vendor's uploaded license.
// GET /api/vendors/[id]/license-url
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const vendor = getVendorById(id);
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!vendor.licenseDocUrl) return NextResponse.json({ error: "No license on file" }, { status: 404 });

  try {
    const url = await signUrl("licenses", vendor.licenseDocUrl, 600);
    if (!url) return NextResponse.json({ error: "Could not sign URL" }, { status: 502 });
    return NextResponse.json({ url });
  } catch (err) {
    log.error("console.error", undefined, { args: ["[vendors] license sign failed:", err] });
    return NextResponse.json({ error: "Could not sign URL" }, { status: 502 });
  }
}

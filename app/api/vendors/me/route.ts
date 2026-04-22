import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorByEmail, updateVendor } from "@/lib/vendors-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = getVendorByEmail(user.email);
  if (!vendor) return NextResponse.json({ vendor: null });
  return NextResponse.json({ vendor });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = getVendorByEmail(user.email);
  if (!vendor) return NextResponse.json({ error: "Not a vendor" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updated = updateVendor(vendor.id, {
    name: typeof body.name === "string" ? body.name : undefined,
    ownerName: typeof body.ownerName === "string" ? body.ownerName : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    addressLine: typeof body.addressLine === "string" ? body.addressLine : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
    country: typeof body.country === "string" ? body.country : undefined,
    bankAccount: typeof body.bankAccount === "string" ? body.bankAccount : undefined,
  });
  return NextResponse.json({ vendor: updated });
}

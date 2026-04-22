import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getVendorByEmail } from "@/lib/vendors-store";
import { listOrdersByVendor, type OrderStatus } from "@/lib/orders-store";

export const runtime = "nodejs";

// GET /api/vendors/me/orders?status=Pending
//   Returns orders that contain at least one item from the signed-in vendor,
//   filtered to just that vendor's line items + per-vendor subtotal.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = getVendorByEmail(email);
  if (!vendor) return NextResponse.json({ error: "Not a vendor" }, { status: 404 });
  if (vendor.status !== "approved") {
    return NextResponse.json({ error: "Vendor not approved" }, { status: 403 });
  }

  const statusParam = req.nextUrl.searchParams.get("status") as
    | OrderStatus
    | "All"
    | null;

  const orders = listOrdersByVendor(vendor.id, {
    status: statusParam || undefined,
  });
  return NextResponse.json({ orders });
}

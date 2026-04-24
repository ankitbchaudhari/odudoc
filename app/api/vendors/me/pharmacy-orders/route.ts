// Vendor queue for pharmacy (Rx) orders.
//
// Returns orders belonging to the signed-in user's vendor. Store-scoped
// staff (cashiers pinned to one counter) only see orders for the stores
// they're assigned to.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveVendorAccess } from "@/lib/vendor-permissions";
import {
  listPharmacyOrdersByVendor,
  type PharmacyOrderStatus,
} from "@/lib/pharmacy-orders-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const access = resolveVendorAccess(email);
  if (!access) {
    return NextResponse.json(
      { error: "No active pharmacy access for this account" },
      { status: email ? 403 : 401 },
    );
  }
  const status = req.nextUrl.searchParams.get("status") as
    | PharmacyOrderStatus
    | "all"
    | null;
  let orders = listPharmacyOrdersByVendor(access.vendor.id, {
    status: status || undefined,
  });
  if (access.storeIds) {
    const allowed = new Set(access.storeIds);
    orders = orders.filter((o) => allowed.has(o.storeId));
  }
  return NextResponse.json({ orders, access: { role: access.role, storeIds: access.storeIds } });
}

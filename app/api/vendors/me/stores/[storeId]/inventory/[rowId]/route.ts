// Delete a single inventory row.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveVendorAccess } from "@/lib/vendor-permissions";
import {
  deleteInventoryRow,
  getStoreLocation,
  listInventoryByStore,
} from "@/lib/vendor-inventory-store";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { storeId: string; rowId: string } },
) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const store = getStoreLocation(params.storeId);
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  const access = resolveVendorAccess(email, store.vendorId);
  if (!access) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  if (access.storeIds && !access.storeIds.includes(params.storeId)) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }
  if (!access.canManageInventory(params.storeId)) {
    return NextResponse.json(
      { error: "Cashiers can't edit inventory" },
      { status: 403 },
    );
  }

  // Confirm the row belongs to this store.
  const row = listInventoryByStore(params.storeId).find((r) => r.id === params.rowId);
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });

  const ok = deleteInventoryRow(params.rowId);
  return NextResponse.json({ ok });
}

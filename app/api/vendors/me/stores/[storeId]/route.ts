// Per-store vendor endpoints: update & delete.
//
// Ownership check is strict — the storeId must belong to the signed-in
// vendor or we return 404 (not 403) so we don't leak that the store
// exists for a different vendor.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveVendorAccess } from "@/lib/vendor-permissions";
import {
  deleteStoreLocation,
  getStoreLocation,
  updateStoreLocation,
} from "@/lib/vendor-inventory-store";

export const runtime = "nodejs";

async function ensureOwned(storeId: string) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const store = getStoreLocation(storeId);
  if (!store) return { error: NextResponse.json({ error: "Store not found" }, { status: 404 }) };
  const access = resolveVendorAccess(email, store.vendorId);
  if (!access) {
    return { error: NextResponse.json({ error: "Store not found" }, { status: 404 }) };
  }
  // If the staff seat is store-scoped, ensure this store is in scope.
  if (access.storeIds && !access.storeIds.includes(storeId)) {
    return { error: NextResponse.json({ error: "Store not found" }, { status: 404 }) };
  }
  return { access, store };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { storeId: string } },
) {
  const r = await ensureOwned(params.storeId);
  if ("error" in r) return r.error;
  if (!r.access.canManageStores) {
    return NextResponse.json({ error: "Only owners/managers can edit stores" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  const copy = (key: string, validator: (v: unknown) => boolean) => {
    if (key in body && validator(body[key])) patch[key] = body[key];
  };
  copy("name", (v) => typeof v === "string" && !!(v as string).trim());
  copy("addressLine", (v) => typeof v === "string");
  copy("city", (v) => typeof v === "string");
  copy("pincode", (v) => typeof v === "string");
  copy("lat", (v) => typeof v === "number" && Math.abs(v as number) <= 90);
  copy("lng", (v) => typeof v === "number" && Math.abs(v as number) <= 180);
  copy("pickup", (v) => typeof v === "boolean");
  copy("delivery", (v) => typeof v === "boolean");
  copy("deliveryRadiusKm", (v) => typeof v === "number" && (v as number) >= 0);
  copy("phone", (v) => typeof v === "string");
  copy("hours", (v) => typeof v === "string");
  copy("active", (v) => typeof v === "boolean");

  const updated = updateStoreLocation(params.storeId, patch);
  return NextResponse.json({ store: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { storeId: string } },
) {
  const r = await ensureOwned(params.storeId);
  if ("error" in r) return r.error;
  if (!r.access.canManageStores) {
    return NextResponse.json({ error: "Only owners/managers can delete stores" }, { status: 403 });
  }
  const ok = deleteStoreLocation(params.storeId);
  return NextResponse.json({ ok });
}

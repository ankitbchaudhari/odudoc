// Per-store inventory list + upsert.
//
// POST handles both create and update (keyed on `id`, falls back to
// (storeId, medicineId, strength) match when id is missing — vendors
// bulk-pasting rows from a spreadsheet shouldn't have to invent ids).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveVendorAccess } from "@/lib/vendor-permissions";
import {
  getStoreLocation,
  listInventoryByStore,
  upsertInventory,
} from "@/lib/vendor-inventory-store";
import { getMedicineById } from "@/lib/medicines-catalog";

export const runtime = "nodejs";

async function ensureOwned(storeId: string) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const store = getStoreLocation(storeId);
  if (!store) return { error: NextResponse.json({ error: "Store not found" }, { status: 404 }) };
  const access = resolveVendorAccess(email, store.vendorId);
  if (!access) return { error: NextResponse.json({ error: "Store not found" }, { status: 404 }) };
  if (access.storeIds && !access.storeIds.includes(storeId)) {
    return { error: NextResponse.json({ error: "Store not found" }, { status: 404 }) };
  }
  return { access, store };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { storeId: string } },
) {
  const r = await ensureOwned(params.storeId);
  if ("error" in r) return r.error;
  return NextResponse.json({ rows: listInventoryByStore(params.storeId) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { storeId: string } },
) {
  const r = await ensureOwned(params.storeId);
  if ("error" in r) return r.error;
  if (!r.access.canManageInventory(params.storeId)) {
    return NextResponse.json(
      { error: "Cashiers can't edit inventory — ask a pharmacist or manager" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const medicineId = String(body.medicineId || "").trim().toLowerCase();
  if (!medicineId || !getMedicineById(medicineId)) {
    return NextResponse.json(
      { error: "medicineId must match a catalog entry" },
      { status: 400 },
    );
  }

  const priceInr = Number(body.priceInr);
  const stock = Number(body.stock);
  if (!Number.isFinite(priceInr) || priceInr < 0) {
    return NextResponse.json({ error: "priceInr must be non-negative" }, { status: 400 });
  }
  if (!Number.isFinite(stock) || stock < 0) {
    return NextResponse.json({ error: "stock must be non-negative" }, { status: 400 });
  }

  const row = upsertInventory({
    id: typeof body.id === "string" ? body.id : undefined,
    storeId: params.storeId,
    medicineId,
    brandLabel: typeof body.brandLabel === "string" ? body.brandLabel : undefined,
    strength: typeof body.strength === "string" ? body.strength : undefined,
    priceInr,
    unit: typeof body.unit === "string" ? body.unit : "per unit",
    stock,
    expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : undefined,
  });
  return NextResponse.json({ row });
}

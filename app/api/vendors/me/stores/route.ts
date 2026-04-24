// Vendor-scoped store locations CRUD.
//
// Each pharmacy can have multiple physical shops. These endpoints let
// the signed-in vendor list / create their own stores — they never see
// other vendors' rows.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveVendorAccess } from "@/lib/vendor-permissions";
import {
  createStoreLocation,
  listStoreLocations,
} from "@/lib/vendor-inventory-store";

export const runtime = "nodejs";

async function requireAccess() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const access = resolveVendorAccess(email);
  if (!access) {
    return {
      error: NextResponse.json(
        { error: "No active pharmacy access for this account" },
        { status: email ? 403 : 401 },
      ),
    };
  }
  return { access, vendor: access.vendor };
}

export async function GET() {
  const r = await requireAccess();
  if ("error" in r) return r.error;
  let stores = listStoreLocations({ vendorId: r.vendor.id });
  if (r.access.storeIds) {
    const allowed = new Set(r.access.storeIds);
    stores = stores.filter((s) => allowed.has(s.id));
  }
  return NextResponse.json({ stores });
}

export async function POST(req: NextRequest) {
  const r = await requireAccess();
  if ("error" in r) return r.error;
  if (!r.access.canManageStores) {
    return NextResponse.json(
      { error: "Only owners and managers can add stores" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const addressLine = String(body.addressLine || "").trim();
  const city = String(body.city || "").trim();
  const pincode = String(body.pincode || "").trim();
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!name || !addressLine || !city || !pincode) {
    return NextResponse.json(
      { error: "name, addressLine, city and pincode are required" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json(
      { error: "Valid lat/lng required (use the 'Get my coordinates' button)" },
      { status: 400 },
    );
  }

  const store = createStoreLocation({
    vendorId: r.vendor.id,
    name,
    addressLine,
    city,
    pincode,
    lat,
    lng,
    pickup: body.pickup !== false,
    delivery: !!body.delivery,
    deliveryRadiusKm:
      typeof body.deliveryRadiusKm === "number" ? body.deliveryRadiusKm : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    hours: typeof body.hours === "string" ? body.hours : undefined,
  });
  return NextResponse.json({ store }, { status: 201 });
}

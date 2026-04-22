import { NextRequest, NextResponse } from "next/server";
import { getVendorById } from "@/lib/vendors-store";
import { listProductsByVendor } from "@/lib/products-store";

export const runtime = "nodejs";

// Public — anyone can browse an approved vendor's catalog.
// GET /api/vendors/[id]/storefront
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vendor = getVendorById(id);
  if (!vendor || vendor.status !== "approved") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const products = listProductsByVendor(vendor.id).filter((p) => p.status === "Active");

  // Strip fields we don't want to leak publicly (bank account, license doc,
  // commission, private contact).
  const publicVendor = {
    id: vendor.id,
    name: vendor.name,
    city: vendor.city,
    country: vendor.country,
    approvedAt: vendor.approvedAt,
  };

  return NextResponse.json({ vendor: publicVendor, products });
}

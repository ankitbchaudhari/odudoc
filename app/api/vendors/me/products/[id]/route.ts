import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isApprovedVendor } from "@/lib/vendors-store";
import {
  getProductById,
  updateProduct,
  deleteProduct,
  PRODUCT_CATEGORIES,
} from "@/lib/products-store";

export const runtime = "nodejs";

// A vendor may only touch products where product.vendorId === vendor.id.
async function resolveOwned(id: string) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string } | undefined) || {};
  if (!user.email) return { error: "Unauthorized", status: 401 as const };
  const vendor = isApprovedVendor(user.email);
  if (!vendor) return { error: "Vendor not approved", status: 403 as const };
  const product = getProductById(id);
  if (!product) return { error: "Not found", status: 404 as const };
  if (product.vendorId !== vendor.id) return { error: "Forbidden", status: 403 as const };
  return { vendor, product };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await resolveOwned(id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ product: r.product });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await resolveOwned(id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  const body = await req.json().catch(() => ({}));

  if (body.category !== undefined && !PRODUCT_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (body.price !== undefined) {
    const p = Number(body.price);
    if (!Number.isFinite(p) || p <= 0) {
      return NextResponse.json({ error: "Valid price is required." }, { status: 400 });
    }
  }
  if (body.stock !== undefined) {
    const s = Number(body.stock);
    if (!Number.isFinite(s) || s < 0) {
      return NextResponse.json({ error: "Valid stock is required." }, { status: 400 });
    }
  }

  const patch: Parameters<typeof updateProduct>[1] = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.category === "string") patch.category = body.category;
  if (body.price !== undefined) patch.price = Number(body.price);
  if (body.originalPrice !== undefined) patch.originalPrice = Number(body.originalPrice);
  if (body.stock !== undefined) patch.stock = Number(body.stock);
  if (body.prescriptionRequired !== undefined) patch.prescriptionRequired = Boolean(body.prescriptionRequired);
  if (typeof body.imageUrl === "string") patch.imageUrl = body.imageUrl;
  if (body.status === "Draft" || body.status === "Active" || body.status === "Out of Stock") {
    patch.status = body.status;
  }

  const product = updateProduct(id, patch);
  return NextResponse.json({ product });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await resolveOwned(id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  const ok = deleteProduct(id);
  return NextResponse.json({ ok });
}

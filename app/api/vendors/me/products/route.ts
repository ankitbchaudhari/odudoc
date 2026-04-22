import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isApprovedVendor } from "@/lib/vendors-store";
import {
  createProduct,
  listProductsByVendor,
  PRODUCT_CATEGORIES,
} from "@/lib/products-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = isApprovedVendor(user.email);
  if (!vendor) return NextResponse.json({ error: "Vendor not approved yet" }, { status: 403 });
  return NextResponse.json({ products: listProductsByVendor(vendor.id) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = isApprovedVendor(user.email);
  if (!vendor) return NextResponse.json({ error: "Only approved vendors can add products." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const category = String(body.category || "");
  const price = Number(body.price);
  const stock = Number(body.stock);
  if (name.length < 2) return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  if (!PRODUCT_CATEGORIES.includes(category)) return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Valid price is required." }, { status: 400 });
  if (!Number.isFinite(stock) || stock < 0) return NextResponse.json({ error: "Valid stock count is required." }, { status: 400 });

  const product = createProduct({
    name,
    description: String(body.description || ""),
    category,
    price,
    originalPrice: Number(body.originalPrice) || price,
    stock: Math.floor(stock),
    prescriptionRequired: Boolean(body.prescriptionRequired),
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
    vendorId: vendor.id,
    vendorName: vendor.name,
  });
  return NextResponse.json({ product }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from "@/lib/products-store";

export const runtime = "nodejs";

function canManage(role: string | undefined): boolean {
  return role === "admin" || role === "staff";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = getProductById(id);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!canManage(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Parameters<typeof updateProduct>[1] = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.category === "string") patch.category = body.category;
  if (body.price !== undefined) patch.price = Number(body.price);
  if (body.originalPrice !== undefined)
    patch.originalPrice = Number(body.originalPrice);
  if (body.stock !== undefined) patch.stock = Number(body.stock);
  if (body.prescriptionRequired !== undefined)
    patch.prescriptionRequired = Boolean(body.prescriptionRequired);
  if (body.status === "Active" || body.status === "Draft" || body.status === "Out of Stock")
    patch.status = body.status;
  if (typeof body.imageUrl === "string") patch.imageUrl = body.imageUrl;

  const product = updateProduct(id, patch);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!canManage(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const ok = deleteProduct(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

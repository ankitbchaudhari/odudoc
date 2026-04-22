import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listProducts,
  createProduct,
  bulkUpdate,
  type BulkAction,
} from "@/lib/products-store";

export const runtime = "nodejs";

// Admin + staff can manage products. Everyone else only sees the public
// "active" catalog — this endpoint is also used by the shop page.
function canManage(role: string | undefined): boolean {
  return role === "admin" || role === "staff";
}

// GET /api/products?search=&category=&view=all|public
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  const search = req.nextUrl.searchParams.get("search") || undefined;
  const category = req.nextUrl.searchParams.get("category") || undefined;
  const view = req.nextUrl.searchParams.get("view"); // "all" forces admin view

  // Non-staff callers always see the public catalog regardless of ?view=all.
  const onlyActive = !(view === "all" && canManage(role));
  const products = listProducts({ search, category, onlyActive });
  return NextResponse.json({ products });
}

// POST /api/products  (admin + staff)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!canManage(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
    originalPrice?: number;
    stock?: number;
    prescriptionRequired?: boolean;
    status?: "Active" | "Draft" | "Out of Stock";
    imageUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!body.category) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Valid price required" }, { status: 400 });
  }

  const product = createProduct({
    name: body.name,
    description: body.description,
    category: body.category,
    price,
    originalPrice: body.originalPrice,
    stock: Number(body.stock) || 0,
    prescriptionRequired: body.prescriptionRequired,
    status: body.status,
    imageUrl: body.imageUrl,
  });
  return NextResponse.json({ product }, { status: 201 });
}

// PATCH /api/products — bulk actions. Body: { ids: string[], action: "delete" | "in-stock" | "out-of-stock" }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!canManage(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { ids?: string[]; action?: BulkAction };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids : [];
  const allowed: BulkAction[] = ["delete", "in-stock", "out-of-stock"];
  if (!body.action || !allowed.includes(body.action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const changed = bulkUpdate(ids, body.action);
  return NextResponse.json({ changed });
}

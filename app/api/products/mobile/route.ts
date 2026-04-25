// GET /api/products/mobile
//
// Thin mobile-friendly wrapper over lib/products-store. Public (no auth)
// — the pharmacy catalog is browsable without logging in, same as the web
// shop page. We still accept a JWT silently so future per-user pricing or
// recommendations can slot in without changing the URL shape.
//
// Query params:
//   search?    free-text (matches name + description)
//   category?  one of PRODUCT_CATEGORIES, or "All"
//   page?      1-indexed, default 1
//   pageSize?  default 24, capped at 100
//
// Response:
//   { products: Product[], page, pageSize, total, hasMore }

import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "@/lib/products-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search")?.trim() || undefined;
  const category = req.nextUrl.searchParams.get("category")?.trim() || undefined;
  const pageRaw = Number(req.nextUrl.searchParams.get("page") || "1");
  const pageSizeRaw = Number(req.nextUrl.searchParams.get("pageSize") || DEFAULT_PAGE_SIZE);

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.isFinite(pageSizeRaw) ? Math.floor(pageSizeRaw) : DEFAULT_PAGE_SIZE)
  );

  // Mobile callers always see the public "active" catalog — there's no
  // admin mode here, unlike /api/products which role-gates ?view=all.
  const all = listProducts({ search, category, onlyActive: true });

  const total = all.length;
  const start = (page - 1) * pageSize;
  const products = all.slice(start, start + pageSize);
  const hasMore = start + products.length < total;

  return NextResponse.json({ products, page, pageSize, total, hasMore });
}

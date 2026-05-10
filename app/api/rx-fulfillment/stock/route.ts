// Pharmacy stock — list + bulk upsert. Used by the pharmacy ops UI
// to load + edit their inventory in one screen, plus a seed
// endpoint that drops a small demo dataset for first-run.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listStockForPharmacy,
  listAllPharmacies,
  upsertStock,
  deleteStock,
  seedDemoStock,
  type UpsertStockInput,
} from "@/lib/rx-fulfillment/pharmacy-stock-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const pharmacyId = url.searchParams.get("pharmacyId");
  if (pharmacyId) {
    return NextResponse.json({ stock: listStockForPharmacy(pharmacyId) });
  }
  return NextResponse.json({ pharmacies: listAllPharmacies() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  if (body.action === "seed_demo") {
    const result = seedDemoStock();
    try { await awaitAllFlushesStrict(); } catch { /* ignore */ }
    return NextResponse.json(result);
  }
  if (body.action === "delete") {
    const ok = deleteStock(String(body.id));
    if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* ignore */ }
    return NextResponse.json({ ok: true });
  }
  // Default: bulk upsert
  const items: UpsertStockInput[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return NextResponse.json({ error: "no_items" }, { status: 400 });
  const out = items.map((i) => upsertStock(i));
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ stock: out });
}

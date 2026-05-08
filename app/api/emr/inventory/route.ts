// Inventory list + create.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveClinic } from "@/lib/emr-store";
import {
  createInventoryItem,
  listInventory,
  summariseInventory,
  type StockScope,
} from "@/lib/inventory-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const VALID_SCOPES: StockScope[] = ["pharmacy", "laboratory", "biomedical", "ward", "general"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const scope = (sp.get("scope") || undefined) as StockScope | "All" | undefined;
  const search = sp.get("search") || undefined;
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const items = await listInventory({ doctorEmail: ownerEmail, scope, search });
  const summary = await summariseInventory(ownerEmail);
  return NextResponse.json({ items, summary });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (clinic.role === "lab_tech") {
    return NextResponse.json({ error: "Your role can't add inventory." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const scope = body.scope as StockScope | undefined;
  if (!scope || !VALID_SCOPES.includes(scope)) {
    return NextResponse.json({ error: `scope must be one of ${VALID_SCOPES.join(", ")}` }, { status: 400 });
  }
  if (!body.sku || !body.name) {
    return NextResponse.json({ error: "sku and name are required" }, { status: 400 });
  }

  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const row = await createInventoryItem({
    doctorEmail: ownerEmail,
    scope,
    sku: String(body.sku),
    name: String(body.name),
    category: body.category as string | undefined,
    medicineId: body.medicineId as string | undefined,
    unit: body.unit as string | undefined,
    unitCost: typeof body.unitCost === "number" ? body.unitCost : undefined,
    unitCurrency: body.unitCurrency as string | undefined,
    qty: typeof body.qty === "number" ? body.qty : 0,
    reorderAt: typeof body.reorderAt === "number" ? body.reorderAt : undefined,
    expiry: body.expiry as string | undefined,
    supplierName: body.supplierName as string | undefined,
    notes: body.notes as string | undefined,
  });

  try { await awaitAllFlushesStrict(); } catch (err) {
    log.error("emr.inventory.persist_failed", err);
    return NextResponse.json({ error: "Saved temporarily but failed to persist." }, { status: 500 });
  }
  return NextResponse.json({ item: row }, { status: 201 });
}

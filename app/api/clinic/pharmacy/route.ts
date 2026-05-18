// GET  /api/clinic/pharmacy             — list stock items for this clinic
// POST /api/clinic/pharmacy             — create a new stock item (manager)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClinicSession } from "@/lib/clinic-session";
import {
  createStockItem,
  listLowStock,
  listStockByClinic,
  reloadClinicPharmacy,
} from "@/lib/clinic-pharmacy-stock-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  generic: z.string().trim().max(200).optional(),
  strength: z.string().trim().max(40).optional(),
  form: z.string().trim().max(40).optional(),
  unit: z.string().trim().min(1).max(20),
  quantityOnHand: z.number().int().min(0).max(1_000_000),
  reorderLevel: z.number().int().min(0).max(1_000_000).optional(),
  unitPriceRupees: z.number().nonnegative().max(1_000_000),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  batchNumber: z.string().trim().max(80).optional(),
});

export async function GET(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  await reloadClinicPharmacy();
  return NextResponse.json({
    items: listStockByClinic(session.clinicId, { activeOnly: true }),
    lowStock: listLowStock(session.clinicId),
  });
}

export async function POST(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  // Stock creation is manager-only — same gate as invoices. Receptionists
  // can dispense but not add new SKUs / change prices.
  if (session.role !== "manager") {
    return NextResponse.json(
      { error: "Only managers can add stock items." },
      { status: 403 },
    );
  }
  const parsed = await parseJson(req, CreateSchema);
  if (!parsed.ok) return parsed.response;
  await reloadClinicPharmacy();
  const item = createStockItem({ ...parsed.data, clinicId: session.clinicId });
  return NextResponse.json({ item }, { status: 201 });
}

// PATCH /api/clinic/pharmacy/[id]  — edit stock item (manager)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClinicSession } from "@/lib/clinic-session";
import { reloadClinicPharmacy, updateStockItem } from "@/lib/clinic-pharmacy-stock-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  generic: z.string().trim().max(200).optional(),
  strength: z.string().trim().max(40).optional(),
  form: z.string().trim().max(40).optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  quantityOnHand: z.number().int().min(0).max(1_000_000).optional(),
  reorderLevel: z.number().int().min(0).max(1_000_000).optional(),
  unitPriceRupees: z.number().nonnegative().max(1_000_000).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  batchNumber: z.string().trim().max(80).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  if (session.role !== "manager") {
    return NextResponse.json({ error: "Only managers can edit stock." }, { status: 403 });
  }
  const parsed = await parseJson(req, PatchSchema);
  if (!parsed.ok) return parsed.response;
  await reloadClinicPharmacy();
  const it = updateStockItem(params.id, session.clinicId, parsed.data);
  if (!it) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ item: it });
}

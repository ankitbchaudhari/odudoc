// POST /api/clinic/pharmacy/dispense
//
// Hand a stock item to the patient. Decrements quantityOnHand and
// emits a dispense ledger row. Receptionist + above (everyone with
// a clinic session) can dispense — front desk is the role that
// actually hands the medicine over at checkout.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClinicSession } from "@/lib/clinic-session";
import { dispenseStock, reloadClinicPharmacy } from "@/lib/clinic-pharmacy-stock-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";

const DispenseSchema = z.object({
  stockItemId: z.string().regex(/^CST-PH-\d+$/),
  patientName: z.string().trim().min(1).max(120),
  patientPhone: z.string().trim().max(32).optional(),
  quantity: z.number().int().min(1).max(10_000),
  bookingId: z.string().regex(/^BK-\d+$/).optional(),
  invoiceId: z.string().regex(/^INV-\d+$/).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  const parsed = await parseJson(req, DispenseSchema);
  if (!parsed.ok) return parsed.response;
  await reloadClinicPharmacy();
  const result = dispenseStock({
    ...parsed.data,
    clinicId: session.clinicId,
    dispensedByStaffId: session.staffId,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ entry: result.entry, item: result.item }, { status: 201 });
}

// GET  /api/clinic/empanelments        — list this clinic's TPA empanelments
// POST /api/clinic/empanelments        — upsert (manager-only)

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClinicSession } from "@/lib/clinic-session";
import {
  listEmpanelmentsForClinic,
  reloadClinicEmpanelments,
  upsertClinicEmpanelment,
} from "@/lib/insurance/clinic-empanelment-store";
import { TPA_REGISTRY } from "@/lib/insurance/tpa-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UpsertSchema = z.object({
  tpaId: z.string().trim().min(1).max(64),
  discountPct: z.number().min(0).max(100).optional(),
  portalUrl: z.string().trim().url().max(500).optional(),
  contactPerson: z.string().trim().max(120).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactEmail: z.string().trim().email().max(200).optional(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(1000).optional(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  await reloadClinicEmpanelments();
  return NextResponse.json({
    empanelments: listEmpanelmentsForClinic(session.clinicId),
    // Hand back the TPA directory so the UI can render labels +
    // populate the picker without a second roundtrip.
    tpas: TPA_REGISTRY,
  });
}

export async function POST(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  // Empanelment is a money + compliance touchpoint — only managers
  // can add or edit. Receptionists and assistants read-only.
  if (session.role !== "manager") {
    return NextResponse.json(
      { error: "Only managers can add or edit TPA empanelments." },
      { status: 403 },
    );
  }
  const parsed = await parseJson(req, UpsertSchema);
  if (!parsed.ok) return parsed.response;
  await reloadClinicEmpanelments();
  try {
    const row = upsertClinicEmpanelment({ ...parsed.data, clinicId: session.clinicId });
    return NextResponse.json({ empanelment: row }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "save_failed";
    if (msg === "unknown_tpa") {
      return NextResponse.json({ error: "Unknown TPA / insurer." }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

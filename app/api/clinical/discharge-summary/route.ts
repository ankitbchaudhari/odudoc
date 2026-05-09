// Discharge-summary synthesis endpoint.
//
// POST a structured DischargeInput → returns { structured, markdown, html }.
// Pure pass-through to the synthesizer; no persistence here. Hospitals
// that want to save the generated summary back into the encounter
// record should POST the result to /api/hospital/encounters/[id] in
// a follow-on call.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  synthesizeDischargeSummary,
  type DischargeInput,
} from "@/lib/clinical-ai/discharge-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireOrg();
    const body = (await req.json()) as DischargeInput;
    if (!body || !body.patient?.name || !Array.isArray(body.diagnoses) || body.diagnoses.length === 0) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const out = synthesizeDischargeSummary({
      ...body,
      dischargeMedications: Array.isArray(body.dischargeMedications)
        ? body.dischargeMedications
        : [],
    });
    return NextResponse.json(out);
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

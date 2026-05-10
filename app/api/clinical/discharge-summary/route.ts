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
import { autoRegisterDischargeSummary } from "@/lib/clinical-ai/discharge-to-abdm";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = (await req.json()) as DischargeInput & {
      patientUserId?: string;
      autoRegisterAbdm?: boolean;
    };
    if (!body || !body.patient?.name || !Array.isArray(body.diagnoses) || body.diagnoses.length === 0) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const out = synthesizeDischargeSummary({
      ...body,
      dischargeMedications: Array.isArray(body.dischargeMedications)
        ? body.dischargeMedications
        : [],
    });

    // Polish hook: when caller flags `autoRegisterAbdm` AND the
    // patient has a linked ABHA, register the discharge summary as
    // a discoverable care context. The summary id is derived from
    // a stable hash of patient+admission+discharge so re-running the
    // same encounter doesn't duplicate.
    let abdmRegistration: Awaited<ReturnType<typeof autoRegisterDischargeSummary>> | null = null;
    if (body.autoRegisterAbdm && body.patientUserId) {
      const summaryId = crypto
        .createHash("sha256")
        .update(`${body.patientUserId}|${body.admissionDate || ""}|${body.dischargeDate || ""}|${out.structured.primaryIcd10 || ""}`)
        .digest("hex")
        .slice(0, 32);
      abdmRegistration = await autoRegisterDischargeSummary({
        organizationId: orgId,
        patientUserId: body.patientUserId,
        summaryId,
        patientName: body.patient.name,
        dischargeDate: body.dischargeDate,
        organizationName: body.organization?.name,
      });
    }

    return NextResponse.json({ ...out, abdmRegistration });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

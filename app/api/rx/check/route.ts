// Rx safety check.
//
// POST body: {
//   patientId?: string,                           // optional — pulls stored context
//   newDrugs: Array<{ name: string, strength?: string }>,
//   contextOverride?: PatientSafetyContext fields // for one-off checks
// }
//
// Returns the structured warning list. The engine is pure — this
// route only resolves patient context from the safety store, then
// hands off to checkRxSafety.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import { checkRxSafety } from "@/lib/drug-safety/check";
import { getContext } from "@/lib/drug-safety/patient-context-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    const newDrugs = Array.isArray(body.newDrugs) ? body.newDrugs : [];
    if (newDrugs.length === 0) {
      return NextResponse.json({ error: "no_drugs" }, { status: 400 });
    }

    let context = body.patientId
      ? getContext(orgId, String(body.patientId))
      : null;
    if (body.contextOverride) {
      // Merge override on top of stored context — lets the demo page
      // pass allergies + conditions inline without first persisting.
      context = {
        id: context?.id || "ephemeral",
        organizationId: orgId,
        patientId: body.patientId || "ephemeral",
        allergies: body.contextOverride.allergies || context?.allergies || [],
        currentMeds: body.contextOverride.currentMeds || context?.currentMeds || [],
        dateOfBirth: body.contextOverride.dateOfBirth ?? context?.dateOfBirth,
        weightKg: body.contextOverride.weightKg ?? context?.weightKg,
        egfr: body.contextOverride.egfr ?? context?.egfr,
        pregnancyStatus: body.contextOverride.pregnancyStatus ?? context?.pregnancyStatus,
        pregnancyTrimester: body.contextOverride.pregnancyTrimester ?? context?.pregnancyTrimester,
        updatedAt: new Date().toISOString(),
      };
    }

    const result = checkRxSafety({
      newDrugs,
      context: context
        ? {
            dateOfBirth: context.dateOfBirth,
            weightKg: context.weightKg,
            egfr: context.egfr,
            pregnancyStatus: context.pregnancyStatus,
            pregnancyTrimester: context.pregnancyTrimester,
            allergies: context.allergies,
            currentMeds: context.currentMeds,
          }
        : undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

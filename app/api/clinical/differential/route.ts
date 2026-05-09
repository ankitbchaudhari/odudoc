// Differential diagnosis ranking endpoint.
//
// POST body: {
//   chiefComplaint: string,
//   modifiers?: string[],
//   vitals?: { systolic, diastolic, hr, rr, spo2, tempC },
//   ageYears?: number,
//   sex?: "male" | "female" | "other"
// }

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import { rankDifferential } from "@/lib/clinical-ai/differential";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await requireOrg();
    const body = await req.json();
    if (!body.chiefComplaint || typeof body.chiefComplaint !== "string") {
      return NextResponse.json({ error: "missing_chief_complaint" }, { status: 400 });
    }
    const result = rankDifferential({
      chiefComplaint: String(body.chiefComplaint),
      modifiers: Array.isArray(body.modifiers) ? body.modifiers : [],
      vitals: body.vitals || undefined,
      ageYears: typeof body.ageYears === "number" ? body.ageYears : undefined,
      sex: body.sex,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

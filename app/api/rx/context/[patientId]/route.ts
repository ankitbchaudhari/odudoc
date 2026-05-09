// Read / write a patient's safety context.
//
// GET   → current context for the patient (null if none)
// POST  → upsert context (allergies, current meds, eGFR, pregnancy)

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  getContext,
  upsertContext,
} from "@/lib/drug-safety/patient-context-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ patientId: string }> }

export async function GET(_req: NextRequest, ctxParam: RouteCtx) {
  try {
    const { orgId } = await requireOrg();
    const { patientId } = await ctxParam.params;
    const ctx = getContext(orgId, patientId);
    return NextResponse.json({ context: ctx });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(req: NextRequest, ctxParam: RouteCtx) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (
      !ctx.isSuperAdmin &&
      ctx.membership &&
      !["owner", "admin", "doctor", "nurse"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { patientId } = await ctxParam.params;
    const body = await req.json();
    const session = await getServerSession(authOptions);
    const updated = upsertContext({
      organizationId: orgId,
      patientId,
      dateOfBirth: body.dateOfBirth,
      weightKg: typeof body.weightKg === "number" ? body.weightKg : undefined,
      egfr: typeof body.egfr === "number" ? body.egfr : undefined,
      pregnancyStatus: body.pregnancyStatus,
      pregnancyTrimester: body.pregnancyTrimester,
      allergies: Array.isArray(body.allergies) ? body.allergies : undefined,
      currentMeds: Array.isArray(body.currentMeds) ? body.currentMeds : undefined,
      updatedByEmail: session?.user?.email || undefined,
    });
    try {
      await awaitAllFlushesStrict();
    } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ context: updated });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

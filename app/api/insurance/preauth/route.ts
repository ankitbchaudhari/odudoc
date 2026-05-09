// Pre-auth: list (org / patient) + create.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  createPreauth,
  listPreauthsForOrg,
  listPreauthsForUser,
} from "@/lib/insurance/preauth-store";
import { findProcedure, estimateCoverage } from "@/lib/insurance/policy-engine";
import { getPolicy, getEmpanelment, getTpa } from "@/lib/insurance/tpa-store";
import { findUserById } from "@/lib/users-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "org";
  if (view === "patient") {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    return NextResponse.json({ preauths: listPreauthsForUser(userId) });
  }
  try {
    const { orgId } = await requireOrg();
    return NextResponse.json({ preauths: listPreauthsForOrg(orgId) });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (
      !ctx.isSuperAdmin &&
      ctx.membership &&
      !["owner", "admin", "doctor", "nurse", "receptionist", "accountant"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const patientUserId = String(body.patientUserId || "").trim();
    const policyId = String(body.policyId || "").trim();
    const procedureCode = String(body.procedureCode || "").trim();
    if (!patientUserId || !policyId || !procedureCode) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const u = findUserById(patientUserId);
    if (!u) return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
    const policy = getPolicy(policyId, patientUserId);
    if (!policy) return NextResponse.json({ error: "policy_not_owned" }, { status: 403 });
    const proc = findProcedure(procedureCode);
    if (!proc) return NextResponse.json({ error: "unknown_procedure" }, { status: 400 });
    const tpa = getTpa(policy.tpaId);
    if (!tpa) return NextResponse.json({ error: "unknown_tpa" }, { status: 400 });
    const emp = getEmpanelment(orgId, policy.tpaId);
    const estimate = estimateCoverage({
      procedureCode,
      sumInsuredRupees: policy.sumInsuredRupees ?? 500000,
      empanelmentDiscountPct: emp?.discountPct,
      roomCategory: body.roomCategory,
      preExisting: Boolean(body.preExisting),
      policyAgeMonths: typeof body.policyAgeMonths === "number" ? body.policyAgeMonths : 12,
      coPayPct: typeof body.coPayPct === "number" ? body.coPayPct : undefined,
    });
    if (!estimate) return NextResponse.json({ error: "estimate_failed" }, { status: 500 });
    const p = createPreauth({
      organizationId: orgId,
      patientUserId,
      dependentId: body.dependentId,
      patientName: u.name,
      tpaId: policy.tpaId,
      policyId: policy.id,
      memberId: policy.memberId,
      procedureCode,
      procedureName: proc.name,
      icd10: proc.icd10,
      proposedAdmissionDate: body.proposedAdmissionDate,
      estimateRupees: {
        gross: estimate.grossRupees,
        net: estimate.netRupees,
        insurerPays: estimate.insurerPaysRupees,
        patientPays: estimate.patientPaysRupees,
      },
      doctorName: body.doctorName,
      clinicalNotes: body.clinicalNotes,
      filedByEmail: session?.user?.email || undefined,
    });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ preauth: p, estimate });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

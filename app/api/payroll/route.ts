// Payroll configuration & run-the-month calculation API (Spec §15).

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listSalaryConfigs,
  upsertSalaryConfig,
  deleteSalaryConfig,
  calculatePayslip,
  type CalcContext,
  type SalaryModel,
} from "@/lib/payroll-store";
import { listEncounters } from "@/lib/encounters-store";
import { listMemberships } from "@/lib/memberships-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handle(e: unknown) {
  if (e instanceof TenantError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "internal" }, { status: 500 });
}

function buildContext(orgId: string, month: string): CalcContext {
  // month = "2026-05" → match encounters whose startedAt begins with it.
  const encs = listEncounters({ organizationId: orgId, status: "open" })
    .concat(listEncounters({ organizationId: orgId, status: "closed" }))
    .filter((e) => e.startedAt.startsWith(month));
  const patientCountByMembership = new Map<string, number>();
  const visitCountByMembership = new Map<string, number>();
  const memberships = listMemberships().filter((m) => m.organizationId === orgId);
  // Match encounter.doctorName → membership.title (loose match for v1).
  for (const enc of encs) {
    if (!enc.doctorName) continue;
    const m = memberships.find(
      (m) => (m.title ?? "").trim().toLowerCase() === enc.doctorName!.trim().toLowerCase()
    );
    if (!m) continue;
    patientCountByMembership.set(m.id, (patientCountByMembership.get(m.id) ?? 0) + 1);
    visitCountByMembership.set(m.id, (visitCountByMembership.get(m.id) ?? 0) + 1);
  }
  return { patientCountByMembership, visitCountByMembership };
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { searchParams } = new URL(req.url);
    const run = searchParams.get("run");
    const configs = listSalaryConfigs(orgId);
    if (!run) {
      return NextResponse.json({ configs });
    }
    // run=YYYY-MM → compute payslips for that month
    const month = run;
    const ctx = buildContext(orgId, month);
    const payslips = configs.filter((c) => c.active).map((c) => calculatePayslip(c, ctx));
    const totals = payslips.reduce(
      (acc, p) => {
        acc.gross += p.gross;
        acc.tax += p.tax;
        acc.net += p.net;
        return acc;
      },
      { gross: 0, tax: 0, net: 0 }
    );
    return NextResponse.json({ configs, payslips, totals, month });
  } catch (e) {
    return handle(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    if (!body.membershipId || !body.staffName || !body.role || !body.model) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const saved = await upsertSalaryConfig({
      organizationId: orgId,
      membershipId: String(body.membershipId),
      staffName: String(body.staffName),
      role: String(body.role),
      model: body.model as SalaryModel,
      baseMonthly: body.baseMonthly != null ? Number(body.baseMonthly) : undefined,
      perPatientRate: body.perPatientRate != null ? Number(body.perPatientRate) : undefined,
      hybridThreshold: body.hybridThreshold != null ? Number(body.hybridThreshold) : undefined,
      perVisitRate: body.perVisitRate != null ? Number(body.perVisitRate) : undefined,
      sharePercent: body.sharePercent != null ? Number(body.sharePercent) : undefined,
      taxPercent: body.taxPercent != null ? Number(body.taxPercent) : undefined,
      currency: body.currency ? String(body.currency) : undefined,
      active: body.active,
    });
    return NextResponse.json({ config: saved });
  } catch (e) {
    return handle(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = await deleteSalaryConfig(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) {
    return handle(e);
  }
}

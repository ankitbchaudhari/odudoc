// Hospital consumables — staff log usage against a patient's
// admission, billing rolls up at discharge.
//
// GET ?admissionId=&orgId= → list + summary
// POST → log a usage row (staff-only)
// DELETE ?id=&orgId= → remove an unbilled row

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  deleteUsage, listUsageForAdmission, logUsage,
  SEED_SKUS, summarizeForAdmission,
} from "@/lib/hospital/consumables-store";
import { getAdmissionById } from "@/lib/hospital/admissions-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function staffish(role: string | undefined): boolean {
  return role === "admin" || role === "staff" || role === "doctor" || role === "pharmacist";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!staffish(role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const admissionId = url.searchParams.get("admissionId");
  if (!orgId || !admissionId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  return NextResponse.json({
    catalogue: SEED_SKUS,
    usage: listUsageForAdmission(admissionId, orgId),
    summary: summarizeForAdmission(admissionId, orgId),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!staffish(role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!body.organizationId || !body.admissionId || !body.skuId || !body.quantity) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const adm = getAdmissionById(String(body.admissionId), String(body.organizationId));
  if (!adm) return NextResponse.json({ error: "admission_not_found" }, { status: 404 });
  const result = logUsage({
    organizationId: String(body.organizationId),
    admissionId: String(body.admissionId),
    patientId: adm.patientId,
    skuId: String(body.skuId),
    quantity: Number(body.quantity),
    unitPriceOverrideRupees: body.unitPriceOverrideRupees !== undefined ? Number(body.unitPriceOverrideRupees) : undefined,
    context: body.context,
    loggedByEmail: session?.user?.email || undefined,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ entry: result.entry });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!staffish(role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const orgId = url.searchParams.get("orgId");
  if (!id || !orgId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const ok = deleteUsage(id, orgId);
  if (!ok) return NextResponse.json({ error: "not_found_or_billed" }, { status: 400 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}

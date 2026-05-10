// Care-context registry — list (org or patient) + register.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listContextsForOrg,
  listContextsForAbha,
  registerContext,
  transitionContext,
  type CareContextType,
} from "@/lib/abdm/care-context-store";
import { findActiveLink } from "@/lib/abdm/abha-store";
import { registerCareContext } from "@/lib/abdm/mock-nha";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES: CareContextType[] = [
  "OPDConsultation", "DischargeSummary", "Prescription",
  "DiagnosticReport", "ImmunizationRecord", "WellnessRecord",
  "HealthDocumentRecord",
];

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("scope") === "patient") {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    const link = findActiveLink(userId);
    if (!link) return NextResponse.json({ contexts: [] });
    return NextResponse.json({ contexts: listContextsForAbha(link.abhaNumber) });
  }
  try {
    const { orgId } = await requireOrg();
    return NextResponse.json({ contexts: listContextsForOrg(orgId) });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin", "doctor", "nurse", "receptionist"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    if (body.action === "register" || body.action === "withdraw") {
      const id = String(body.id || "");
      if (body.action === "register") {
        const r = await registerCareContext({
          abhaNumber: body.abhaNumber || "",
          patientId: body.patientUserId || "",
          type: body.type || "",
          display: body.display || "",
        });
        const updated = transitionContext(id, "registered", r.nhaContextId);
        if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
        try { await awaitAllFlushesStrict(); } catch { /* ignore */ }
        return NextResponse.json({ context: updated });
      }
      const updated = transitionContext(id, "withdrawn");
      if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
      try { await awaitAllFlushesStrict(); } catch { /* ignore */ }
      return NextResponse.json({ context: updated });
    }
    // Default: create a draft context.
    const type = body.type as CareContextType;
    if (!ALLOWED_TYPES.includes(type)) return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    const abhaNumber = String(body.abhaNumber || "").trim();
    const patientUserId = String(body.patientUserId || "").trim();
    const display = String(body.display || "").trim();
    const internalRef = String(body.internalRef || "").trim();
    if (!abhaNumber || !patientUserId || !display || !internalRef) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const c = registerContext({
      organizationId: orgId,
      abhaNumber, patientUserId, type,
      display, internalRef,
      recordDate: body.recordDate,
      status: "draft",
    });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ context: c });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

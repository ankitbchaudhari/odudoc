// Pre-auth: read + state transitions.
// PATCH body: { action: "submit" | "decide" | "cancel" | "doc",
//               docName?, attached?,
//               decision?, approvedAmountRupees?, tpaReference?, tpaNote? }

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  getPreauth,
  setDocumentAttached,
  submitPreauth,
  decidePreauth,
  cancelPreauth,
} from "@/lib/insurance/preauth-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { findUserById } from "@/lib/users-store";
import { getOrganizationById } from "@/lib/organizations-store";
import { sendInsurancePreauthViaSentDm } from "@/lib/sent-dm";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctxParam: RouteCtx) {
  const { id } = await ctxParam.params;
  const p = getPreauth(id);
  if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ preauth: p });
}

export async function PATCH(req: NextRequest, ctxParam: RouteCtx) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (
      !ctx.isSuperAdmin &&
      ctx.membership &&
      !["owner", "admin", "doctor", "nurse", "receptionist", "accountant"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { id } = await ctxParam.params;
    const existing = getPreauth(id);
    if (!existing || existing.organizationId !== orgId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = await req.json();
    const action = String(body.action || "");
    let updated = existing;
    if (action === "doc") {
      const docName = String(body.docName || "").trim();
      const attached = Boolean(body.attached);
      const r = setDocumentAttached(id, docName, attached);
      if (!r) return NextResponse.json({ error: "doc_not_found" }, { status: 404 });
      updated = r;
    } else if (action === "submit") {
      const r = submitPreauth(id);
      if (!r) return NextResponse.json({ error: "invalid_state" }, { status: 409 });
      updated = r;
    } else if (action === "decide") {
      const decision = body.decision;
      if (!["approved", "approved_with_query", "rejected"].includes(decision)) {
        return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
      }
      const r = decidePreauth(
        id,
        decision,
        typeof body.approvedAmountRupees === "number" ? body.approvedAmountRupees : undefined,
        body.tpaReference,
        body.tpaNote,
      );
      if (!r) return NextResponse.json({ error: "invalid_state" }, { status: 409 });
      updated = r;
      // Best-effort WhatsApp notice to the patient on a TPA decision.
      const patient = findUserById(r.patientUserId);
      if (patient?.phone) {
        const orgName = getOrganizationById(r.organizationId)?.name || "the hospital";
        const ctx =
          decision === "approved"
            ? "Cashless approved. Bring your policy card on admission."
            : decision === "approved_with_query"
              ? "Approved with queries — we'll contact you shortly with next steps."
              : "Pre-auth was not approved. We'll contact you shortly with next steps.";
        (async () => {
          try {
            const res = await sendInsurancePreauthViaSentDm(patient.phone!, {
              patientName: r.patientName || patient.name || "there",
              procedure: r.procedureName,
              hospital: orgName,
              status: decision,
              context: ctx,
            });
            if (!res.ok) log.warn("insurance.preauth_wa_template_failed", { error: res.error || "unknown" });
          } catch (err) {
            log.warn("insurance.preauth_wa_template_threw", { error: err instanceof Error ? err.message : "send threw" });
          }
        })();
      }
    } else if (action === "cancel") {
      const r = cancelPreauth(id);
      if (!r) return NextResponse.json({ error: "invalid_state" }, { status: 409 });
      updated = r;
    } else {
      return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ preauth: updated });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

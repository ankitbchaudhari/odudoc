// List + send for the active org.
//
// GET → conversations for the active org
// POST → templated outbound to a patient (admin / staff console)

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listConversationsForOrg,
  ensureConversation,
} from "@/lib/whatsapp/conversations-store";
import { sendTemplated } from "@/lib/whatsapp/dispatcher";
import { listTemplates, TEMPLATES } from "@/lib/whatsapp/templates";
import { findUserById } from "@/lib/users-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    const conversations = listConversationsForOrg(orgId);
    return NextResponse.json({
      conversations,
      templates: listTemplates(),
    });
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
      !["owner", "admin", "doctor", "nurse", "receptionist"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const patientUserId = String(body.patientUserId || "").trim();
    const templateName = String(body.templateName || "").trim();
    const vars = body.vars || {};
    if (!patientUserId || !templateName) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const tmpl = TEMPLATES[templateName];
    if (!tmpl) return NextResponse.json({ error: "unknown_template" }, { status: 400 });
    const u = findUserById(patientUserId);
    if (!u) return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
    if (!u.phone) return NextResponse.json({ error: "patient_has_no_phone" }, { status: 400 });

    // Pre-create the conversation so the staff inbox has a row even
    // if the dispatcher returns skipped_provider in sandbox.
    ensureConversation({
      patientUserId,
      organizationId: orgId,
      patientPhone: u.phone,
      patientName: u.name,
    });

    const result = await sendTemplated({
      patientUserId,
      organizationId: orgId,
      patientName: u.name,
      patientPhone: u.phone,
      templateName,
      vars,
    });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

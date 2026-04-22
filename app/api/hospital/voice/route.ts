import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  getNoteById,
  synthesizeSummary,
  type VoiceStatus,
  type VoiceKind,
  type VoiceEntityType,
} from "@/lib/hospital/voice-store";

import { parseJson, z } from "@/lib/validate";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleError(e: unknown) {
  if (e instanceof TenantError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  return NextResponse.json({ error: "internal" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { searchParams } = new URL(req.url);
    return NextResponse.json({
      notes: listNotes({
        organizationId: orgId,
        patientId: searchParams.get("patientId") || undefined,
        entityType:
          (searchParams.get("entityType") as VoiceEntityType) || undefined,
        entityId: searchParams.get("entityId") || undefined,
        kind: (searchParams.get("kind") as VoiceKind) || undefined,
        status: (searchParams.get("status") as VoiceStatus) || undefined,
        search: searchParams.get("search") || undefined,
      }),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "voice", module: "voice" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    const n = createNote(orgId, body);
    return NextResponse.json({ note: n });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "voice", module: "voice" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    // Virtual action: synthesize summary from transcript
    if (body.action === "summarize") {
      const existing = getNoteById(String(body.id), orgId);
      if (!existing)
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      if (!existing.transcript?.trim()) {
        return NextResponse.json(
          { error: "no_transcript" },
          { status: 400 }
        );
      }
      const summary = synthesizeSummary(existing.transcript, existing.kind);
      const updated = updateNote(String(body.id), orgId, { summary });
      return NextResponse.json({ note: updated });
    }

    const n = updateNote(String(body.id), orgId, body);
    if (!n) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ note: n });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "voice", module: "voice" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = deleteNote(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) {
    return handleError(e);
  }
}

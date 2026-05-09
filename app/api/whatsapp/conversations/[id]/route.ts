// Per-conversation: read + free-form reply + mark-read.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listConversationsForOrg,
  markStaffRead,
} from "@/lib/whatsapp/conversations-store";
import { sendFreeform } from "@/lib/whatsapp/dispatcher";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctxParam: RouteCtx) {
  try {
    const { orgId } = await requireOrg();
    const { id } = await ctxParam.params;
    const conv = listConversationsForOrg(orgId).find((c) => c.id === id);
    if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });
    markStaffRead(id);
    try { await awaitAllFlushesStrict(); } catch { /* read-mark is best-effort */ }
    return NextResponse.json({ conversation: conv });
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
      !["owner", "admin", "doctor", "nurse", "receptionist"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const session = await getServerSession(authOptions);
    const { id } = await ctxParam.params;
    const conv = listConversationsForOrg(orgId).find((c) => c.id === id);
    if (!conv) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const body = await req.json();
    const text = String(body.body || "").trim();
    if (!text) return NextResponse.json({ error: "missing_body" }, { status: 400 });
    if (text.length > 1500) return NextResponse.json({ error: "body_too_long" }, { status: 400 });
    const r = await sendFreeform({
      conversationId: conv.id,
      patientPhone: conv.patientPhone,
      body: text,
      staffEmail: session?.user?.email || undefined,
    });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json(r);
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

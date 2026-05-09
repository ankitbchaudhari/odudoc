// Approve / reject an erasure request.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/tenant";
import { reviewErasureRequest } from "@/lib/consent-vault-store";
import { recordAudit } from "@/lib/audit-log-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!isSuperAdmin(email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await ctxParam.params;
  const body = await req.json();
  const decision = body.decision === "approved" ? "approved" : body.decision === "rejected" ? "rejected" : null;
  if (!decision) return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.slice(0, 500) : undefined;
  const r = reviewErasureRequest(id, email!, decision, note);
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
  recordAudit({
    actorEmail: email!,
    action: "user.update",
    summary: `Erasure request ${decision} for user ${r.userId}`,
    meta: { erasureId: id, note },
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ request: r });
}

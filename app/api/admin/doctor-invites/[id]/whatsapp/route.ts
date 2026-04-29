// Admin clicks "Open WhatsApp" in the invite history. We can't
// see whether they actually pressed Send in WhatsApp afterwards,
// but we record the click as evidence of outreach so the history
// table shows two channels per invite when both ran.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markInviteWhatsappSent } from "@/lib/doctor-invites-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const updated = await markInviteWhatsappSent(id);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.doctor_invite.whatsapp_persist_failed", err, { id });
    // Non-blocking — the WhatsApp link itself was opened, this is
    // just bookkeeping. Fall through.
  }
  return NextResponse.json({ ok: true, invite: updated });
}

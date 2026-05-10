// Capture (create) + list voice orders.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  captureOrder,
  listVoiceOrdersForOrg,
  type VoiceOrderStatus,
} from "@/lib/voice-orders/store";
import type { ParsedVoiceOrder } from "@/lib/voice-orders/parser";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as VoiceOrderStatus | null;
    return NextResponse.json({
      orders: listVoiceOrdersForOrg(orgId, {
        status: status || undefined,
        limit: 50,
      }),
    });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (
      !ctx.isSuperAdmin &&
      ctx.membership &&
      !["owner", "admin", "doctor", "nurse"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const transcript = String(body.transcript || "");
    const parsed: ParsedVoiceOrder | null = body.parsed || null;
    if (!parsed || !transcript.trim()) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const o = captureOrder({
      organizationId: orgId,
      capturedByEmail: session?.user?.email || undefined,
      capturedByName: session?.user?.name || undefined,
      bedId: body.bedId,
      transcript,
      parsed,
    });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ order: o });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

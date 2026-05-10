// Per-order: read + transition.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  getVoiceOrder,
  transitionVoiceOrder,
  type VoiceOrderStatus,
} from "@/lib/voice-orders/store";
import { ingestReadings } from "@/lib/wearables/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

const ALLOWED: VoiceOrderStatus[] = ["confirmed", "executed", "cancelled", "flagged"];

export async function GET(_req: NextRequest, ctxParam: RouteCtx) {
  const { id } = await ctxParam.params;
  const o = getVoiceOrder(id);
  if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ order: o });
}

export async function PATCH(req: NextRequest, ctxParam: RouteCtx) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (!ctx.isSuperAdmin && ctx.membership && !["owner", "admin", "doctor", "nurse"].includes(ctx.membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const session = await getServerSession(authOptions);
    const { id } = await ctxParam.params;
    const existing = getVoiceOrder(id);
    if (!existing || existing.organizationId !== orgId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const body = await req.json();
    const to = body.to as VoiceOrderStatus;
    if (!ALLOWED.includes(to)) return NextResponse.json({ error: "invalid_target" }, { status: 400 });

    let executionRef: string | undefined;
    let executionTarget: "vitals" | "rx" | "lab" | "note" | undefined;

    // On "confirmed", caller may also push to a downstream system.
    // Most useful path today: vitals → wearables-store readings.
    if (to === "executed" && existing.kind === "vitals" && existing.vitals && body.patientUserId) {
      const v = existing.vitals;
      const takenAt = new Date().toISOString();
      const items = [];
      if (v.systolic !== undefined) items.push({ userId: String(body.patientUserId), deviceId: String(body.deviceId || "manual"), kind: "bp_systolic" as const, value: v.systolic, takenAt });
      if (v.diastolic !== undefined) items.push({ userId: String(body.patientUserId), deviceId: String(body.deviceId || "manual"), kind: "bp_diastolic" as const, value: v.diastolic, takenAt });
      if (v.hr !== undefined) items.push({ userId: String(body.patientUserId), deviceId: String(body.deviceId || "manual"), kind: "hr_resting" as const, value: v.hr, takenAt });
      if (v.spo2 !== undefined) items.push({ userId: String(body.patientUserId), deviceId: String(body.deviceId || "manual"), kind: "spo2" as const, value: v.spo2, takenAt });
      if (v.rr !== undefined) items.push({ userId: String(body.patientUserId), deviceId: String(body.deviceId || "manual"), kind: "respiratory_rate" as const, value: v.rr, takenAt });
      if (v.tempC !== undefined) items.push({ userId: String(body.patientUserId), deviceId: String(body.deviceId || "manual"), kind: "temperature_c" as const, value: v.tempC, takenAt });
      if (v.glucose !== undefined) items.push({ userId: String(body.patientUserId), deviceId: String(body.deviceId || "manual"), kind: "blood_glucose" as const, value: v.glucose, takenAt });
      if (v.weight !== undefined) items.push({ userId: String(body.patientUserId), deviceId: String(body.deviceId || "manual"), kind: "weight_kg" as const, value: v.weight, takenAt });
      if (items.length > 0) {
        const ingested = ingestReadings(items);
        executionRef = `${ingested.length} readings`;
        executionTarget = "vitals";
      }
    }

    const updated = transitionVoiceOrder({
      id,
      to,
      note: body.note,
      edits: body.edits,
      confirmedByEmail: session?.user?.email || undefined,
      executionTarget,
      executionRef,
    });
    if (!updated) return NextResponse.json({ error: "transition_failed" }, { status: 409 });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ order: updated });
  } catch (err) {
    if (err instanceof TenantError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}

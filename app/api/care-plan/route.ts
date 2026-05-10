// Care plan API.
//
// GET → all plans for the user, each enriched with target-compliance
//       computed off the last 30 days of vital readings.
// POST → create a new plan (preset targets per condition).
// PATCH → update title / targets / goals / notes / active.
// DELETE ?id=<id> → remove a plan.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createPlan, deletePlan, evaluateTarget, getPlan, listPlans, updatePlan,
  Condition, defaultTargets, CONDITION_LABEL,
} from "@/lib/care-plan/store";
import { listReadings } from "@/lib/vitals/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CONDITIONS: Condition[] = [
  "diabetes_t2", "diabetes_t1", "hypertension", "hyperlipidemia",
  "asthma", "copd", "ckd", "thyroid_hypo", "thyroid_hyper",
  "obesity", "anxiety_depression", "post_mi", "pregnancy", "other",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const plans = listPlans(userId);
  // Pull last 30 days of readings once, then evaluate each target
  // against the relevant subset.
  const since = new Date(); since.setDate(since.getDate() - 30);
  // VitalKind ⊋ VitalTarget["kind"] (respiration isn't a target).
  // Drop respiration readings up front so the cast lands cleanly.
  const TARGET_KINDS = new Set(["bp", "weight", "glucose", "heart_rate", "spo2", "temperature"] as const);
  type TargetKind = "bp" | "weight" | "glucose" | "heart_rate" | "spo2" | "temperature";
  const readings = listReadings(userId)
    .filter((r) => new Date(r.takenAt) >= since)
    .filter((r): r is typeof r & { kind: TargetKind } => TARGET_KINDS.has(r.kind as TargetKind))
    .map((r) => ({ kind: r.kind, value: r.value, value2: r.value2, takenAt: r.takenAt }));
  const enriched = plans.map((p) => ({
    ...p,
    compliance: p.targets.map((t) =>
      evaluateTarget(t, readings.filter((r) => r.kind === t.kind))
    ),
  }));
  return NextResponse.json({
    plans: enriched,
    conditions: VALID_CONDITIONS.map((c) => ({ value: c, label: CONDITION_LABEL[c] })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!VALID_CONDITIONS.includes(body.condition)) {
    return NextResponse.json({ error: "invalid_condition" }, { status: 400 });
  }
  const p = createPlan({
    userId,
    condition: body.condition,
    title: body.title,
    diagnosedOn: body.diagnosedOn,
    doctorEmail: body.doctorEmail,
    targets: body.targets,
    goals: body.goals,
    notes: body.notes,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ plan: p, defaultTargets: defaultTargets(body.condition) });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  if (!getPlan(String(body.id), userId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const patch: Record<string, unknown> = {};
  for (const key of ["title", "targets", "goals", "notes", "active", "diagnosedOn"] as const) {
    if (body[key] !== undefined) patch[key] = body[key];
  }
  const updated = updatePlan(String(body.id), userId, patch);
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ plan: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const ok = deletePlan(id, userId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}

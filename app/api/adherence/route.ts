// Medication adherence API.
//
// GET → today's schedule + recent log. The schedule is computed
//       on each call from the patient's active prescriptions; the
//       log is the persisted dose-event list.
// POST → log a dose action (taken/skipped) for a specific
//        (rxId, medIndex, date, slot) tuple. Idempotent — re-logging
//        the same dose updates the row instead of stacking.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPrescriptions, reloadPrescriptions } from "@/lib/prescriptions-store";
import { listDoseEvents, logDose, slotsFor, reloadAdherence, DoseAction } from "@/lib/adherence/store";
import { runRefillCheck } from "@/lib/adherence/refill";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ACTIONS: DoseAction[] = ["taken", "skipped"];

interface ScheduledDose {
  rxId: string;
  medIndex: number;
  medName: string;
  dose: string;
  frequency: string;
  instructions?: string;
  scheduledDate: string;
  slot: string;
  status: "due" | "taken" | "skipped";
  loggedAt?: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase();
  if (!userId || !email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const today = todayIso();
  await reloadPrescriptions();
  const rxs = listPrescriptions({ patientEmail: email })
    .filter((rx) => rx.status === "active");
  // Best-effort refill check on every load. Idempotent in the
  // notification store, so re-firing during the renotify window is
  // a no-op rather than a double-push.
  for (const rx of rxs) {
    try { await runRefillCheck(rx); } catch { /* skip */ }
  }
  await reloadAdherence();
  const events = listDoseEvents(userId, { since: today });

  const schedule: ScheduledDose[] = [];
  for (const rx of rxs) {
    rx.data.medications.forEach((med, mi) => {
      const slots = slotsFor(med.frequency);
      for (const slot of slots) {
        const ev = events.find((e) =>
          e.rxId === rx.id && e.medIndex === mi &&
          e.scheduledDate === today && e.slot === slot
        );
        schedule.push({
          rxId: rx.id, medIndex: mi,
          medName: med.name, dose: med.dose, frequency: med.frequency,
          instructions: med.instructions,
          scheduledDate: today, slot,
          status: ev ? (ev.action === "taken" ? "taken" : "skipped") : "due",
          loggedAt: ev?.loggedAt,
        });
      }
    });
  }
  // Order: morning → noon → evening → night.
  const SLOT_ORDER: Record<string, number> = { morning: 0, noon: 1, evening: 2, night: 3 };
  schedule.sort((a, b) => (SLOT_ORDER[a.slot] ?? 9) - (SLOT_ORDER[b.slot] ?? 9));

  // 7-day adherence rate — % of scheduled doses logged as "taken".
  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentEvents = listDoseEvents(userId, { since: sevenDaysAgo.toISOString().slice(0, 10) });
  const taken = recentEvents.filter((e) => e.action === "taken").length;
  const total = recentEvents.length || 1;
  const adherencePct = Math.round((taken / total) * 100);

  return NextResponse.json({
    today: schedule,
    recent: recentEvents.slice(0, 50),
    stats: {
      adherencePct,
      taken,
      logged: recentEvents.length,
      activePrescriptions: rxs.length,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase();
  if (!userId || !email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!VALID_ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  if (!body.rxId || typeof body.medIndex !== "number" || !body.scheduledDate || !body.slot) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  // Verify the prescription belongs to this user.
  await reloadPrescriptions();
  const rxs = listPrescriptions({ patientEmail: email });
  if (!rxs.some((r) => r.id === body.rxId)) {
    return NextResponse.json({ error: "rx_not_found" }, { status: 403 });
  }
  const ev = logDose({
    userId,
    rxId: body.rxId,
    medIndex: body.medIndex,
    scheduledDate: body.scheduledDate,
    slot: body.slot,
    action: body.action,
    note: body.note,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ event: ev });
}

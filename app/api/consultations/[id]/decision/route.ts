import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getConsultation,
  listConsultations,
  recordDecision,
  attachRefund,
  type DecisionAction,
} from "@/lib/consultations-store";
import { validateSlot } from "@/lib/slot-utils";
import {
  sendPatientApproved,
  sendPatientRejected,
  sendPatientRescheduled,
} from "@/lib/consultation-emails";
import { issueRefund } from "@/lib/refunds";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// Doctor (or admin acting on their behalf) approves / rejects / reschedules a
// pending consultation. On rejection we auto-issue a refund. On reschedule we
// update the scheduled time and email the patient.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; name?: string; role?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const c = getConsultation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwnerDoctor =
    user.role === "doctor" &&
    (
      (!!c.doctorEmail && c.doctorEmail === user.email.toLowerCase()) ||
      (!!user.name && c.doctorName.toLowerCase() === user.name.toLowerCase())
    );
  const isAdmin = user.role === "admin";
  if (!isOwnerDoctor && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as DecisionAction;
  if (!["approved", "rejected", "rescheduled"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // For reschedules, enforce the same slot rules the booking flow uses.
  // A doctor or admin can't shift a patient into a past slot, a slot
  // <30 min away, or one that collides with another of this doctor's
  // consultations. The consultation being rescheduled is excluded from
  // the collision check (it's allowed to "move onto itself" conceptually
  // since its old slot is being vacated).
  if (action === "rescheduled") {
    const targetIso = typeof body.rescheduleTo === "string" ? body.rescheduleTo : "";
    const targetSlot = typeof body.rescheduleSlot === "string" ? body.rescheduleSlot : "";
    if (!targetIso || !targetSlot) {
      return NextResponse.json(
        { error: "Reschedule requires both rescheduleTo (date) and rescheduleSlot (time)." },
        { status: 400 },
      );
    }
    const dateStr = targetIso.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return NextResponse.json({ error: "Invalid rescheduleTo date." }, { status: 400 });
    }
    const slotErr = validateSlot({
      dateStr,
      slot: targetSlot,
      consultations: listConsultations({ doctorId: c.doctorId }),
      ignoreConsultationId: c.id,
    });
    if (slotErr) {
      return NextResponse.json({ error: slotErr }, { status: 400 });
    }
  }

  const oldSlot = `${c.dateLabel} ${c.timeSlot}`;
  const updated = recordDecision(id, {
    action,
    at: new Date().toISOString(),
    reason: typeof body.reason === "string" ? body.reason : undefined,
    rescheduleTo: typeof body.rescheduleTo === "string" ? body.rescheduleTo : undefined,
    rescheduleSlot: typeof body.rescheduleSlot === "string" ? body.rescheduleSlot : undefined,
  });
  if (!updated) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  // Side-effects per action — don't block the response on them.
  if (action === "rejected") {
    // Fire refund, then stamp onto record.
    const r = await issueRefund({
      provider: updated.paymentProvider,
      paymentIntentId: updated.paymentIntentId,
      amount: updated.fee,
      currency: updated.currency,
      reason: body.reason,
    });
    attachRefund(id, {
      id: r.id,
      provider: r.provider,
      amount: r.amount,
      createdAt: r.createdAt,
      reason: r.reason,
      succeeded: r.succeeded,
      error: r.error,
    });
    sendPatientRejected(updated, body.reason).catch(console.error);
  } else if (action === "approved") {
    sendPatientApproved(updated).catch(console.error);
  } else if (action === "rescheduled") {
    sendPatientRescheduled(updated, oldSlot).catch(console.error);
  }

  return NextResponse.json({ consultation: getConsultation(id) });
}

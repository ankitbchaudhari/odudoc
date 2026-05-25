// POST /api/admin/appointment-policy/preview
//
// Stateless preview of how a given fee + outcome would resolve under
// the policy in the request body. Backs the live "this would refund
// X, charge Y" labels in the admin form.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  computeOutcome,
  isValidPolicyShape,
  type AppointmentOutcome,
  type PenaltyPolicy,
} from "@/lib/appointment-penalty-engine";

export const runtime = "nodejs";

interface Body {
  feeAmount?: number;
  outcome?: AppointmentOutcome;
  minutesBeforeAppointment?: number;
  policy?: Partial<PenaltyPolicy>;
}

const VALID_OUTCOMES: AppointmentOutcome[] = [
  "completed",
  "no-show",
  "late-cancel",
  "early-cancel",
  "reschedule",
  "doctor-cancel",
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Body;
  const fee = Number(body.feeAmount);
  if (!Number.isFinite(fee) || fee < 0) {
    return NextResponse.json({ error: "invalid_fee" }, { status: 400 });
  }
  const outcome = body.outcome;
  if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
    return NextResponse.json({ error: "invalid_outcome" }, { status: 400 });
  }
  const policy = body.policy || {};
  const shapeError = isValidPolicyShape(policy);
  if (shapeError) {
    return NextResponse.json({ error: shapeError }, { status: 400 });
  }
  const result = computeOutcome({
    feeAmount: fee,
    outcome,
    minutesBeforeAppointment: body.minutesBeforeAppointment,
    policy: {
      scope: "platform",
      scopeId: null,
      noShowPenaltyPercent: policy.noShowPenaltyPercent!,
      lateCancelPenaltyPercent: policy.lateCancelPenaltyPercent!,
      lateCancelWindowMinutes: policy.lateCancelWindowMinutes!,
      earlyCancelRefundPercent: policy.earlyCancelRefundPercent!,
      rescheduleFeeRupees: policy.rescheduleFeeRupees!,
      doctorCancelRefundsFull: true,
      updatedAt: new Date().toISOString(),
    },
  });
  return NextResponse.json(result);
}

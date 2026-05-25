// Appointment penalty + refund engine.
//
// Each appointment owner (doctor, clinic, hospital org, corporate)
// declares a policy: how much of the fee the patient forfeits on a
// no-show or late cancel, and how soon before the appointment a
// cancel counts as "late". The platform ships a sensible default; any
// level can override.
//
// Resolution priority (highest first):
//   doctor > clinic > organization > platform default
//
// Pure functions — no I/O. The store layer
// (lib/appointment-penalty-store.ts) reads and writes; the API + UI
// calls this to compute the actual outcome.

export type PenaltyScope = "platform" | "organization" | "clinic" | "doctor";

export type AppointmentOutcome =
  | "completed"      // patient attended → no penalty
  | "no-show"        // patient didn't show + didn't cancel
  | "late-cancel"    // patient cancelled inside the lateCancelWindow
  | "early-cancel"   // patient cancelled before the lateCancelWindow
  | "reschedule"     // patient moved the appointment
  | "doctor-cancel"; // owner cancelled → patient gets 100% refund

export interface PenaltyPolicy {
  /** When the policy belongs to a specific entity, the id is set here.
   *  Platform default uses scope="platform" + scopeId=null. */
  scope: PenaltyScope;
  scopeId: string | null;
  /** Percent of the appointment fee forfeited on no-show (0..100). */
  noShowPenaltyPercent: number;
  /** Percent forfeited when patient cancels INSIDE the late-cancel
   *  window. Typically less harsh than no-show, but configurable. */
  lateCancelPenaltyPercent: number;
  /** Minutes before the appointment that mark the boundary between
   *  early and late cancel. Default 120 (2 h). */
  lateCancelWindowMinutes: number;
  /** Percent REFUNDED for early cancellations. Most owners refund
   *  100%, but a clinic can keep e.g. 5% to cover gateway fees. */
  earlyCancelRefundPercent: number;
  /** Flat fee charged for rescheduling. 0 = free reschedule. */
  rescheduleFeeRupees: number;
  /** Free-text the admin can show patients alongside the policy
   *  ("48-hour cancel for first-time patients" etc). */
  notes?: string;
  /** When the doctor / clinic / org cancels, the patient ALWAYS gets
   *  100% refunded — this flag stays true. Surfaced in admin UI so
   *  the owner can confirm they're not unintentionally keeping
   *  patient money on a unilateral cancel. */
  doctorCancelRefundsFull: true;
  updatedAt: string;
}

export const PLATFORM_DEFAULT_POLICY: PenaltyPolicy = {
  scope: "platform",
  scopeId: null,
  // Sensible cross-market defaults — tuned for telemed where no-shows
  // burn the doctor's slot; admins should tighten or loosen for their
  // own market. (Spec mention: 0–100%, owner picks.)
  noShowPenaltyPercent: 100,
  lateCancelPenaltyPercent: 50,
  lateCancelWindowMinutes: 120,
  earlyCancelRefundPercent: 100,
  rescheduleFeeRupees: 0,
  doctorCancelRefundsFull: true,
  updatedAt: new Date().toISOString(),
};

export interface ResolveInput {
  doctorPolicy?: PenaltyPolicy | null;
  clinicPolicy?: PenaltyPolicy | null;
  orgPolicy?: PenaltyPolicy | null;
  platformPolicy?: PenaltyPolicy | null;
}

/** Resolve the live policy for an appointment. Highest-precedence
 *  defined wins; falls back to the platform default. */
export function resolvePolicy(input: ResolveInput): PenaltyPolicy {
  return (
    input.doctorPolicy ||
    input.clinicPolicy ||
    input.orgPolicy ||
    input.platformPolicy ||
    PLATFORM_DEFAULT_POLICY
  );
}

export interface OutcomeInput {
  /** Appointment fee in MAJOR units (₹ / $ — same currency the booking
   *  was charged in). The engine doesn't care about FX; whatever
   *  currency the fee is in, the refund + penalty come out in the
   *  same one. */
  feeAmount: number;
  outcome: AppointmentOutcome;
  /** Minutes between cancellation and the appointment start time.
   *  Used to classify the cancel as early vs late when the caller
   *  passes outcome="late-cancel" or "early-cancel" generically. */
  minutesBeforeAppointment?: number;
  /** The resolved policy from resolvePolicy(). */
  policy: PenaltyPolicy;
}

export interface OutcomeResult {
  /** Effective outcome after classification. Same as input.outcome
   *  unless the engine reclassified an early-vs-late edge case. */
  effectiveOutcome: AppointmentOutcome;
  /** What the patient owes / forfeits, in fee currency major units. */
  penaltyAmount: number;
  /** What the patient gets back, in fee currency major units. */
  refundAmount: number;
  /** Plain-language description, suitable for invoice line text and
   *  patient-facing emails. */
  description: string;
  policy: PenaltyPolicy;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Compute the penalty + refund for one appointment outcome.
 *  Cancellation type (early vs late) is auto-classified when
 *  minutesBeforeAppointment is supplied. */
export function computeOutcome(input: OutcomeInput): OutcomeResult {
  const { feeAmount, policy } = input;
  let outcome = input.outcome;

  // Auto-classify a generic "cancel" outcome by the supplied window.
  if (
    (outcome === "late-cancel" || outcome === "early-cancel") &&
    typeof input.minutesBeforeAppointment === "number"
  ) {
    outcome =
      input.minutesBeforeAppointment >= policy.lateCancelWindowMinutes
        ? "early-cancel"
        : "late-cancel";
  }

  let penalty = 0;
  let refund = 0;
  let desc = "";

  switch (outcome) {
    case "completed":
      penalty = 0;
      refund = 0;
      desc = "Appointment completed — full fee retained.";
      break;
    case "no-show":
      penalty = round2((feeAmount * policy.noShowPenaltyPercent) / 100);
      refund = round2(feeAmount - penalty);
      desc = `No-show — ${policy.noShowPenaltyPercent}% of the fee retained as penalty.`;
      break;
    case "late-cancel":
      penalty = round2((feeAmount * policy.lateCancelPenaltyPercent) / 100);
      refund = round2(feeAmount - penalty);
      desc = `Cancelled inside the ${policy.lateCancelWindowMinutes}-minute window — ${policy.lateCancelPenaltyPercent}% penalty.`;
      break;
    case "early-cancel":
      refund = round2((feeAmount * policy.earlyCancelRefundPercent) / 100);
      penalty = round2(feeAmount - refund);
      desc = `Early cancel — ${policy.earlyCancelRefundPercent}% refunded.`;
      break;
    case "reschedule":
      penalty = round2(policy.rescheduleFeeRupees);
      refund = 0; // fee carries to the new slot; reschedule fee is a separate charge
      desc =
        policy.rescheduleFeeRupees > 0
          ? `Rescheduled — flat reschedule fee applied.`
          : "Rescheduled — no fee.";
      break;
    case "doctor-cancel":
      penalty = 0;
      refund = round2(feeAmount);
      desc = "Cancelled by the doctor / clinic — full refund.";
      break;
  }

  return {
    effectiveOutcome: outcome,
    penaltyAmount: penalty,
    refundAmount: refund,
    description: desc,
    policy,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Input validation helpers — used by both the admin form and the API.
// ─────────────────────────────────────────────────────────────────────
export function isValidPercent(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 100;
}

export function isValidPolicyShape(p: Partial<PenaltyPolicy>): string | null {
  if (!isValidPercent(p.noShowPenaltyPercent))
    return "no-show penalty must be 0..100";
  if (!isValidPercent(p.lateCancelPenaltyPercent))
    return "late-cancel penalty must be 0..100";
  if (!isValidPercent(p.earlyCancelRefundPercent))
    return "early-cancel refund must be 0..100";
  if (
    typeof p.lateCancelWindowMinutes !== "number" ||
    p.lateCancelWindowMinutes < 0 ||
    p.lateCancelWindowMinutes > 60 * 24 * 14
  ) {
    return "late-cancel window must be 0..20160 minutes (two weeks)";
  }
  if (
    typeof p.rescheduleFeeRupees !== "number" ||
    p.rescheduleFeeRupees < 0 ||
    p.rescheduleFeeRupees > 100_000
  ) {
    return "reschedule fee must be 0..100,000";
  }
  return null;
}

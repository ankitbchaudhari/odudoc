// Referral program store — sign-up referrals with a one-sided reward
// to the referrer when the referee crosses a usage threshold.
//
// NOTE: this is a different feature from lib/referrals-store.ts,
// which is a client-side store for doctor-to-doctor patient
// referrals (one doctor sending a patient to a colleague). The
// "referral program" here is a marketing growth loop — anyone with
// an OduDoc account gets a code, sharing it earns both sides
// credit when the referee converts.
//
// Reward economics (referrer-only — joiner gets nothing):
//   Patient referral  $10 credit when referee completes 10 paid
//                     video consultations
//   Doctor referral   $50 credit when the referred doctor completes
//                     10 paid consultations
//   Cap               One row per (referrer, referee) email pair.
//                     Self-referrals rejected.
//
// Lifecycle:
//   1. New user signs up. Client passes refCode (read from ?ref=…
//      cookie or query param) to /api/referral-program/apply.
//   2. We validate the code, look up referrer, check uniqueness,
//      insert with status="pending".
//   3. Referee books + pays for a consultation. Consultation flow
//      calls qualifyReferralsForReferee() which transitions every
//      pending row keyed by this email to "qualified" and posts
//      the $10 + $10 credits.
//   4. Both sides see the credit on /dashboard/referrals and it
//      auto-applies on their next consultation booking.

import { bindPersistentArray } from "./persistent-array";
import {
  addReferralCredit,
  findUserByEmail,
  findUserByReferralCode,
} from "./users-store";

export type ReferralProgramStatus = "pending" | "qualified" | "void";

export type ReferralProgramKind =
  | "patient_to_patient"
  | "patient_to_doctor"
  | "doctor_to_patient"
  | "doctor_to_doctor"
  | "other";

export interface ReferralProgramRow {
  id: string;
  referrerEmail: string;
  referrerUserId: string;
  refereeEmail: string;
  /** Set when the referee actually signs up — same email may sign
   *  up later than the referral was claimed. */
  refereeUserId?: string;
  kind: ReferralProgramKind;
  status: ReferralProgramStatus;
  /** Cents of credit promised to each side at qualification time.
   *  We snapshot the amount on the row so changing the program
   *  later doesn't retroactively bump pending rows. */
  rewardEachCents: number;
  currency: string; // "USD"
  /** Free-text source — "signup_form", "share_link", etc. */
  source?: string;
  createdAt: string;
  qualifiedAt?: string;
  qualifyingConsultationId?: string;
}

/** Reward to the referrer (only) for a patient-flavoured referral.
 *  Earned when the referee completes the qualification threshold of
 *  paid video consultations. */
export const REFERRAL_REWARD_CENTS = 1000; // $10
/** Reward to the referrer (only) for a doctor-to-doctor referral.
 *  Acquiring a doctor is materially more valuable than a patient,
 *  so the payout is bigger. */
export const DOCTOR_REFERRAL_REWARD_CENTS = 5000; // $50

/** Number of completed paid consultations the referee must complete
 *  before any referral row tied to them transitions from "pending"
 *  to "qualified" and the referrer gets credited. Same threshold
 *  applies whether the referee is a patient (counts as the patient)
 *  or a doctor (counts as the consulting doctor). */
export const REFERRAL_QUALIFICATION_THRESHOLD = 10;
const DEFAULT_CURRENCY = "USD";

function rewardForKind(kind: ReferralProgramKind): number {
  return kind === "doctor_to_doctor"
    ? DOCTOR_REFERRAL_REWARD_CENTS
    : REFERRAL_REWARD_CENTS;
}

const program: ReferralProgramRow[] = [];
const {
  hydrate: hydrateProgram,
  reload: reloadProgramInternal,
} = bindPersistentArray<ReferralProgramRow>(
  "referral-program",
  program,
  () => []
);

export async function reloadReferralProgram(): Promise<void> {
  await reloadProgramInternal();
}

function nowIso(): string {
  return new Date().toISOString();
}
function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36).slice(-4)}`;
}

function inferKind(
  referrerRole: string,
  refereeRole: string
): ReferralProgramKind {
  const r = referrerRole.toLowerCase();
  const e = refereeRole.toLowerCase();
  if (r === "patient" && e === "patient") return "patient_to_patient";
  if (r === "patient" && e === "doctor") return "patient_to_doctor";
  if (r === "doctor" && e === "patient") return "doctor_to_patient";
  if (r === "doctor" && e === "doctor") return "doctor_to_doctor";
  return "other";
}

/* ============================================================ */
/*  Apply a code (claim the referral)                           */
/* ============================================================ */

export interface ApplyReferralResult {
  ok: boolean;
  reason?:
    | "invalid_code"
    | "self_referral"
    | "already_referred";
  referral?: ReferralProgramRow;
}

export async function applyReferralCode(input: {
  refereeEmail: string;
  code: string;
  source?: string;
  /** Hint about what role the referee will become if they aren't
   *  in the system yet. Used by the /for-doctors/register flow,
   *  where the application creates a DoctorApplication row but
   *  not a User row until admin approval — without this hint the
   *  kind would default to patient_to_* and the doctor referral
   *  would be paid out at the lower rate. */
  inviteAs?: "doctor" | "patient";
}): Promise<ApplyReferralResult> {
  await hydrateProgram();
  const refereeEmail = input.refereeEmail.trim().toLowerCase();
  const referrer = findUserByReferralCode(input.code);
  if (!referrer) return { ok: false, reason: "invalid_code" };
  if (referrer.email.toLowerCase() === refereeEmail) {
    return { ok: false, reason: "self_referral" };
  }
  const existing = program.find(
    (r) =>
      r.referrerEmail.toLowerCase() === referrer.email.toLowerCase() &&
      r.refereeEmail.toLowerCase() === refereeEmail
  );
  if (existing) {
    return { ok: false, reason: "already_referred", referral: existing };
  }
  // Reject if the referee already has any other pending or qualified
  // referral pointing at them — first attribution wins, can't farm
  // the program by re-claiming codes.
  const otherClaim = program.find(
    (r) =>
      r.refereeEmail.toLowerCase() === refereeEmail &&
      (r.status === "pending" || r.status === "qualified")
  );
  if (otherClaim) {
    return { ok: false, reason: "already_referred", referral: otherClaim };
  }
  const referee = findUserByEmail(refereeEmail);
  // Resolution order for the referee's role:
  //   1. Existing User record on file
  //   2. Caller-supplied inviteAs hint (e.g. /for-doctors/register
  //      flow knows the referee is going to be a doctor before
  //      admin approves the application)
  //   3. Default to patient (most common signup path)
  const refereeRole =
    referee?.role || input.inviteAs || "patient";
  const kind = inferKind(referrer.role, refereeRole);
  const row: ReferralProgramRow = {
    id: uid("rp"),
    referrerEmail: referrer.email.toLowerCase(),
    referrerUserId: referrer.id,
    refereeEmail,
    refereeUserId: referee?.id,
    kind,
    status: "pending",
    rewardEachCents: rewardForKind(kind),
    currency: DEFAULT_CURRENCY,
    source: input.source,
    createdAt: nowIso(),
  };
  program.push(row);
  return { ok: true, referral: row };
}

/* ============================================================ */
/*  Qualify on first paid consultation                          */
/* ============================================================ */

/** Try to qualify pending referral rows for a referee. The referrer
 *  is credited only when the referee has completed
 *  `REFERRAL_QUALIFICATION_THRESHOLD` paid consultations. The joiner
 *  (referee) receives no credit — the bonus is one-sided.
 *
 *  Caller passes `completedConsultationCount` (paid + completed
 *  consultations the referee has on file). Below the threshold this
 *  is a no-op. Idempotent — once a row is qualified, repeated calls
 *  do nothing for that row.
 *
 *  Returns the rows that transitioned this call. */
export async function qualifyReferralsForReferee(input: {
  refereeEmail: string;
  consultationId?: string;
  /** Total paid+completed consultations the referee has on this
   *  platform. Caller computes this. */
  completedConsultationCount?: number;
}): Promise<ReferralProgramRow[]> {
  await hydrateProgram();
  const email = input.refereeEmail.trim().toLowerCase();
  const refereeUser = findUserByEmail(email);
  const promoted: ReferralProgramRow[] = [];
  const count = input.completedConsultationCount ?? 0;
  // Threshold gate — below the bar, do nothing. We don't even
  // stamp progress on the row because the count is implicit
  // (consultations table) and recomputed every call.
  if (count < REFERRAL_QUALIFICATION_THRESHOLD) return promoted;

  for (let i = 0; i < program.length; i++) {
    const r = program[i];
    if (r.refereeEmail !== email) continue;
    if (r.status !== "pending") continue;
    const next: ReferralProgramRow = {
      ...r,
      status: "qualified",
      qualifiedAt: nowIso(),
      qualifyingConsultationId: input.consultationId,
      refereeUserId: refereeUser?.id || r.refereeUserId,
    };
    program.splice(i, 1, next);
    // One-sided: only the referrer is credited. Joiner gets nothing.
    addReferralCredit(r.referrerUserId, r.rewardEachCents);
    promoted.push(next);
  }
  return promoted;
}

/* ============================================================ */
/*  Reads                                                       */
/* ============================================================ */

export interface ReferralProgramStats {
  pending: number;
  qualified: number;
  totalEarnedCents: number;
  recent: ReferralProgramRow[];
}

export async function getReferralStatsForUser(
  userId: string,
  email: string
): Promise<ReferralProgramStats> {
  await hydrateProgram();
  const mine = program
    .filter(
      (r) =>
        r.referrerUserId === userId ||
        r.referrerEmail.toLowerCase() === email.toLowerCase()
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pending = mine.filter((r) => r.status === "pending").length;
  const qualified = mine.filter((r) => r.status === "qualified").length;
  const totalEarnedCents = mine
    .filter((r) => r.status === "qualified")
    .reduce((sum, r) => sum + r.rewardEachCents, 0);
  return {
    pending,
    qualified,
    totalEarnedCents,
    recent: mine.slice(0, 20),
  };
}

export async function hasPendingReferralAsReferee(
  email: string
): Promise<boolean> {
  await hydrateProgram();
  const e = email.toLowerCase();
  return program.some(
    (r) => r.refereeEmail === e && r.status === "pending"
  );
}

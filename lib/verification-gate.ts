// Verification gate — single source of truth for "is this user
// allowed to add money or book an appointment yet?"
//
// Rule: the OduDoc patient ID is the master key. Before any financial
// action (wallet top-up) or scheduled-care action (appointment book),
// the user must have:
//   1. email — verified (User.emailVerified)
//   2. phone — verified at least once via OTP (User.phoneVerifiedAt)
//   3. an ID  — at least one verifiedAt-stamped entry on
//               Patient.governmentIds[] (govt ID OR national health ID).
//
// All three must pass for `allOk` to be true. The /api/me/
// verification-status endpoint returns this shape; API routes that
// gate behaviour return { error: "verification_required", missing }
// when a step is incomplete so the client can render the next nudge.

import type { User } from "./users-store";

export type VerificationStep = "email" | "phone" | "id";

export interface VerificationStatus {
  emailOk: boolean;
  phoneOk: boolean;
  idOk: boolean;
  /** True only when all three are satisfied. */
  allOk: boolean;
  /** Ordered list of missing steps for the UI checklist. */
  missing: VerificationStep[];
  /** Quick stats for the UI status card. */
  stats: {
    idsAttached: number;
    idsVerified: number;
  };
}

export function computeVerificationStatus(
  user:
    | Pick<User, "emailVerified" | "phoneVerifiedAt" | "governmentIds">
    | null
    | undefined,
): VerificationStatus {
  const emailOk = !!user?.emailVerified;
  const phoneOk = !!user?.phoneVerifiedAt;
  const ids = user?.governmentIds || [];
  const verifiedCount = ids.filter((g) => !!g.verifiedAt).length;
  const idOk = verifiedCount > 0;

  const missing: VerificationStep[] = [];
  if (!emailOk) missing.push("email");
  if (!phoneOk) missing.push("phone");
  if (!idOk) missing.push("id");

  return {
    emailOk,
    phoneOk,
    idOk,
    allOk: missing.length === 0,
    missing,
    stats: { idsAttached: ids.length, idsVerified: verifiedCount },
  };
}

/** Marker thrown by API routes when a gate fails. Caught in route
 *  handlers and translated to a 403 JSON body the client can act on. */
export class VerificationRequiredError extends Error {
  status = 403 as const;
  code = "verification_required" as const;
  constructor(public status_: VerificationStatus) {
    super("verification_required");
    this.name = "VerificationRequiredError";
  }
}

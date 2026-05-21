// Near-miss reporting — V13 §7 of the Master Spec.
//
// "A near-miss is an event that could have caused harm but didn't —
//  drug-vial scanned to the wrong patient and caught BEFORE
//  administration, wrong-side-marking caught at the pause, a fall
//  arrested by a bedrail. The point of capturing these is that the
//  pattern they reveal predicts the next actual harm." (V13 §7.1)
//
// V13 §7.4 rules:
//  - Anonymous reporting is allowed (no-blame culture). The reporter
//    can identify themselves later for follow-up, but the initial
//    submission can be anonymous.
//  - Patient identity is optional. If included it is encrypted.
//  - No disciplinary action against the reporter for the act of
//    reporting itself (this is a policy rule we enforce at the
//    management layer — scorecard math does NOT penalise reporting).
//
// We model these as a separate store because the semantics differ
// from accountability events: near-misses are PROACTIVELY surfaced
// by humans and are valuable BECAUSE they reveal patterns even
// without traceable actor identity.

import { bindPersistentArray } from "@/lib/persistent-array";

export type Domain =
  | "medication"     // wrong drug, wrong dose, wrong route, wrong patient
  | "identification" // wrist-band mismatch, ID confusion
  | "procedure"      // wrong site, wrong implant, unscheduled
  | "infection"      // hand-hygiene miss, sterile-field break
  | "fall"           // unwitnessed fall, near-fall, fall-arrested
  | "equipment"      // device malfunction, missing item at point of use
  | "communication"  // handover gap, missed call-back, illegible note
  | "documentation"  // wrong patient record, late entry, missing consent
  | "security"       // unauthorised access attempt, lost device
  | "other";

export type Severity = "minor" | "moderate" | "serious" | "catastrophic_avoided";

export type Outcome =
  | "no_harm"             // The default — patient unaffected
  | "delayed_treatment"
  | "extra_intervention"  // Required a corrective action to prevent harm
  | "psychological";      // Patient/family distress only

export interface NearMissReport {
  id: string;
  createdAt: string;
  tenantId?: string;

  /** Free-form narrative. */
  what: string;
  /** Where in the hospital — ward, OR, ICU bed, OPD cabin. */
  where: string;
  /** When the event happened (vs createdAt which is when reported). */
  whenAt: string;

  domain: Domain;
  severity: Severity;
  outcome: Outcome;

  /** Reporter email. Empty string = anonymous. */
  reporterEmail: string;
  /** Role of reporter — kept even when email is empty so the pattern
   *  detector can group by role-type. */
  reporterRole?: string;

  /** Patient id IF the reporter chose to attach one. May be omitted —
   *  V13 §7.4 makes patient identity optional. */
  patientId?: string;

  /** Contributing factors checked off by the reporter (V13 §7.3 form). */
  contributingFactors?: string[];

  /** Suggested system-level improvement (V13 §7.3 form). */
  suggestedFix?: string;

  /** Review state. V13 §7 says near-misses go to a weekly review
   *  meeting (§8.3 "Pattern Review Meeting"). */
  reviewStatus: "new" | "under_review" | "actioned" | "closed";
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;

  /** Whether a CAR was opened off this near-miss (V13 §7.4 says only
   *  systemic issues escalate to CAR — individual mistakes don't). */
  carId?: string;
}

const reports: NearMissReport[] = [];
const handle = bindPersistentArray<NearMissReport>("near_miss_reports", reports);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await handle.hydrate();
  hydrated = true;
}

function uid(): string {
  return `nm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── Submit ────────────────────────────────────────────────────────

export interface SubmitInput {
  what: string;
  where: string;
  whenAt: string;
  domain: Domain;
  severity: Severity;
  outcome: Outcome;
  /** Empty string = anonymous; the reporter chose not to identify. */
  reporterEmail: string;
  reporterRole?: string;
  patientId?: string;
  contributingFactors?: string[];
  suggestedFix?: string;
  tenantId?: string;
}

export async function submitNearMiss(input: SubmitInput): Promise<NearMissReport> {
  await ensureHydrated();
  const r: NearMissReport = {
    id: uid(),
    createdAt: new Date().toISOString(),
    tenantId: input.tenantId,
    what: input.what,
    where: input.where,
    whenAt: input.whenAt,
    domain: input.domain,
    severity: input.severity,
    outcome: input.outcome,
    reporterEmail: input.reporterEmail,
    reporterRole: input.reporterRole,
    patientId: input.patientId,
    contributingFactors: input.contributingFactors,
    suggestedFix: input.suggestedFix,
    reviewStatus: "new",
  };
  reports.push(r);
  handle.flush();
  return r;
}

// ── Read ──────────────────────────────────────────────────────────

export interface NearMissFilter {
  domain?: Domain;
  severity?: Severity;
  reviewStatus?: NearMissReport["reviewStatus"];
  tenantId?: string;
  /** When listing for the public reporter (their own submissions),
   *  filter to entries that match their email. Anonymous reports
   *  cannot be re-listed by reporter — that's intentional and the
   *  trade-off for the no-blame culture. */
  reporterEmail?: string;
  limit?: number;
}

export async function listNearMisses(filter: NearMissFilter = {}): Promise<NearMissReport[]> {
  await ensureHydrated();
  let rows = [...reports];
  if (filter.domain)         rows = rows.filter((r) => r.domain === filter.domain);
  if (filter.severity)       rows = rows.filter((r) => r.severity === filter.severity);
  if (filter.reviewStatus)   rows = rows.filter((r) => r.reviewStatus === filter.reviewStatus);
  if (filter.tenantId)       rows = rows.filter((r) => r.tenantId === filter.tenantId);
  if (filter.reporterEmail)  rows = rows.filter((r) => r.reporterEmail === filter.reporterEmail);
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows.slice(0, filter.limit || 200);
}

// ── Review (V13 §7.4 + §8.3 pattern review meeting) ───────────────

export async function reviewNearMiss(
  id: string,
  reviewer: { email: string; role?: string },
  next: { reviewStatus: NearMissReport["reviewStatus"]; reviewNotes?: string; carId?: string },
): Promise<NearMissReport | null> {
  await ensureHydrated();
  const r = reports.find((x) => x.id === id);
  if (!r) return null;
  r.reviewStatus = next.reviewStatus;
  if (next.reviewNotes !== undefined) r.reviewNotes = next.reviewNotes;
  if (next.carId) r.carId = next.carId;
  r.reviewedBy = reviewer.email;
  r.reviewedAt = new Date().toISOString();
  handle.flush();
  return r;
}

// ── Pattern aggregation (V13 §8 lite) ─────────────────────────────
//
// Cheap roll-up — counts by domain in the lookback window. The full
// V13 §8 detector that finds time/location/team clusters needs the
// pattern-review meeting workflow + analytics back-end and is a
// separate ship.

export async function aggregateByDomain(windowDays = 30): Promise<{ domain: Domain; count: number; severityMix: Record<Severity, number> }[]> {
  await ensureHydrated();
  const since = new Date(Date.now() - windowDays * 24 * 3600_000).toISOString();
  const rows = reports.filter((r) => r.createdAt >= since);
  const buckets = new Map<Domain, { count: number; severityMix: Record<Severity, number> }>();
  for (const r of rows) {
    const b = buckets.get(r.domain) || { count: 0, severityMix: { minor: 0, moderate: 0, serious: 0, catastrophic_avoided: 0 } };
    b.count++;
    b.severityMix[r.severity]++;
    buckets.set(r.domain, b);
  }
  return [...buckets.entries()]
    .map(([domain, v]) => ({ domain, ...v }))
    .sort((a, b) => b.count - a.count);
}

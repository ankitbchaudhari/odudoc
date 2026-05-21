// Pre-Policy Medical Examination (PPME) — V9 §3 of the Master Spec.
//
// Insurance companies require medical screening before issuing certain
// policies (Health, Life, Critical Illness). OduDoc runs the exam
// through any empanelled hospital / clinic / lab in the patient's
// city, generates the report, and hands it back to the insurer with
// blockchain verification.
//
// Revenue model (V9 §3.8):
//   - Insurer pays OduDoc the negotiated PPME fee (tier-priced per V9 §3.9)
//   - OduDoc keeps a platform commission (default 15%)
//   - The performing facility receives the remainder, settled to their wallet
//
// Why this is a winning strategy (V9 §3.12):
//   - Insurers historically struggle to verify which exam was actually
//     done by which doctor. OduDoc captures the photos + vitals + lab
//     results immutably in V13 accountability + V4 §2 PDF (with SHA-256
//     + QR) so the report cannot be tampered with.
//   - Patients want the convenience of booking the exam where they
//     already get care, not at an insurer-controlled centre.

import { bindPersistentArray } from "@/lib/persistent-array";
import { ensureWallet, transfer } from "@/lib/wallet-store";
import { recordEvent } from "@/lib/accountability-store";

export type PpmeTier = "basic" | "standard" | "comprehensive" | "executive";

export interface PpmeTest {
  /** Stable code; the insurance company configures which codes are
   *  required per tier (V9 §3.5 + §3.10). */
  code: string;
  /** Display name shown to the patient + on the report. */
  name: string;
  /** Did the patient actually do this test? */
  status: "pending" | "done" | "skipped" | "abnormal";
  /** Final value text (e.g. "Hb 14.2 g/dL", "BP 124/82"). */
  result?: string;
  /** Reference range, used to flag abnormal results. */
  referenceRange?: string;
  /** Who performed/recorded the test. */
  recordedBy?: string;
  recordedAt?: string;
}

export interface PpmeReport {
  id: string;
  /** The patient being examined. */
  patientId: string;
  patientName: string;
  patientPhone?: string;
  /** Reference number the insurance company can use to look up the
   *  request on their side. */
  insurerRef: string;
  /** Insurance company entity id (their wallet pays the fee). */
  insurerId: string;
  insurerName: string;
  /** Policy type tied to this exam. */
  policyType: "health" | "life" | "critical_illness" | "travel";
  /** Tier — drives which test set is required + the fee. */
  tier: PpmeTier;
  /** Total fee charged to the insurer, in cents (currency from the
   *  insurer's pod). */
  feeCents: number;
  currency: string;
  /** Facility performing the exam (empanelled hospital / clinic / lab). */
  facilityId: string;
  facilityName: string;
  /** Status of the overall exam. */
  status: "scheduled" | "in_progress" | "submitted" | "approved" | "rejected" | "cancelled";
  /** The test array — V9 §3.5 standard tier mandates: vitals, BMI,
   *  ECG, blood panel, urinalysis, eye check, audiogram. Insurance
   *  company can configure additions per V9 §3.10. */
  tests: PpmeTest[];
  /** Photos uploaded during the exam (face shot for identity check,
   *  any clinical photos required by the policy). URLs from the
   *  files.odudoc.com blob service via /api/upload/photo. */
  photoUrls: string[];
  /** Final exam notes from the examining doctor. */
  examinerNotes?: string;
  examinerEmail?: string;
  /** SHA-256 hash of the locked report data — recorded when status
   *  flips to submitted so the insurer's tamper check works. */
  reportHash?: string;
  scheduledFor?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const reports: PpmeReport[] = [];
const handle = bindPersistentArray<PpmeReport>("ppme_reports", reports);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await handle.hydrate();
  hydrated = true;
}

function uid(): string {
  return `ppme_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// V9 §3.5 standard tier — the test set the insurer expects unless
// they've overridden it via V9 §3.10 admin config.
const STANDARD_TESTS: PpmeTest[] = [
  { code: "BP",         name: "Blood pressure",            status: "pending" },
  { code: "HR",         name: "Heart rate",                 status: "pending" },
  { code: "BMI",        name: "BMI / weight / height",      status: "pending" },
  { code: "TEMP",       name: "Temperature",                status: "pending" },
  { code: "SPO2",       name: "SpO₂",                       status: "pending" },
  { code: "ECG",        name: "Electrocardiogram",          status: "pending" },
  { code: "CBC",        name: "Complete blood count",       status: "pending" },
  { code: "LIPID",      name: "Lipid profile",              status: "pending" },
  { code: "GLU",        name: "Fasting glucose",            status: "pending" },
  { code: "LFT",        name: "Liver function",             status: "pending" },
  { code: "RFT",        name: "Renal function",             status: "pending" },
  { code: "URINE",      name: "Urinalysis",                 status: "pending" },
  { code: "VISION",     name: "Vision (Snellen)",           status: "pending" },
  { code: "AUDIO",      name: "Audiogram",                  status: "pending" },
];

// V9 §3.9 tier pricing (default in INR cents; insurers can override
// per V9 §3.10).
const DEFAULT_TIER_FEES: Record<PpmeTier, number> = {
  basic:         150_000,    // ₹1,500
  standard:      300_000,    // ₹3,000
  comprehensive: 550_000,    // ₹5,500
  executive:     900_000,    // ₹9,000
};

const PLATFORM_COMMISSION_PCT = 15; // V9 §3.8 default; per-insurer override later

// ── Create ────────────────────────────────────────────────────────

export interface SchedulePpmeInput {
  patientId: string;
  patientName: string;
  patientPhone?: string;
  insurerId: string;
  insurerName: string;
  insurerRef: string;
  policyType: PpmeReport["policyType"];
  tier: PpmeTier;
  facilityId: string;
  facilityName: string;
  scheduledFor?: string;
  feeCentsOverride?: number;
  currency?: string;
}

export async function schedulePpme(input: SchedulePpmeInput): Promise<PpmeReport> {
  await ensureHydrated();
  const now = new Date().toISOString();
  const r: PpmeReport = {
    id: uid(),
    patientId: input.patientId,
    patientName: input.patientName,
    patientPhone: input.patientPhone,
    insurerId: input.insurerId,
    insurerName: input.insurerName,
    insurerRef: input.insurerRef,
    policyType: input.policyType,
    tier: input.tier,
    feeCents: input.feeCentsOverride ?? DEFAULT_TIER_FEES[input.tier],
    currency: input.currency || "INR",
    facilityId: input.facilityId,
    facilityName: input.facilityName,
    status: "scheduled",
    tests: STANDARD_TESTS.map((t) => ({ ...t })),
    photoUrls: [],
    scheduledFor: input.scheduledFor,
    createdAt: now,
    updatedAt: now,
  };
  reports.push(r);
  handle.flush();
  return r;
}

// ── Read ──────────────────────────────────────────────────────────

export async function getPpme(id: string): Promise<PpmeReport | null> {
  await ensureHydrated();
  return reports.find((r) => r.id === id) || null;
}

export async function listPpme(filter: { patientId?: string; insurerId?: string; facilityId?: string; status?: PpmeReport["status"]; limit?: number } = {}): Promise<PpmeReport[]> {
  await ensureHydrated();
  let rows = [...reports];
  if (filter.patientId)  rows = rows.filter((r) => r.patientId === filter.patientId);
  if (filter.insurerId)  rows = rows.filter((r) => r.insurerId === filter.insurerId);
  if (filter.facilityId) rows = rows.filter((r) => r.facilityId === filter.facilityId);
  if (filter.status)     rows = rows.filter((r) => r.status === filter.status);
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return rows.slice(0, filter.limit || 200);
}

// ── Update test results ───────────────────────────────────────────

export async function updateTest(
  reportId: string,
  code: string,
  patch: Partial<Pick<PpmeTest, "status" | "result" | "referenceRange" | "recordedBy" | "recordedAt">>,
): Promise<PpmeReport | null> {
  await ensureHydrated();
  const r = reports.find((x) => x.id === reportId);
  if (!r) return null;
  if (r.status === "submitted" || r.status === "approved") {
    throw new Error("report_locked");
  }
  const t = r.tests.find((x) => x.code === code);
  if (!t) return null;
  Object.assign(t, patch);
  r.status = "in_progress";
  r.updatedAt = new Date().toISOString();
  handle.flush();
  return r;
}

export async function attachPhoto(reportId: string, url: string): Promise<PpmeReport | null> {
  await ensureHydrated();
  const r = reports.find((x) => x.id === reportId);
  if (!r) return null;
  if (r.status === "submitted" || r.status === "approved") throw new Error("report_locked");
  if (!r.photoUrls.includes(url)) r.photoUrls.push(url);
  r.updatedAt = new Date().toISOString();
  handle.flush();
  return r;
}

// ── Submit + payment flow (V9 §3.7 + §3.8) ────────────────────────

import { createHash } from "crypto";

export async function submitPpme(
  reportId: string,
  examiner: { email: string; role?: string; notes?: string },
): Promise<PpmeReport | null> {
  await ensureHydrated();
  const r = reports.find((x) => x.id === reportId);
  if (!r) return null;
  if (r.status === "submitted" || r.status === "approved") return r;

  r.examinerEmail = examiner.email;
  if (examiner.notes) r.examinerNotes = examiner.notes;
  r.completedAt = new Date().toISOString();
  r.status = "submitted";

  // Lock the report by hashing the payload — the insurer can re-hash
  // to detect tampering.
  r.reportHash = createHash("sha256")
    .update(JSON.stringify({
      id: r.id,
      patientId: r.patientId,
      tier: r.tier,
      tests: r.tests,
      photoUrls: r.photoUrls,
      examinerEmail: r.examinerEmail,
      examinerNotes: r.examinerNotes,
      completedAt: r.completedAt,
    }))
    .digest("hex");

  r.updatedAt = r.completedAt;
  handle.flush();

  // ── Settlement (V9 §3.8) ──
  // Insurer wallet → Platform wallet → Facility wallet.
  // We split the fee inline rather than running it through a separate
  // settlement cron because PPME is small-volume + tightly-scoped.
  try {
    const insurerWallet = await ensureWallet("insurance", r.insurerId, r.currency);
    const facilityWallet = await ensureWallet("hospital", r.facilityId, r.currency);
    const platformWallet = await ensureWallet("platform", "platform-singleton", r.currency);

    const platformCut = Math.round((r.feeCents * PLATFORM_COMMISSION_PCT) / 100);
    const facilityCut = r.feeCents - platformCut;

    // Step 1: insurer → platform (full fee)
    if (insurerWallet.balanceCents >= r.feeCents) {
      await transfer({
        kind: "ppme_fee",
        fromWalletId: insurerWallet.id,
        toWalletId: platformWallet.id,
        amountCents: r.feeCents,
        currency: r.currency,
        refKind: "ppme",
        refId: r.id,
        note: `PPME ${r.tier} for ${r.patientName}`,
        actorEmail: examiner.email,
        actorRole: examiner.role,
      });

      // Step 2: platform → facility (facilityCut)
      if (facilityCut > 0) {
        await transfer({
          kind: "settlement",
          fromWalletId: platformWallet.id,
          toWalletId: facilityWallet.id,
          amountCents: facilityCut,
          currency: r.currency,
          refKind: "ppme",
          refId: r.id,
          note: `Facility payout for PPME ${r.id} (${100 - PLATFORM_COMMISSION_PCT}% of fee)`,
          actorEmail: examiner.email,
          actorRole: examiner.role,
        });
      }
    }
    // If the insurer wallet is under-funded we still submit the report
    // (medical evidence shouldn't block on accounting) — the unpaid
    // ppme_fee creates an AR row in V8 §7.4 collections.
  } catch {/* settlement failures don't block report submission */}

  await recordEvent({
    category: "clinical",
    action: "ppme.submitted",
    severity: "low",
    actorEmail: examiner.email,
    actorRole: examiner.role,
    subjectKind: "ppme_report",
    subjectId: r.id,
    summary: `PPME ${r.tier} submitted for ${r.patientName} → ${r.insurerName}`,
    after: { reportHash: r.reportHash, tier: r.tier, feeCents: r.feeCents, currency: r.currency },
  }).catch(() => {/* ignore */});

  // V6 §5.20 — PPME submit fan-out point
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const xc = require("@/lib/cross-connections") as typeof import("@/lib/cross-connections");
    xc.emit("ppme.submitted", {
      ppmeId: r.id,
      insurerId: r.insurerId,
      facilityId: r.facilityId,
      tier: r.tier,
      feeCents: r.feeCents,
      currency: r.currency,
    });
  } catch {/* ignore */}

  return r;
}

export async function decidePpme(
  reportId: string,
  decider: { email: string; role?: string },
  decision: "approved" | "rejected",
  note?: string,
): Promise<PpmeReport | null> {
  await ensureHydrated();
  const r = reports.find((x) => x.id === reportId);
  if (!r) return null;
  if (r.status !== "submitted") throw new Error("only_submitted_can_be_decided");
  r.status = decision;
  r.updatedAt = new Date().toISOString();
  handle.flush();

  await recordEvent({
    category: "admin",
    action: `ppme.${decision}`,
    actorEmail: decider.email,
    actorRole: decider.role,
    subjectKind: "ppme_report",
    subjectId: r.id,
    summary: `PPME ${r.id} ${decision}${note ? `: ${note}` : ""}.`,
  }).catch(() => {/* ignore */});

  return r;
}

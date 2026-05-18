// Medical tourism module. Spec v6.0 §24 / v6.3 §57.
//
// Three primitives:
//   - corridors  — super-admin curated pairs of (origin, destination,
//                  recommended hospitals, visa-assist contact). Drives
//                  the storefront on /medical-tourism.
//   - quotes     — patient asks for a procedure cost estimate; the
//                  destination hospital sends a locked quote after the
//                  pre-flight video consult.
//   - escrow_holds — payment held in escrow until the procedure is
//                  signed off by the surgeon. Real escrow integration
//                  with the payment gateway is stubbed here — the
//                  state machine + audit trail are real, but the
//                  funds movement is a no-op in this build.
//
// In production we'd wire this to a custodial escrow service (e.g.
// Razorpay Route or a regulated escrow agent for the larger
// procedure sums). The state machine below is the contract the UI
// + email templates code against.

import { bindPersistentArray } from "./persistent-array";

export interface TourismCorridor {
  id: string;
  /** ISO 3166-1 alpha-2 codes. */
  origin: string;
  destination: string;
  /** Display strings — "India → Thailand" etc. */
  label: string;
  /** Marketing blurb shown on the storefront card. */
  blurb: string;
  /** Anchor procedure used for the price compare table. */
  anchorProcedureSlug: string;
  /** Average savings vs origin baseline (60-95%). */
  savingsPercent: number;
  /** OduDoc-empanelled destination hospitals — opaque ids that
   *  resolve to the /admin/organizations registry. */
  hospitalIds: string[];
  /** Visa-assist agency contact bundled with the corridor. */
  visaContact?: string;
  /** Curated procedure list this corridor specialises in. */
  procedureSlugs: string[];
  active: boolean;
}

export type QuoteStatus = "requested" | "consult_scheduled" | "quoted" | "accepted" | "declined" | "expired";

export interface TourismQuote {
  id: string;
  patientEmail: string;
  patientName: string;
  procedureSlug: string;
  corridorId: string;
  hospitalId: string;
  status: QuoteStatus;
  /** Total in USD; localised at display time. */
  quotedUsd?: number;
  /** Surgeon who'll do the case (set after pre-flight consult). */
  surgeonDoctorId?: string;
  scheduledFor?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type EscrowStatus = "pending_funding" | "held" | "released" | "refunded";

export interface EscrowHold {
  id: string;
  quoteId: string;
  amountUsd: number;
  status: EscrowStatus;
  /** Payment gateway reference once funded. */
  paymentRef?: string;
  /** When the surgeon signs off + the funds release. */
  releasedAt?: string;
  /** If the procedure is cancelled / not performed. */
  refundedAt?: string;
  createdAt: string;
}

const corridors: TourismCorridor[] = [];
const quotes: TourismQuote[] = [];
const escrow: EscrowHold[] = [];

const corHy = bindPersistentArray<TourismCorridor>("tourism_corridors", corridors, () => []);
const quHy = bindPersistentArray<TourismQuote>("tourism_quotes", quotes, () => []);
const esHy = bindPersistentArray<EscrowHold>("tourism_escrow", escrow, () => []);
await corHy.hydrate();
await quHy.hydrate();
await esHy.hydrate();

// ── Seed corridors if empty so the storefront has content even on
//    a fresh deploy. Super admin can edit / disable / add via the
//    /admin/medical-tourism page (not wired in this MVP).
if (corridors.length === 0) {
  corridors.push(
    {
      id: "tc-in-th",
      origin: "IN", destination: "TH",
      label: "India → Thailand",
      blurb: "JCI-accredited Bangkok hospitals. Strong cardiac, cosmetic, and orthopaedic offerings.",
      anchorProcedureSlug: "knee-replacement",
      savingsPercent: 50,
      hospitalIds: [],
      visaContact: "tourism-th@odudoc.com",
      procedureSlugs: ["knee-replacement", "cardiac-bypass", "cosmetic-rhinoplasty"],
      active: true,
    },
    {
      id: "tc-us-in",
      origin: "US", destination: "IN",
      label: "US → India",
      blurb: "Top JCI / NABH hospitals in Mumbai, Delhi, Chennai. Average 87% cost savings vs US baseline.",
      anchorProcedureSlug: "cardiac-bypass",
      savingsPercent: 87,
      hospitalIds: [],
      visaContact: "tourism-in@odudoc.com",
      procedureSlugs: ["cardiac-bypass", "knee-replacement", "hip-replacement", "ivf", "dental-implants"],
      active: true,
    },
    {
      id: "tc-ae-in",
      origin: "AE", destination: "IN",
      label: "UAE → India",
      blurb: "Direct flights, language match, NRI surgeon network. Strong for complex onco + transplant.",
      anchorProcedureSlug: "liver-transplant",
      savingsPercent: 70,
      hospitalIds: [],
      visaContact: "tourism-in@odudoc.com",
      procedureSlugs: ["liver-transplant", "kidney-transplant", "oncology-pkg"],
      active: true,
    },
  );
  corHy.flush();
}

// ── Corridor queries ─────────────────────────────────────────────
export function listCorridors(opts: { activeOnly?: boolean } = {}): TourismCorridor[] {
  return opts.activeOnly ? corridors.filter((c) => c.active) : [...corridors];
}
export function getCorridor(id: string): TourismCorridor | null {
  return corridors.find((c) => c.id === id) || null;
}

// ── Quote lifecycle ──────────────────────────────────────────────
function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createQuote(input: Omit<TourismQuote, "id" | "status" | "createdAt" | "updatedAt">): TourismQuote {
  const at = new Date().toISOString();
  const q: TourismQuote = {
    id: id("tq"),
    status: "requested",
    createdAt: at,
    updatedAt: at,
    ...input,
  };
  quotes.unshift(q);
  quHy.flush();
  return q;
}

export function listQuotes(filter: { patientEmail?: string } = {}): TourismQuote[] {
  let list = [...quotes];
  if (filter.patientEmail) list = list.filter((q) => q.patientEmail.toLowerCase() === filter.patientEmail!.toLowerCase());
  return list;
}

export function updateQuoteStatus(quoteId: string, status: QuoteStatus, patch: Partial<TourismQuote> = {}): TourismQuote | null {
  const q = quotes.find((x) => x.id === quoteId);
  if (!q) return null;
  Object.assign(q, patch);
  q.status = status;
  q.updatedAt = new Date().toISOString();
  quHy.flush();
  return q;
}

// ── Escrow stubs ────────────────────────────────────────────────
// Funds movement is a no-op; the state machine is real so the UI
// and email pipeline can integrate. Plug into a real escrow service
// at /api/medical-tourism/escrow.
export function createEscrowHold(quoteId: string, amountUsd: number): EscrowHold {
  const e: EscrowHold = {
    id: id("esc"),
    quoteId,
    amountUsd,
    status: "pending_funding",
    createdAt: new Date().toISOString(),
  };
  escrow.push(e);
  esHy.flush();
  return e;
}

export function markEscrowFunded(escrowId: string, paymentRef: string): EscrowHold | null {
  const e = escrow.find((x) => x.id === escrowId);
  if (!e) return null;
  e.status = "held";
  e.paymentRef = paymentRef;
  esHy.flush();
  return e;
}

export function releaseEscrow(escrowId: string): EscrowHold | null {
  const e = escrow.find((x) => x.id === escrowId);
  if (!e || e.status !== "held") return null;
  e.status = "released";
  e.releasedAt = new Date().toISOString();
  esHy.flush();
  return e;
}

export function refundEscrow(escrowId: string): EscrowHold | null {
  const e = escrow.find((x) => x.id === escrowId);
  if (!e || e.status !== "held") return null;
  e.status = "refunded";
  e.refundedAt = new Date().toISOString();
  esHy.flush();
  return e;
}

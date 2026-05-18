// TeleICU multi-site monitoring. Spec v6.0 §4 + admin/teleicu.
//
// A central intensivist desk monitors ICU beds across multiple
// remote hospitals (typically a hub-and-spoke chain). Each remote
// bed streams vitals every 60 s; the central screen surfaces beds
// sorted by acuity (NEWS2 + custom flags). The intensivist can
// open a video link with the bedside nurse, sign a remote order,
// or flag a deterioration for on-site MET activation.
//
// Production: vitals stream via the existing wearables/devices
// pipeline; the central UI renders waveforms with a Mux/Cloudflare
// Stream link. MVP here is the bed registry + the acuity ranking +
// the action audit trail.

import { bindPersistentArray } from "./persistent-array";
import { calculateEws, type VitalSnapshot, type EwsVerdict } from "./ews";

export interface TeleIcuBed {
  id: string;
  /** Remote hospital this bed lives at. */
  organizationId: string;
  hospitalName: string;
  bedLabel: string;
  /** Patient currently in the bed (or null = empty). */
  patientEmail?: string;
  patientName?: string;
  /** Latest vitals snapshot — populated by the device stream. */
  vitals?: VitalSnapshot & { at: string };
  /** Intensivist's last review timestamp. */
  lastReviewAt?: string;
  /** True when the central desk has flagged this bed for closer
   *  attention regardless of EWS. */
  flagged?: boolean;
  flagReason?: string;
  active: boolean;
}

export interface TeleIcuAction {
  id: string;
  bedId: string;
  intensivistEmail: string;
  intensivistName: string;
  at: string;
  /** What the central intensivist did. */
  kind: "review" | "remote_order" | "video_call" | "flag" | "unflag" | "met_activation";
  /** Free-text note. */
  note?: string;
}

const beds: TeleIcuBed[] = [];
const actions: TeleIcuAction[] = [];

const bHy = bindPersistentArray<TeleIcuBed>("teleicu_beds", beds, () => []);
const aHy = bindPersistentArray<TeleIcuAction>("teleicu_actions", actions, () => []);
await bHy.hydrate();
await aHy.hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function registerBed(input: Omit<TeleIcuBed, "id" | "active">): TeleIcuBed {
  const b: TeleIcuBed = { id: id("icu"), active: true, ...input };
  beds.push(b);
  bHy.flush();
  return b;
}

export function pushVitals(bedId: string, vitals: VitalSnapshot): TeleIcuBed | null {
  const b = beds.find((x) => x.id === bedId);
  if (!b) return null;
  b.vitals = { ...vitals, at: new Date().toISOString() };
  bHy.flush();
  return b;
}

export function recordAction(input: Omit<TeleIcuAction, "id" | "at">): TeleIcuAction {
  const a: TeleIcuAction = { id: id("act"), at: new Date().toISOString(), ...input };
  actions.unshift(a);
  // Update bed last-review on review/video.
  if (input.kind === "review" || input.kind === "video_call") {
    const b = beds.find((x) => x.id === input.bedId);
    if (b) b.lastReviewAt = a.at;
    bHy.flush();
  }
  // Flag toggles
  if (input.kind === "flag") {
    const b = beds.find((x) => x.id === input.bedId);
    if (b) { b.flagged = true; b.flagReason = input.note; bHy.flush(); }
  }
  if (input.kind === "unflag") {
    const b = beds.find((x) => x.id === input.bedId);
    if (b) { b.flagged = false; b.flagReason = undefined; bHy.flush(); }
  }
  aHy.flush();
  return a;
}

/** Central desk view — beds across all hospitals, sorted by acuity.
 *  Acuity ranking: EWS critical > red > flagged > amber > stale
 *  (no recent review). */
export function centralDeskView(): Array<TeleIcuBed & { ews?: ReturnType<typeof calculateEws>; acuityScore: number }> {
  const now = Date.now();
  return beds
    .filter((b) => b.active && b.patientEmail) // only occupied beds
    .map((b) => {
      let ews: ReturnType<typeof calculateEws> | undefined;
      if (b.vitals) ews = calculateEws(b.vitals);
      let score = 0;
      if (ews) {
        score += ews.verdict === "critical" ? 1000 : ews.verdict === "red" ? 500 : ews.verdict === "amber" ? 100 : 0;
        score += ews.total * 10;
      }
      if (b.flagged) score += 200;
      // Stale review: if not reviewed in the last 6 hours, +50.
      if (!b.lastReviewAt || now - new Date(b.lastReviewAt).getTime() > 6 * 3600 * 1000) score += 50;
      return { ...b, ews, acuityScore: score };
    })
    .sort((a, b) => b.acuityScore - a.acuityScore);
}

export function listActions(bedId?: string): TeleIcuAction[] {
  return bedId ? actions.filter((a) => a.bedId === bedId) : [...actions];
}

export type { EwsVerdict };

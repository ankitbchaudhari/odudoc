// Captured voice orders + lifecycle.
//
// State machine:
//
//   draft       — captured by parser, awaiting nurse confirm
//   confirmed   — nurse OK'd; ready for pharmacy/lab/MD pickup
//   executed    — downstream system has acted (vitals saved into
//                 wearables-store, med dispensed, lab booked)
//   cancelled   — nurse discarded
//   flagged     — confidence < threshold; needs MD review

import { bindPersistentArray } from "../persistent-array";
import type { ParsedVoiceOrder } from "./parser";

export type VoiceOrderStatus =
  | "draft"
  | "confirmed"
  | "executed"
  | "cancelled"
  | "flagged";

export interface VoiceOrder extends ParsedVoiceOrder {
  id: string;
  organizationId: string;
  capturedByEmail?: string;
  capturedByName?: string;
  /** Optional fully-resolved bed id when the nurse picks from the
   *  bed picker (links back to the tele-icu bed-store). */
  bedId?: string;
  status: VoiceOrderStatus;
  /** Free-text edit buffer if the nurse tweaked the parsed order. */
  edits?: string;
  /** Confirmed-by metadata. */
  confirmedAt?: string;
  confirmedByEmail?: string;
  /** Where this got executed downstream — e.g. "wearables", "rx",
   *  "lab". The voice-orders system stays a thin capture layer; we
   *  push to the right downstream store on confirm. */
  executedAt?: string;
  executionTarget?: "vitals" | "rx" | "lab" | "note";
  executionRef?: string;
  events: Array<{ at: string; status: VoiceOrderStatus; note?: string }>;
  /** Original transcript span for audit. */
  transcript: string;
  createdAt: string;
  updatedAt: string;
}

const orders: VoiceOrder[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<VoiceOrder>(
  "voice_orders",
  orders,
  () => []
);
await hydrate();

export function listVoiceOrdersForOrg(orgId: string, opts: { status?: VoiceOrderStatus; limit?: number } = {}): VoiceOrder[] {
  let list = orders.filter((o) => o.organizationId === orgId);
  if (opts.status) list = list.filter((o) => o.status === opts.status);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function getVoiceOrder(id: string): VoiceOrder | null {
  return orders.find((o) => o.id === id) || null;
}

export interface CaptureInput {
  organizationId: string;
  capturedByEmail?: string;
  capturedByName?: string;
  bedId?: string;
  transcript: string;
  parsed: ParsedVoiceOrder;
}

export function captureOrder(input: CaptureInput): VoiceOrder {
  const now = new Date().toISOString();
  // Confidence < 0.7 → auto-flagged for review.
  const initialStatus: VoiceOrderStatus = input.parsed.confidence < 0.7 ? "flagged" : "draft";
  const o: VoiceOrder = {
    ...input.parsed,
    id: `vo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    capturedByEmail: input.capturedByEmail,
    capturedByName: input.capturedByName,
    bedId: input.bedId,
    status: initialStatus,
    transcript: input.transcript,
    events: [{ at: now, status: initialStatus }],
    createdAt: now,
    updatedAt: now,
  };
  orders.unshift(o);
  flush();
  return o;
}

const NEXT: Record<VoiceOrderStatus, VoiceOrderStatus[]> = {
  draft: ["confirmed", "cancelled", "flagged"],
  flagged: ["confirmed", "cancelled"],
  confirmed: ["executed", "cancelled"],
  executed: [],
  cancelled: [],
};

export interface TransitionInput {
  id: string;
  to: VoiceOrderStatus;
  note?: string;
  edits?: string;
  executionTarget?: VoiceOrder["executionTarget"];
  executionRef?: string;
  confirmedByEmail?: string;
}

export function transitionVoiceOrder(input: TransitionInput): VoiceOrder | null {
  const o = orders.find((x) => x.id === input.id);
  if (!o) return null;
  if (!NEXT[o.status].includes(input.to)) return null;
  const at = new Date().toISOString();
  o.status = input.to;
  if (input.edits !== undefined) o.edits = input.edits;
  if (input.to === "confirmed") {
    o.confirmedAt = at;
    if (input.confirmedByEmail) o.confirmedByEmail = input.confirmedByEmail;
  }
  if (input.to === "executed") {
    o.executedAt = at;
    if (input.executionTarget) o.executionTarget = input.executionTarget;
    if (input.executionRef) o.executionRef = input.executionRef;
  }
  o.events.push({ at, status: input.to, note: input.note });
  o.updatedAt = at;
  flush();
  return o;
}

export function deleteVoiceOrdersForOrg(orgId: string): number {
  let n = 0;
  for (let i = orders.length - 1; i >= 0; i--) {
    if (orders[i].organizationId === orgId) {
      tombstone(orders[i].id);
      orders.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}

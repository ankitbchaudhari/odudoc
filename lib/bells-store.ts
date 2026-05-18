// Bell devices + bell events. Spec v6.0 §30 + §31.
//
// "Bells" are how OduDoc moves patients through OPD queues + IPD
// wards without a wall of physical buttons. Three flavours:
//
//   - opd_phone     — patient's own phone rings when their OPD turn
//                     comes up. No hardware. CallKit on iOS / full-
//                     screen intent on Android.
//   - ipd_zigbee    — Sonoff Zigbee bedside bell. Hardware ~₹600,
//                     paired once via the gateway. Silent — fires a
//                     ward console toast + nurse phone push.
//   - ot_console    — wall-mounted button at OT consoles for code
//                     handoffs (Code Blue from OT, anesthesia call).
//
// All event types flow through the same `bell_events` log so the
// audit + acknowledgement workflow stays uniform. Acknowledgement
// requires a logged-in staff identity; first-ack wins (the others
// see the ack toast and stand down).

import { bindPersistentArray } from "./persistent-array";

export type BellKind = "opd_phone" | "ipd_zigbee" | "ot_console";

export interface BellDevice {
  id: string;
  kind: BellKind;
  /** Tenant (hospital / clinic) this device belongs to. */
  organizationId: string;
  /** Human label — "Bed 12A", "OT-2 console", or patient name for
   *  phone-as-bell devices. */
  label: string;
  /** For phone-as-bell — the patient's E.164 number. For Zigbee —
   *  the device MAC. For OT consoles — the room id. */
  identifier: string;
  /** When the device was paired / registered. */
  pairedAt: string;
  active: boolean;
}

export interface BellEvent {
  id: string;
  /** Device that fired. */
  deviceId: string;
  /** Denormalised so we can render the log without re-joining. */
  deviceKind: BellKind;
  deviceLabel: string;
  organizationId: string;
  /** What kind of call this was — drives downstream routing. */
  reason: "opd_queue_advance" | "ipd_help_request" | "ipd_pain" | "ipd_toilet" | "code_blue" | "code_pink" | "other";
  /** Free-text added by the caller (optional). */
  note?: string;
  /** When the bell rang. */
  firedAt: string;
  /** First staff member to acknowledge — clears the alarm. */
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  /** Closed when the underlying need is resolved (patient seen,
   *  meds delivered, etc). */
  closedAt?: string;
  closedBy?: string;
}

const devices: BellDevice[] = [];
const events: BellEvent[] = [];

const devHydrate = bindPersistentArray<BellDevice>("bells_devices", devices, () => []);
const evtHydrate = bindPersistentArray<BellEvent>("bells_events", events, () => []);
await devHydrate.hydrate();
await evtHydrate.hydrate();

function id(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Device management ────────────────────────────────────────────
export function registerDevice(input: Omit<BellDevice, "id" | "pairedAt" | "active"> & { active?: boolean }): BellDevice {
  const d: BellDevice = {
    id: id("bell"),
    pairedAt: new Date().toISOString(),
    active: input.active ?? true,
    ...input,
  };
  devices.push(d);
  devHydrate.flush();
  return d;
}

export function listDevices(orgId?: string): BellDevice[] {
  return orgId ? devices.filter((d) => d.organizationId === orgId) : [...devices];
}

export function setDeviceActive(deviceId: string, active: boolean): BellDevice | null {
  const d = devices.find((x) => x.id === deviceId);
  if (!d) return null;
  d.active = active;
  devHydrate.flush();
  return d;
}

// ── Event flow ───────────────────────────────────────────────────
export function fireBell(input: {
  deviceId: string;
  reason: BellEvent["reason"];
  note?: string;
}): BellEvent | null {
  const d = devices.find((x) => x.id === input.deviceId);
  if (!d) return null;
  const e: BellEvent = {
    id: id("evt"),
    deviceId: d.id,
    deviceKind: d.kind,
    deviceLabel: d.label,
    organizationId: d.organizationId,
    reason: input.reason,
    note: input.note,
    firedAt: new Date().toISOString(),
  };
  events.push(e);
  evtHydrate.flush();
  return e;
}

export function acknowledgeBell(eventId: string, staffId: string): BellEvent | null {
  const e = events.find((x) => x.id === eventId);
  if (!e || e.acknowledgedBy) return e || null;
  e.acknowledgedBy = staffId;
  e.acknowledgedAt = new Date().toISOString();
  evtHydrate.flush();
  return e;
}

export function closeBell(eventId: string, staffId: string): BellEvent | null {
  const e = events.find((x) => x.id === eventId);
  if (!e) return null;
  e.closedBy = staffId;
  e.closedAt = new Date().toISOString();
  evtHydrate.flush();
  return e;
}

export function listEvents(orgId?: string, opts: { activeOnly?: boolean } = {}): BellEvent[] {
  let list = orgId ? events.filter((e) => e.organizationId === orgId) : [...events];
  if (opts.activeOnly) list = list.filter((e) => !e.closedAt);
  return list.sort((a, b) => b.firedAt.localeCompare(a.firedAt));
}

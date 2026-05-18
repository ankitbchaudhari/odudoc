// Append-only scan log for the anti-counterfeit QR chain. Every
// scan of /api/pharma/scan?u=<serial> writes one row here.
//
// The first scan of a given serial is recorded as the "dispense"
// event (assumes a pharmacy scanning at the counter, or a patient
// scanning before opening the box). Subsequent scans are replays —
// the verify API surfaces this so a patient can tell whether
// they're holding a previously-dispensed unit.
//
// No PII is recorded by default. If a logged-in user scans, their
// id is captured for audit purposes; anonymous scans store only the
// hash of the IP so the same anonymous device can be correlated
// across scans without exposing the IP itself.

import crypto from "crypto";
import { bindPersistentArray } from "../persistent-array";

export interface ScanEvent {
  id: string;
  serial: string;
  at: string; // ISO datetime
  /** Optional — user id if scanner was signed in. */
  userId?: string;
  /** SHA-256(IP + salt) so we can correlate without retaining IPs. */
  fingerprint?: string;
  /** "verified" | "recalled" | "unknown" — denormalised so the log
   *  is queryable without re-joining batch state. */
  verdict: "verified" | "recalled" | "unknown";
  /** Geo hint when available (city / country from IP — TBD; null
   *  for now). */
  city?: string;
  country?: string;
}

const events: ScanEvent[] = [];
const { hydrate, flush } = bindPersistentArray<ScanEvent>(
  "pharma_scan_log",
  events,
  () => [],
);
await hydrate();

const HASH_SALT = process.env.PHARMA_SCAN_HASH_SALT || "odudoc-scan-salt-v1";

export function fingerprintIp(ip: string | null | undefined): string | undefined {
  if (!ip) return undefined;
  return crypto.createHash("sha256").update(ip + ":" + HASH_SALT).digest("hex").slice(0, 16);
}

export function recordScan(input: Omit<ScanEvent, "id" | "at">): ScanEvent {
  const e: ScanEvent = {
    id: `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    ...input,
  };
  events.push(e);
  flush();
  return e;
}

export function listScansForSerial(serial: string): ScanEvent[] {
  return events
    .filter((e) => e.serial.toUpperCase() === serial.toUpperCase())
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function listScansForBatch(serials: string[]): ScanEvent[] {
  const set = new Set(serials.map((s) => s.toUpperCase()));
  return events.filter((e) => set.has(e.serial.toUpperCase()));
}

export async function reloadScans(): Promise<void> {
  await hydrate();
}

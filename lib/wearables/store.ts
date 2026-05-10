// Wearable readings + linked devices.
//
// One bucket store for the whole stream of vitals coming off a
// patient's wearables. We deliberately keep it normalised + flat
// (one row per reading) rather than per-device-typed: any number of
// new device classes can land here without a schema migration.
// Aggregation happens in lib/wearables/insights.ts on read; this
// store just persists raw readings.
//
// Provider model: each patient links any number of `WearableDevice`
// rows (Fitbit account, Apple Health bundle, Mi Fit account, manual
// upload, etc.). Each device contributes readings tagged with its id
// for provenance. Devices can be unlinked any time, which leaves
// historical readings intact (audit-friendly).

import { bindPersistentArray } from "../persistent-array";

export type WearableProvider =
  | "fitbit"
  | "apple_health"
  | "google_fit"
  | "samsung_health"
  | "garmin"
  | "mi_fit"
  | "oura"
  | "whoop"
  | "manual";

export interface WearableDevice {
  id: string;
  userId: string;
  /** Optional dependent — kid's smartwatch on the parent's account. */
  dependentId?: string;
  provider: WearableProvider;
  /** Display name the patient picked: "Dad's Watch", "My Mi Band 7". */
  displayName: string;
  /** External account / device id from the provider. Free-text. */
  externalId?: string;
  /** Provider OAuth refresh token — encrypted in production. */
  refreshTokenCipher?: string;
  linkedAt: string;
  lastSyncAt?: string;
  status: "active" | "needs_reauth" | "revoked";
}

export type ReadingKind =
  | "hr_resting"
  | "hr_walking"
  | "hr_max"
  | "spo2"
  | "bp_systolic"
  | "bp_diastolic"
  | "blood_glucose"
  | "weight_kg"
  | "steps"
  | "calories_active"
  | "sleep_minutes"
  | "stress_score"
  | "vo2_max"
  | "ecg_rhythm"   // value is a numeric class (0=sinus, 1=afib, 2=other)
  | "temperature_c"
  | "respiratory_rate";

export interface WearableReading {
  id: string;
  userId: string;
  dependentId?: string;
  deviceId: string;
  kind: ReadingKind;
  /** Numeric value in the unit declared by the kind. */
  value: number;
  /** Optional aux fields for kinds that carry context — e.g. an
   *  ECG sample's classified rhythm string, or a BP cuff side. */
  context?: Record<string, string | number>;
  /** ISO timestamp of the reading. */
  takenAt: string;
  /** When ingestion happened (vs `takenAt` which is when the wearable
   *  recorded). Used for late-arrival reconciliation. */
  ingestedAt: string;
}

const devices: WearableDevice[] = [];
const { hydrate: hydrDev, flush: flushDev, tombstone: tombDev } =
  bindPersistentArray<WearableDevice>("wearable_devices", devices, () => []);
await hydrDev();

const readings: WearableReading[] = [];
const { hydrate: hydrRead, flush: flushRead, tombstone: tombRead } =
  bindPersistentArray<WearableReading>("wearable_readings", readings, () => []);
await hydrRead();

// ── Devices ───────────────────────────────────────────────────────
export function listDevices(userId: string): WearableDevice[] {
  return devices
    .filter((d) => d.userId === userId)
    .sort((a, b) => b.linkedAt.localeCompare(a.linkedAt));
}

export function getDevice(id: string): WearableDevice | null {
  return devices.find((d) => d.id === id) || null;
}

export interface LinkDeviceInput {
  userId: string;
  dependentId?: string;
  provider: WearableProvider;
  displayName: string;
  externalId?: string;
}

export function linkDevice(input: LinkDeviceInput): WearableDevice {
  const now = new Date().toISOString();
  const d: WearableDevice = {
    id: `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    dependentId: input.dependentId,
    provider: input.provider,
    displayName: input.displayName.trim(),
    externalId: input.externalId?.trim() || undefined,
    linkedAt: now,
    status: "active",
  };
  devices.push(d);
  flushDev();
  return d;
}

export function unlinkDevice(id: string, userId: string): boolean {
  const i = devices.findIndex((d) => d.id === id && d.userId === userId);
  if (i < 0) return false;
  tombDev(devices[i].id);
  devices.splice(i, 1);
  flushDev();
  return true;
}

export function markSync(deviceId: string): WearableDevice | null {
  const d = devices.find((x) => x.id === deviceId);
  if (!d) return null;
  d.lastSyncAt = new Date().toISOString();
  flushDev();
  return d;
}

// ── Readings ──────────────────────────────────────────────────────
export interface IngestReadingInput {
  userId: string;
  dependentId?: string;
  deviceId: string;
  kind: ReadingKind;
  value: number;
  takenAt: string;
  context?: WearableReading["context"];
}

export function ingestReadings(items: IngestReadingInput[]): WearableReading[] {
  if (items.length === 0) return [];
  const now = new Date().toISOString();
  const out: WearableReading[] = [];
  for (const i of items) {
    const r: WearableReading = {
      id: `wr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}-${out.length}`,
      userId: i.userId,
      dependentId: i.dependentId,
      deviceId: i.deviceId,
      kind: i.kind,
      value: i.value,
      context: i.context,
      takenAt: i.takenAt,
      ingestedAt: now,
    };
    readings.push(r);
    out.push(r);
  }
  flushRead();
  return out;
}

export interface ListReadingsInput {
  userId: string;
  dependentId?: string;
  kind?: ReadingKind;
  /** Inclusive ISO bounds; undefined = unbounded. */
  fromIso?: string;
  toIso?: string;
}

export function listReadings(input: ListReadingsInput): WearableReading[] {
  const fromMs = input.fromIso ? new Date(input.fromIso).getTime() : -Infinity;
  const toMs = input.toIso ? new Date(input.toIso).getTime() : Infinity;
  return readings
    .filter((r) => {
      if (r.userId !== input.userId) return false;
      if ((r.dependentId || "") !== (input.dependentId || "")) return false;
      if (input.kind && r.kind !== input.kind) return false;
      const t = new Date(r.takenAt).getTime();
      return t >= fromMs && t <= toMs;
    })
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}

export function deleteReadingsForUser(userId: string): number {
  let n = 0;
  for (let i = readings.length - 1; i >= 0; i--) {
    if (readings[i].userId === userId) {
      tombRead(readings[i].id);
      readings.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flushRead();
  return n;
}

export function deleteDevicesForUser(userId: string): number {
  let n = 0;
  for (let i = devices.length - 1; i >= 0; i--) {
    if (devices[i].userId === userId) {
      tombDev(devices[i].id);
      devices.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flushDev();
  return n;
}

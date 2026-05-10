// Symptom log.
//
// Patient self-reports symptoms with a 0-10 severity score. Designed
// for chronic-condition patterns (migraine days, IBS flares, joint
// pain) where the doctor wants a frequency + intensity record between
// visits. Each entry is a single point-in-time event — for ongoing
// symptoms the patient logs at start + end so we can compute duration.

import { bindPersistentArray } from "../persistent-array";

export type SymptomSeverity = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface SymptomEntry {
  id: string;
  userId: string;
  /** Free-text — "headache", "knee pain", "nausea". */
  symptom: string;
  severity: SymptomSeverity;
  /** Body-area tag for filtering — head, chest, abdomen, etc. */
  bodyArea?: "head" | "neck" | "chest" | "abdomen" | "back" | "limbs" | "skin" | "general" | "mental";
  /** Duration in minutes, when known. Long-running symptoms log
   *  start/end; we don't compute duration server-side. */
  durationMinutes?: number;
  /** Free-text trigger ("after coffee", "running", "post-meal"). */
  trigger?: string;
  /** Free-text relief / what helped. */
  relief?: string;
  notes?: string;
  takenAt: string;
  createdAt: string;
}

const entries: SymptomEntry[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<SymptomEntry>(
  "symptoms",
  entries,
  () => []
);
await hydrate();

export const BODY_AREA_LABEL: Record<NonNullable<SymptomEntry["bodyArea"]>, string> = {
  head: "Head", neck: "Neck", chest: "Chest", abdomen: "Abdomen",
  back: "Back", limbs: "Limbs", skin: "Skin", general: "General", mental: "Mental health",
};
export const BODY_AREA_EMOJI: Record<NonNullable<SymptomEntry["bodyArea"]>, string> = {
  head: "🧠", neck: "🦴", chest: "🫀", abdomen: "🫃",
  back: "🦴", limbs: "🦵", skin: "🩹", general: "🌡️", mental: "💭",
};

export interface AddSymptomInput {
  userId: string;
  symptom: string;
  severity: number;
  bodyArea?: SymptomEntry["bodyArea"];
  durationMinutes?: number;
  trigger?: string;
  relief?: string;
  notes?: string;
  takenAt?: string;
}

export function addSymptom(input: AddSymptomInput): SymptomEntry {
  const at = new Date().toISOString();
  const sev = Math.max(0, Math.min(10, Math.round(input.severity))) as SymptomSeverity;
  const e: SymptomEntry = {
    id: `sym-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    symptom: input.symptom.trim(),
    severity: sev,
    bodyArea: input.bodyArea,
    durationMinutes: input.durationMinutes && input.durationMinutes > 0 ? Math.floor(input.durationMinutes) : undefined,
    trigger: input.trigger?.trim() || undefined,
    relief: input.relief?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    takenAt: input.takenAt || at,
    createdAt: at,
  };
  entries.unshift(e);
  flush();
  return e;
}

export function listSymptoms(userId: string, opts: { since?: string; symptom?: string; limit?: number } = {}): SymptomEntry[] {
  let list = entries.filter((e) => e.userId === userId);
  if (opts.since) list = list.filter((e) => e.takenAt >= opts.since!);
  if (opts.symptom) {
    const s = opts.symptom.toLowerCase();
    list = list.filter((e) => e.symptom.toLowerCase().includes(s));
  }
  list.sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1));
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

export function deleteSymptom(id: string, userId: string): boolean {
  const i = entries.findIndex((e) => e.id === id && e.userId === userId);
  if (i < 0) return false;
  tombstone(entries[i].id);
  entries.splice(i, 1);
  flush();
  return true;
}

export function deleteSymptomsForUser(userId: string): number {
  let n = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].userId === userId) {
      tombstone(entries[i].id);
      entries.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}

export interface SymptomSummary {
  symptom: string;
  count: number;
  avgSeverity: number;
  lastAt: string;
}

/** Group recent symptoms by name (case-insensitive) for the dashboard. */
export function summarize(userId: string, sinceDays = 30): SymptomSummary[] {
  const since = new Date(); since.setDate(since.getDate() - sinceDays);
  const sinceIso = since.toISOString();
  const buckets = new Map<string, { name: string; sevSum: number; count: number; lastAt: string }>();
  for (const e of entries) {
    if (e.userId !== userId) continue;
    if (e.takenAt < sinceIso) continue;
    const key = e.symptom.toLowerCase();
    const cur = buckets.get(key);
    if (cur) {
      cur.sevSum += e.severity;
      cur.count++;
      if (e.takenAt > cur.lastAt) cur.lastAt = e.takenAt;
    } else {
      buckets.set(key, { name: e.symptom, sevSum: e.severity, count: 1, lastAt: e.takenAt });
    }
  }
  return Array.from(buckets.values())
    .map((b) => ({ symptom: b.name, count: b.count, avgSeverity: Math.round((b.sevSum / b.count) * 10) / 10, lastAt: b.lastAt }))
    .sort((a, b) => b.count - a.count);
}

// Vaccination records.
//
// One row per vaccine-dose-administered event. Patient may track
// multiple subjects (themselves + each family member) — keyed by
// (userId, subjectKey) where subjectKey is "self" or a family
// member's id. The store stays flat; the UI groups.

import { bindPersistentArray } from "../persistent-array";

export interface VaccinationRecord {
  id: string;
  userId: string;
  /** "self" or family member id. Profile-level isolation. */
  subjectKey: string;
  /** Subject's date of birth (ISO YYYY-MM-DD). Drives schedule timing. */
  subjectDob: string;
  /** Display name, e.g. "Aarav (son)". */
  subjectName: string;
  /** Stable id from SCHEDULE — the dose this record marks. */
  vaccineId: string;
  /** ISO date the dose was actually given. */
  receivedDate: string;
  /** Free-text — clinic / batch / lot. */
  notes?: string;
  /** Optional document id linking back to /dashboard/documents. */
  documentId?: string;
  createdAt: string;
}

const records: VaccinationRecord[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<VaccinationRecord>(
  "vaccinations",
  records,
  () => []
);
await hydrate();

export interface AddRecordInput {
  userId: string;
  subjectKey: string;
  subjectDob: string;
  subjectName: string;
  vaccineId: string;
  receivedDate: string;
  notes?: string;
  documentId?: string;
}

export function addRecord(input: AddRecordInput): VaccinationRecord {
  // (subjectKey, vaccineId) is unique — re-marking updates the row.
  const existing = records.find((r) =>
    r.userId === input.userId && r.subjectKey === input.subjectKey && r.vaccineId === input.vaccineId
  );
  if (existing) {
    existing.receivedDate = input.receivedDate;
    existing.notes = input.notes?.trim() || undefined;
    existing.documentId = input.documentId;
    existing.subjectDob = input.subjectDob;
    existing.subjectName = input.subjectName;
    flush();
    return existing;
  }
  const r: VaccinationRecord = {
    id: `vac-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    subjectKey: input.subjectKey,
    subjectDob: input.subjectDob,
    subjectName: input.subjectName,
    vaccineId: input.vaccineId,
    receivedDate: input.receivedDate,
    notes: input.notes?.trim() || undefined,
    documentId: input.documentId,
    createdAt: new Date().toISOString(),
  };
  records.unshift(r);
  flush();
  return r;
}

export function listRecords(userId: string, subjectKey?: string): VaccinationRecord[] {
  let list = records.filter((r) => r.userId === userId);
  if (subjectKey) list = list.filter((r) => r.subjectKey === subjectKey);
  return list.sort((a, b) => (a.receivedDate < b.receivedDate ? 1 : -1));
}

export function listSubjects(userId: string): Array<{ subjectKey: string; subjectName: string; subjectDob: string }> {
  const out = new Map<string, { subjectKey: string; subjectName: string; subjectDob: string }>();
  for (const r of records) {
    if (r.userId !== userId) continue;
    if (!out.has(r.subjectKey)) {
      out.set(r.subjectKey, { subjectKey: r.subjectKey, subjectName: r.subjectName, subjectDob: r.subjectDob });
    }
  }
  return Array.from(out.values());
}

export function deleteRecord(id: string, userId: string): boolean {
  const i = records.findIndex((r) => r.id === id && r.userId === userId);
  if (i < 0) return false;
  tombstone(records[i].id);
  records.splice(i, 1);
  flush();
  return true;
}

export function deleteVaccinationsForUser(userId: string): number {
  let n = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    if (records[i].userId === userId) {
      tombstone(records[i].id);
      records.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}

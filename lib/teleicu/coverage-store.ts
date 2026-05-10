// Tele-ICU coverage roster + handover notes.
//
// Two tables:
//   1. Coverage rows — which intensivist (User row, role: doctor) is
//      responsible for which bed during which time window. The
//      command center shows only the beds the signed-in intensivist
//      currently covers.
//   2. Notes — free-form handover entries on each bed. Critical
//      colour-coded so the next shift sees them at a glance.

import { bindPersistentArray } from "../persistent-array";

export interface IcuCoverage {
  id: string;
  bedId: string;
  /** Intensivist user id. */
  intensivistUserId: string;
  intensivistName?: string;
  /** Window start / end ISO. End=null means open-ended (still on shift). */
  fromIso: string;
  toIso?: string;
  /** Optional handoff note added when the shift ends. */
  endNote?: string;
  createdAt: string;
}

const coverage: IcuCoverage[] = [];
const { hydrate: hydrCov, flush: flushCov, tombstone: tombCov } =
  bindPersistentArray<IcuCoverage>("teleicu_coverage", coverage, () => []);
await hydrCov();

export function listCoverageForBed(bedId: string): IcuCoverage[] {
  return coverage
    .filter((c) => c.bedId === bedId)
    .sort((a, b) => b.fromIso.localeCompare(a.fromIso));
}

export function activeCoverageForBed(bedId: string): IcuCoverage | null {
  const now = Date.now();
  return (
    coverage.find(
      (c) =>
        c.bedId === bedId &&
        new Date(c.fromIso).getTime() <= now &&
        (!c.toIso || new Date(c.toIso).getTime() > now),
    ) || null
  );
}

export function bedsCoveredBy(intensivistUserId: string): string[] {
  const now = Date.now();
  const out = new Set<string>();
  for (const c of coverage) {
    if (c.intensivistUserId !== intensivistUserId) continue;
    if (new Date(c.fromIso).getTime() > now) continue;
    if (c.toIso && new Date(c.toIso).getTime() <= now) continue;
    out.add(c.bedId);
  }
  return Array.from(out);
}

export interface AssignCoverageInput {
  bedId: string;
  intensivistUserId: string;
  intensivistName?: string;
  fromIso?: string;
  toIso?: string;
}

export function assignCoverage(input: AssignCoverageInput): IcuCoverage {
  const now = new Date().toISOString();
  // Close any existing open coverage on this bed so we don't have
  // overlapping rows.
  for (const c of coverage) {
    if (c.bedId === input.bedId && !c.toIso) {
      c.toIso = now;
    }
  }
  const c: IcuCoverage = {
    id: `cov-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    bedId: input.bedId,
    intensivistUserId: input.intensivistUserId,
    intensivistName: input.intensivistName,
    fromIso: input.fromIso || now,
    toIso: input.toIso,
    createdAt: now,
  };
  coverage.push(c);
  flushCov();
  return c;
}

export function endCoverage(id: string, endNote?: string): IcuCoverage | null {
  const c = coverage.find((x) => x.id === id);
  if (!c) return null;
  if (c.toIso) return c;
  c.toIso = new Date().toISOString();
  c.endNote = endNote?.trim() || undefined;
  flushCov();
  return c;
}

export function deleteCoverageForBed(bedId: string): number {
  let n = 0;
  for (let i = coverage.length - 1; i >= 0; i--) {
    if (coverage[i].bedId === bedId) {
      tombCov(coverage[i].id);
      coverage.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flushCov();
  return n;
}

// ── Handover notes ──────────────────────────────────────────────
export interface IcuNote {
  id: string;
  bedId: string;
  authorEmail: string;
  authorName?: string;
  body: string;
  /** Colour tag for the command center. critical = red; concern =
   *  amber; info = neutral. */
  tag: "info" | "concern" | "critical";
  createdAt: string;
}

const notes: IcuNote[] = [];
const { hydrate: hydrNote, flush: flushNote, tombstone: tombNote } =
  bindPersistentArray<IcuNote>("teleicu_notes", notes, () => []);
await hydrNote();

export function listNotesForBed(bedId: string): IcuNote[] {
  return notes
    .filter((n) => n.bedId === bedId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface AddNoteInput {
  bedId: string;
  authorEmail: string;
  authorName?: string;
  body: string;
  tag?: IcuNote["tag"];
}

export function addNote(input: AddNoteInput): IcuNote {
  const n: IcuNote = {
    id: `inote-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    bedId: input.bedId,
    authorEmail: input.authorEmail,
    authorName: input.authorName,
    body: input.body.trim(),
    tag: input.tag || "info",
    createdAt: new Date().toISOString(),
  };
  notes.push(n);
  flushNote();
  return n;
}

export function deleteNotesForBed(bedId: string): number {
  let n = 0;
  for (let i = notes.length - 1; i >= 0; i--) {
    if (notes[i].bedId === bedId) {
      tombNote(notes[i].id);
      notes.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flushNote();
  return n;
}

// Admin-generated doctor letters — appointment + experience.
//
// Kept on disk so admins can reopen, reprint, or share a letter days
// after it was first generated. Each record stores only the *inputs*; the
// rendered HTML is built on demand by the /admin/letters/[id] page, which
// means we can tweak the template without re-issuing old letters.

import { bindPersistentArray, saveJson } from "./persistent-array";

export type LetterType = "appointment" | "experience";

export interface DoctorLetter {
  id: string;
  type: LetterType;

  // Recipient snapshot — frozen at generation time so renaming a doctor
  // doesn't retroactively rewrite an already-issued letter.
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  specialty: string;

  // Common fields
  designation: string;   // e.g. "Consultant Physician"
  department: string;    // e.g. "General Medicine"
  issuedOn: string;      // ISO date when the letter was generated
  referenceNo: string;   // e.g. "ODU/HR/APP/2026/0042"
  signedBy: string;      // e.g. "HR Manager"
  signedByTitle: string; // e.g. "Head of People, OduDoc"

  // Appointment-letter-specific
  joiningDate?: string;  // YYYY-MM-DD
  ctcAnnual?: number;    // total compensation, currency-agnostic (USD assumed)
  probationMonths?: number;
  noticePeriodDays?: number;
  workLocation?: string;

  // Experience-letter-specific
  startDate?: string;    // YYYY-MM-DD
  endDate?: string;      // YYYY-MM-DD
  conductRemarks?: string; // free text; defaults to a generic line

  // Free-text addendum an admin can add ("Additional terms" etc.)
  notes?: string;

  createdAt: string;
  createdBy: string; // admin email
}

const letters: DoctorLetter[] = [];
const { hydrate, reload, flush: _flush } = bindPersistentArray<DoctorLetter>(
  "doctor-letters",
  letters,
  () => [],
);
await hydrate();

/** Force re-read from the store — used on read paths that might be
 *  serving a different lambda than the one that issued the letter. */
export async function reloadLetters(): Promise<void> {
  await reload();
}

function nextReferenceNo(type: LetterType, at: Date): string {
  const year = at.getFullYear();
  const prefix = type === "appointment" ? "APP" : "EXP";
  const countThisYear = letters.filter(
    (l) => l.type === type && new Date(l.createdAt).getFullYear() === year,
  ).length + 1;
  return `ODU/HR/${prefix}/${year}/${String(countThisYear).padStart(4, "0")}`;
}

export function listLetters(opts: { doctorId?: string; type?: LetterType } = {}): DoctorLetter[] {
  let list = [...letters];
  if (opts.doctorId) list = list.filter((l) => l.doctorId === opts.doctorId);
  if (opts.type) list = list.filter((l) => l.type === opts.type);
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getLetterById(id: string): DoctorLetter | undefined {
  return letters.find((l) => l.id === id);
}

export async function createLetter(
  input: Omit<DoctorLetter, "id" | "createdAt" | "referenceNo" | "issuedOn"> &
    Partial<Pick<DoctorLetter, "referenceNo" | "issuedOn">>,
): Promise<DoctorLetter> {
  const now = new Date();
  const letter: DoctorLetter = {
    id: `ltr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now.toISOString(),
    issuedOn: input.issuedOn || now.toISOString().slice(0, 10),
    referenceNo: input.referenceNo || nextReferenceNo(input.type, now),
    ...input,
  };
  letters.push(letter);
  // Await the DB write before returning so the client's immediate GET for
  // /admin/letters/[id] — which may land on a different (cold) Lambda —
  // sees the row after hydrate. The bound auto-flush is fire-and-forget
  // and would race the redirect, producing a 404 on the new tab.
  await saveJson("doctor-letters", letters);
  return letter;
}

export function deleteLetter(id: string): boolean {
  const idx = letters.findIndex((l) => l.id === id);
  if (idx < 0) return false;
  // splice is wrapped by bindPersistentArray to auto-flush.
  letters.splice(idx, 1);
  return true;
}

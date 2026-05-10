// Imported prescription records (paper-Rx → structured).
//
// Each row carries the OCR'd text + parsed items + the patient
// (or dependent) it belongs to. Patients hit /dashboard/rx-import,
// drop a photo, edit the parsed items, save → row lands here. The
// row can later be linked to an encounter or pushed into the
// pharmacy-fulfillment matcher.

import { bindPersistentArray } from "../persistent-array";
import type { ParsedRxItem } from "./parser";

export type RxImportStatus = "draft" | "saved" | "discarded";

export interface RxImport {
  id: string;
  userId: string;
  dependentId?: string;
  /** Raw OCR text, kept for audit. */
  rawText: string;
  /** Final, possibly nurse/patient-edited items. */
  items: ParsedRxItem[];
  /** Original photo URL when uploaded; optional. */
  photoUrl?: string;
  /** Source label — "user_upload" / "ambient_scribe" / "manual". */
  source: "user_upload" | "manual" | "ambient_scribe";
  /** Free-text note from the patient when capturing. */
  note?: string;
  status: RxImportStatus;
  /** Whether this import has been forwarded to the pharmacy-
   *  fulfillment matcher; just a flag we surface in the UI. */
  forwardedToFulfillment?: boolean;
  createdAt: string;
  updatedAt: string;
}

const imports: RxImport[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<RxImport>(
  "rx_ocr_imports",
  imports,
  () => []
);
await hydrate();

export function listImportsForUser(userId: string): RxImport[] {
  return imports
    .filter((i) => i.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getImport(id: string, userId: string): RxImport | null {
  const r = imports.find((i) => i.id === id);
  if (!r || r.userId !== userId) return null;
  return r;
}

export interface SaveImportInput {
  userId: string;
  dependentId?: string;
  rawText: string;
  items: ParsedRxItem[];
  photoUrl?: string;
  source?: RxImport["source"];
  note?: string;
}

export function saveImport(input: SaveImportInput): RxImport {
  const now = new Date().toISOString();
  const r: RxImport = {
    id: `rxim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    dependentId: input.dependentId,
    rawText: input.rawText,
    items: input.items,
    photoUrl: input.photoUrl,
    source: input.source || "user_upload",
    note: input.note?.trim() || undefined,
    status: "saved",
    createdAt: now,
    updatedAt: now,
  };
  imports.unshift(r);
  flush();
  return r;
}

export function updateImport(
  id: string,
  userId: string,
  patch: Partial<Omit<RxImport, "id" | "userId" | "createdAt">>,
): RxImport | null {
  const r = getImport(id, userId);
  if (!r) return null;
  Object.assign(r, patch);
  r.updatedAt = new Date().toISOString();
  flush();
  return r;
}

export function discardImport(id: string, userId: string): boolean {
  const r = getImport(id, userId);
  if (!r) return false;
  r.status = "discarded";
  r.updatedAt = new Date().toISOString();
  flush();
  return true;
}

export function deleteImport(id: string, userId: string): boolean {
  const i = imports.findIndex((x) => x.id === id && x.userId === userId);
  if (i < 0) return false;
  tombstone(imports[i].id);
  imports.splice(i, 1);
  flush();
  return true;
}

export function deleteImportsForUser(userId: string): number {
  let n = 0;
  for (let i = imports.length - 1; i >= 0; i--) {
    if (imports[i].userId === userId) {
      tombstone(imports[i].id);
      imports.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}

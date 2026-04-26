// Audit log of admin access to KYC / identity documents.
//
// Every signed-URL mint AND every actual fetch is recorded here so we
// can answer "who viewed Dr. X's passport scan and when". One row per
// event; never deleted, never modified.
//
// Backed by Postgres via bindPersistentArray so the log survives
// Lambda recycles. Querying a 100k-row blob is fine for v1; if this
// grows past 10M we'll move it to a dedicated table with date-based
// partitioning.

import { bindPersistentArray } from "./persistent-array";

export type AccessKind = "sign" | "fetch";

export interface BlobAccessEvent {
  id: string;
  kind: AccessKind;
  path: string;
  /** Admin email taken from the session at access time. */
  adminEmail: string;
  /** IP captured from x-forwarded-for. */
  ipAddress?: string;
  userAgent?: string;
  /** Application id this document is attached to, when known. */
  applicationId?: string;
  /** True if the access succeeded. False rows record failed attempts
   *  (expired token, signature mismatch) so we can spot abuse. */
  success: boolean;
  reason?: string;
  at: string; // ISO
}

const events: BlobAccessEvent[] = [];
const { hydrate, flush } = bindPersistentArray<BlobAccessEvent>(
  "blob-access-log",
  events,
  () => [],
);
await hydrate();

export interface RecordEventInput {
  kind: AccessKind;
  path: string;
  adminEmail: string;
  ipAddress?: string;
  userAgent?: string;
  applicationId?: string;
  success: boolean;
  reason?: string;
}

export function recordAccess(input: RecordEventInput): BlobAccessEvent {
  const ev: BlobAccessEvent = {
    id: `bal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    ...input,
  };
  events.push(ev);
  flush();
  return ev;
}

export function listAccess(opts: { limit?: number; path?: string } = {}): BlobAccessEvent[] {
  let list = [...events];
  if (opts.path) list = list.filter((e) => e.path === opts.path);
  list.sort((a, b) => b.at.localeCompare(a.at));
  if (opts.limit) list = list.slice(0, opts.limit);
  return list;
}

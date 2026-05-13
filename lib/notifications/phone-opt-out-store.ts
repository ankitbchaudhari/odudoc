// Phone-keyed opt-out registry.
//
// The richer `preferences-store` keys by userId, which works for
// signed-in users but doesn't help when a STOP message arrives from
// a phone number we can't immediately map to a user (no signed-in
// session, no email on hand). This store records opt-outs by phone
// number so the SMS / WhatsApp dispatch paths can skip them
// regardless of which user record owns the number.
//
// Patient un-opts-out by replying START — the chatbot calls
// `removeOptOut()` which deletes the row here.

import { bindPersistentArray } from "../persistent-array";

interface OptOutRow {
  /** E.164 phone number, normalised with leading "+". */
  phone: string;
  /** ISO timestamp when the opt-out was recorded. */
  optedOutAt: string;
}

const rows: OptOutRow[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<OptOutRow>(
  "phone-opt-outs",
  rows,
  () => []
);
await hydrate();

function normalise(phone: string): string {
  const trimmed = phone.trim();
  return trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/^\+?/, "")}`;
}

export function recordOptOut(phone: string): void {
  const norm = normalise(phone);
  // Idempotent — don't write a duplicate row if the number is
  // already opted out.
  if (rows.some((r) => r.phone === norm)) return;
  rows.push({ phone: norm, optedOutAt: new Date().toISOString() });
  flush();
}

export function removeOptOut(phone: string): void {
  const norm = normalise(phone);
  const i = rows.findIndex((r) => r.phone === norm);
  if (i < 0) return;
  tombstone(rows[i].phone);
  rows.splice(i, 1);
  flush();
}

export function isPhoneOptedOut(phone: string): boolean {
  const norm = normalise(phone);
  return rows.some((r) => r.phone === norm);
}

// In-memory + persistent log of WhatsApp / sent.dm outbound sends.
//
// Vercel function logs are great for ops but unreadable from the
// admin UI. This store is the lightweight alternative — bounded at
// 5000 rows so storage stays small, masked phone numbers so a
// snapshot leak doesn't dump full E.164s.

import { bindPersistentArray } from "../persistent-array";

export interface WaDeliveryEntry {
  id: string;
  ts: string;
  template: string;
  channel: string;
  /** Phone masked to first-3 + last-2; middle replaced with stars. */
  to: string;
  success: boolean;
  error?: string;
  messageId?: string;
  sentBy: "system";
}

const MAX_ROWS = 5000;

const rows: WaDeliveryEntry[] = [];
const { hydrate, flush } = bindPersistentArray<WaDeliveryEntry>(
  "wa-delivery-log",
  rows,
  () => [],
);
await hydrate();

/** Mask an E.164 to keep only the first 3 and last 2 digits, with
 *  stars in between. Defensive against odd inputs — never throws. */
export function maskPhone(raw: string): string {
  const s = String(raw || "").trim();
  if (s.length <= 5) return s.replace(/\d/g, "*");
  const plus = s.startsWith("+") ? "+" : "";
  const digits = s.replace(/[^\d]/g, "");
  if (digits.length <= 5) return plus + digits.replace(/\d/g, "*");
  const head = digits.slice(0, 3);
  const tail = digits.slice(-2);
  const middle = "*".repeat(Math.max(1, digits.length - 5));
  return `${plus}${head}${middle}${tail}`;
}

export interface LogWaSendInput {
  template: string;
  channel?: string;
  to: string;
  success: boolean;
  error?: string;
  messageId?: string;
}

export function logWaSend(input: LogWaSendInput): void {
  const entry: WaDeliveryEntry = {
    id: `wa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    template: input.template || "(unknown)",
    channel: input.channel || "sent",
    to: maskPhone(input.to),
    success: Boolean(input.success),
    error: input.error,
    messageId: input.messageId,
    sentBy: "system",
  };
  rows.unshift(entry);
  if (rows.length > MAX_ROWS) {
    // Drop oldest. unshift puts new entries at index 0 so old ones
    // are at the tail.
    rows.splice(MAX_ROWS, rows.length - MAX_ROWS);
  }
  flush();
}

export interface ListWaSendsOpts {
  limit?: number;
  sinceMs?: number;
  template?: string;
}

export function listWaSends(opts: ListWaSendsOpts = {}): WaDeliveryEntry[] {
  let out = rows.slice();
  if (opts.sinceMs) {
    const cutoff = Date.now() - opts.sinceMs;
    out = out.filter((r) => new Date(r.ts).getTime() >= cutoff);
  }
  if (opts.template) {
    out = out.filter((r) => r.template === opts.template);
  }
  if (opts.limit && opts.limit > 0) {
    out = out.slice(0, opts.limit);
  }
  return out;
}

export interface WaDeliveryStats {
  totalToday: number;
  successToday: number;
  failedToday: number;
  successRateToday: number;
  topTemplate?: { template: string; count: number };
  topFailureReason?: { error: string; count: number };
}

export function computeStats(): WaDeliveryStats {
  const cutoff = Date.now() - 24 * 3600 * 1000;
  const today = rows.filter((r) => new Date(r.ts).getTime() >= cutoff);
  const success = today.filter((r) => r.success).length;
  const failed = today.length - success;

  const tCounts: Record<string, number> = {};
  for (const r of today) tCounts[r.template] = (tCounts[r.template] || 0) + 1;
  let topTemplate: WaDeliveryStats["topTemplate"];
  for (const [template, count] of Object.entries(tCounts)) {
    if (!topTemplate || count > topTemplate.count) topTemplate = { template, count };
  }

  const eCounts: Record<string, number> = {};
  for (const r of today) {
    if (!r.success && r.error) eCounts[r.error] = (eCounts[r.error] || 0) + 1;
  }
  let topFailureReason: WaDeliveryStats["topFailureReason"];
  for (const [error, count] of Object.entries(eCounts)) {
    if (!topFailureReason || count > topFailureReason.count) topFailureReason = { error, count };
  }

  return {
    totalToday: today.length,
    successToday: success,
    failedToday: failed,
    successRateToday: today.length === 0 ? 0 : Math.round((success / today.length) * 100),
    topTemplate,
    topFailureReason,
  };
}

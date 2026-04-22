// OPD Queue & Token Management. Tenant-scoped.
//
// Distinct from Appointments (which is scheduled future slots). Queue is
// the live walk-in / same-day flow at physical counters/consulting rooms.
//
// Two entities:
//   QueueCounter — physical counter/room with current serving state
//   QueueToken   — a live ticket issued to a patient in a counter's queue
//
// Token lifecycle:
//   waiting → called → serving → served
//         ↘        ↘         ↘
//          cancelled skipped  no_show
//
// Side effects:
//   * calling a token stamps calledAt and sets counter.currentTokenId
//   * starting (serving) stamps servingStartedAt
//   * completing (served) stamps servedAt and clears counter.currentTokenId
//   * per-token waitSeconds computed at terminal states

import { bindPersistentArray } from "../persistent-array";

export type TokenPriority = "emergency" | "senior" | "regular" | "followup";
export type TokenStatus =
  | "waiting"
  | "called"
  | "serving"
  | "served"
  | "skipped"
  | "no_show"
  | "cancelled";

export type CounterStatus = "open" | "paused" | "closed";

export interface QueueCounter {
  id: string;
  organizationId: string;
  counterCode: string; // Q-{suffix}-{seq}
  name: string; // "OPD-1", "ENT Room 2"
  serviceType?: string; // "General OPD", "Cardiology", "Dressing"
  doctor?: string; // current doctor name
  status: CounterStatus;
  currentTokenId?: string;
  tokenCounter: number; // daily running counter (resets on resetDay)
  lastResetDay?: string; // YYYY-MM-DD
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QueueToken {
  id: string;
  organizationId: string;
  counterId: string;
  tokenNumber: string; // displayed like "A-042" — counter letter + seq
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  priority: TokenPriority;
  reason?: string;
  status: TokenStatus;
  issuedAt: string;
  calledAt?: string;
  servingStartedAt?: string;
  servedAt?: string;
  cancelledAt?: string;
  waitSeconds?: number; // issued → serving (or terminal if not served)
  serveSeconds?: number; // servingStartedAt → servedAt
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const counters: QueueCounter[] = [];
const tokens: QueueToken[] = [];

const { hydrate: hydrateC, flush: flushC } = bindPersistentArray<QueueCounter>(
  "hospital-queue-counters",
  counters,
  () => []
);
const { hydrate: hydrateT, flush: flushT } = bindPersistentArray<QueueToken>(
  "hospital-queue-tokens",
  tokens,
  () => []
);
await hydrateC();
await hydrateT();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextCounterCode(orgId: string): string {
  const n = counters.filter((c) => c.organizationId === orgId).length + 1;
  return `Q-${orgSuffix(orgId)}-${String(n).padStart(2, "0")}`;
}

function counterLetter(counter: QueueCounter): string {
  // First letter of name (A-Z), fallback to last 2 of code.
  const m = counter.name.match(/[A-Za-z]/);
  return (m ? m[0] : counter.counterCode.slice(-2)).toUpperCase();
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function bumpTokenCounter(c: QueueCounter): number {
  const today = todayStr();
  if (c.lastResetDay !== today) {
    c.tokenCounter = 0;
    c.lastResetDay = today;
  }
  c.tokenCounter += 1;
  return c.tokenCounter;
}

// Counters -----------------------------------------------------------

export function listCounters(organizationId: string): QueueCounter[] {
  return counters
    .filter((c) => c.organizationId === organizationId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface CounterInput {
  name?: string;
  serviceType?: string;
  doctor?: string;
  status?: CounterStatus;
  active?: boolean;
}

export function createCounter(organizationId: string, input: CounterInput): QueueCounter {
  const now = new Date().toISOString();
  const c: QueueCounter = {
    id: `qc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    counterCode: nextCounterCode(organizationId),
    name: (input.name || "Counter").trim(),
    serviceType: input.serviceType?.trim() || undefined,
    doctor: input.doctor?.trim() || undefined,
    status: input.status || "open",
    currentTokenId: undefined,
    tokenCounter: 0,
    lastResetDay: todayStr(),
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  counters.unshift(c);
  flushC();
  return c;
}

export function updateCounter(
  id: string,
  organizationId: string,
  patch: Partial<CounterInput>
): QueueCounter | null {
  const c = counters.find((x) => x.id === id && x.organizationId === organizationId);
  if (!c) return null;
  if (patch.name !== undefined) c.name = patch.name.trim();
  if (patch.serviceType !== undefined) c.serviceType = patch.serviceType?.trim() || undefined;
  if (patch.doctor !== undefined) c.doctor = patch.doctor?.trim() || undefined;
  if (patch.status !== undefined) c.status = patch.status;
  if (patch.active !== undefined) c.active = patch.active;
  c.updatedAt = new Date().toISOString();
  flushC();
  return c;
}

export function deleteCounter(id: string, organizationId: string): boolean {
  const idx = counters.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  // Cancel any active tokens on this counter.
  const now = new Date().toISOString();
  for (const t of tokens) {
    if (t.counterId === id && t.organizationId === organizationId) {
      if (t.status === "waiting" || t.status === "called" || t.status === "serving") {
        t.status = "cancelled";
        t.cancelledAt = now;
        t.updatedAt = now;
      }
    }
  }
  counters.splice(idx, 1);
  flushC();
  flushT();
  return true;
}

// Tokens -------------------------------------------------------------

export function listTokens(opts: {
  organizationId: string;
  counterId?: string;
  status?: TokenStatus;
  date?: string; // filter issuedAt prefix
}): QueueToken[] {
  let list = tokens.filter((t) => t.organizationId === opts.organizationId);
  if (opts.counterId) list = list.filter((t) => t.counterId === opts.counterId);
  if (opts.status) list = list.filter((t) => t.status === opts.status);
  if (opts.date) list = list.filter((t) => t.issuedAt.slice(0, 10) === opts.date);
  // Active statuses sorted by priority then issuedAt; terminal by issuedAt desc.
  const priorityRank: Record<TokenPriority, number> = {
    emergency: 0,
    senior: 1,
    regular: 2,
    followup: 3,
  };
  return list.sort((a, b) => {
    const aActive = a.status === "waiting" || a.status === "called" || a.status === "serving";
    const bActive = b.status === "waiting" || b.status === "called" || b.status === "serving";
    if (aActive !== bActive) return aActive ? -1 : 1;
    if (aActive) {
      const p = priorityRank[a.priority] - priorityRank[b.priority];
      if (p !== 0) return p;
      return a.issuedAt.localeCompare(b.issuedAt);
    }
    return b.issuedAt.localeCompare(a.issuedAt);
  });
}

export interface TokenInput {
  counterId?: string;
  patientName?: string;
  patientPhone?: string;
  patientAge?: number;
  priority?: TokenPriority;
  reason?: string;
  notes?: string;
  status?: TokenStatus;
}

export function issueToken(organizationId: string, input: TokenInput): QueueToken | null {
  if (!input.counterId) return null;
  const counter = counters.find(
    (c) => c.id === input.counterId && c.organizationId === organizationId
  );
  if (!counter) return null;
  const now = new Date().toISOString();
  const seq = bumpTokenCounter(counter);
  const letter = counterLetter(counter);
  const t: QueueToken = {
    id: `qt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    counterId: counter.id,
    tokenNumber: `${letter}-${String(seq).padStart(3, "0")}`,
    patientName: (input.patientName || "").trim(),
    patientPhone: input.patientPhone?.trim() || undefined,
    patientAge: input.patientAge !== undefined ? Math.max(0, Math.round(Number(input.patientAge))) : undefined,
    priority: input.priority || "regular",
    reason: input.reason?.trim() || undefined,
    status: "waiting",
    issuedAt: now,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  tokens.unshift(t);
  counter.updatedAt = now;
  flushT();
  flushC();
  return t;
}

function recomputeWait(t: QueueToken) {
  // If we hit serving, waitSeconds = serving - issued.
  // Otherwise (terminal from waiting/called like cancelled/skipped/no_show),
  // waitSeconds = terminal - issued.
  const issued = new Date(t.issuedAt).getTime();
  const terminus =
    t.servingStartedAt ? new Date(t.servingStartedAt).getTime()
    : t.cancelledAt ? new Date(t.cancelledAt).getTime()
    : null;
  if (terminus !== null && !Number.isNaN(issued) && !Number.isNaN(terminus)) {
    t.waitSeconds = Math.max(0, Math.round((terminus - issued) / 1000));
  }
}

function recomputeServe(t: QueueToken) {
  if (t.servingStartedAt && t.servedAt) {
    const a = new Date(t.servingStartedAt).getTime();
    const b = new Date(t.servedAt).getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      t.serveSeconds = Math.max(0, Math.round((b - a) / 1000));
    }
  }
}

export function updateToken(
  id: string,
  organizationId: string,
  patch: Partial<TokenInput>
): QueueToken | null {
  const t = tokens.find((x) => x.id === id && x.organizationId === organizationId);
  if (!t) return null;
  const now = new Date().toISOString();

  if (patch.patientName !== undefined) t.patientName = patch.patientName.trim();
  if (patch.patientPhone !== undefined) t.patientPhone = patch.patientPhone?.trim() || undefined;
  if (patch.patientAge !== undefined)
    t.patientAge = Math.max(0, Math.round(Number(patch.patientAge)));
  if (patch.priority !== undefined) t.priority = patch.priority;
  if (patch.reason !== undefined) t.reason = patch.reason?.trim() || undefined;
  if (patch.notes !== undefined) t.notes = patch.notes?.trim() || undefined;

  if (patch.status !== undefined && patch.status !== t.status) {
    const counter = counters.find(
      (c) => c.id === t.counterId && c.organizationId === organizationId
    );
    const prev = t.status;
    t.status = patch.status;

    if (patch.status === "called" && !t.calledAt) t.calledAt = now;
    if (patch.status === "serving") {
      if (!t.calledAt) t.calledAt = now;
      if (!t.servingStartedAt) t.servingStartedAt = now;
      if (counter) {
        counter.currentTokenId = t.id;
        counter.updatedAt = now;
      }
    }
    if (patch.status === "served") {
      if (!t.servedAt) t.servedAt = now;
      if (!t.servingStartedAt) t.servingStartedAt = t.servedAt;
      if (counter && counter.currentTokenId === t.id) {
        counter.currentTokenId = undefined;
        counter.updatedAt = now;
      }
    }
    if (patch.status === "cancelled" && !t.cancelledAt) t.cancelledAt = now;
    if ((patch.status === "skipped" || patch.status === "no_show") && counter && counter.currentTokenId === t.id) {
      counter.currentTokenId = undefined;
      counter.updatedAt = now;
    }
    void prev;
    recomputeWait(t);
    recomputeServe(t);
    flushC();
  }

  t.updatedAt = now;
  flushT();
  return t;
}

export function deleteToken(id: string, organizationId: string): boolean {
  const idx = tokens.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  const t = tokens[idx];
  const counter = counters.find(
    (c) => c.id === t.counterId && c.organizationId === organizationId
  );
  if (counter && counter.currentTokenId === t.id) {
    counter.currentTokenId = undefined;
    counter.updatedAt = new Date().toISOString();
    flushC();
  }
  tokens.splice(idx, 1);
  flushT();
  return true;
}

/** Call the next waiting token at this counter (highest priority, earliest issued). */
export function callNext(counterId: string, organizationId: string): QueueToken | null {
  const counter = counters.find((c) => c.id === counterId && c.organizationId === organizationId);
  if (!counter) return null;
  const now = new Date().toISOString();

  const priorityRank: Record<TokenPriority, number> = {
    emergency: 0, senior: 1, regular: 2, followup: 3,
  };
  const candidates = tokens
    .filter((t) => t.counterId === counterId && t.organizationId === organizationId && t.status === "waiting")
    .sort((a, b) => {
      const p = priorityRank[a.priority] - priorityRank[b.priority];
      if (p !== 0) return p;
      return a.issuedAt.localeCompare(b.issuedAt);
    });
  const next = candidates[0];
  if (!next) return null;

  // If there was a previously called/serving token not terminalized, mark it skipped.
  if (counter.currentTokenId && counter.currentTokenId !== next.id) {
    const prev = tokens.find((t) => t.id === counter.currentTokenId);
    if (prev && (prev.status === "called" || prev.status === "serving")) {
      prev.status = prev.status === "serving" ? "served" : "skipped";
      if (prev.status === "served" && !prev.servedAt) prev.servedAt = now;
      recomputeWait(prev);
      recomputeServe(prev);
      prev.updatedAt = now;
    }
  }

  next.status = "called";
  next.calledAt = now;
  next.updatedAt = now;
  counter.currentTokenId = next.id;
  counter.updatedAt = now;
  flushT();
  flushC();
  return next;
}

// Generic persistence helper for in-memory arrays that need to survive
// Vercel Lambda recycles.
//
// Design: every store has a single JSONB row in the `app_kv` table keyed by
// its store name. On first use the Lambda hydrates the in-memory array from
// that row, then every mutation triggers a background write back. The store
// keeps working synchronously on the hydrated array — only the first call
// per cold start pays the DB round-trip.
//
// Two usage patterns are supported:
//
//   1) Classic (explicit):
//        const { hydrate, flush } = bindPersistentArray("key", arr, seed);
//        await hydrate();
//        arr.push(x); flush();
//
//   2) Ergonomic (current Phase-1 stores):
//        const h = bindPersistentArray("key", arr, seed);
//        await h;               // thenable — triggers hydrate()
//        arr.push(x);           // auto-flushed (mutator methods are wrapped)
//
// Mutator methods wrapped for auto-flush: push, pop, shift, unshift, splice,
// sort, reverse, fill, copyWithin. Direct index assignment (`arr[i] = x`)
// is NOT auto-flushed — stores must use `arr.splice(i, 1, newValue)` or
// call `flush()` manually.
//
// Trade-offs: reads the whole array each mutation (fine for <10k rows),
// no DB-level concurrency protection (last write wins — acceptable for
// admin-edited stores, not for high-concurrency mutations).

import { sql, ensureSchema } from "./db";

import { log } from "./log";
async function initKv(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS app_kv (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function kvReady(): Promise<void> {
  await ensureSchema(initKv);
}

export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    await kvReady();
    const rows = (await sql`SELECT data FROM app_kv WHERE key = ${key} LIMIT 1`) as Array<{
      data: unknown;
    }>;
    if (!rows[0]) return fallback;
    return rows[0].data as T;
  } catch (err) {
    log.error("persistent_array.load_failed", err, { key });
    return fallback;
  }
}

/**
 * Strict load — distinguishes "row missing" from "DB unavailable" so the
 * caller can decide whether to seed-and-save or skip.
 *
 *   { ok: true, found: true, data }    — row exists, return data
 *   { ok: true, found: false }         — row missing, caller may seed
 *   { ok: false, error }               — DB unreachable, DO NOT overwrite
 *
 * Critical for hydrate(): the previous `loadJson(key, null)` couldn't
 * tell these apart, so a transient DB blip on cold start would seed
 * with the bootstrap defaults and then `saveJson(key, ref)` would
 * overwrite the real Postgres data with seeds, wiping every user /
 * order / record for that key. This is the bug that surfaced as
 * "Email verified — you can sign in now" followed by login replying
 * "No account found with this email".
 */
export type LoadResult<T> =
  | { ok: true; found: true; data: T }
  | { ok: true; found: false }
  | { ok: false; error: Error };

export async function loadJsonStrict<T>(key: string): Promise<LoadResult<T>> {
  try {
    await kvReady();
    const rows = (await sql`SELECT data FROM app_kv WHERE key = ${key} LIMIT 1`) as Array<{
      data: unknown;
    }>;
    if (!rows[0]) return { ok: true, found: false };
    return { ok: true, found: true, data: rows[0].data as T };
  } catch (err) {
    log.error("persistent_array.load_failed", err, { key });
    return { ok: false, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// Lightweight count: pulls a single integer from Postgres instead of the
// entire JSON blob. Used by dashboard/list endpoints that only need
// `arr.length` — hydrating a 1000-row store just to call .length burns
// the free-tier data transfer quota fast.
export async function countJsonArray(key: string): Promise<number> {
  try {
    await kvReady();
    const rows = (await sql`
      SELECT COALESCE(jsonb_array_length(data), 0)::int AS n
      FROM app_kv WHERE key = ${key} LIMIT 1
    `) as Array<{ n: number }>;
    return rows[0]?.n ?? 0;
  } catch (err) {
    log.error("persistent_array.count_failed", err, { key });
    return 0;
  }
}

// Pull the last N entries of a JSON array store without transferring the
// whole blob. Used by dashboard tiles that show "5 recent orders" etc.
// Implemented as a JSONB path query so only the slice travels over the wire.
export async function tailJsonArray<T>(key: string, n: number): Promise<T[]> {
  if (n <= 0) return [];
  try {
    await kvReady();
    const rows = (await sql`
      WITH src AS (
        SELECT data, jsonb_array_length(data) AS len
        FROM app_kv WHERE key = ${key} LIMIT 1
      )
      SELECT COALESCE(jsonb_agg(elem ORDER BY ord DESC), '[]'::jsonb) AS data
      FROM src,
        LATERAL jsonb_array_elements(data) WITH ORDINALITY AS t(elem, ord)
      WHERE ord > GREATEST(src.len - ${n}, 0)
    `) as Array<{ data: T[] | null }>;
    return (rows[0]?.data ?? []) as T[];
  } catch (err) {
    log.error("persistent_array.tail_failed", err, { key });
    return [];
  }
}

// Per-key tracking of the most recent flush failure. Routes that care
// about durability (careers/apply, doctor-register, withdrawals, etc.)
// drain pending flushes via awaitAllFlushesStrict() which reads from
// this map and throws if any key has a recent error. Cleared by
// awaitAllFlushesStrict() after consumption so the next request sees
// a clean slate.
const recentFlushErrors: Map<string, Error> = new Map();

/** Read the current set of recorded flush errors (key → Error). Useful
 *  for diagnostics; awaitAllFlushesStrict() also returns them. */
export function getRecentFlushErrors(): Map<string, Error> {
  return new Map(recentFlushErrors);
}

/** Forget any recorded flush errors. Called by awaitAllFlushesStrict()
 *  after it raises so the next request starts clean. */
export function clearRecentFlushErrors(): void {
  recentFlushErrors.clear();
}

export async function saveJson<T>(key: string, data: T): Promise<void> {
  try {
    await kvReady();
    await sql`
      INSERT INTO app_kv (key, data, updated_at)
      VALUES (${key}, ${JSON.stringify(data)}::text::jsonb, now())
      ON CONFLICT (key) DO UPDATE
        SET data = EXCLUDED.data, updated_at = now()
    `;
    // Successful save — clear any earlier failure for this key so a
    // subsequent strict drain doesn't fail because of stale history.
    recentFlushErrors.delete(key);
  } catch (err) {
    log.error("persistent_array.save_failed", err, { key });
    recentFlushErrors.set(
      key,
      err instanceof Error ? err : new Error(String(err)),
    );
  }
}

// Array methods that change contents; we wrap these to auto-flush.
const MUTATORS = ["push", "pop", "shift", "unshift", "splice", "sort", "reverse", "fill", "copyWithin"] as const;

// Global registry of pending flush promises across every bound array.
// Vercel serverless freezes the Lambda as soon as a route handler returns,
// so fire-and-forget `flush()` calls made during a request can lose their
// Postgres writes if the response is sent before they resolve. Routes that
// mutate persistent stores right before responding (seeding, bulk imports)
// should `await awaitAllFlushes()` to drain the queue first.
const pendingFlushes: Set<Promise<void>> = new Set();

export async function awaitAllFlushes(): Promise<void> {
  // Snapshot — new flushes triggered by hydration during this await are
  // picked up by the while loop on the next iteration.
  while (pendingFlushes.size > 0) {
    await Promise.allSettled(Array.from(pendingFlushes));
  }
}

/**
 * Stricter sibling of awaitAllFlushes — drains the same queue, then
 * THROWS if any saveJson() call recorded a failure during this draining
 * pass (i.e. since the last call to clearRecentFlushErrors). Use this
 * in route handlers that mutate persistent data and need to be sure
 * the write actually landed before responding to the client.
 *
 * Pattern at a route handler:
 *
 *   try {
 *     // do the mutation through your store helper, e.g. addApplication(...)
 *     await awaitAllFlushesStrict();
 *   } catch (err) {
 *     log.error("careers.apply.persist_failed", err);
 *     return NextResponse.json(
 *       { error: "Application service temporarily unavailable" },
 *       { status: 503 },
 *     );
 *   }
 *
 * The route returns 503 instead of pretending the submission succeeded.
 * Clears the error map on entry so each request sees a fresh slate.
 *
 * The thrown error is a `PersistenceError` with a `.errors` array of
 * `{ key, error }` so callers can log structured details.
 */
export class PersistenceError extends Error {
  errors: Array<{ key: string; error: Error }>;
  constructor(errors: Array<{ key: string; error: Error }>) {
    const summary = errors.map((e) => `${e.key}: ${e.error.message}`).join("; ");
    super(`Persistence failed for ${errors.length} key(s): ${summary}`);
    this.name = "PersistenceError";
    this.errors = errors;
  }
}

export async function awaitAllFlushesStrict(): Promise<void> {
  // Reset error state at entry so the strict check only catches errors
  // produced during *this* drain (not stale ones from a prior request
  // running on the same warm Lambda).
  const beforeKeys = new Set(recentFlushErrors.keys());
  for (const key of beforeKeys) recentFlushErrors.delete(key);

  await awaitAllFlushes();

  if (recentFlushErrors.size === 0) return;
  const captured = Array.from(recentFlushErrors.entries()).map(
    ([key, error]) => ({ key, error }),
  );
  recentFlushErrors.clear();
  throw new PersistenceError(captured);
}

export interface PersistentArrayHandle {
  hydrate: () => Promise<void>;
  reload: () => Promise<void>;
  flush: () => void;
  isHydrated: () => boolean;
  // Record that an id was deliberately deleted so the anti-clobber merge
  // in mergingSave() doesn't resurrect it from Postgres. Stores that mutate
  // by id MUST call this when deleting, or the row will be re-merged back.
  tombstone: (id: string | number) => void;
  // Thenable — `await handle` triggers hydrate(). Resolves to void so TS
  // doesn't recurse on PersistentArrayHandle referencing itself.
  then: <TResult1 = void, TResult2 = never>(
    onFulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) => Promise<TResult1 | TResult2>;
}

export function bindPersistentArray<T>(
  key: string,
  ref: T[],
  seed: () => T[] = () => [] as T[]
): PersistentArrayHandle {
  let hydrated = false;
  let hydrating: Promise<void> | null = null;
  let flushPromise: Promise<void> = Promise.resolve();
  let suspendFlush = false; // when hydrate/reload replaces ref contents we don't want to write-through
  // IDs explicitly deleted by this Lambda. mergingSave() reads from Postgres
  // before writing to avoid clobbering sibling inserts, but without tracking
  // deliberate deletes it would re-merge our just-deleted rows back in.
  const tombstones = new Set<string | number>();

  async function hydrate(): Promise<void> {
    if (hydrated) return;
    if (!hydrating) {
      hydrating = (async () => {
        const result = await loadJsonStrict<T[]>(key);
        suspendFlush = true;
        try {
          if (result.ok && result.found && Array.isArray(result.data)) {
            // Happy path — real data in Postgres, load it.
            ref.splice(0, ref.length, ...result.data);
          } else if (result.ok && !result.found) {
            // Row genuinely missing (fresh DB) — seed and persist once.
            const initial = seed();
            ref.splice(0, ref.length, ...initial);
            await saveJson(key, ref);
          }
          // result.ok === false → DB unreachable. DO NOT seed, DO NOT
          // save. Leave ref empty (or whatever its current state) and
          // let subsequent requests retry. Mark not-hydrated so the
          // next request attempts hydration again instead of blindly
          // operating on a phantom empty array.
        } finally {
          suspendFlush = false;
        }
        // Only mark hydrated when we successfully reached Postgres. A
        // transient DB error means we don't know the true state — let
        // the next request try again rather than caching a wrong view.
        hydrated = result.ok;
      })().catch((err) => {
        log.error("persistent_array.hydrate_failed", err, { key });
        // Don't set hydrated=true here either. Let the next call retry.
      })
      .finally(() => {
        hydrating = null;
      });
    }
    await hydrating;
  }

  // Merge items from DB that our stale in-memory copy is missing.
  // Only applies when entries are objects with a stable `id` field — the
  // overwhelming majority of stores. Without that, we fall back to a plain
  // overwrite (the previous behaviour) because we can't tell adds from edits.
  //
  // The goal: stop stale warm Lambdas from erasing data that a different
  // Lambda just inserted. A Lambda whose ref was hydrated before the insert
  // would otherwise write its stale view back and clobber the new item.
  async function mergingSave(): Promise<void> {
    try {
      const dbItems = await loadJson<T[] | null>(key, null);
      if (Array.isArray(dbItems) && dbItems.length > 0) {
        const first = dbItems[0] as unknown;
        const hasId =
          first && typeof first === "object" && "id" in (first as object);
        if (hasId) {
          const refIds = new Set(
            (ref as unknown as Array<{ id: unknown }>)
              .map((r) => r?.id)
              .filter((id) => id !== undefined)
          );
          const missing = (dbItems as Array<{ id: unknown }>).filter(
            (item) =>
              item?.id !== undefined &&
              !refIds.has(item.id) &&
              !tombstones.has(item.id as string | number)
          );
          if (missing.length > 0) {
            suspendFlush = true;
            try {
              (ref as unknown as unknown[]).push(...missing);
            } finally {
              suspendFlush = false;
            }
          }
        }
      }
    } catch (err) {
      log.error("persistent_array.merge_before_save_failed", err, { key });
    }
    await saveJson(key, ref);
  }

  function flush(): void {
    if (suspendFlush) return;
    flushPromise = flushPromise.then(() => mergingSave());
    // Track in the global registry so awaitAllFlushes() can drain it
    // before a route handler returns. Self-remove when resolved.
    const tracked = flushPromise;
    pendingFlushes.add(tracked);
    tracked.finally(() => pendingFlushes.delete(tracked));
  }

  function isHydrated(): boolean {
    return hydrated;
  }

  // TTL cache for reload — without this, every API request that calls
  // a reload<Name>() helper triggers a Postgres roundtrip. With cross-
  // Lambda staleness already small (sub-second in practice) a 10-second
  // memo cuts read traffic ~95% with negligible correctness impact.
  // The bound RELOAD_TTL_MS knob lets ops tune from env if needed.
  const RELOAD_TTL_MS = Number(process.env.PERSISTENT_ARRAY_RELOAD_TTL_MS || 10_000);
  let lastReloadAt = 0;
  let inflightReload: Promise<void> | null = null;

  async function reload(): Promise<void> {
    const now = Date.now();
    if (inflightReload) return inflightReload;
    if (now - lastReloadAt < RELOAD_TTL_MS) return;
    inflightReload = (async () => {
      try {
        await flushPromise;
        const result = await loadJsonStrict<T[]>(key);
        // Mirrors hydrate(): only mutate ref on a successful read. DB
        // failure → leave ref intact and don't mark hydrated; next call
        // retries instead of operating on a stale phantom view.
        if (result.ok && result.found && Array.isArray(result.data)) {
          suspendFlush = true;
          try {
            ref.splice(0, ref.length, ...result.data);
          } finally {
            suspendFlush = false;
          }
          hydrated = true;
          lastReloadAt = Date.now();
        } else if (result.ok && !result.found) {
          // Row missing on a reload (rare — usually a deletion at the DB
          // level). Don't seed here; reload() is for refresh, not init.
          hydrated = true;
          lastReloadAt = Date.now();
        }
        // result.ok === false → leave ref alone, don't update hydrated.
      } catch (err) {
        log.error("persistent_array.reload_failed", err, { key });
      } finally {
        inflightReload = null;
      }
    })();
    return inflightReload;
  }

  // Wrap mutators to auto-flush. Each call is debounced via the flushPromise
  // serialisation so a burst of writes causes a single tail write.
  //
  // Auto-tombstone: every mutator that REMOVES items (splice, pop, shift)
  // captures the removed entries' ids and adds them to the tombstones set
  // before flushing. This prevents mergingSave() from re-adding the row
  // it just saw "missing" in the local ref. Without this, every store
  // that deletes via splice + flush ends up with an instantly-revived
  // row — the merge-before-save reads DB, sees the row, treats it as a
  // stale-read recovery, and writes it back. Bug affected ~70 stores.
  for (const name of MUTATORS) {
    const original = (ref as unknown as Record<string, (...args: unknown[]) => unknown>)[name];
    if (typeof original === "function") {
      (ref as unknown as Record<string, (...args: unknown[]) => unknown>)[name] = function (
        this: unknown,
        ...args: unknown[]
      ) {
        // Snapshot ids before the call so we can diff and tombstone.
        const beforeIds = new Set<string | number>();
        if (name === "splice" || name === "pop" || name === "shift") {
          for (const item of ref as unknown as Array<{ id?: unknown }>) {
            const id = item?.id;
            if (typeof id === "string" || typeof id === "number") beforeIds.add(id);
          }
        }
        const result = original.apply(this, args);
        if (beforeIds.size > 0) {
          const afterIds = new Set<string | number>();
          for (const item of ref as unknown as Array<{ id?: unknown }>) {
            const id = item?.id;
            if (typeof id === "string" || typeof id === "number") afterIds.add(id);
          }
          for (const id of beforeIds) {
            if (!afterIds.has(id)) tombstones.add(id);
          }
        }
        flush();
        return result;
      };
    }
  }

  function tombstone(id: string | number): void {
    tombstones.add(id);
  }

  const handle: PersistentArrayHandle = {
    hydrate,
    reload,
    flush,
    isHydrated,
    tombstone,
    then(onFulfilled, onRejected) {
      return hydrate().then(onFulfilled, onRejected);
    },
  };
  return handle;
}

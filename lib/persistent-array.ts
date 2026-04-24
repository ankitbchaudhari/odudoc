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

export async function saveJson<T>(key: string, data: T): Promise<void> {
  try {
    await kvReady();
    await sql`
      INSERT INTO app_kv (key, data, updated_at)
      VALUES (${key}, ${JSON.stringify(data)}::text::jsonb, now())
      ON CONFLICT (key) DO UPDATE
        SET data = EXCLUDED.data, updated_at = now()
    `;
  } catch (err) {
    log.error("persistent_array.save_failed", err, { key });
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
        const loaded = await loadJson<T[] | null>(key, null);
        suspendFlush = true;
        try {
          if (loaded === null) {
            const initial = seed();
            ref.splice(0, ref.length, ...initial);
          } else if (Array.isArray(loaded)) {
            ref.splice(0, ref.length, ...loaded);
          }
        } finally {
          suspendFlush = false;
        }
        if (loaded === null) await saveJson(key, ref);
        hydrated = true;
      })().catch((err) => {
        log.error("persistent_array.hydrate_failed", err, { key });
        hydrated = true;
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

  async function reload(): Promise<void> {
    try {
      await flushPromise;
      const loaded = await loadJson<T[] | null>(key, null);
      suspendFlush = true;
      try {
        if (Array.isArray(loaded)) {
          ref.splice(0, ref.length, ...loaded);
        }
      } finally {
        suspendFlush = false;
      }
      hydrated = true;
    } catch (err) {
      log.error("persistent_array.reload_failed", err, { key });
    }
  }

  // Wrap mutators to auto-flush. Each call is debounced via the flushPromise
  // serialisation so a burst of writes causes a single tail write.
  for (const name of MUTATORS) {
    const original = (ref as unknown as Record<string, (...args: unknown[]) => unknown>)[name];
    if (typeof original === "function") {
      (ref as unknown as Record<string, (...args: unknown[]) => unknown>)[name] = function (
        this: unknown,
        ...args: unknown[]
      ) {
        const result = original.apply(this, args);
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

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
    log.error("console.error", undefined, { args: [`[persistent-array] loadJson("${key}") failed`, err] });
    return fallback;
  }
}

export async function saveJson<T>(key: string, data: T): Promise<void> {
  try {
    await kvReady();
    await sql`
      INSERT INTO app_kv (key, data, updated_at)
      VALUES (${key}, ${JSON.stringify(data)}::jsonb, now())
      ON CONFLICT (key) DO UPDATE
        SET data = EXCLUDED.data, updated_at = now()
    `;
  } catch (err) {
    log.error("console.error", undefined, { args: [`[persistent-array] saveJson("${key}") failed`, err] });
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
        log.error("console.error", undefined, { args: [`[persistent-array] hydrate("${key}") failed`, err] });
        hydrated = true;
      });
    }
    await hydrating;
  }

  function flush(): void {
    if (suspendFlush) return;
    flushPromise = flushPromise.then(() => saveJson(key, ref));
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
      log.error("console.error", undefined, { args: [`[persistent-array] reload("${key}") failed`, err] });
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

  const handle: PersistentArrayHandle = {
    hydrate,
    reload,
    flush,
    isHydrated,
    then(onFulfilled, onRejected) {
      return hydrate().then(onFulfilled, onRejected);
    },
  };
  return handle;
}

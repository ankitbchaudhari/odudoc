// Postgres client (postgres.js driver) — self-hosted on Hostinger VPS
// via PgBouncer. We keep the existing `sql` tagged-template API so no
// call sites need to change:
//
//     const rows = await sql`SELECT * FROM foo WHERE id = ${id}`;
//
// IMPORTANT:
//  - `prepare: false` is required because PgBouncer is in transaction
//    pooling mode, which doesn't support server-side prepared statements.
//  - `ssl.rejectUnauthorized: false` trusts the self-signed cert the
//    PgBouncer instance presents. Traffic is still encrypted; we're
//    just skipping CA chain validation (we pin by IP in the URL).
//  - `max: 1` keeps each Vercel Lambda instance's connection footprint
//    minimal. PgBouncer multiplexes across Lambdas, so one client-side
//    connection per Lambda is plenty.

import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.warn(
    "[db] DATABASE_URL / POSTGRES_URL not set — DB operations will fail at runtime",
  );
}

const client = postgres(connectionString || "postgres://invalid", {
  ssl: { rejectUnauthorized: false },
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Re-export as `sql` — same tagged-template API as the old Neon driver.
// postgres.js returns a Result object that is array-like and iterable,
// so existing code like `const rows = await sql\`...\`; rows[0]` works
// unchanged.
export const sql = client;

// Per-init promise cache. Previously this was a single global promise
// which silently skipped every store's schema init after the first one
// ran. It worked on Neon because tables already existed from prior use,
// but on a fresh DB (e.g. self-hosted VPS) only the first init would
// ever fire and every other store would get "relation does not exist".
const schemaReadyMap = new Map<() => Promise<void>, Promise<void>>();

/**
 * Run `init` exactly once per Lambda instance, keyed by the init function
 * reference. If it throws, the next call with the same init will retry.
 * Use this to create tables + seed idempotently on first use.
 */
export function ensureSchema(init: () => Promise<void>): Promise<void> {
  let promise = schemaReadyMap.get(init);
  if (!promise) {
    promise = init().catch((err) => {
      schemaReadyMap.delete(init);
      throw err;
    });
    schemaReadyMap.set(init, promise);
  }
  return promise;
}

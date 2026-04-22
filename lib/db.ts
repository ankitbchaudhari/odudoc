// Postgres client (Neon serverless driver).
//
// Neon's `neon()` returns a tagged-template `sql` function that handles
// parameterised queries safely — never interpolate strings into the template.
//
// Tables are lazy-initialised on first use via `ensureSchema(init)`. The
// first request after a deploy creates tables and seeds from static data
// if the table is empty. Subsequent requests skip that via the cached
// promise.

import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.warn(
    "[db] DATABASE_URL / POSTGRES_URL not set — DB operations will fail at runtime"
  );
}

export const sql = neon(connectionString || "postgres://invalid");

let schemaReadyPromise: Promise<void> | null = null;

/**
 * Run `init` exactly once per Lambda instance. If it throws, the next call
 * will retry. Use this to create tables + seed idempotently on first use.
 */
export function ensureSchema(init: () => Promise<void>): Promise<void> {
  if (!schemaReadyPromise) {
    schemaReadyPromise = init().catch((err) => {
      schemaReadyPromise = null;
      throw err;
    });
  }
  return schemaReadyPromise;
}

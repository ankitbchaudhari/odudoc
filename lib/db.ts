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

import postgres, { type TransactionSql } from "postgres";

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

// ────────────────────────────── V12 RLS GUC setter ─────────────────────
//
// Master Spec V12 §5.1 requires that every query carrying patient data
// runs inside a transaction with custom GUCs (`odudoc.tenant_id`,
// `odudoc.patient_id`, `odudoc.role`) set via SET LOCAL. Postgres RLS
// policies then read these values via current_setting('odudoc.tenant_id',
// true) to scope rows to the caller.
//
// Wrap the per-request DB work in withRlsContext to get the guarantees:
//
//   await withRlsContext({ tenantId, patientId, role }, async (tx) => {
//     return tx`SELECT * FROM appointments WHERE patient_id = ${pid}`;
//   });
//
// SET LOCAL is automatically released at commit/rollback, so the next
// caller on the same pooled connection (PgBouncer transaction mode is
// fine — SET LOCAL is the supported way) starts with a clean slate.
// If RLS policies aren't enabled on a table yet, the GUC is harmless.

export interface RlsContext {
  /** Hospital / clinic / "platform". */
  tenantId?: string;
  /** Patient id when the query touches a specific patient's record. */
  patientId?: string;
  /** Caller's role — used by policies that whitelist e.g. doctor/admin. */
  role?: string;
}

/**
 * Run `fn` inside a transaction that has the V12 RLS GUCs set. The
 * tagged-template `tx` passed in is the same postgres.js client scoped
 * to the transaction. SET LOCAL is reverted automatically on commit.
 */
export async function withRlsContext<T>(
  ctx: RlsContext,
  fn: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  return client.begin(async (tx) => {
    if (ctx.tenantId) await tx`SELECT set_config('odudoc.tenant_id', ${ctx.tenantId}, true)`;
    if (ctx.patientId) await tx`SELECT set_config('odudoc.patient_id', ${ctx.patientId}, true)`;
    if (ctx.role) await tx`SELECT set_config('odudoc.role', ${ctx.role}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

/** Read the GUC values currently set on a transaction — diagnostics only. */
export async function readRlsContext(
  tx: TransactionSql,
): Promise<RlsContext> {
  const rows = await tx<
    { tenant_id: string | null; patient_id: string | null; role: string | null }[]
  >`SELECT current_setting('odudoc.tenant_id', true) AS tenant_id,
           current_setting('odudoc.patient_id', true) AS patient_id,
           current_setting('odudoc.role', true) AS role`;
  const r = rows[0];
  return {
    tenantId: r?.tenant_id || undefined,
    patientId: r?.patient_id || undefined,
    role: r?.role || undefined,
  };
}

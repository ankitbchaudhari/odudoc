// Apply scripts/v12-postgres-policies.sql to the connected Postgres.
//
// Run order (V12 §6):
//   1. `npm run db:generate`     → drizzle emits CREATE TABLE migration
//   2. `npm run db:migrate`      → drizzle applies the tables
//   3. `npm run db:v12:policies` → this script — RLS + hypertables + indexes
//
// Same connection-picking rules as scripts/db-migrate.ts: prefer
// DATABASE_URL_DIRECT (port 5432 / socket), refuse PgBouncer because
// some statements take session-level locks.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

function pickConnectionString(): string {
  const direct = process.env.DATABASE_URL_DIRECT;
  if (direct && direct.trim().length > 0) return direct;
  const runtime = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!runtime) {
    console.error(
      "[v12-policies] Neither DATABASE_URL_DIRECT nor DATABASE_URL is set.",
    );
    process.exit(1);
  }
  try {
    if (new URL(runtime).port === "6432") {
      console.error(
        "[v12-policies] DATABASE_URL points at PgBouncer (6432). " +
          "Set DATABASE_URL_DIRECT to a direct connection.",
      );
      process.exit(1);
    }
  } catch {/* not a parseable URL */}
  return runtime;
}

async function main(): Promise<void> {
  const connectionString = pickConnectionString();
  const sqlPath = resolve(process.cwd(), "scripts/v12-postgres-policies.sql");
  const sql = await readFile(sqlPath, "utf-8");

  const client = postgres(connectionString, {
    ssl: connectionString.includes("sslmode=disable")
      ? false
      : { rejectUnauthorized: false },
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });

  console.log("[v12-policies] applying V12 RLS + hypertables + indexes…");
  const start = Date.now();
  try {
    // The SQL file is one big script with DO blocks, extensions, ALTER
    // TABLE, CREATE POLICY etc. Run it as a single unsafe call —
    // postgres.js's parameterised query path doesn't accept multi-
    // statement scripts.
    await client.unsafe(sql);
    console.log(`[v12-policies] done in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("[v12-policies] failed:", err);
    process.exit(1);
  } finally {
    await client.end({ timeout: 5 });
  }
}

void main();

// Apply all pending Drizzle migrations.
//
// Designed to run FROM the Hostinger VPS itself (SSH, then `npm run
// db:migrate`). Never from Vercel, never from a developer laptop over
// the internet — our runtime DATABASE_URL points at PgBouncer (port
// 6432, transaction pooling) which breaks the migrator's advisory lock.
//
// Connection preference (first match wins):
//   1. DATABASE_URL_DIRECT  — explicit direct-port URL, e.g.
//                              postgres://...@localhost:5432/odudoc
//   2. DATABASE_URL         — only used if port is NOT 6432 (PgBouncer
//                              check). We refuse to run against a
//                              transaction pooler because drizzle's
//                              migrator calls pg_advisory_lock().
//
// Idempotency: drizzle-kit's migrator tracks applied migrations in
// `drizzle.__drizzle_migrations` by hash. Re-running after a successful
// apply is a no-op. If a migration fails mid-way, the whole transaction
// rolls back — fix the SQL and re-run.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

function pickConnectionString(): string {
  const direct = process.env.DATABASE_URL_DIRECT;
  if (direct && direct.trim().length > 0) return direct;

  const runtime = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
  if (!runtime) {
    console.error(
      "[db:migrate] Neither DATABASE_URL_DIRECT nor DATABASE_URL is set. " +
        "Export a direct (non-pooled) connection string on the VPS and re-run.",
    );
    process.exit(1);
  }

  // Refuse to run migrations through PgBouncer in transaction mode. The
  // migrator takes pg_advisory_lock which needs a session-scoped
  // connection.
  try {
    const u = new URL(runtime);
    if (u.port === "6432") {
      console.error(
        "[db:migrate] DATABASE_URL points at port 6432 (PgBouncer). " +
          "Set DATABASE_URL_DIRECT to a direct Postgres URL (port 5432 / local " +
          "socket) and re-run. Migrations through a transaction pooler will " +
          "stall on pg_advisory_lock.",
      );
      process.exit(1);
    }
  } catch {
    // not a parseable URL — let postgres.js complain with a better error
  }

  return runtime;
}

async function main(): Promise<void> {
  const connectionString = pickConnectionString();

  // Short-circuit guard: if we somehow got through the URL check but the
  // host looks like a public IP and the user did NOT explicitly set
  // DATABASE_URL_DIRECT, bail with a warning. Migrations should be run
  // from the VPS against localhost.
  if (!process.env.DATABASE_URL_DIRECT) {
    try {
      const host = new URL(connectionString).hostname;
      const isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host.endsWith(".local");
      if (!isLocal) {
        console.warn(
          `[db:migrate] WARNING: running against non-local host "${host}". ` +
            "This script is meant to run from the VPS. Continuing in 5s " +
            "— Ctrl-C to abort.",
        );
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch {
      /* ignore */
    }
  }

  const client = postgres(connectionString, {
    ssl: connectionString.includes("sslmode=disable")
      ? false
      : { rejectUnauthorized: false },
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });

  const db = drizzle(client);

  console.log("[db:migrate] applying migrations from lib/drizzle/migrations…");
  const start = Date.now();
  try {
    await migrate(db, { migrationsFolder: "./lib/drizzle/migrations" });
    console.log(`[db:migrate] done in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("[db:migrate] failed:", err);
    process.exit(1);
  } finally {
    await client.end({ timeout: 5 });
  }
}

void main();

// Apply all pending Drizzle migrations against DATABASE_URL.
//
// Run locally:       npm run db:migrate
// Run on Vercel:     wire this into a deploy hook, NOT into the runtime.
//                    Migrations must never run inside a request handler.
//
// This uses a dedicated postgres.js client (NOT the Lambda-tuned `max: 1`
// client from lib/db.ts) because migrations acquire locks and run
// longer-than-request work.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main(): Promise<void> {
  const connectionString =
    process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error(
      "[db:migrate] DATABASE_URL / POSTGRES_URL not set — refusing to run",
    );
    process.exit(1);
  }

  const client = postgres(connectionString, {
    ssl: { rejectUnauthorized: false },
    max: 1,
    prepare: false,
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

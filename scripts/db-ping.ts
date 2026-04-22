// Ping Neon Postgres to verify DATABASE_URL + schema is reachable.
//
// Run: `npx tsx scripts/db-ping.ts`
// Expects .env.local to have DATABASE_URL (or POSTGRES_URL) set.

import "dotenv/config";
import { sql } from "../lib/db";

async function main() {
  const rows = (await sql`SELECT NOW() AS now`) as Array<{ now: string }>;
  console.log("OK — server time:", rows[0]?.now);

  const tables = (await sql`
    SELECT table_name AS name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `) as Array<{ name: string }>;
  console.log("Tables:", tables.map((t) => t.name).join(", ") || "(none)");

  process.exit(0);
}

main().catch((err) => {
  console.error("DB ping failed:");
  console.error(err);
  process.exit(1);
});

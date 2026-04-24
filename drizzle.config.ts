// Drizzle Kit config — used by `npm run db:generate` and `npm run db:migrate`.
// Phase 1 foundation: no tables yet, schema.ts is empty by design. Each
// subsequent cutover phase (auth → bookings/payments → catalog → coupons/
// reviews → cms) adds to lib/drizzle/schema.ts and emits a new migration.
//
// We deliberately target `schema: "public"` because the Hostinger VPS
// Postgres already hosts the existing `app_kv` blob table there. Drizzle
// migrations are additive-only during transition — never drop `app_kv`
// until Phase 7 (after 2 weeks of zero fallback hits).

import type { Config } from "drizzle-kit";

const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export default {
  schema: "./lib/drizzle/schema.ts",
  out: "./lib/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    // Hostinger VPS Postgres presents a self-signed cert through PgBouncer;
    // encryption is still on the wire, we just don't pin the CA.
    ssl: { rejectUnauthorized: false },
  },
  // Safer defaults for a live DB:
  strict: true,
  verbose: true,
  // Keep existing app_kv table out of introspection diffs.
  schemaFilter: ["public"],
  tablesFilter: ["!app_kv"],
} satisfies Config;

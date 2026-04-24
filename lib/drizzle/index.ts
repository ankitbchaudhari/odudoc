// Drizzle client — wraps the existing postgres.js connection from `lib/db.ts`
// so we do NOT open a second connection pool. On Vercel Lambdas each cold
// start is already limited to `max: 1` postgres.js client; Drizzle is a
// type-safe wrapper over that same client.
//
// Usage (once Phase 2+ adds tables):
//
//     import { db } from "@/lib/drizzle";
//     import { users } from "@/lib/drizzle/schema";
//     const [user] = await db.select().from(users).where(eq(users.id, id));
//
// The raw `sql` tagged template from `lib/db.ts` remains the primary API
// during transition. Drizzle is opt-in per call site — no big-bang rewrite.

import { drizzle } from "drizzle-orm/postgres-js";
import { sql as postgresClient } from "../db";
import * as schema from "./schema";

// `postgresClient` is the postgres.js client instance exported as `sql`
// from lib/db.ts. drizzle-orm/postgres-js accepts that client directly and
// reuses its connection pool — no second connection is opened.
export const db = drizzle(postgresClient as never, {
  schema,
  logger: process.env.DRIZZLE_LOG === "1",
});

export type DB = typeof db;

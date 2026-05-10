// Super-admin factory reset.
//
// One-shot wipe of demo / seed content + selectable real data
// categories. Runs synchronously and returns counts for each
// store so the operator can confirm what cleared.
//
// Auth: super-admin only (SUPER_ADMIN_EMAILS env or admin@odudoc.com).
// Tenant admins cannot reach this — their data isolation is handled
// at the dashboard query layer, not by deleting the platform's stuff.
//
// POST /api/admin/factory-reset
// Body: {
//   blog?: boolean,           // delete all blog posts
//   departments?: boolean,    // delete all departments
//   subscribers?: boolean,    // delete newsletter subscribers
//   comments?: boolean,       // delete public comments
//   formResponses?: boolean,  // delete contact-form / job applications
//   doctors?: boolean,        // delete public-site doctor profiles
//   products?: boolean,       // delete shop products
//   confirm?: "WIPE"          // required as a safety token
// }
//
// Returns { wiped: { blog: N, departments: N, ... } }.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function isSuper(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  if (e === "admin@odudoc.com") return true;
  return SUPER_ADMIN_EMAILS.includes(e);
}

interface SqlCountRow { n: number }

/** Wipe a key from the app_kv table — used by all bindPersistentArray
 *  stores. Replaces the JSON array with an empty array so any
 *  warm Lambda re-hydrates correctly. */
async function wipePersistentArray(key: string): Promise<number> {
  // Count first so we can report what we cleared.
  const before = (await sql`
    SELECT COALESCE(jsonb_array_length(value), 0)::int AS n
    FROM app_kv WHERE key = ${key}
  `) as SqlCountRow[];
  const n = before[0]?.n || 0;
  if (n === 0) return 0;
  await sql`
    INSERT INTO app_kv (key, value) VALUES (${key}, '[]'::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = '[]'::jsonb
  `;
  return n;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email || "";
  if (!isSuper(email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== "WIPE") {
    return NextResponse.json({
      error: "missing_confirmation",
      hint: "Pass { confirm: 'WIPE' } in the body to authorize.",
    }, { status: 400 });
  }

  const wiped: Record<string, number> = {};

  if (body.blog) {
    const r = await sql`SELECT COUNT(*)::int AS n FROM blog_posts` as SqlCountRow[];
    wiped.blog = r[0]?.n || 0;
    await sql`DELETE FROM blog_posts`;
  }
  if (body.departments) wiped.departments = await wipePersistentArray("departments");
  if (body.subscribers) wiped.subscribers = await wipePersistentArray("subscribers");
  if (body.comments) wiped.comments = await wipePersistentArray("comments");
  if (body.formResponses) {
    wiped.bookings = await wipePersistentArray("bookings");
    wiped.applications = await wipePersistentArray("careers-applications");
  }
  if (body.doctors) wiped.doctors = await wipePersistentArray("doctors");
  if (body.products) wiped.products = await wipePersistentArray("products");

  return NextResponse.json({ ok: true, wiped });
}

// Public doctors list — merges admin-managed fields over static profile data.
// Used by client pages (/doctors, /consult/book) that can't import server-only
// stores directly. Re-reads the admin store from Postgres on every request so
// writes from other Lambdas show up immediately.

import { NextResponse } from "next/server";
import { getPublicDoctorsFresh } from "@/lib/public-doctors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const doctors = await getPublicDoctorsFresh();
  return NextResponse.json({ doctors });
}

// Staff-side: my shifts across active rosters. We resolve the
// signed-in user → matching RosterStaff row by userId or email.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listShiftsForStaff, listStaff } from "@/lib/roster/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  // We can't iterate without an org; the user might cover multiple
  // orgs as a doctor. We scan every staff row across all orgs and
  // match by userId or email — RosterStaff isn't huge in scale.
  // (If needed, a per-user index can be added later.)
  // Imported lazily via listStaff per org. Simpler: look up via
  // global by repeatedly calling listStaff for each known org —
  // here we instead do a private direct read by importing the store
  // module's lookup. For brevity we use a small helper that queries
  // every row matching the user.
  const allStaff: ReturnType<typeof listStaff> = [];
  // Accumulate every staff row for this user. We don't have a global
  // listStaff() — work around by iterating known orgs via the
  // memberships store (the user's orgs).
  try {
    const { getMembershipsForUser } = await import("@/lib/memberships-store");
    const mems = getMembershipsForUser(session.user.id);
    for (const m of mems) {
      for (const s of listStaff(m.organizationId)) {
        if (
          (s.userId && s.userId === session.user.id) ||
          (s.email && session.user.email && s.email.toLowerCase() === session.user.email.toLowerCase())
        ) {
          allStaff.push(s);
        }
      }
    }
  } catch {
    // No memberships layer available — fall through.
  }
  const shifts: Array<unknown> = [];
  for (const s of allStaff) {
    for (const sh of listShiftsForStaff(s.id)) {
      shifts.push({ ...sh, orgId: s.organizationId, staffName: s.name });
    }
  }
  return NextResponse.json({ shifts, staff: allStaff });
}

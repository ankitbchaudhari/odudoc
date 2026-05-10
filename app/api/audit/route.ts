// Audit log API — patient inspects who has accessed their records.
//
// We deliberately do NOT expose other patients' events to admins
// here; admin/forensic views go through a separate ops route gated
// on the admin role. This endpoint is the patient's transparency
// window.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listEventsForSubject } from "@/lib/audit/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const events = listEventsForSubject(userId, 200);
  return NextResponse.json({ events });
}

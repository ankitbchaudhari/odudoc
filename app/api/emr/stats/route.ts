// EMR stats endpoint — small numbers card on the EMR landing page.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDoctorEmrStats, reloadPatients, reloadVisits } from "@/lib/emr-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "doctor" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Force-fresh — stats card flickers with stale numbers otherwise.
  await reloadPatients();
  await reloadVisits();
  const stats = await getDoctorEmrStats(user.email);
  return NextResponse.json({ stats });
}

// Mobile EMR summary — single endpoint hydrating the home tab in
// a native client. Combines: clinic role, today's stats, current
// quota state, recent visits. Single round-trip = faster app
// launch.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import {
  getDoctorEmrStats,
  getQuotaState,
  listRecentVisits,
  reloadPatients,
  reloadVisits,
  reloadInvoices,
  reloadUnlocks,
  resolveClinic,
} from "@/lib/emr-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  const clinic = await resolveClinic(auth.email, auth.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await reloadPatients();
  await reloadVisits();
  await reloadInvoices();
  await reloadUnlocks();

  const ownerEmail =
    clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const [stats, quota, recentVisits] = await Promise.all([
    getDoctorEmrStats(ownerEmail),
    clinic.role === "admin"
      ? Promise.resolve(null)
      : getQuotaState(ownerEmail),
    listRecentVisits(ownerEmail, 10),
  ]);

  return NextResponse.json({
    role: clinic.role,
    ownerEmail,
    stats,
    quota,
    recentVisits,
  });
}

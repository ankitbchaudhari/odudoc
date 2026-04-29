// EMR quota status — used by the landing page banner to show "X/50 used"
// and surface the unlock button when the clinic has crossed the line.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getQuotaState,
  reloadPatients,
  reloadUnlocks,
  resolveClinic,
} from "@/lib/emr-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await reloadPatients();
  await reloadUnlocks();
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const quota = await getQuotaState(ownerEmail);
  return NextResponse.json({ quota, role: clinic.role });
}

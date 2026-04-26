// Self-read for the signed-in doctor.
//
// Returns the Doctor record matching the session email, if any. Used
// by /dashboard/doctor/* surfaces to populate the compliance + payouts
// tile, the verified badge, the license-expiry warning, etc.
//
// Doctor.role gates this — admins, vendors, and patients all 403 here
// even if their session is otherwise valid.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/doctors-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "doctor") {
    return NextResponse.json({ error: "Doctor session required" }, { status: 403 });
  }
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) return NextResponse.json({ error: "Doctor record not found" }, { status: 404 });
  // Strip internal-only flags before returning. licenseReminderTier is
  // a cron-only value the doctor doesn't need to see.
  const { licenseReminderTier: _ignore, ...safe } = doctor as typeof doctor & {
    licenseReminderTier?: string;
  };
  void _ignore;
  return NextResponse.json({ doctor: safe });
}

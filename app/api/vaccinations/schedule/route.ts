// GET /api/vaccinations/schedule?dob=YYYY-MM-DD&sex=M|F|X&pregnant=true
//
// Returns the patient's computed vaccine schedule per the India pod
// master (UIP + IAP). Pure compute — no auth required; the patient's
// DOB is the only input the master needs. Used by the patient
// vaccination dashboard and the family-account dependents UI.

import { NextRequest, NextResponse } from "next/server";
import { buildSchedule } from "@/lib/vaccine-schedule-master";
import { findUserByEmail } from "@/lib/users-store";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  let dob = sp.get("dob");
  let sex: "M" | "F" | "X" | undefined;
  const sexParam = sp.get("sex");
  if (sexParam === "M" || sexParam === "F" || sexParam === "X") sex = sexParam;
  const pregnant = sp.get("pregnant") === "true";

  // If the caller is signed in and didn't supply a dob, fall back to
  // their own record. Keeps the URL clean for the patient-side
  // dashboard.
  if (!dob) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (email) {
      const u = findUserByEmail(email);
      const userWithDob = u as (typeof u) & { dateOfBirth?: string };
      dob = userWithDob?.dateOfBirth || null;
    }
  }
  if (!dob) {
    return NextResponse.json({ error: "dob required" }, { status: 400 });
  }

  // "alreadyTaken" — query string list (comma-separated entry ids).
  // Real implementation reads the patient's `vaccinations` record;
  // accept the param so the family/dependents view can hand them in
  // directly without a server fetch.
  const takenParam = sp.get("taken");
  const alreadyTaken = takenParam ? takenParam.split(",").map((s) => s.trim()).filter(Boolean) : [];

  const schedule = buildSchedule({ dob, sex, pregnant, alreadyTaken });
  return NextResponse.json({ schedule, dob, sex, pregnant });
}

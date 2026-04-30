// POST /api/admin/applications/[id]/sync-doctor
//
// Idempotent recovery: takes an already-approved application and
// ensures a Doctor row + User account exist for it. Used when the
// original approval ran before this fix was deployed and the persistence
// flush dropped under a Lambda freeze, leaving an "approved" application
// without a corresponding doctor record.
//
// Safe to click multiple times — every step is a no-op if the target
// state is already reached.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApplicationById } from "@/lib/doctor-applications-store";
import {
  findDoctorByEmail,
  createDoctor,
  DOCTOR_SPECIALTIES,
  setDoctorLicense,
  setDoctorVerified,
} from "@/lib/doctors-store";
import { inviteDoctor } from "@/lib/doctor-invite";
import { findUserByEmail } from "@/lib/users-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminEmail = user?.email || "admin";

  const { id } = await ctx.params;
  const app = getApplicationById(id);
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  if (app.status !== "approved") {
    return NextResponse.json(
      { error: "Application must be approved first." },
      { status: 400 },
    );
  }

  let doctorCreated = false;
  let userInvited = false;
  let alreadyHadDoctor = false;
  let alreadyHadUser = false;

  try {
    const existingDoctor = findDoctorByEmail(app.email);
    if (existingDoctor) {
      alreadyHadDoctor = true;
      doctorCreated = true;
    } else {
      const specialty = DOCTOR_SPECIALTIES.includes(app.specialty as any)
        ? app.specialty
        : "General Physician";
      const created = createDoctor({
        name: app.fullName,
        specialty,
        email: app.email,
        phone: app.phone,
        status: "Active",
        qualifications: app.qualifications,
        experience: app.yearsExperience,
        fee: app.fee,
        gender:
          app.gender?.toLowerCase() === "female" ? "Female"
          : app.gender?.toLowerCase() === "male" ? "Male"
          : undefined,
      });
      setDoctorLicense(created.id, {
        country: app.licenseCountry || app.country,
        number: app.licenseNumber,
        expiry: app.licenseExpiry,
      });
      setDoctorVerified(created.id, true, adminEmail);
      doctorCreated = true;
    }

    const existingUser = findUserByEmail(app.email);
    alreadyHadUser = !!existingUser && existingUser.role === "doctor";

    // Invite is idempotent — if user exists with role !== doctor it
    // promotes them; otherwise it just re-issues a fresh temp password
    // and sends the welcome email. Always run on sync so the doctor
    // gets login credentials even if the original invite email was lost.
    const inv = await inviteDoctor({
      name: app.fullName,
      email: app.email,
      phone: app.phone,
    });
    userInvited = !!inv;
  } catch (err) {
    log.error("admin.application.sync_doctor_failed", err, { id });
    return NextResponse.json(
      {
        error:
          (err as Error).message ||
          "Sync failed. Check server logs for details.",
        partial: { doctorCreated, userInvited },
      },
      { status: 502 },
    );
  }

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.application.sync_persist_failed", err, { id });
    return NextResponse.json(
      { error: "Sync ran but didn't persist. Try the button again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    doctorCreated,
    userInvited,
    alreadyHadDoctor,
    alreadyHadUser,
  });
}

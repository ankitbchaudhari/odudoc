// Admin-only: list and update doctor registration applications.
// Serves the /admin/applications page. Scoped to admin session only —
// these records contain identity documents and PII.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  type ApplicationStatus,
} from "@/lib/doctor-applications-store";
import {
  findDoctorByEmail,
  createDoctor,
  DOCTOR_SPECIALTIES,
} from "@/lib/doctors-store";
import { sendDoctorApplicationStatusEmail } from "@/lib/email";
import { inviteDoctor } from "@/lib/doctor-invite";

import { log } from "@/lib/log";
export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ applications: getApplications() });
}

// PATCH body: { id, status, adminNotes? }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { id?: string; status?: ApplicationStatus; adminNotes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.id || !body.status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }
  const prev = getApplicationById(body.id);
  const updated = updateApplicationStatus(body.id, body.status, body.adminNotes);
  if (!updated) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // On approval, materialise the application into a real Doctor record so
  // the doctor appears on /consult. Idempotent — only creates on the
  // pending→approved transition and only if no doctor with that email exists.
  if (
    body.status === "approved" &&
    prev?.status !== "approved" &&
    !findDoctorByEmail(updated.email)
  ) {
    const specialty = DOCTOR_SPECIALTIES.includes(updated.specialty as any)
      ? updated.specialty
      : "General Physician";
    try {
      createDoctor({
        name: updated.fullName,
        specialty,
        email: updated.email,
        phone: updated.phone,
        status: "Active",
        qualifications: updated.qualifications,
        experience: updated.yearsExperience,
        fee: updated.fee,
        gender:
          updated.gender?.toLowerCase() === "female" ? "Female"
          : updated.gender?.toLowerCase() === "male" ? "Male"
          : undefined,
      });
      // Provision the doctor's login (7-day temp password) and send the
      // welcome email + SMS. Failures are logged but non-fatal — the
      // approval still stands.
      await inviteDoctor({
        name: updated.fullName,
        email: updated.email,
        phone: updated.phone,
      });
    } catch (err) {
      log.error("doctor_applications.create_doctor_failed", err);
    }
  }

  // Notify the applicant of the decision. Fire-and-forget so a mail
  // failure never breaks the admin action.
  if (body.status === "approved" || body.status === "rejected") {
    void sendDoctorApplicationStatusEmail({
      to: updated.email,
      fullName: updated.fullName,
      status: body.status,
      adminNotes: body.adminNotes,
    }).catch((err) =>
      log.error("doctor_applications.status_email_failed", err)
    );
  }

  return NextResponse.json({ application: updated });
}

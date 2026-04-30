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
  deleteApplication,
  type ApplicationStatus,
} from "@/lib/doctor-applications-store";
import {
  findDoctorByEmail,
  createDoctor,
  DOCTOR_SPECIALTIES,
  setDoctorLicense,
  setDoctorVerified,
} from "@/lib/doctors-store";
import { sendDoctorApplicationStatusEmail } from "@/lib/email";
import { inviteDoctor } from "@/lib/doctor-invite";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

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
  const adminEmail = (session?.user as { email?: string } | undefined)?.email || "admin";
  const prev = getApplicationById(body.id);
  const updated = updateApplicationStatus(body.id, body.status, body.adminNotes, adminEmail);
  if (!updated) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // On approval, materialise the application into a real Doctor record so
  // the doctor appears on /consult. Idempotent — only creates on the
  // pending→approved transition and only if no doctor with that email exists.
  // We track the outcome so the response can tell the admin UI whether
  // the sync actually succeeded (previously failures were swallowed and
  // the admin only found out later when /admin/doctors was empty).
  let doctorCreated = false;
  let userInvited = false;
  let syncError: string | undefined;

  if (body.status === "approved" && prev?.status !== "approved") {
    const alreadyExists = !!findDoctorByEmail(updated.email);
    if (alreadyExists) {
      doctorCreated = true; // already there, treat as success
      userInvited = true;
    } else {
      const specialty = DOCTOR_SPECIALTIES.includes(updated.specialty as any)
        ? updated.specialty
        : "General Physician";
      try {
        const created = createDoctor({
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
        setDoctorLicense(created.id, {
          country: updated.licenseCountry || updated.country,
          number: updated.licenseNumber,
          expiry: updated.licenseExpiry,
        });
        setDoctorVerified(created.id, true, adminEmail);
        doctorCreated = true;

        try {
          const inv = await inviteDoctor({
            name: updated.fullName,
            email: updated.email,
            phone: updated.phone,
          });
          userInvited = !!inv;
        } catch (inviteErr) {
          // Doctor row exists; user provisioning failed. Surface but
          // don't roll back the doctor row.
          log.error("doctor_applications.invite_failed", inviteErr);
          syncError = `Doctor created, but user account provisioning failed: ${
            (inviteErr as Error).message || "unknown error"
          }`;
        }
      } catch (err) {
        log.error("doctor_applications.create_doctor_failed", err);
        syncError = `Failed to create doctor row: ${
          (err as Error).message || "unknown error"
        }`;
      }
    }
  }

  // Drain pending Postgres writes BEFORE we respond. Previously the
  // PATCH returned 200 the moment in-memory state was updated; the
  // Lambda would freeze on response and the doctor row never made it
  // to the persistent JSONB. The admin would approve the application
  // and find /admin/doctors still showing zero doctors.
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("doctor_applications.persist_failed", err);
    return NextResponse.json(
      {
        error:
          "Approval saved in memory but didn't persist to the database. Refresh and try the Sync button.",
      },
      { status: 500 },
    );
  }

  // Notify the applicant of the decision. Awaited so the Lambda doesn't
  // terminate before Resend's HTTP call finishes — fire-and-forget was
  // dropping mails on cold starts. Failure is logged, not raised.
  if (body.status === "approved" || body.status === "rejected") {
    try {
      const res = await sendDoctorApplicationStatusEmail({
        to: updated.email,
        fullName: updated.fullName,
        status: body.status,
        adminNotes: body.adminNotes,
      });
      if (!res.ok) {
        log.error("doctor_applications.status_email_failed", undefined, {
          error: res.error,
        });
      }
    } catch (err) {
      log.error("doctor_applications.status_email_threw", err);
    }
  }

  return NextResponse.json({
    application: updated,
    sync: { doctorCreated, userInvited, error: syncError },
  });
}

// DELETE ?id=<applicationId> — permanently removes the application record.
// Does NOT touch any Doctor record that may have been created on approval;
// admins manage those separately from /admin/doctors.
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const ok = deleteApplication(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

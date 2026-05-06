// Admin "Request verification" — emails the doctor a nudge to upload
// their KYC documents (ID, selfie, license) on the dashboard. Used
// for orphan / not-submitted accounts where the doctor was created
// (manually by admin, by Google sign-in promotion, or by clinic
// onboarding) but has never opened /dashboard/doctor to upload docs.
//
// Side effects:
//   - sends a transactional email to the doctor's primary email
//   - stamps verificationRequestedAt + verificationRequestedBy on the
//     Doctor row so the admin queue can show "Last requested 2 days ago"
//   - drops a row in the admin notifications inbox so we have a record
//
// Idempotent on rapid double-clicks via a 60-second cooldown — if the
// admin spams the button we don't spam the doctor.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDoctorById,
  markVerificationRequested,
} from "@/lib/doctors-store";
import { sendDoctorVerificationRequestEmail } from "@/lib/email";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const COOLDOWN_MS = 60_000; // 1 minute

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const adminEmail = (session?.user as { email?: string } | undefined)?.email || "admin";
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const doctor = getDoctorById(id);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  // Don't bother if they're already verified — admin probably clicked
  // by mistake. Errors loudly so the UI surfaces it instead of failing
  // silently.
  if (doctor.verified) {
    return NextResponse.json(
      { error: "Doctor is already verified" },
      { status: 400 },
    );
  }

  const now = Date.now();
  const last = doctor.verificationRequestedAt
    ? new Date(doctor.verificationRequestedAt).getTime()
    : 0;
  if (Number.isFinite(last) && now - last < COOLDOWN_MS) {
    return NextResponse.json(
      {
        error:
          "A verification request was just sent. Wait a minute before resending.",
      },
      { status: 429 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — note is optional
  }
  const adminNoteRaw = typeof body.note === "string" ? body.note.trim() : "";
  const adminNote = adminNoteRaw.length > 0 ? adminNoteRaw.slice(0, 500) : undefined;

  const result = await sendDoctorVerificationRequestEmail({
    to: doctor.email,
    name: doctor.name,
    adminNote,
  });

  if (!result.ok && !result.skipped) {
    log.error("admin.doctors.request_verification_email_failed", null, {
      doctorId: doctor.id,
      error: result.error,
    });
    return NextResponse.json(
      { error: "Could not send the email. Try again." },
      { status: 502 },
    );
  }

  markVerificationRequested(doctor.id, adminEmail);

  try {
    addAdminNotification({
      type: "doctor_verification_requested",
      title: "Verification requested",
      body: `${adminEmail} pinged ${doctor.name} (${doctor.email}) to upload verification documents.`,
      link: `/admin/doctors/verifications`,
    });
  } catch (err) {
    log.error("admin.doctors.request_verification_notify_failed", err);
  }

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.doctors.request_verification_persist_failed", err, {
      doctorId: doctor.id,
    });
  }

  return NextResponse.json({
    ok: true,
    sent: result.ok && !result.skipped,
    skipped: !!result.skipped,
  });
}

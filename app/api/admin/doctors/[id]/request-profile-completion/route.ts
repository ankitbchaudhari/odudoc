// Admin "Request profile completion" — emails the doctor a list of
// the specific fields still missing on their public profile (photo,
// bio, fee, time slots, etc.) with a one-click link into the editor.
//
// Distinct from request-verification: that one is about credential
// review (ID, license). This one is about marketability — incomplete
// profiles get far fewer bookings, so admins use this to nudge
// doctors who finished verification but never filled in their bio /
// photo / availability.
//
// Side effects:
//   - sends a transactional email to the doctor's primary email
//   - stamps profileNudgeAt + profileNudgeBy on the Doctor row
//   - drops a row in the admin notifications inbox
//
// 60-second cooldown so a triple-click doesn't triple-mail the doctor.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDoctorById,
  listMissingProfileFields,
  markProfileNudgeSent,
} from "@/lib/doctors-store";
import { sendDoctorProfileCompletionEmail } from "@/lib/email";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const COOLDOWN_MS = 60_000;

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const adminEmail =
    (session?.user as { email?: string } | undefined)?.email || "admin";
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const doctor = getDoctorById(id);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  // Cooldown — same pattern as request-verification.
  const now = Date.now();
  const last = doctor.profileNudgeAt
    ? new Date(doctor.profileNudgeAt).getTime()
    : 0;
  if (Number.isFinite(last) && now - last < COOLDOWN_MS) {
    return NextResponse.json(
      {
        error:
          "A profile-completion nudge was just sent. Wait a minute before resending.",
      },
      { status: 429 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — admin note is optional.
  }
  const adminNoteRaw = typeof body.note === "string" ? body.note.trim() : "";
  const adminNote =
    adminNoteRaw.length > 0 ? adminNoteRaw.slice(0, 500) : undefined;

  // If the admin passed an explicit list of fields, use that. Otherwise
  // compute it from the doctor row so the email mentions the right
  // things even when the admin clicks without thinking.
  const overrideFields = Array.isArray(body.missing)
    ? (body.missing as unknown[]).filter(
        (f): f is string => typeof f === "string" && f.trim().length > 0,
      )
    : null;
  const missing =
    overrideFields && overrideFields.length > 0
      ? overrideFields
      : listMissingProfileFields(doctor);

  const result = await sendDoctorProfileCompletionEmail({
    to: doctor.email,
    name: doctor.name,
    missing,
    adminNote,
  });

  if (!result.ok && !result.skipped) {
    log.error("admin.doctors.request_profile_email_failed", null, {
      doctorId: doctor.id,
      error: result.error,
    });
    return NextResponse.json(
      { error: "Could not send the email. Try again." },
      { status: 502 },
    );
  }

  markProfileNudgeSent(doctor.id, adminEmail);

  try {
    addAdminNotification({
      type: "doctor_profile_nudge",
      title: "Profile completion requested",
      body: `${adminEmail} pinged ${doctor.name} (${doctor.email}) to fill in ${
        missing.length > 0 ? `${missing.length} missing field${missing.length === 1 ? "" : "s"}` : "their profile"
      }.`,
      link: `/admin/doctors`,
    });
  } catch (err) {
    log.error("admin.doctors.request_profile_notify_failed", err);
  }

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.doctors.request_profile_persist_failed", err, {
      doctorId: doctor.id,
    });
  }

  return NextResponse.json({
    ok: true,
    sent: result.ok && !result.skipped,
    skipped: !!result.skipped,
    missing,
  });
}

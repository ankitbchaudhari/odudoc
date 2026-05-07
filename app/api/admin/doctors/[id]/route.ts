import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  setDoctorVerified,
  setDoctorLicense,
  rejectDoctorVerification,
  type DoctorStatus,
} from "@/lib/doctors-store";
import { sendDoctorRemovedEmail, sendEmail } from "@/lib/email";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const doctor = getDoctorById(id);
  if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ doctor });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch: Parameters<typeof updateDoctor>[1] = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.specialty === "string") patch.specialty = body.specialty;
  if (typeof body.email === "string") patch.email = body.email;
  if (typeof body.phone === "string") patch.phone = body.phone;
  if (body.status === "Active" || body.status === "Inactive")
    patch.status = body.status as DoctorStatus;
  if (typeof body.commission === "number") patch.commission = body.commission;
  if (typeof body.rating === "number") patch.rating = body.rating;
  if (typeof body.consultationCount === "number")
    patch.consultationCount = body.consultationCount;
  if (typeof body.bio === "string") patch.bio = body.bio;
  if (typeof body.imageUrl === "string") patch.imageUrl = body.imageUrl;
  if (typeof body.qualifications === "string") patch.qualifications = body.qualifications;
  if (typeof body.experience === "number") patch.experience = body.experience;
  if (typeof body.city === "string") patch.city = body.city;
  if (typeof body.location === "string") patch.location = body.location;
  if (typeof body.fee === "number") patch.fee = body.fee;
  if (body.gender === "Male" || body.gender === "Female") patch.gender = body.gender;
  if (typeof body.country === "string") patch.country = body.country;
  if (Array.isArray(body.services))
    patch.services = (body.services as unknown[]).filter((s): s is string => typeof s === "string");
  if (Array.isArray(body.timeSlots))
    patch.timeSlots = (body.timeSlots as unknown[]).filter((s): s is string => typeof s === "string");

  let doctor = updateDoctor(id, patch);
  if (!doctor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verification toggle is admin-only and stamped with the admin's
  // email + timestamp by the helper. Routed here so the existing
  // PATCH endpoint stays the single point of mutation.
  if (typeof body.verified === "boolean") {
    const adminEmail = (session?.user as { email?: string } | undefined)?.email || "admin";
    doctor = setDoctorVerified(id, body.verified, adminEmail) || doctor;
    // Notify the doctor that their account is now active.
    if (body.verified && doctor?.email) {
      try {
        await sendEmail({
          from: "notifications",
          to: doctor.email,
          subject: "Your OduDoc account is verified",
          html: `<p>Hi ${doctor.name},</p><p>Your verification documents have been approved. Your dashboard is now active — sign in at <a href="https://www.odudoc.com/dashboard/doctor">odudoc.com/dashboard/doctor</a> to start consulting.</p><p>Thanks,<br/>OduDoc</p>`,
        });
      } catch (mailErr) {
        log.error("admin_doctor_verify.email_failed", mailErr);
      }
    }
  }

  // Request re-verification with a reason. Clears the submitted-at
  // stamp + sets a rejection reason so the doctor sees the upload
  // form again on their gate, with the admin's note explaining
  // what wasn't acceptable.
  if (body.rejectVerification && typeof body.rejectVerification === "object") {
    const reason =
      (body.rejectVerification as { reason?: unknown }).reason;
    if (typeof reason !== "string" || reason.trim().length < 3) {
      return NextResponse.json(
        { error: "rejectVerification.reason is required (min 3 chars)" },
        { status: 400 }
      );
    }
    doctor = rejectDoctorVerification(id, reason) || doctor;
    // Email the doctor — they're not on the dashboard right now, so
    // they need a push to know there's something to fix.
    if (doctor?.email) {
      try {
        await sendEmail({
          from: "notifications",
          to: doctor.email,
          subject: "OduDoc verification needs another look",
          html: `<p>Hi ${doctor.name},</p><p>Our team reviewed your verification documents and asked for an updated submission.</p><p><b>Reason:</b> ${reason
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</p><p>Please sign in at <a href="https://www.odudoc.com/dashboard/doctor">odudoc.com/dashboard/doctor</a> and resubmit. Your dashboard activates as soon as we approve the new documents.</p><p>Thanks,<br/>OduDoc</p>`,
        });
      } catch (mailErr) {
        log.error("admin_doctor_reject.email_failed", mailErr);
      }
    }
  }

  // License fields go through the dedicated helper so country gets
  // canonicalised to a 2-letter ISO code and updates record an audit
  // timestamp consistently.
  if (
    typeof body.licenseCountry === "string" ||
    typeof body.licenseNumber === "string" ||
    typeof body.licenseExpiry === "string"
  ) {
    doctor = setDoctorLicense(id, {
      country: typeof body.licenseCountry === "string" ? body.licenseCountry : undefined,
      number: typeof body.licenseNumber === "string" ? body.licenseNumber : undefined,
      expiry: typeof body.licenseExpiry === "string" ? body.licenseExpiry : undefined,
    }) || doctor;
  }

  // Critical: drain pending Postgres writes before returning. Vercel
  // serverless freezes the Lambda the moment we send the response, so
  // updateDoctor()'s fire-and-forget flush() can be killed mid-write
  // and the change disappears on the next page load. The admin's
  // edits looked saved (response was 200, modal closed) but the row
  // never persisted. await fixes this.
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.doctors.persist_failed", err, { id });
    return NextResponse.json(
      { error: "Saved temporarily but failed to persist. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ doctor });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  // Capture the doctor's details before deletion so we can email them.
  const doctor = getDoctorById(id);
  const ok = deleteDoctor(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Notify the doctor that they've been removed. Awaited so the Lambda
  // doesn't exit before Resend finishes the HTTP call.
  if (doctor?.email) {
    try {
      const res = await sendDoctorRemovedEmail({
        to: doctor.email,
        name: doctor.name,
      });
      if (!res.ok) {
        log.error("admin_doctor_delete.email_failed", undefined, {
          error: res.error,
        });
      }
    } catch (err) {
      log.error("admin_doctor_delete.email_threw", err);
    }
  }

  // Same persistence story as PATCH: deleteDoctor mutates the array
  // and triggers a fire-and-forget flush. Without awaiting, the
  // Lambda freezes on response and the row reappears on next read.
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.doctors.delete_persist_failed", err, { id });
    return NextResponse.json(
      { error: "Deletion failed to persist. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

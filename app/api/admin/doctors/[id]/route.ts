import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDoctorById,
  updateDoctor,
  deleteDoctor,
  setDoctorVerified,
  setDoctorLicense,
  type DoctorStatus,
} from "@/lib/doctors-store";
import { sendDoctorRemovedEmail } from "@/lib/email";
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

  return NextResponse.json({ ok: true });
}

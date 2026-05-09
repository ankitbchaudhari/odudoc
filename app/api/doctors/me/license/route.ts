// Doctor-self license entry.
//
// Adding a license is identity-sensitive enough that we don't fold it
// into the general /api/doctors/me PATCH allow-list — it has its own
// route with stricter validation and an audit-friendly shape. Doctors
// can update their own license freely; admins also re-validate on the
// verification queue when documents arrive.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail, setDoctorLicense } from "@/lib/doctors-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "doctor") {
    return NextResponse.json({ error: "Doctor session required" }, { status: 403 });
  }
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) return NextResponse.json({ error: "Doctor record not found" }, { status: 404 });

  let body: { country?: string; number?: string; expiry?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const country = typeof body.country === "string" ? body.country.trim().toUpperCase() : "";
  const number = typeof body.number === "string" ? body.number.trim() : "";
  const expiry = typeof body.expiry === "string" ? body.expiry.trim() : "";

  if (!country || country.length !== 2) {
    return NextResponse.json(
      { error: "Country must be a 2-letter ISO code (e.g. US, IN, GB)." },
      { status: 400 },
    );
  }
  if (!number || number.length < 3) {
    return NextResponse.json(
      { error: "License number is required (min 3 characters)." },
      { status: 400 },
    );
  }
  if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
    return NextResponse.json(
      { error: "Expiry must be a YYYY-MM-DD date if provided." },
      { status: 400 },
    );
  }

  try {
    const updated = setDoctorLicense(doctor.id, {
      country,
      number,
      expiry: expiry || undefined,
    });
    if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    await awaitAllFlushesStrict();
    return NextResponse.json({
      ok: true,
      licenseCountry: updated.licenseCountry,
      licenseNumber: updated.licenseNumber,
      licenseExpiry: updated.licenseExpiry,
    });
  } catch (err) {
    log.error("doctors.me.license_failed", err, { doctorId: doctor.id });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

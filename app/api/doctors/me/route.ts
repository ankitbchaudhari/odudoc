// Self-read for the signed-in doctor.
//
// Returns the Doctor record matching the session email, if any. Used
// by /dashboard/doctor/* surfaces to populate the compliance + payouts
// tile, the verified badge, the license-expiry warning, etc.
//
// Doctor.role gates this — admins, vendors, and patients all 403 here
// even if their session is otherwise valid.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail, updateDoctor } from "@/lib/doctors-store";
import { displayCurrencyForCountry } from "@/lib/doctor-display-currency";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

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
  // Surface the doctor's display currency derived from their country.
  // Drives every money figure on /dashboard/doctor — earnings,
  // transactions, payouts, EMR invoices etc. — so a doctor in India
  // sees ₹ everywhere instead of $. Pure derivation, no DB write.
  const displayCurrency = displayCurrencyForCountry(doctor.country);
  return NextResponse.json({ doctor: safe, displayCurrency });
}

// Doctor self-edit. Lets a signed-in doctor update only the
// marketing / availability fields on their own row — photo, bio,
// fee, time slots, qualifications, etc. Identity-critical fields
// (name, email, specialty, verified, status, commission) are NOT
// patchable here — those go through admin review.
const ALLOWED_KEYS = new Set([
  "imageUrl",
  "bio",
  "qualifications",
  "experience",
  "city",
  "location",
  "country",
  "fee",
  "gender",
  "phone",
  "services",
  "timeSlots",
]);

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "doctor") {
    return NextResponse.json({ error: "Doctor session required" }, { status: 403 });
  }
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor record not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Whitelist — silently drop anything not in the allowed list so a
  // malicious client can't, say, flip their commission or verified
  // flag by including extra fields.
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (ALLOWED_KEYS.has(key)) patch[key] = value;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No editable fields in the request body." },
      { status: 400 },
    );
  }

  try {
    const updated = updateDoctor(doctor.id, patch as never);
    if (!updated) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
    await awaitAllFlushesStrict();
    return NextResponse.json({ doctor: updated });
  } catch (err) {
    log.error("doctors.me.patch_failed", err, { doctorId: doctor.id });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

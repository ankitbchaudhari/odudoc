// /api/doctors/me/mobile
//
// GET   — return the calling doctor's full profile (Bearer JWT auth).
// PATCH — update editable profile fields. Whitelisted to fields a doctor
//         can self-edit; admin-controlled fields (commission, tier, status,
//         verified, etc.) are NOT writable here.
//
// Uses the same Bearer JWT as the patient app's mobile-* endpoints. The
// website's /api/doctors/me uses NextAuth web sessions and isn't usable
// from native apps.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import {
  findDoctorByEmail,
  updateDoctor,
  reloadDoctors,
} from "@/lib/doctors-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z } from "@/lib/validate";
import { awaitAllFlushes } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicShape(d: ReturnType<typeof findDoctorByEmail>) {
  if (!d) return null;
  // Strip internal-only flags before returning to the app.
  const { licenseReminderTier: _x, ...safe } = d as typeof d & {
    licenseReminderTier?: string;
  };
  void _x;
  return safe;
}

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "doctor") {
    return NextResponse.json(
      { error: "wrong_role", message: "This endpoint is for doctors only." },
      { status: 403 }
    );
  }

  await reloadDoctors();
  const doctor = findDoctorByEmail(auth.email);
  if (!doctor) {
    // Doctor user exists in users table but no record in doctors table — common
    // for newly upgraded role accounts. The app should fall back to the user
    // shape and prompt the doctor to complete their profile.
    return NextResponse.json(
      {
        error: "doctor_record_missing",
        message:
          "Your doctor profile hasn't been set up yet. Contact admin to provision it.",
      },
      { status: 404 }
    );
  }
  return NextResponse.json({ doctor: publicShape(doctor) });
}

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  bio: z.string().trim().max(2000).optional(),
  specialty: z.string().trim().min(1).max(120).optional(),
  qualifications: z.string().trim().max(500).optional(),
  experience: z.number().int().min(0).max(80).optional(),
  city: z.string().trim().max(120).optional(),
  location: z.string().trim().max(200).optional(),
  imageUrl: z.string().trim().max(2000).optional(),
  // Note: fee changes intentionally NOT allowed via mobile self-service —
  // admin reviews fee changes for fairness/disputes.
});

export async function PATCH(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "doctor") {
    return NextResponse.json(
      { error: "wrong_role", message: "This endpoint is for doctors only." },
      { status: 403 }
    );
  }

  const blocked = await enforceRateLimit(request, "doctor-me-patch", 30, "1 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, PatchSchema);
  if (parsed instanceof NextResponse) return parsed;
  const patch = parsed;

  try {
    await reloadDoctors();
    const before = findDoctorByEmail(auth.email);
    if (!before) {
      return NextResponse.json(
        { error: "doctor_record_missing" },
        { status: 404 }
      );
    }
    const updated = updateDoctor(before.id, patch);
    if (!updated) {
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    await awaitAllFlushes();
    return NextResponse.json({ doctor: publicShape(updated) });
  } catch (err) {
    log.error("doctors/me/mobile PATCH error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listDoctors,
  createDoctor,
  findDoctorByEmail,
  reloadDoctors,
  DOCTOR_TIERS,
  DOCTOR_SPECIALTIES,
  type DoctorStatus,
  type DoctorTier,
} from "@/lib/doctors-store";
import { listUsersAdmin, reloadUsers } from "@/lib/users-store";
import { inviteDoctor } from "@/lib/doctor-invite";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Refresh from Postgres so a warm Lambda started before the latest
  // approval still sees the newly-created doctor.
  await reloadDoctors();
  await reloadUsers();

  // Reconcile orphan doctor users — any user with role "doctor" who lacks
  // a profile in doctors-store gets a stub created on the fly. Common
  // causes: a profile was deleted but the user role wasn't downgraded,
  // a doctor signed up via Google before the doctor-profile auto-create
  // landed, or a verification webhook lost its persist. Without this
  // backfill the admin Users panel says "4 doctors" while the Doctors
  // panel only lists 2.
  try {
    const orphans = listUsersAdmin().filter(
      (u) => u.role === "doctor" && !findDoctorByEmail(u.email)
    );
    let reconciled = 0;
    for (const u of orphans) {
      // Per-row try so a single bad row (e.g. blank email, weird
      // unicode in name) doesn't abort the whole reconciliation
      // loop and 500 the admin doctors page for everyone.
      try {
        createDoctor({
          name: u.name,
          specialty: "General Physician",
          email: u.email,
          phone: u.phone,
          status: "Active",
        });
        reconciled++;
      } catch (innerErr) {
        log.warn("admin.doctors.reconcile_orphan_failed", {
          email: u.email,
          message: innerErr instanceof Error ? innerErr.message : String(innerErr),
        });
      }
    }
    if (reconciled > 0) {
      await reloadDoctors();
      log.info("admin.doctors.reconciled_orphans", { count: reconciled });
    }
  } catch (err) {
    log.error("admin.doctors.reconcile_failed", err);
  }

  const { searchParams } = new URL(req.url);
  const doctors = listDoctors({
    search: searchParams.get("search") || undefined,
    specialty: searchParams.get("specialty") || undefined,
    status: (searchParams.get("status") as DoctorStatus | "All" | null) || undefined,
    tier: (searchParams.get("tier") as DoctorTier | "All" | null) || undefined,
  });
  return NextResponse.json({
    doctors,
    tiers: DOCTOR_TIERS,
    specialties: DOCTOR_SPECIALTIES,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const specialty = typeof body.specialty === "string" ? body.specialty : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!name || !specialty || !email) {
    return NextResponse.json(
      { error: "name, specialty and email are required" },
      { status: 400 }
    );
  }
  const doctor = createDoctor({
    name,
    specialty,
    email,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    status: body.status === "Inactive" ? "Inactive" : "Active",
    commission:
      typeof body.commission === "number" ? body.commission : undefined,
    rating: typeof body.rating === "number" ? body.rating : undefined,
    consultationCount:
      typeof body.consultationCount === "number"
        ? body.consultationCount
        : undefined,
    bio: typeof body.bio === "string" ? body.bio : undefined,
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
    qualifications: typeof body.qualifications === "string" ? body.qualifications : undefined,
    experience: typeof body.experience === "number" ? body.experience : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
    location: typeof body.location === "string" ? body.location : undefined,
    fee: typeof body.fee === "number" ? body.fee : undefined,
    gender: body.gender === "Male" || body.gender === "Female" ? body.gender : undefined,
    country: typeof body.country === "string" ? body.country : undefined,
    services: Array.isArray(body.services) ? (body.services as unknown[]).filter((s): s is string => typeof s === "string") : undefined,
    timeSlots: Array.isArray(body.timeSlots) ? (body.timeSlots as unknown[]).filter((s): s is string => typeof s === "string") : undefined,
  });

  // Provision the doctor's login + fire off the welcome email and SMS with
  // a 7-day temporary password. Non-blocking — a mail/SMS outage should not
  // wedge the admin flow.
  let invite: Awaited<ReturnType<typeof inviteDoctor>> = null;
  try {
    invite = await inviteDoctor({
      name: doctor.name,
      email: doctor.email,
      phone: doctor.phone,
    });
  } catch (err) {
    log.error("admin.doctors.invite_failed", err);
  }

  return NextResponse.json(
    {
      doctor,
      invite: invite
        ? {
            emailSent: invite.emailSent,
            smsSent: invite.smsSent,
            reused: invite.reused,
            expiresAt: invite.expiresAt,
          }
        : null,
    },
    { status: 201 },
  );
}

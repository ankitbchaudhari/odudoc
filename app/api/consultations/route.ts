import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createConsultation,
  listConsultations,
  markPaid,
  type MedicalHistory,
} from "@/lib/consultations-store";
import { sendPatientBookingReceived, sendDoctorNewRequest } from "@/lib/consultation-emails";
import { paymentsDisabled } from "@/lib/payments-config";
import { validateSlot } from "@/lib/slot-utils";

import { log } from "@/lib/log";
export const runtime = "nodejs";

function emptyMedicalHistory(): MedicalHistory {
  return {
    chiefComplaint: "",
    symptoms: "",
    duration: "",
    severity: "",
    allergies: "",
    currentMedications: "",
    pastConditions: "",
    surgeries: "",
    familyHistory: "",
    smoker: "",
    alcohol: "",
    pregnant: "",
    additional: "",
  };
}

// ---------- GET — scoped list ----------
// Admins see everything, doctors see consults assigned to them, patients see
// their own. Optional ?status= filters inside that scope.

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; name?: string; role?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  let list;
  if (user.role === "admin") {
    list = listConsultations({ status: status as never });
  } else if (user.role === "doctor") {
    // Match on email first (strict), then fall back to name match so demo
    // doctors like "Dr. Sarah Johnson" (logged in as doctor@odudoc.com) still
    // see consultations created from the public /doctors directory, where
    // the static data.ts doctor profiles don't carry emails.
    const byEmail = listConsultations({ doctorEmail: user.email, status: status as never });
    const byName = user.name
      ? listConsultations({ status: status as never }).filter(
          (c) => c.doctorName.toLowerCase() === user.name!.toLowerCase()
        )
      : [];
    const seen = new Set<string>();
    list = [...byEmail, ...byName].filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  } else {
    list = listConsultations({ patientEmail: user.email, status: status as never });
  }
  return NextResponse.json({ consultations: list });
}

// ---------- POST — patient creates a consultation ----------

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; name?: string } | undefined;
  const body = await req.json().catch(() => ({}));

  const patientEmail = (typeof body.patientEmail === "string" && body.patientEmail) || user?.email || "";
  const patientName = (typeof body.patientName === "string" && body.patientName) || user?.name || "";
  if (!patientEmail || !patientName) {
    return NextResponse.json({ error: "patientEmail and patientName required" }, { status: 400 });
  }
  if (!body.doctorId || !body.doctorName || !body.specialty || !body.scheduledFor || !body.timeSlot) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Enforce 15-min ladder + 30-min lead + no double booking. See
  // lib/slot-utils.ts for the exact rules. scheduledFor can be either a
  // full ISO or YYYY-MM-DD — slice the date part either way.
  const dateStr = String(body.scheduledFor).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const err = validateSlot({
      dateStr,
      slot: String(body.timeSlot),
      consultations: listConsultations({ doctorId: String(body.doctorId) }),
    });
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const mhIn = (body.medicalHistory || {}) as Partial<MedicalHistory>;
  const mh: MedicalHistory = { ...emptyMedicalHistory(), ...mhIn };

  // Kill switch: while payments are disabled, ignore fee + treat as paid.
  const freePeriod = paymentsDisabled();
  const effectiveFee = freePeriod ? 0 : (typeof body.fee === "number" ? body.fee : 25);
  const effectivePaymentIntent = freePeriod
    ? `free_${Date.now()}`
    : (typeof body.paymentIntentId === "string" ? body.paymentIntentId : "");

  const c = createConsultation({
    patientEmail,
    patientName,
    patientPhone: typeof body.patientPhone === "string" ? body.patientPhone : "",
    doctorId: body.doctorId,
    doctorName: body.doctorName,
    doctorEmail: typeof body.doctorEmail === "string" ? body.doctorEmail : undefined,
    specialty: body.specialty,
    scheduledFor: body.scheduledFor,
    timeSlot: body.timeSlot,
    dateLabel: typeof body.dateLabel === "string" ? body.dateLabel : new Date(body.scheduledFor).toDateString(),
    mode: body.mode === "chat" ? "chat" : "video",
    fee: effectiveFee,
    currency: typeof body.currency === "string" ? body.currency : "USD",
    paymentProvider: freePeriod ? "manual" : (body.paymentProvider === "induspays" ? "induspays" : body.paymentProvider === "manual" ? "manual" : "stripe"),
    paymentIntentId: effectivePaymentIntent,
    medicalHistory: mh,
  });

  // If the client already confirmed payment (demo flow without a real
  // gateway round-trip), flip to awaiting_doctor and fire emails now.
  // Free period auto-confirms every booking.
  if (freePeriod || body.paymentStatus === "paid") {
    markPaid(c.id, c.paymentIntentId);
    Promise.all([sendPatientBookingReceived(c), sendDoctorNewRequest(c)]).catch(console.error);
  }

  return NextResponse.json({ consultation: c }, { status: 201 });
}

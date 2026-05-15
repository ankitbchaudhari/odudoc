// POST /api/bookings/mobile/{id}/prescribe
//
// Doctor issues a prescription against a booking from the mobile app.
// The web flow (consultations/[id]/prescribe) operates on consultation
// IDs because it's launched mid-call from the consultation panel; the
// mobile flow keys off the booking the doctor was working from. We
// resolve patient and doctor identity server-side from the booking +
// JWT, the client can't impersonate either.
//
// Body shape mirrors the web prescribe route's PrescriptionData with
// only the fields a doctor would actually fill in on a phone — sensible
// defaults fill the rest from the doctor profile + booking.

import { NextRequest, NextResponse } from "next/server";
import { getBookingById, reloadBookings } from "@/lib/bookings-store";
import { findDoctorByEmail } from "@/lib/doctors-store";
import { findUserByEmail, reloadUsers } from "@/lib/users-store";
import { addPrescription } from "@/lib/prescriptions-store";
import type { PrescriptionData } from "@/lib/prescription-templates";
import { sendPrescriptionToPatient } from "@/lib/consultation-emails";
import { requireMobileUser } from "@/lib/mobile-auth";
import { checkPrescriptionSafety } from "@/lib/drug-safety";
import { parseJson, z } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";

const MedicationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dose: z.string().trim().max(200).default(""),
  frequency: z.string().trim().max(200).default(""),
  duration: z.string().trim().max(200).default(""),
  instructions: z.string().trim().max(500).optional(),
});

const PrescribeSchema = z.object({
  symptoms: z.string().max(2000).optional(),
  diagnosis: z.string().trim().min(1).max(500),
  medications: z.array(MedicationSchema).min(1).max(20),
  tests: z.array(z.string().trim().min(1).max(120)).max(15).optional(),
  advice: z.string().max(1000).optional(),
  followUp: z.string().max(200).optional(),
  templateId: z.string().trim().max(64).optional(),
  patient: z.object({
    age: z.number().int().min(0).max(130).optional(),
    sex: z.enum(["male", "female", "other"]).optional(),
    allergies: z.string().max(500).optional(),
    pregnant: z.boolean().optional(),
    conditions: z.array(z.string().trim().max(64)).max(20).optional(),
  }).optional(),
  /** Doctor must set true after acknowledging high-severity safety
   *  warnings — server-side belt-and-suspenders check. */
  acknowledgeHighSeverityWarnings: z.boolean().optional(),
});

function medicationsTable(data: PrescriptionData): string {
  if (!data.medications?.length) return "";
  const rows = data.medications
    .map(
      (m) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;"><b>${m.name}</b><br/><span style="color:#6b7280;font-size:12px;">${m.instructions || ""}</span></td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${m.dose}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${m.frequency}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${m.duration}</td></tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;"><thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:8px;">Medicine</th><th style="text-align:left;padding:8px;">Dose</th><th style="text-align:left;padding:8px;">Frequency</th><th style="text-align:left;padding:8px;">Duration</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "doctor") {
    return NextResponse.json(
      { error: "wrong_role", message: "Only doctors can issue prescriptions." },
      { status: 403 }
    );
  }

  const parsed = await parseJson(request, PrescribeSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed;

  try {
    await reloadBookings();
    const booking = getBookingById(params.id);
    if (!booking) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }

    // Owner check — the JWT email must match the doctor pinned to this booking.
    const doctor = findDoctorByEmail(auth.email);
    if (!doctor) {
      return NextResponse.json(
        { error: "doctor_record_missing", message: "No doctor profile linked to this account." },
        { status: 404 }
      );
    }
    if (doctor.id !== booking.doctorId) {
      return NextResponse.json(
        { error: "not_your_booking", message: "This booking belongs to another doctor." },
        { status: 403 }
      );
    }

    await reloadUsers();
    const patient = booking.patientEmail ? findUserByEmail(booking.patientEmail) : null;

    // Server-side safety net. If the client submitted without running
    // the checker, a high-severity warning still blocks issuing unless
    // the doctor explicitly acknowledged.
    const safety = checkPrescriptionSafety({
      medicines: body.medications.map((m) => ({ name: m.name, dose: m.dose })),
      patient: body.patient,
    });
    const high = safety.filter((w) => w.severity === "high");
    if (high.length > 0 && !body.acknowledgeHighSeverityWarnings) {
      return NextResponse.json(
        {
          error: "safety_warnings_unacknowledged",
          message:
            "This prescription has high-severity safety warnings. Review them and re-submit with acknowledgement.",
          warnings: safety,
        },
        { status: 409 }
      );
    }

    // Default everything we need; doctor only had to fill diagnosis +
    // medications. Pulling clinic / signature defaults from the doctor
    // profile keeps the printable Rx looking complete.
    const fullData: PrescriptionData = {
      doctorName: doctor.name,
      doctorQualification: doctor.qualifications || "",
      doctorRegistration: "", // not in current Doctor schema
      doctorSpecialty: doctor.specialty || "",
      clinicName: "OduDoc Online Clinic",
      clinicAddress: "OduDoc Telemedicine",
      clinicPhone: doctor.phone || "",
      clinicEmail: doctor.email,
      patientName: booking.patientName,
      patientAge: "",
      patientGender: patient ? "" : "",
      patientId: booking.id,
      patientPhone: booking.patientPhone,
      date: new Date().toISOString().slice(0, 10),
      symptoms: body.symptoms || "",
      diagnosis: body.diagnosis,
      medications: body.medications,
      tests: body.tests || [],
      advice: body.advice || "",
      followUp: body.followUp || "",
      signature: doctor.name,
    };

    const rx = addPrescription({
      doctorEmail: doctor.email,
      patientEmail: booking.patientEmail || "",
      templateId: body.templateId || "classic-blue",
      data: fullData,
    });

    const viewUrl = `${SITE_URL}/prescription/${rx.id}`;
    const buyUrl = `${SITE_URL}/shop?rx=${rx.id}`;

    if (booking.patientEmail) {
      sendPrescriptionToPatient({
        to: booking.patientEmail,
        patientName: booking.patientName,
        doctorName: doctor.name,
        prescriptionId: rx.id,
        medicationsHtml: medicationsTable(fullData),
        buyUrl,
        viewUrl,
      }).catch((err) => log.error("mobile prescribe email failed", err));
    }

    return NextResponse.json({
      prescription: rx,
      viewUrl,
      buyUrl,
    }, { status: 201 });
  } catch (err) {
    log.error("mobile prescribe error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

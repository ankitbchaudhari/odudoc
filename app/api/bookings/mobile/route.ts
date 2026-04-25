// /api/bookings/mobile
//
// Authenticated booking endpoints for the Android apps.
//
// POST — create a booking (patient identity is taken from the JWT, not from
// the request body, so clients can't book as someone else).
// GET  — list the caller's bookings (Upcoming / Past split happens client-
// side so the backend stays stateless about "now").

import { NextRequest, NextResponse } from "next/server";
import {
  createBooking,
  getBookingsForUser,
} from "@/lib/bookings-store";
import { listConsultations } from "@/lib/consultations-store";
import { validateSlot } from "@/lib/slot-utils";
import { getDoctorById } from "@/lib/doctors-store";
import { findUserByEmail, reloadUsers } from "@/lib/users-store";
import { notifyAppointmentBooked } from "@/lib/notifications";
import { requireMobileUser } from "@/lib/mobile-auth";
import { sendToUser, sendToEmail } from "@/lib/fcm";
import { parseJson, z } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const MobileBookingSchema = z.object({
  doctorId: z.string().trim().min(1).max(64),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  timeSlot: z.string().trim().regex(/^\d{2}:\d{2}$/, "timeSlot must be HH:MM"),
  appointmentType: z.enum(["video", "in-person"]).optional(),
  paymentIntentId: z.string().trim().max(128).optional(),
  paymentStatus: z.enum(["paid", "pending"]).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  // Doctors shouldn't be booking themselves from the patient app.
  if (auth.role !== "patient") {
    return NextResponse.json(
      { error: "wrong_role", message: "Only patients can book consultations." },
      { status: 403 }
    );
  }

  const parsed = await parseJson(request, MobileBookingSchema);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed;

  try {
    await reloadUsers();
    const patient = findUserByEmail(auth.email);
    if (!patient) {
      return NextResponse.json({ error: "patient_not_found" }, { status: 404 });
    }

    const doctor = getDoctorById(body.doctorId);
    if (!doctor) {
      return NextResponse.json({ error: "doctor_not_found" }, { status: 404 });
    }

    const slotErr = validateSlot({
      dateStr: body.date,
      slot: body.timeSlot,
      consultations: listConsultations({ doctorId: doctor.id }),
    });
    if (slotErr) {
      return NextResponse.json({ error: "slot_invalid", message: slotErr }, { status: 400 });
    }

    const booking = createBooking({
      doctorId: doctor.id,
      doctorName: doctor.name,
      patientName: patient.name,
      patientPhone: patient.phone,
      timeSlot: body.timeSlot,
      fee: doctor.fee ?? 0,
      paymentStatus: body.paymentStatus || "pending",
      paymentIntentId: body.paymentIntentId || "",
      // Mobile-only fields — let the My Consultations screen find this
      // booking and decide upcoming/past from `date`.
      patientUserId: patient.id,
      patientEmail: patient.email,
      date: body.date,
      appointmentType: body.appointmentType || "video",
      status: "scheduled",
    });

    // Email notifications — same helper the web flow uses. Non-fatal.
    try {
      notifyAppointmentBooked({
        patientName: patient.name,
        patientEmail: patient.email,
        patientPhone: patient.phone,
        doctorName: doctor.name,
        doctorEmail: doctor.email,
        doctorPhone: doctor.phone,
        date: body.date,
        time: body.timeSlot,
        type: body.appointmentType || "video",
      });
    } catch (err) {
      log.error("mobile-booking notify threw", err);
    }

    // FCM push to both sides so they see the booking instantly. Best-effort.
    void sendToUser(patient.id, {
      title: "Appointment booked",
      body: `${doctor.name} on ${body.date} at ${body.timeSlot}`,
      deepLink: `consult/${booking.id}`,
      channel: "appointments",
    });
    if (doctor.email) {
      void sendToEmail(doctor.email, {
        title: "New appointment",
        body: `${patient.name} on ${body.date} at ${body.timeSlot}`,
        deepLink: `consult/${booking.id}`,
        channel: "appointments",
      });
    }

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    log.error("mobile-booking error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "patient") {
    return NextResponse.json(
      { error: "wrong_role", message: "This endpoint is for patients." },
      { status: 403 }
    );
  }

  try {
    const bookings = getBookingsForUser(auth.userId, auth.email);
    return NextResponse.json({ bookings });
  } catch (err) {
    log.error("mobile-booking list error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

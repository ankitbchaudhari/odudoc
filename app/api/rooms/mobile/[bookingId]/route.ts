// GET /api/rooms/mobile/[bookingId]
//
// Return the video room for an authenticated user's booking. Unlike the
// public /api/rooms which accepts a client-supplied patientName (guarded
// by an OTP token), this one reads identity from the mobile JWT — the
// caller must either (a) be the patient who created the booking, or (b)
// be the doctor assigned to it.
//
// Behavior:
//   - Reuses an existing Room row keyed to the bookingId (idempotent per
//     booking), or creates one on first access.
//   - Uses Daily.co when configured (returns a fresh meeting token for
//     this caller), falls back to Jitsi Meet otherwise (no token needed).
//   - Refuses if the booking is cancelled or unpaid.
//   - Soft lead-time window: patients can join from 15 minutes before the
//     slot; doctors can join any time before the slot start (they may be
//     early) and after (they may be finishing notes).

import { NextRequest, NextResponse } from "next/server";
import {
  createDailyRoom,
  createDailyToken,
  generateRoomName,
  isDailyConfigured,
} from "@/lib/daily";
import { createRoom, getAllRooms } from "@/lib/rooms-store";
import { getBookingById } from "@/lib/bookings-store";
import { findUserByEmail, reloadUsers } from "@/lib/users-store";
import { getDoctorById } from "@/lib/doctors-store";
import { requireMobileUser } from "@/lib/mobile-auth";
import { log } from "@/lib/log";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

const PATIENT_LEAD_MIN = 15;   // join-early window for patients
const JOIN_LATE_MIN = 60;      // max late after slot start (for both roles)

function sanitiseJitsiName(roomName: string): string {
  return `odudoc-${roomName}`.replace(/[^a-zA-Z0-9-]/g, "-");
}

function slotStart(date?: string, hhmm?: string): Date | null {
  if (!date || !hhmm) return null;
  const d = new Date(`${date}T${hhmm}:00`);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const booking = getBookingById(params.bookingId);
    if (!booking) {
      return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
    }
    if (booking.status === "cancelled") {
      return NextResponse.json(
        { error: "booking_cancelled", message: "This consultation was cancelled." },
        { status: 400 }
      );
    }

    // Role-based authorization.
    let isOwner = false;   // i.e. the Daily "is_owner" bit — true for doctors
    let displayName = auth.name || auth.email;

    if (auth.role === "patient") {
      if (booking.patientUserId !== auth.userId) {
        return NextResponse.json(
          { error: "not_your_booking" },
          { status: 403 }
        );
      }
      if (booking.paymentStatus !== "paid") {
        return NextResponse.json(
          { error: "payment_required", message: "Please complete payment before joining." },
          { status: 402 }
        );
      }
      await reloadUsers();
      const patient = findUserByEmail(auth.email);
      displayName = patient?.name || displayName;
    } else if (auth.role === "doctor") {
      const doc = getDoctorById(booking.doctorId);
      if (!doc || doc.email?.toLowerCase() !== auth.email.toLowerCase()) {
        return NextResponse.json(
          { error: "not_your_booking" },
          { status: 403 }
        );
      }
      isOwner = true;
      displayName = doc.name || displayName;
    } else {
      return NextResponse.json(
        { error: "wrong_role", message: "Only patients and doctors can join consultations." },
        { status: 403 }
      );
    }

    // Time-window check (soft — we warn but still allow, UI shows a banner).
    // Hard block only if they're way too early or way too late, to reduce
    // wasted room creation on typos.
    const start = slotStart(booking.date, booking.timeSlot);
    if (start) {
      const now = Date.now();
      const startMs = start.getTime();
      const minsUntil = (startMs - now) / 60000;
      const minsLate = (now - startMs) / 60000;
      if (auth.role === "patient" && minsUntil > PATIENT_LEAD_MIN * 4) {
        // More than an hour early — not ready yet.
        return NextResponse.json(
          {
            error: "too_early",
            message: `You can join up to ${PATIENT_LEAD_MIN} minutes before your slot.`,
            minutesUntilSlot: Math.ceil(minsUntil),
          },
          { status: 400 }
        );
      }
      if (minsLate > JOIN_LATE_MIN) {
        return NextResponse.json(
          {
            error: "slot_ended",
            message: "This consultation window has ended.",
          },
          { status: 410 }
        );
      }
    }

    // Idempotent room lookup — reuse if a row already exists for this
    // bookingId. We keep the same roomUrl so both sides land in the same
    // room regardless of who joins first.
    let room = getAllRooms().find((r) => r.bookingId === booking.id);

    if (!room) {
      const roomName = generateRoomName(booking.doctorId, booking.id);
      let roomUrl = "";

      if (isDailyConfigured()) {
        const dailyRoom = await createDailyRoom(roomName);
        if (dailyRoom) roomUrl = dailyRoom.url;
      }
      // Jitsi fallback — no API key required.
      if (!roomUrl) {
        roomUrl = `https://meet.jit.si/${sanitiseJitsiName(roomName)}`;
      }

      room = createRoom({
        id: uuidv4(),
        roomName,
        roomUrl,
        doctorId: booking.doctorId,
        doctorName: booking.doctorName,
        patientName: booking.patientName,
        patientPhone: booking.patientPhone,
        bookingId: booking.id,
        specialty: "General",
        fee: booking.fee,
        status: "waiting",
        createdAt: new Date().toISOString(),
      });
    }

    // Daily tokens are per-user and short-lived, so mint fresh every call.
    let meetingToken: string | null = null;
    const provider: "daily" | "jitsi" = room.roomUrl.includes("daily.co")
      ? "daily"
      : "jitsi";

    if (provider === "daily") {
      meetingToken = await createDailyToken(room.roomName, displayName, isOwner);
    }

    return NextResponse.json({
      bookingId: booking.id,
      roomId: room.id,
      roomUrl: room.roomUrl,
      roomName: room.roomName,
      provider,
      token: meetingToken,
      userName: displayName,
      isOwner,
      doctorName: booking.doctorName,
      patientName: booking.patientName,
      status: room.status,
    });
  } catch (err) {
    log.error("mobile-rooms error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

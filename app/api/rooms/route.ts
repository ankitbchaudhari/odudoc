import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createDailyRoom, createDailyToken, generateRoomName, isDailyConfigured } from "@/lib/daily";
import { createRoom, getRoom, getAllRooms, reloadRooms } from "@/lib/rooms-store";
import { consumeConsultToken } from "@/lib/consult-otp";
import { createConsultation, markPaid, setStatus } from "@/lib/consultations-store";

import { log } from "@/lib/log";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doctorId, doctorName, specialty, fee, bookingId, consultToken } = body;
    let { patientName } = body;
    let patientPhone: string | undefined;

    // Guest video-consult flow: client sends the short-lived OTP token it
    // got from /api/consult/otp/verify. We consume it here and take the
    // trusted name + phone from the server-side record, so a random caller
    // can't just POST arbitrary patientName into /api/rooms.
    if (consultToken) {
      const rec = consumeConsultToken(consultToken);
      if (!rec) {
        return NextResponse.json(
          { error: "Your verification has expired. Please verify your phone again." },
          { status: 401 },
        );
      }
      patientName = `${rec.firstName} ${rec.lastName}`.trim();
      patientPhone = rec.phone;
    }

    if (!doctorId || !patientName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const roomId = uuidv4();

    // Resolve a real consultation id for this room. If the caller supplied
    // one (the booked-flow case), use it; otherwise this is an instant or
    // guest video-consult where no consultation row exists yet, so create
    // a placeholder. We need a real id because /api/consultations/{id}/
    // prescribe looks the row up by id when the doctor saves the Rx at
    // the end of the call. Without a row, that POST 404s and the
    // prescription is lost.
    let bId = bookingId;
    if (!bId) {
      const phoneDigits = (patientPhone || "").replace(/[^0-9]/g, "");
      const syntheticEmail = phoneDigits
        ? `guest-${phoneDigits}@consult.odudoc.local`
        : `guest-${roomId.slice(0, 8)}@consult.odudoc.local`;
      const today = new Date();
      const placeholder = createConsultation({
        patientEmail: syntheticEmail,
        patientName,
        patientPhone: patientPhone || "",
        doctorId,
        doctorName: doctorName || "Doctor",
        specialty: specialty || "General",
        scheduledFor: today.toISOString(),
        timeSlot: "now",
        dateLabel: today.toISOString().slice(0, 10),
        mode: "video",
        fee: fee || 0,
        paymentProvider: "manual",
        medicalHistory: {
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
        },
      });
      // Reflect that the call is happening now and was paid out-of-band
      // (OTP-gated guest flow / instant consult — Stripe wasn't involved).
      markPaid(placeholder.id, `manual-${roomId}`);
      setStatus(placeholder.id, "in_progress");
      bId = placeholder.id;
    }

    const roomName = generateRoomName(doctorId, bId);

    let roomUrl = "";
    let patientToken: string | null = null;
    let doctorToken: string | null = null;
    let demoMode = false;

    if (isDailyConfigured()) {
      const dailyRoom = await createDailyRoom(roomName);
      if (dailyRoom) {
        roomUrl = dailyRoom.url;
        patientToken = await createDailyToken(roomName, patientName, false);
        doctorToken = await createDailyToken(roomName, doctorName || "Doctor", true);
      }
    }

    // Free fallback: Jitsi Meet — no API key, no account, no billing.
    // Works for our two-participant telehealth calls and handles its
    // own signaling, media, and prebuilt UI via the iframe at
    // meet.jit.si/<roomName>. Daily is preferred when configured
    // because it gives us per-user tokens + usage analytics, but
    // Jitsi keeps the product working for free.
    if (!roomUrl) {
      const jitsiRoom = `odudoc-${roomName}`.replace(/[^a-zA-Z0-9-]/g, "-");
      roomUrl = `https://meet.jit.si/${jitsiRoom}`;
    }

    const room = createRoom({
      id: roomId,
      roomName,
      roomUrl,
      doctorId,
      doctorName: doctorName || "Doctor",
      patientName,
      patientPhone,
      bookingId: bId,
      specialty: specialty || "General",
      fee: fee || 0,
      status: "waiting",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      roomId: room.id,
      roomUrl: room.roomUrl,
      roomName: room.roomName,
      patientToken,
      doctorToken,
      demoMode,
    });
  } catch (err) {
    log.error("Error creating room:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Rewrite legacy Daily URLs that were created before we switched to
// Jitsi. Those Daily rooms require a billed account to actually join,
// so without rewriting, old consultation links would be dead. Jitsi
// rooms don't need to exist ahead of time — meet.jit.si creates them
// on first visit — so we can just redirect the name and it works.
function migrateLegacyUrl(url: string, roomName: string): string {
  if (url.includes("daily.co")) {
    const jitsiRoom = `odudoc-${roomName}`.replace(/[^a-zA-Z0-9-]/g, "-");
    return `https://meet.jit.si/${jitsiRoom}`;
  }
  return url;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  await reloadRooms();

  if (roomId) {
    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    // Once a call has ended, neither side can rejoin. The UI uses `ended`
    // to short-circuit straight to a "consultation closed" screen that
    // prompts the patient to book + pay for a new appointment.
    const ended = room.status === "ended";
    return NextResponse.json({
      ...room,
      ended,
      roomUrl: migrateLegacyUrl(room.roomUrl, room.roomName),
    });
  }

  const rooms = getAllRooms().map((r) => ({
    ...r,
    roomUrl: migrateLegacyUrl(r.roomUrl, r.roomName),
  }));
  return NextResponse.json(rooms);
}

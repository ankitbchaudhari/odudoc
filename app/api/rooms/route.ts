import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createDailyRoom, createDailyToken, generateRoomName, isDailyConfigured } from "@/lib/daily";
import { createRoom, getRoom, getAllRooms } from "@/lib/rooms-store";
import { consumeConsultToken } from "@/lib/consult-otp";

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
    const bId = bookingId || uuidv4().slice(0, 8);
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");

  if (roomId) {
    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    return NextResponse.json(room);
  }

  const rooms = getAllRooms();
  return NextResponse.json(rooms);
}

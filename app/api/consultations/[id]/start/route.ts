import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import {
  getConsultation,
  setRoom,
  setStatus,
  hasMedicalHistory,
} from "@/lib/consultations-store";
import { createDailyRoom, createDailyToken, generateRoomName, isDailyConfigured } from "@/lib/daily";
import { createRoom } from "@/lib/rooms-store";

export const runtime = "nodejs";

// Doctor starts the consultation — provisions a video room and flips the
// consultation into in_progress so both sides get a "Join video call" link.

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; name?: string; role?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const c = getConsultation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwnerDoctor =
    user.role === "doctor" &&
    (
      (!!c.doctorEmail && c.doctorEmail === user.email.toLowerCase()) ||
      (!!user.name && c.doctorName.toLowerCase() === user.name.toLowerCase())
    );
  const isAdmin = user.role === "admin";
  if (!isOwnerDoctor && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Medical history is preferred but not required to start the call — the
  // doctor can collect it verbally during the consult. We surface a warning
  // in the response so the UI can nudge the patient to fill it in.
  const missingHistory = !hasMedicalHistory(c);
  if (c.status !== "approved" && c.status !== "in_progress" && c.status !== "rescheduled") {
    return NextResponse.json({ error: `Cannot start — consultation is ${c.status}` }, { status: 400 });
  }

  // If a room already exists, reuse it.
  if (c.roomId) {
    setStatus(id, "in_progress");
    return NextResponse.json({ consultation: getConsultation(id), roomId: c.roomId, missingHistory });
  }

  const roomId = uuidv4();
  const bId = c.bookingId || id.slice(0, 8);
  const roomName = generateRoomName(c.doctorId, bId);
  let roomUrl = "";

  if (isDailyConfigured()) {
    const dailyRoom = await createDailyRoom(roomName);
    if (dailyRoom) roomUrl = dailyRoom.url;
  }
  if (!roomUrl) roomUrl = `demo://${roomName}`;

  createRoom({
    id: roomId,
    roomName,
    roomUrl,
    doctorId: c.doctorId,
    doctorName: c.doctorName,
    patientName: c.patientName,
    bookingId: bId,
    specialty: c.specialty,
    fee: c.fee,
    status: "waiting",
    createdAt: new Date().toISOString(),
  });

  setRoom(id, roomId);
  setStatus(id, "in_progress");

  // Best-effort token creation (tokens are fetched at join time in current flow)
  if (isDailyConfigured()) {
    await createDailyToken(roomName, c.patientName, false).catch(() => null);
    await createDailyToken(roomName, c.doctorName, true).catch(() => null);
  }

  return NextResponse.json({ consultation: getConsultation(id), roomId, missingHistory });
}

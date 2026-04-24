// GET/POST /api/rooms/[roomId]/presence
//
// Lightweight per-room heartbeat so the VideoCall component can flip
// the "Waiting for other participant…" state the moment the other
// side lands on the room page. No WebRTC/signaling infra needed — we
// just keep an in-memory map of who pinged which room in the last
// 20 seconds. Both patient and doctor POST every ~5s while on the
// room page; GET returns the peer's presence so the UI can react.
//
// Single-process per Lambda is fine here: both callers hit the same
// route-handler warm Lambda for the duration of the call, and even
// if they don't the worst case is a ~5s delay before presence syncs.
// For production you'd swap this for Daily.co participant events or
// a Redis pubsub heartbeat.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

type Role = "doctor" | "patient";

interface Entry {
  role: Role;
  name: string;
  lastSeen: number;
}

// roomId -> userId -> Entry. Held in a module-level Map so it survives
// across route calls in the same Lambda.
const PRESENCE: Map<string, Map<string, Entry>> = new Map();

// Anything older than this is considered "left" — matches twice the
// client's 5s ping cadence with a little buffer for network jitter.
const STALE_MS = 20_000;

function prune(room: Map<string, Entry>) {
  const now = Date.now();
  for (const [k, v] of room.entries()) {
    if (now - v.lastSeen > STALE_MS) room.delete(k);
  }
}

function roleFromSession(sessionRole: string | undefined): Role {
  return sessionRole === "doctor" ? "doctor" : "patient";
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; name?: string; role?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { roomId } = await params;
  let room = PRESENCE.get(roomId);
  if (!room) {
    room = new Map();
    PRESENCE.set(roomId, room);
  }
  room.set(user.email, {
    role: roleFromSession(user.role),
    name: user.name || user.email,
    lastSeen: Date.now(),
  });
  prune(room);

  // Return the peer info (the other role) so the client can update
  // its UI immediately off the POST response without an extra GET.
  const selfRole = roleFromSession(user.role);
  const peer = Array.from(room.values()).find((e) => e.role !== selfRole);
  return NextResponse.json({
    ok: true,
    peer: peer ? { role: peer.role, name: peer.name } : null,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { roomId } = await params;
  const room = PRESENCE.get(roomId);
  if (!room) return NextResponse.json({ peer: null, participants: [] });
  prune(room);

  const selfRole = roleFromSession(user.role);
  const participants = Array.from(room.values()).map((e) => ({
    role: e.role,
    name: e.name,
  }));
  const peer = participants.find((p) => p.role !== selfRole);
  return NextResponse.json({ peer: peer ?? null, participants });
}

// POST /api/doctor/instant   — flip own "available now" flag
// GET  /api/doctor/instant   — read current flag (for dashboard UI)
//
// Doctors only. Uses the session email to find their directory record,
// so they can't accidentally (or maliciously) toggle someone else's
// availability. `minutes` controls how long the flag stays on before it
// auto-expires — defaults to 15 minutes so an abandoned browser tab
// doesn't leave a doctor showing as online overnight.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findDoctorByEmail,
  isInstantlyAvailable,
  setInstantAvailable,
} from "@/lib/doctors-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const d = findDoctorByEmail(user.email);
  if (!d) return NextResponse.json({ available: false, until: null });
  return NextResponse.json({
    available: isInstantlyAvailable(d),
    until: d.instantAvailableUntil ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email || user.role !== "doctor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  // Clamp the TTL to 2 hours max so an hour-long standup doesn't leave
  // the doctor advertised as online indefinitely.
  const minutes = Math.max(0, Math.min(120, Number(body.minutes ?? 15)));

  const d = setInstantAvailable(user.email, minutes);
  if (!d) {
    return NextResponse.json(
      { error: "Doctor profile not found. Contact admin to set up your directory entry." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    available: isInstantlyAvailable(d),
    until: d.instantAvailableUntil ?? null,
  });
}

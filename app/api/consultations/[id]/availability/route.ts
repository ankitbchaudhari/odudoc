import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getConsultation,
  requestAvailability,
  respondAvailability,
  hasMedicalHistory,
} from "@/lib/consultations-store";

export const runtime = "nodejs";

// POST: doctor pings patient "are you available?"
// PATCH: patient responds (available true/false)

function isDoctor(c: ReturnType<typeof getConsultation>, u: { email?: string; name?: string; role?: string }) {
  if (!c || !u.email) return false;
  if (u.role === "admin") return true;
  if (u.role !== "doctor") return false;
  return (
    (!!c.doctorEmail && c.doctorEmail === u.email.toLowerCase()) ||
    (!!u.name && c.doctorName.toLowerCase() === u.name.toLowerCase())
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; name?: string; role?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const c = getConsultation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isDoctor(c, user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!hasMedicalHistory(c)) {
    return NextResponse.json({ error: "Patient hasn't submitted medical history yet" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message : undefined;
  const updated = requestAvailability(id, message);
  return NextResponse.json({ consultation: updated });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const c = getConsultation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPatient = c.patientEmail === user.email.toLowerCase();
  if (!isPatient && user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const available = !!body.available;
  const note = typeof body.note === "string" ? body.note : undefined;
  const updated = respondAvailability(id, available, note);
  if (!updated) return NextResponse.json({ error: "No pending request" }, { status: 400 });
  return NextResponse.json({ consultation: updated });
}

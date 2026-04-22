import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  type AppointmentStatus,
} from "@/lib/appointments-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const a = getAppointmentById(id);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ appointment: a });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Parameters<typeof updateAppointment>[1] = {};
  if (typeof body.patientName === "string") patch.patientName = body.patientName;
  if (typeof body.patientEmail === "string") patch.patientEmail = body.patientEmail;
  if (typeof body.patientPhone === "string") patch.patientPhone = body.patientPhone;
  if (typeof body.doctorName === "string") patch.doctorName = body.doctorName;
  if (typeof body.doctorId === "string") patch.doctorId = body.doctorId;
  if (typeof body.date === "string") patch.date = body.date;
  if (typeof body.time === "string") patch.time = body.time;
  if (["Pending", "Confirmed", "Completed", "Cancelled"].includes(body.status)) {
    patch.status = body.status as AppointmentStatus;
  }
  if (typeof body.notes === "string") patch.notes = body.notes;
  const a = updateAppointment(id, patch);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ appointment: a });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const ok = deleteAppointment(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

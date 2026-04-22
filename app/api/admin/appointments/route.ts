import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAppointments, createAppointment, type AppointmentStatus } from "@/lib/appointments-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  return NextResponse.json({
    appointments: listAppointments({
      status: (searchParams.get("status") as AppointmentStatus | "All" | null) || undefined,
      date: searchParams.get("date") || undefined,
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const patientName = typeof body.patientName === "string" ? body.patientName.trim() : "";
  const doctorName = typeof body.doctorName === "string" ? body.doctorName.trim() : "";
  const date = typeof body.date === "string" ? body.date : "";
  const time = typeof body.time === "string" ? body.time : "";
  if (!patientName || !doctorName || !date || !time) {
    return NextResponse.json({ error: "patientName, doctorName, date, time required" }, { status: 400 });
  }
  const status: AppointmentStatus = ["Pending", "Confirmed", "Completed", "Cancelled"].includes(body.status)
    ? body.status
    : "Pending";
  const a = createAppointment({
    patientName,
    patientEmail: typeof body.patientEmail === "string" ? body.patientEmail : undefined,
    patientPhone: typeof body.patientPhone === "string" ? body.patientPhone : undefined,
    doctorName,
    doctorId: typeof body.doctorId === "string" ? body.doctorId : undefined,
    date,
    time,
    status,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });
  return NextResponse.json({ appointment: a }, { status: 201 });
}

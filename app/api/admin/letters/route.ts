// Admin API: list + create doctor letters (appointment / experience).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDoctorById } from "@/lib/doctors-store";
import {
  createLetter,
  listLetters,
  type LetterType,
} from "@/lib/doctor-letters";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId") || undefined;
  const type = (searchParams.get("type") as LetterType | null) || undefined;
  return NextResponse.json({ letters: listLetters({ doctorId, type: type ?? undefined }) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; email?: string | null } | undefined;
  if (!isAdmin(user?.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = body.type as LetterType;
  if (type !== "appointment" && type !== "experience") {
    return NextResponse.json({ error: "type must be 'appointment' or 'experience'" }, { status: 400 });
  }

  const doctorId = typeof body.doctorId === "string" ? body.doctorId : "";
  if (!doctorId) return NextResponse.json({ error: "doctorId is required" }, { status: 400 });
  const doctor = getDoctorById(doctorId);
  if (!doctor) return NextResponse.json({ error: "Doctor not found" }, { status: 404 });

  const str = (k: string, fallback = ""): string =>
    typeof body[k] === "string" ? (body[k] as string).trim() : fallback;
  const num = (k: string): number | undefined =>
    typeof body[k] === "number" ? (body[k] as number) : undefined;

  // Shared fields
  const designation = str("designation") || "Consultant Physician";
  const department = str("department") || doctor.specialty || "General Medicine";
  const signedBy = str("signedBy") || "HR Manager";
  const signedByTitle = str("signedByTitle") || "Head of People, OduDoc";
  const notes = str("notes") || undefined;

  // Type-specific validation
  if (type === "appointment" && !str("joiningDate")) {
    return NextResponse.json({ error: "joiningDate is required for appointment letters" }, { status: 400 });
  }
  if (type === "experience") {
    if (!str("startDate") || !str("endDate")) {
      return NextResponse.json({ error: "startDate and endDate are required for experience letters" }, { status: 400 });
    }
  }

  const letter = await createLetter({
    type,
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorEmail: doctor.email,
    specialty: doctor.specialty,
    designation,
    department,
    signedBy,
    signedByTitle,
    joiningDate: str("joiningDate") || undefined,
    ctcAnnual: num("ctcAnnual"),
    probationMonths: num("probationMonths"),
    noticePeriodDays: num("noticePeriodDays"),
    workLocation: str("workLocation") || undefined,
    startDate: str("startDate") || undefined,
    endDate: str("endDate") || undefined,
    conductRemarks: str("conductRemarks") || undefined,
    notes,
    createdBy: user?.email || "admin",
  });

  return NextResponse.json({ letter }, { status: 201 });
}

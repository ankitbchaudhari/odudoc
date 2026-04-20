import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listTimetable,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  type WeekDay,
  type TimetableSlot,
} from "@/lib/timetable-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

const DAYS: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS: TimetableSlot[] = ["morning", "afternoon", "evening"];

export async function GET() {
  return NextResponse.json({ entries: listTimetable() });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { doctorName, department, day, timeSlot, time, color } = body as Record<string, unknown>;
  if (typeof doctorName !== "string" || !doctorName.trim())
    return NextResponse.json({ error: "doctorName required" }, { status: 400 });
  if (typeof department !== "string" || !department.trim())
    return NextResponse.json({ error: "department required" }, { status: 400 });
  if (typeof day !== "string" || !DAYS.includes(day as WeekDay))
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  if (typeof timeSlot !== "string" || !SLOTS.includes(timeSlot as TimetableSlot))
    return NextResponse.json({ error: "Invalid timeSlot" }, { status: 400 });
  if (typeof time !== "string" || !time.trim())
    return NextResponse.json({ error: "time required" }, { status: 400 });

  const entry = createTimetableEntry({
    doctorName,
    department,
    day: day as WeekDay,
    timeSlot: timeSlot as TimetableSlot,
    time,
    color: typeof color === "string" ? color : undefined,
  });
  return NextResponse.json({ entry }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const { id, ...patch } = body as Record<string, unknown>;
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  const entry = updateTimetableEntry(id, {
    doctorName: typeof patch.doctorName === "string" ? patch.doctorName : undefined,
    department: typeof patch.department === "string" ? patch.department : undefined,
    day: typeof patch.day === "string" && DAYS.includes(patch.day as WeekDay) ? (patch.day as WeekDay) : undefined,
    timeSlot:
      typeof patch.timeSlot === "string" && SLOTS.includes(patch.timeSlot as TimetableSlot)
        ? (patch.timeSlot as TimetableSlot)
        : undefined,
    time: typeof patch.time === "string" ? patch.time : undefined,
    color: typeof patch.color === "string" ? patch.color : undefined,
  });
  return entry
    ? NextResponse.json({ entry })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = deleteTimetableEntry(id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

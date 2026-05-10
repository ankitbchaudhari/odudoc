// Education partners API — courses + placements.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createCourse, createPlacement, deleteCourse, deletePlacement,
  listCourses, listPlacements, updateCourse, updatePlacement,
  CourseLevel, CourseMode,
} from "@/lib/education/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEVELS: CourseLevel[] = ["certificate", "diploma", "undergrad", "postgrad", "fellowship", "cme", "workshop"];
const MODES: CourseMode[] = ["in_person", "online_self_paced", "online_live", "online_one_on_one", "hybrid"];

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "courses";
  if (scope === "placements") {
    const session = await getServerSession(authOptions);
    if (role(session) !== "admin" && role(session) !== "staff") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({
      placements: listPlacements({
        organizationId: url.searchParams.get("orgId") || undefined,
      }),
    });
  }
  const opts = {
    organizationId: url.searchParams.get("orgId") || undefined,
    specialty: url.searchParams.get("specialty") || undefined,
    level: (url.searchParams.get("level") as CourseLevel | null) || undefined,
    mode: (url.searchParams.get("mode") as CourseMode | null) || undefined,
    query: url.searchParams.get("query") || undefined,
    openOnly: true,
  };
  return NextResponse.json({ courses: listCourses(opts) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action || "create_course";

  // Placement requests are open to any signed-in user (the student
  // applying through a partner).
  if (action === "create_placement") {
    if (!body.organizationId || !body.studentName || !body.studentEmail || !body.qualifications) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const p = createPlacement({
      organizationId: String(body.organizationId),
      studentName: String(body.studentName),
      studentEmail: String(body.studentEmail),
      studentPhone: body.studentPhone,
      qualifications: String(body.qualifications),
      specialtySought: body.specialtySought,
      preferredCities: body.preferredCities,
      courseId: body.courseId,
      objective: body.objective,
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ placement: p });
  }

  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (action === "create_course") {
    if (!body.organizationId || !body.title || !body.description || !LEVELS.includes(body.level) || !MODES.includes(body.mode)) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const c = createCourse({
      organizationId: String(body.organizationId),
      title: String(body.title),
      specialty: body.specialty,
      level: body.level,
      mode: body.mode,
      duration: body.duration,
      feeRupees: body.feeRupees !== undefined ? Number(body.feeRupees) : undefined,
      intakeSchedule: body.intakeSchedule,
      city: body.city,
      countryIso2: body.countryIso2,
      description: String(body.description),
      syllabus: Array.isArray(body.syllabus) ? body.syllabus : undefined,
      prerequisites: Array.isArray(body.prerequisites) ? body.prerequisites : undefined,
      websiteUrl: body.websiteUrl,
      enrollOnPlatform: body.enrollOnPlatform,
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ course: c });
  }

  if (action === "update_course") {
    if (!body.id || !body.organizationId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const c = updateCourse(String(body.id), String(body.organizationId), body.patch || {});
    if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ course: c });
  }

  if (action === "update_placement") {
    if (!body.id || !body.organizationId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const p = updatePlacement(String(body.id), String(body.organizationId), body.patch || {});
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ placement: p });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const orgId = url.searchParams.get("orgId");
  const target = url.searchParams.get("target") || "course";
  if (!id || !orgId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const ok = target === "placement" ? deletePlacement(id, orgId) : deleteCourse(id, orgId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}

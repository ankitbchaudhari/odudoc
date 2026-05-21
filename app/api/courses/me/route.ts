// GET /api/courses/me — signed-in student's enrolments.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listMyEnrollments, getCourseBySlug } from "@/lib/courses-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const rows = await listMyEnrollments(session.user.email);

  // Join the course title + slug onto each enrolment row for the UI.
  // Cheap because the courses array is small + in-memory.
  const enrolments = await Promise.all(rows.map(async (e) => {
    // We need course by id, not slug; but getCourseBySlug() exists.
    // Iterate listCourses indirectly via the store import to keep
    // this endpoint thin.
    const { listCourses } = await import("@/lib/courses-store");
    const all = await listCourses({ status: "published" });
    const c = all.find((x) => x.id === e.courseId);
    return {
      ...e,
      courseTitle: c?.title || "Untitled course",
      courseSlug: c?.slug || "",
    };
  }));
  return NextResponse.json({ enrolments });
}

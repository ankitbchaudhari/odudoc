// POST /api/courses/[slug]/enrol
//
// Charges the student's wallet (for paid tiers), records the
// enrolment row. Returns 422 with a friendly error code when the
// wallet is under-funded so the UI can prompt a top-up.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourseBySlug, enrol } from "@/lib/courses-store";

export const runtime = "nodejs";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const course = await getCourseBySlug(slug);
  if (!course) return NextResponse.json({ error: "course_not_found" }, { status: 404 });

  const result = await enrol(course.id, {
    email: session.user.email,
    name: session.user.name || session.user.email.split("@")[0],
  });
  if (!result.ok) {
    const status = result.error === "insufficient_balance" ? 422
      : result.error === "course_not_published" ? 409
      : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ enrolment: result.enrolment });
}

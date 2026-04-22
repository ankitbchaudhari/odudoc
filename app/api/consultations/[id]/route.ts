import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConsultation } from "@/lib/consultations-store";

export const runtime = "nodejs";

function canView(
  c: ReturnType<typeof getConsultation>,
  user: { email?: string; name?: string; role?: string }
): boolean {
  if (!c) return false;
  if (user.role === "admin") return true;
  if (user.role === "doctor") {
    const emailMatch = c.doctorEmail && c.doctorEmail === user.email?.toLowerCase();
    const nameMatch = user.name && c.doctorName.toLowerCase() === user.name.toLowerCase();
    return Boolean(emailMatch || nameMatch);
  }
  return c.patientEmail === user.email?.toLowerCase();
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; name?: string; role?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const c = getConsultation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canView(c, user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ consultation: c });
}

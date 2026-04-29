// Audit log read API — owner / admin only.
// Returns recent EMR mutations across the clinic (who did what,
// when). Optional filters: actorEmail, resource, since.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listAudit, reloadAudit, resolveClinic } from "@/lib/emr-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (clinic.role !== "owner" && clinic.role !== "admin") {
    return NextResponse.json(
      { error: "Only the clinic owner can view the audit log." },
      { status: 403 }
    );
  }

  await reloadAudit();
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const actorEmail = req.nextUrl.searchParams.get("actor") || undefined;
  const resource = req.nextUrl.searchParams.get("resource") || undefined;
  const since = req.nextUrl.searchParams.get("since") || undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") || "200") || 200;

  const entries = await listAudit({ ownerEmail, actorEmail, resource, since, limit });
  return NextResponse.json({ entries });
}

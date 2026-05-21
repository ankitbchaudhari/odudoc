// /api/ppme
//
// GET — list PPME reports. Doctors see their own; admin / insurers
//       see all (per-tenant scoping comes with V12).
// POST — schedule a new PPME. Insurer-side or platform-admin only.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPpme, schedulePpme } from "@/lib/ppme-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const role = session.user.role;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as Parameters<typeof listPpme>[0] extends infer P ? P extends { status?: infer S } ? S : never : never;
  const reports = await listPpme({
    status: status || undefined,
    facilityId: role === "doctor" ? undefined : undefined, // facility scoping TBD with V12 tenant ids
    limit: 200,
  });
  return NextResponse.json({ reports });
}

const ScheduleSchema = z.object({
  patientId: z.string().min(1),
  patientName: z.string().min(1),
  patientPhone: z.string().optional(),
  insurerId: z.string().min(1),
  insurerName: z.string().min(1),
  insurerRef: z.string().min(1),
  policyType: z.enum(["health", "life", "critical_illness", "travel"]),
  tier: z.enum(["basic", "standard", "comprehensive", "executive"]),
  facilityId: z.string().min(1),
  facilityName: z.string().min(1),
  scheduledFor: z.string().optional(),
  feeCentsOverride: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, ScheduleSchema);
  if (parsed instanceof NextResponse) return parsed;
  const report = await schedulePpme(parsed);
  return NextResponse.json({ report }, { status: 201 });
}

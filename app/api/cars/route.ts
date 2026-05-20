// /api/cars
//
// GET — admin / support / hr list CARs with V13 §5 filters.
// POST — admin / support / quality lead opens a new CAR against a
//        specific accountability event.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listCars, openCar, type CarFilter, type CarSeverity, type CarStatus } from "@/lib/car-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

function gate(role: string | undefined): boolean {
  return role === "admin" || role === "support" || role === "hr";
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!gate(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const filter: CarFilter = {
    status: (url.searchParams.get("status") as CarStatus) || undefined,
    severity: (url.searchParams.get("severity") as CarSeverity) || undefined,
    assignedToEmail: url.searchParams.get("assignedToEmail") || undefined,
    tenantId: url.searchParams.get("tenantId") || undefined,
    overdueOnly: url.searchParams.get("overdueOnly") === "1",
    limit: Math.min(Number(url.searchParams.get("limit") || 200), 500),
  };
  const cars = await listCars(filter);
  return NextResponse.json({ cars });
}

const OpenSchema = z.object({
  eventId: z.string().min(1).max(64),
  breachRule: z.string().min(1).max(120),
  breachLevel: z.number().int().min(1).max(5),
  category: z.enum(["clinical", "admin", "financial", "data_access", "system"]),
  tenantId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  assignedToEmail: z.string().email(),
  assignedToRole: z.string().max(48).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!gate(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, OpenSchema);
  if (parsed instanceof NextResponse) return parsed;

  const car = await openCar({
    eventId: parsed.eventId,
    breachRule: parsed.breachRule,
    breachLevel: parsed.breachLevel as 1 | 2 | 3 | 4 | 5,
    category: parsed.category,
    tenantId: parsed.tenantId,
    title: parsed.title,
    description: parsed.description,
    assignedToEmail: parsed.assignedToEmail,
    assignedToRole: parsed.assignedToRole,
    openedByEmail: session.user.email,
    openedByRole: session.user.role || undefined,
  });
  return NextResponse.json({ car }, { status: 201 });
}

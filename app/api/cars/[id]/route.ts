// /api/cars/[id]
//
// GET — fetch one CAR with its full update history.
// PATCH — advance lifecycle state (next state computed from current),
//         or append a comment without state change.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCar, advanceCar, commentOnCar, type CarStatus } from "@/lib/car-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

function gate(role: string | undefined): boolean {
  return role === "admin" || role === "support" || role === "doctor" || role === "hr";
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!gate(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const car = await getCar(id);
  if (!car) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ car });
}

const PatchSchema = z.object({
  /** When provided, advances state. The server checks current is the
   *  expected state to avoid double-advance race conditions. */
  expectedCurrentState: z.enum(["open", "acknowledged", "investigating", "action_planned", "closed"]).optional(),
  note: z.string().min(1).max(2000),
  rootCause: z.string().max(2000).optional(),
  correctiveAction: z.string().max(2000).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!gate(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, PatchSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    if (parsed.expectedCurrentState) {
      const car = await advanceCar(parsed.expectedCurrentState as CarStatus, {
        carId: id,
        byEmail: session.user.email,
        byRole: session.user.role || undefined,
        note: parsed.note,
        rootCause: parsed.rootCause,
        correctiveAction: parsed.correctiveAction,
      });
      if (!car) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ car });
    }
    // No state change — just a comment.
    const car = await commentOnCar({
      carId: id,
      byEmail: session.user.email,
      byRole: session.user.role || undefined,
      note: parsed.note,
    });
    if (!car) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ car });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}

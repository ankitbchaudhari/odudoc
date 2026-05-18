// /api/procedure-plans/[id]/sittings
//   GET   — list sittings for a plan (caller must own or be the doctor).
//   PATCH — mark a sitting done. { sittingId, note? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { completeSitting, listSittingsForPlan, listPlans } from "@/lib/multi-sitting-procedures-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const PatchSchema = z.object({
  sittingId: nonEmptyString.max(40),
  note: z.string().trim().max(2000).optional(),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sittings = listSittingsForPlan(params.id);
  return NextResponse.json({ sittings });
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "doctor" && role !== "admin") {
    return NextResponse.json({ error: "Only doctors can complete sittings" }, { status: 403 });
  }

  const parsed = await parseJson(request, PatchSchema);
  if (parsed instanceof NextResponse) return parsed;

  // Verify the plan belongs to the caller (doctor).
  const plans = listPlans({ doctorId: session.user.email });
  if (!plans.find((p) => p.id === params.id)) {
    return NextResponse.json({ error: "Not your plan" }, { status: 403 });
  }

  const out = completeSitting(parsed.sittingId, parsed.note);
  if (!out) return NextResponse.json({ error: "Sitting not found" }, { status: 404 });
  return NextResponse.json(out);
}

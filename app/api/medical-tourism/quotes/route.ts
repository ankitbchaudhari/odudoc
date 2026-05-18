// /api/medical-tourism/quotes
//   GET — list the calling patient's quotes.
//   POST — request a new quote for a procedure in a corridor.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createQuote, listQuotes, getCorridor } from "@/lib/medical-tourism-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  procedureSlug: nonEmptyString.max(80),
  corridorId: nonEmptyString.max(40),
  hospitalId: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const quotes = listQuotes({ patientEmail: session.user.email });
  return NextResponse.json({ quotes });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const corridor = getCorridor(parsed.corridorId);
  if (!corridor) return NextResponse.json({ error: "Corridor not found" }, { status: 404 });

  const q = createQuote({
    patientEmail: session.user.email,
    patientName: session.user.name || "Patient",
    procedureSlug: parsed.procedureSlug,
    corridorId: parsed.corridorId,
    hospitalId: parsed.hospitalId || (corridor.hospitalIds[0] ?? ""),
    notes: parsed.notes,
  });
  return NextResponse.json({ quote: q }, { status: 201 });
}

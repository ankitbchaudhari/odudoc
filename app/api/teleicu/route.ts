// /api/teleicu
//   GET  — central-desk view across all sites this intensivist
//          covers.
//   POST — record an action against a bed
//          { bedId, kind, note? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { centralDeskView, recordAction } from "@/lib/teleicu-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const ActionSchema = z.object({
  bedId: nonEmptyString.max(40),
  kind: z.enum(["review", "remote_order", "video_call", "flag", "unflag", "met_activation"]),
  note: z.string().trim().max(2000).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ beds: centralDeskView() });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "doctor" && role !== "admin") {
    return NextResponse.json({ error: "Only intensivists can record actions" }, { status: 403 });
  }
  const parsed = await parseJson(request, ActionSchema);
  if (parsed instanceof NextResponse) return parsed;
  const a = recordAction({
    bedId: parsed.bedId,
    kind: parsed.kind,
    note: parsed.note,
    intensivistEmail: session.user.email,
    intensivistName: session.user.name || "Intensivist",
  });
  return NextResponse.json({ action: a }, { status: 201 });
}

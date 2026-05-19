// POST /api/teleicu/vitals — manual vitals push.
// Body: { bedId, rr, spo2, onOxygen, sbp, hr, consciousness, temp }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pushVitals } from "@/lib/teleicu-store";
import { parseJson, z, nonEmptyString } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  bedId: nonEmptyString.max(40),
  rr: z.number().min(0).max(80),
  spo2: z.number().min(0).max(100),
  onOxygen: z.boolean(),
  sbp: z.number().min(0).max(300),
  hr: z.number().min(0).max(300),
  consciousness: z.enum(["A", "C", "V", "P", "U"]),
  temp: z.number().min(25).max(45),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const { bedId, ...vitals } = parsed;
  const b = pushVitals(bedId, vitals);
  if (!b) return NextResponse.json({ error: "Bed not found" }, { status: 404 });
  return NextResponse.json({ bed: b });
}

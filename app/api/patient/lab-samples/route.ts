// /api/patient/lab-samples
// GET — list lab samples for the calling patient (no tenant filter
//       since the patient's records can span tenants).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listSamples } from "@/lib/lab-samples-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ samples: listSamples({ patientEmail: session.user.email }) });
}

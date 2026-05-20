// /api/diet-plan
//
// Stub endpoint for the patient Diet Plan dashboard tile. Returns a
// null plan today; once the doctor-side Diet template authoring module
// ships (treatment-templates with type="diet"), this route reads the
// active plan for the signed-in patient from that store.
//
// Until then, the dashboard page renders the "No active diet plan yet"
// empty state and points the patient at a nutritionist.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  // TODO: once treatment_templates supports type="diet", look up the
  // active diet plan for this user and return it.
  return NextResponse.json({ plan: null });
}

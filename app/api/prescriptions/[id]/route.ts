import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { cancelPrescription, getPrescription } from "@/lib/prescriptions-store";

export const runtime = "nodejs";

// GET /api/prescriptions/[id]
// Auth scope: admin → any; doctor → only what they wrote;
// patient → only ones addressed to their email.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rx = getPrescription(params.id);
  if (!rx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const email = user.email.toLowerCase();
  const allowed =
    user.role === "admin" ||
    (user.role === "doctor" && rx.doctorEmail.toLowerCase() === email) ||
    (user.role === "patient" && rx.patientEmail.toLowerCase() === email);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ prescription: rx });
}

// DELETE /api/prescriptions/[id]
// Soft-cancel only — we keep the record so audits and existing patient views
// still resolve. Admins or the authoring doctor may cancel.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = getPrescription(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const email = user.email.toLowerCase();
  const allowed =
    user.role === "admin" ||
    (user.role === "doctor" && existing.doctorEmail.toLowerCase() === email);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rx = cancelPrescription(params.id);
  return NextResponse.json({ prescription: rx });
}

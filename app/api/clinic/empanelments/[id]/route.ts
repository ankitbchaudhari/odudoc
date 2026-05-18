// DELETE /api/clinic/empanelments/[id]   — remove a TPA empanelment

import { NextRequest, NextResponse } from "next/server";
import { getClinicSession } from "@/lib/clinic-session";
import {
  deleteClinicEmpanelment,
  reloadClinicEmpanelments,
} from "@/lib/insurance/clinic-empanelment-store";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  if (session.role !== "manager") {
    return NextResponse.json({ error: "Only managers can remove empanelments." }, { status: 403 });
  }
  await reloadClinicEmpanelments();
  const ok = deleteClinicEmpanelment(params.id, session.clinicId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

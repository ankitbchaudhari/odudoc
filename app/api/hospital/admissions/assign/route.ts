// Reception duty-roster: assign / unassign specialists on a patient's
// active admission. Vital-sign alerts route to whoever is on the
// list at the time the alert fires, so the roster has live effect.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addAssignedDoctor, assignDoctors, getAdmissionById, removeAssignedDoctor } from "@/lib/hospital/admissions-store";
import { findUserByEmail } from "@/lib/users-store";
import { pushNotification } from "@/lib/notifications/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function staffish(role: string | undefined): boolean {
  return role === "admin" || role === "staff" || role === "doctor";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!staffish(role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const action = body.action as "set" | "add" | "remove";
  if (!body.admissionId || !body.organizationId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const adm = getAdmissionById(String(body.admissionId), String(body.organizationId));
  if (!adm) return NextResponse.json({ error: "admission_not_found" }, { status: 404 });

  let updated = adm;
  let newlyAssigned: string[] = [];
  const before = new Set((adm.assignedDoctorEmails || []).map((e) => e.toLowerCase()));

  if (action === "set" && Array.isArray(body.doctorEmails)) {
    const x = assignDoctors(adm.id, adm.organizationId, body.doctorEmails);
    if (x) updated = x;
  } else if (action === "add" && body.doctorEmail) {
    const x = addAssignedDoctor(adm.id, adm.organizationId, String(body.doctorEmail));
    if (x) updated = x;
  } else if (action === "remove" && body.doctorEmail) {
    const x = removeAssignedDoctor(adm.id, adm.organizationId, String(body.doctorEmail));
    if (x) updated = x;
  } else {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  // Newly-added doctors get a "you've been assigned" push so they
  // know to start watching this patient's vitals.
  for (const email of updated.assignedDoctorEmails || []) {
    if (!before.has(email.toLowerCase())) newlyAssigned.push(email);
  }
  for (const email of newlyAssigned) {
    const u = findUserByEmail(email);
    if (!u) continue;
    pushNotification({
      userId: u.id,
      kind: "system",
      severity: "info",
      title: "Assigned to a patient",
      body: `${updated.chiefComplaint || "Active admission"} · ward ${updated.currentWardId || "?"} · bed ${updated.currentBedId || "?"}`,
      link: `/admin/admissions`,
      reference: `assigned:${updated.id}:${u.id}`,
    });
  }

  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ admission: updated, newlyAssigned });
}

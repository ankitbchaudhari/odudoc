// EMR staff API — clinic owner manages their front-desk / nurse / doctor staff.
// Only the clinic owner can list/add/remove staff. Staff records reference
// the owner email so when those staff users sign in, resolveClinic() puts
// them into this owner's clinic with the role set here.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listStaffForOwner,
  createStaff,
  deleteStaff,
  reloadStaff,
  resolveClinic,
  type StaffRole,
} from "@/lib/emr-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const VALID_ROLES: StaffRole[] = ["doctor", "nurse", "frontdesk"];

function isOwnerOrAdmin(role: string): boolean {
  return role === "owner" || role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isOwnerOrAdmin(clinic.role)) {
    return NextResponse.json({ error: "Only the clinic owner can view staff." }, { status: 403 });
  }
  await reloadStaff();
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const staff = await listStaffForOwner(ownerEmail);
  return NextResponse.json({ staff });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isOwnerOrAdmin(clinic.role)) {
    return NextResponse.json({ error: "Only the clinic owner can add staff." }, { status: 403 });
  }

  let body: { staffEmail?: string; staffName?: string; role?: StaffRole };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const staffEmail = (body.staffEmail || "").trim().toLowerCase();
  const role = body.role;
  if (!staffEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staffEmail)) {
    return NextResponse.json({ error: "Valid staff email required" }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `role must be one of ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    );
  }

  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  if (staffEmail === ownerEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "You're already the clinic owner — no need to add yourself as staff." },
      { status: 400 }
    );
  }

  const staff = await createStaff({
    ownerEmail,
    staffEmail,
    staffName: body.staffName,
    role,
    invitedBy: clinic.userEmail,
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.staff.persist_failed", err, { ownerEmail, staffEmail });
    return NextResponse.json(
      { error: "EMR service temporarily unavailable. Please retry." },
      { status: 503 }
    );
  }
  return NextResponse.json({ staff }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isOwnerOrAdmin(clinic.role)) {
    return NextResponse.json({ error: "Only the clinic owner can remove staff." }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const ok = await deleteStaff(id, ownerEmail);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

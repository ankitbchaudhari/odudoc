import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  updateDepartment,
  deleteDepartment,
  toggleDepartmentStatus,
} from "@/lib/departments-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Convenience: { toggle: true } flips Active<->Inactive.
  if (body.toggle === true) {
    const d = toggleDepartmentStatus(id);
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ department: d });
  }

  const patch: Parameters<typeof updateDepartment>[1] = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.description === "string") patch.description = body.description;
  if (typeof body.icon === "string") patch.icon = body.icon;
  if (typeof body.doctorCount === "number") patch.doctorCount = body.doctorCount;
  if (body.status === "Active" || body.status === "Inactive") patch.status = body.status;

  const d = updateDepartment(id, patch);
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ department: d });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const ok = deleteDepartment(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

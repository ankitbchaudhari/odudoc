import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listDepartments,
  createDepartment,
  reloadDepartments,
} from "@/lib/departments-store";
import { listDoctors, reloadDoctors } from "@/lib/doctors-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

/** Map a department/specialty name to a normalised key so we can
 *  compare "Cardiology" vs "cardiology" vs "Cardiologist" without
 *  worrying about exact case + plural form. */
function normaliseSpecialty(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(ist|ian|ologist|s)$/, "")
    .replace(/(ology|y)$/, "");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Reload both stores so the live doctor counts are accurate even
  // right after a doctor approval. Cheap on warm Lambda.
  await Promise.all([reloadDepartments(), reloadDoctors()]);

  const doctors = listDoctors({ status: "Active" });
  // Count active doctors per normalised specialty key.
  const countByKey = new Map<string, number>();
  for (const d of doctors) {
    const key = normaliseSpecialty(d.specialty);
    if (!key) continue;
    countByKey.set(key, (countByKey.get(key) || 0) + 1);
  }

  // Replace the stored (legacy seed) doctorCount with the live count.
  // This is what the admin / public pages display, so users see real
  // numbers from the doctors store regardless of what the
  // departments seed had baked in.
  const departments = listDepartments().map((d) => ({
    ...d,
    doctorCount: countByKey.get(normaliseSpecialty(d.name)) || 0,
  }));

  return NextResponse.json({ departments });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const department = createDepartment({
    name,
    description: typeof body.description === "string" ? body.description : undefined,
    icon: typeof body.icon === "string" ? body.icon : undefined,
    doctorCount: typeof body.doctorCount === "number" ? body.doctorCount : undefined,
    status: body.status === "Inactive" ? "Inactive" : "Active",
  });
  return NextResponse.json({ department }, { status: 201 });
}

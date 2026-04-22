import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listDepartments,
  createDepartment,
  reloadDepartments,
} from "@/lib/departments-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await reloadDepartments();
  return NextResponse.json({ departments: listDepartments() });
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

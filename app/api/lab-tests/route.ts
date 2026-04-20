import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listLabTests,
  createLabTest,
  updateLabTest,
  deleteLabTest,
} from "@/lib/lab-tests-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

// GET  /api/lab-tests            → public, active-only
// GET  /api/lab-tests?view=admin → admin, all rows
export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get("view");
  if (view === "admin") {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ tests: listLabTests() });
  }
  return NextResponse.json({ tests: listLabTests({ onlyActive: true }) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { name, description, parameters, price, originalPrice, popular, turnaround, active } =
    body as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const p = Number(price);
  if (!Number.isFinite(p) || p < 0) {
    return NextResponse.json({ error: "Valid price required" }, { status: 400 });
  }
  const test = createLabTest({
    name,
    description: typeof description === "string" ? description : "",
    parameters: typeof parameters === "number" ? parameters : undefined,
    price: p,
    originalPrice: typeof originalPrice === "number" ? originalPrice : undefined,
    popular: Boolean(popular),
    turnaround: typeof turnaround === "string" ? turnaround : undefined,
    active: active === false ? false : true,
  });
  return NextResponse.json({ test }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { id, ...patch } = body as Record<string, unknown>;
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  const test = updateLabTest(id, {
    name: typeof patch.name === "string" ? patch.name : undefined,
    description: typeof patch.description === "string" ? patch.description : undefined,
    parameters: typeof patch.parameters === "number" ? patch.parameters : undefined,
    price: typeof patch.price === "number" ? patch.price : undefined,
    originalPrice: typeof patch.originalPrice === "number" ? patch.originalPrice : undefined,
    popular: typeof patch.popular === "boolean" ? patch.popular : undefined,
    turnaround: typeof patch.turnaround === "string" ? patch.turnaround : undefined,
    active: typeof patch.active === "boolean" ? patch.active : undefined,
  });
  return test
    ? NextResponse.json({ test })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = deleteLabTest(id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

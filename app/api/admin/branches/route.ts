// Branches CRUD — org-scoped.
//
//   GET  /api/admin/branches          → list this org's branches
//   POST /api/admin/branches          → create
//   PUT  /api/admin/branches?id=...   → update
//   DELETE /api/admin/branches?id=... → delete
//
// Auth: master admin (role === "admin" or membership.role === "owner"
// or "admin") of the active org. Branch admins can READ but not WRITE.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import {
  createBranch,
  deleteBranch,
  listBranches,
  updateBranch,
  type BranchInput,
  type BranchStatus,
} from "@/lib/branches-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireMaster() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "unauthorized" as const, status: 401 };
  const ctx = await getTenantContext();
  if (!ctx.organization) return { error: "no_active_org" as const, status: 400 };
  const role = (session.user as { role?: string }).role;
  const memberRole = ctx.membership?.role;
  const isMaster =
    ctx.isSuperAdmin ||
    role === "admin" ||
    memberRole === "owner" ||
    memberRole === "admin";
  if (!isMaster) return { error: "forbidden" as const, status: 403 };
  return { ctx };
}

async function readOnly() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "unauthorized" as const, status: 401 };
  const ctx = await getTenantContext();
  if (!ctx.organization) return { error: "no_active_org" as const, status: 400 };
  return { ctx };
}

export async function GET() {
  const r = await readOnly();
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  return NextResponse.json({
    branches: listBranches({ organizationId: r.ctx.organization!.id }),
  });
}

export async function POST(req: NextRequest) {
  const r = await requireMaster();
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<BranchInput>;
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "missing_name" }, { status: 400 });
  }
  const created = createBranch(r.ctx.organization!.id, {
    name: body.name,
    code: body.code,
    address: body.address,
    city: body.city,
    state: body.state,
    country: body.country,
    postalCode: body.postalCode,
    phone: body.phone,
    status: (body.status as BranchStatus) || "active",
  });
  return NextResponse.json({ branch: created });
}

export async function PUT(req: NextRequest) {
  const r = await requireMaster();
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as Partial<BranchInput>;
  const updated = updateBranch(id, r.ctx.organization!.id, body);
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ branch: updated });
}

export async function DELETE(req: NextRequest) {
  const r = await requireMaster();
  if ("error" in r) {
    return NextResponse.json({ error: r.error }, { status: r.status });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const ok = deleteBranch(id, r.ctx.organization!.id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

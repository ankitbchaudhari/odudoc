// Org-vacancy API. Public GET (drives /jobs feed); admin/staff POST.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createVacancy, deleteVacancy, listVacancies, setStatus, updateVacancy,
  VacancyKind, VacancyStatus,
} from "@/lib/org-vacancies/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: VacancyKind[] = ["full_time", "part_time", "locum", "contract", "internship", "fellowship", "residency", "volunteer"];
const STATUSES: VacancyStatus[] = ["open", "filled", "closed", "draft"];

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const opts = {
    organizationId: url.searchParams.get("orgId") || undefined,
    kind: (url.searchParams.get("kind") as VacancyKind | null) || undefined,
    orgKind: url.searchParams.get("orgKind") || undefined,
    city: url.searchParams.get("city") || undefined,
    specialty: url.searchParams.get("specialty") || undefined,
    query: url.searchParams.get("query") || undefined,
    openOnly: url.searchParams.get("openOnly") !== "0",
  };
  return NextResponse.json({ vacancies: listVacancies(opts as Parameters<typeof listVacancies>[0]) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (role(session) !== "admin" && role(session) !== "staff" && role(session) !== "hr") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const action = body.action || "create";
  if (action === "create") {
    if (!body.organizationId || !body.title || !body.location || !body.description || !KINDS.includes(body.kind)) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const v = createVacancy({
      organizationId: String(body.organizationId),
      orgKind: body.orgKind,
      title: String(body.title),
      department: body.department,
      specialty: body.specialty,
      kind: body.kind,
      location: String(body.location),
      remoteOk: !!body.remoteOk,
      countryIso2: body.countryIso2,
      salary: body.salary,
      salaryMinRupees: body.salaryMinRupees !== undefined ? Number(body.salaryMinRupees) : undefined,
      salaryMaxRupees: body.salaryMaxRupees !== undefined ? Number(body.salaryMaxRupees) : undefined,
      description: String(body.description),
      responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities : undefined,
      requirements: Array.isArray(body.requirements) ? body.requirements : undefined,
      closesAt: body.closesAt,
      contactEmail: body.contactEmail,
      applyUrl: body.applyUrl,
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ vacancy: v });
  }
  if (action === "update") {
    if (!body.id || !body.organizationId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const v = updateVacancy(String(body.id), String(body.organizationId), body.patch || {});
    if (!v) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ vacancy: v });
  }
  if (action === "set_status") {
    if (!body.id || !body.organizationId || !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const v = setStatus(String(body.id), String(body.organizationId), body.status);
    if (!v) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ vacancy: v });
  }
  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff" && role(session) !== "hr") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const orgId = url.searchParams.get("orgId");
  if (!id || !orgId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const ok = deleteVacancy(id, orgId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}

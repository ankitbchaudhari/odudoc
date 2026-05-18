// Pharma drug catalogue API.
//
// GET ?orgId=&query= → list (admin within org sees own; doctors
//                      see active across orgs for verification)
// GET ?id=           → single drug w/ attachments
// POST               → create / attach / setActive (admin within org)
// DELETE ?id=        → remove

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  attachToDrug, createDrug, deleteDrug, getDrug, listDrugs, setActive,
  addBatch, DrugForm, DrugScheduleClass,
} from "@/lib/pharma/catalogue-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMS: DrugForm[] = ["tablet", "capsule", "syrup", "injection", "topical", "inhaler", "drops", "patch", "other"];
const SCHEDULES: DrugScheduleClass[] = ["OTC", "H", "H1", "X", "G", "K"];

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const d = getDrug(id);
    if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ drug: d });
  }
  const orgId = url.searchParams.get("orgId") || undefined;
  const query = url.searchParams.get("query") || undefined;
  return NextResponse.json({ drugs: listDrugs({ organizationId: orgId, query, activeOnly: true }) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const action = body.action || "create";

  if (action === "create") {
    if (!body.organizationId || !body.brandName || !body.genericName) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (!FORMS.includes(body.form) || !SCHEDULES.includes(body.scheduleClass)) {
      return NextResponse.json({ error: "invalid_form_or_schedule" }, { status: 400 });
    }
    const d = createDrug({
      organizationId: String(body.organizationId),
      brandName: String(body.brandName),
      genericName: String(body.genericName),
      composition: String(body.composition || ""),
      form: body.form,
      strength: String(body.strength || ""),
      scheduleClass: body.scheduleClass,
      manufacturerLicense: String(body.manufacturerLicense || ""),
      countryIso2: String(body.countryIso2 || "IN"),
      storeClass: body.storeClass || "medicine",
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ drug: d });
  }

  if (action === "attach") {
    if (!body.id || !body.attachment) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const r = attachToDrug(String(body.id), {
      kind: body.attachment.kind,
      title: String(body.attachment.title || ""),
      data: String(body.attachment.data || ""),
      mimeType: String(body.attachment.mimeType || "application/octet-stream"),
    });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ drug: r.drug });
  }

  if (action === "add_batch") {
    if (!body.id || !body.batch?.batchNumber) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const d = addBatch(String(body.id), {
      batchNumber: String(body.batch.batchNumber),
      manufacturedOn: String(body.batch.manufacturedOn || ""),
      expiresOn: String(body.batch.expiresOn || ""),
      labReportAttachmentIndex: body.batch.labReportAttachmentIndex,
      notes: body.batch.notes,
    });
    if (!d) return NextResponse.json({ error: "drug_not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ drug: d });
  }

  if (action === "set_active") {
    if (!body.id) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const d = setActive(String(body.id), Boolean(body.active));
    if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ drug: d });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const orgId = url.searchParams.get("orgId");
  if (!id || !orgId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const ok = deleteDrug(id, orgId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}

// Document vault API.
//
// GET → list (returns metadata only — strips the data URL to keep
//       the response small; clients fetch the full doc via GET ?id=)
// GET ?id=<id> → single document with data URL
// POST → upload (JSON body with data URL)
// DELETE ?id=<id> → remove

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  addDocument, deleteDocument, getDocument, listDocuments,
  DocumentCategory, MAX_BYTES,
} from "@/lib/documents/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { recordAuditEvent, clientIpFromHeaders } from "@/lib/audit/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES: DocumentCategory[] = [
  "prescription", "lab_report", "discharge", "imaging",
  "insurance", "vaccination", "consent", "other",
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const category = url.searchParams.get("category") as DocumentCategory | null;
  if (id) {
    const doc = getDocument(id, userId);
    if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
    // Every document open is recorded — patients see who looked,
    // when, and from what IP. Print/download events are recorded
    // separately via PUT (action: "print" | "download").
    const ip = clientIpFromHeaders(req.headers);
    recordAuditEvent({
      actorUserId: userId,
      actorRole: (session?.user as { role?: string } | undefined)?.role as "patient" | "doctor" | "admin" | undefined,
      actorEmail: session?.user?.email || undefined,
      subjectUserId: userId, // self-view; cross-user views go through a different route
      resource: "document",
      resourceId: doc.id,
      action: "view",
      ip,
      userAgent: req.headers.get("user-agent") || undefined,
    });
    return NextResponse.json({
      document: doc,
      // Watermark hint — the client overlays patient ID + IP +
      // timestamp on every render of the document. The ip echoed
      // here matches what audit logged so the watermark and the log
      // tell the same story.
      watermark: { patientUserId: userId, ip, viewedAt: new Date().toISOString() },
    });
  }
  const list = listDocuments(userId, category && VALID_CATEGORIES.includes(category) ? category : undefined);
  // Strip data URL on list view to keep payload small.
  const meta = list.map(({ data: _data, ...rest }) => rest);
  return NextResponse.json({ documents: meta, total: list.length });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "missing_title" }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(body.category)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }
  if (typeof body.data !== "string" || !body.data.startsWith("data:")) {
    return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  }
  const mimeMatch = body.data.match(/^data:([^;]+);base64,/);
  if (!mimeMatch) return NextResponse.json({ error: "invalid_data_url" }, { status: 400 });
  const mimeType = mimeMatch[1];
  // Decoded byte count from base64 length: roughly (n * 3 / 4) minus padding.
  const b64 = body.data.slice(body.data.indexOf(",") + 1);
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  if (bytes > MAX_BYTES) {
    return NextResponse.json({ error: "too_large", maxBytes: MAX_BYTES }, { status: 413 });
  }
  const result = addDocument({
    userId,
    title: body.title,
    category: body.category,
    mimeType,
    bytes,
    data: body.data,
    source: body.source,
    documentDate: body.documentDate,
    notes: body.notes,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  // Return metadata only — client already has the data it just uploaded.
  const { data: _data, ...meta } = result.doc;
  return NextResponse.json({ document: meta });
}

// Patient-side print/download tracking. We don't gate these here
// (the patient owns the data); we just log so suspicious patterns
// are visible.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id || !body.action) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const doc = getDocument(String(body.id), userId);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const action = String(body.action);
  if (action !== "print" && action !== "download" && action !== "share") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  recordAuditEvent({
    actorUserId: userId,
    actorEmail: session?.user?.email || undefined,
    subjectUserId: userId,
    resource: "document",
    resourceId: doc.id,
    action,
    ip: clientIpFromHeaders(req.headers),
    userAgent: req.headers.get("user-agent") || undefined,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const ok = deleteDocument(id, userId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}

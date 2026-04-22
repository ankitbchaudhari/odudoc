import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getConsultation,
  addDocument,
  removeDocument,
} from "@/lib/consultations-store";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

function canAccess(
  c: ReturnType<typeof getConsultation>,
  user: { email?: string; name?: string; role?: string }
): boolean {
  if (!c || !user.email) return false;
  if (user.role === "admin") return true;
  if (user.role === "doctor") {
    if (c.doctorEmail && c.doctorEmail === user.email.toLowerCase()) return true;
    if (user.name && c.doctorName.toLowerCase() === user.name.toLowerCase()) return true;
    return false;
  }
  return c.patientEmail === user.email.toLowerCase();
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; name?: string; role?: string } | undefined) || {};
  const { id } = await params;
  const c = getConsultation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccess(c, user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ documents: c.documents });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; name?: string; role?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const c = getConsultation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccess(c, user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : "";
  const mime = typeof body.mime === "string" ? body.mime : "application/octet-stream";
  const size = typeof body.size === "number" ? body.size : 0;
  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  if (!name || !dataUrl) return NextResponse.json({ error: "name and dataUrl required" }, { status: 400 });
  if (size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 10MB" }, { status: 413 });

  const uploadedBy = user.role === "doctor" ? "doctor" : "patient";
  const doc = addDocument(id, { name, mime, size, dataUrl, uploadedBy });
  if (!doc) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json({ document: doc }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; name?: string; role?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const c = getConsultation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccess(c, user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "docId required" }, { status: 400 });
  const ok = removeDocument(id, docId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

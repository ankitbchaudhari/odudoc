// POST /api/admin/applications/[id]/upload-document
//
// Admin recovery flow for the case where a doctor's original upload
// silently failed and only the filename ended up in their application
// record. Doctor sends the file directly (email / WhatsApp); admin
// uploads it here and the cert / license / etc becomes viewable.
//
// Body: multipart form-data with
//   - file       (Blob)   required
//   - key        (text)   required — DocumentKey
//   - index      (text)   optional — only meaningful for
//                          specialtyCertifications
//
// Returns the updated application.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getApplicationById,
  updateApplicationDocument,
  type DocumentKey,
} from "@/lib/doctor-applications-store";
import { uploadBlob } from "@/lib/blob";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — matches doctor-doc upload
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);
const VALID_KEYS: DocumentKey[] = [
  "medicalLicense",
  "governmentId",
  "medicalDegree",
  "professionalPhoto",
  "hospitalAffiliationLetter",
  "specialtyCertifications",
];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const app = getApplicationById(id);
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const keyRaw = form.get("key");
  const indexRaw = form.get("index");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds 10 MB limit (got ${Math.round(file.size / 1024 / 1024)} MB)` },
      { status: 413 },
    );
  }
  const ftype = file.type || "";
  if (ftype && !ALLOWED_TYPES.has(ftype)) {
    return NextResponse.json(
      { error: `Unsupported type: ${ftype}` },
      { status: 415 },
    );
  }
  if (typeof keyRaw !== "string" || !VALID_KEYS.includes(keyRaw as DocumentKey)) {
    return NextResponse.json({ error: "Invalid 'key' value" }, { status: 400 });
  }
  const key = keyRaw as DocumentKey;

  const index =
    typeof indexRaw === "string" && indexRaw.trim() !== ""
      ? Math.max(0, Math.floor(Number(indexRaw)))
      : undefined;

  // Upload to the file service
  let uploadedUrl: string;
  try {
    const arrayBuf = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const ext = ftype === "application/pdf" ? "pdf"
      : ftype === "image/png" ? "png"
      : ftype === "image/webp" ? "webp"
      : "jpg";
    const safeName =
      ((file as File).name || `admin-upload-${key}.${ext}`)
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 80);
    const result = await uploadBlob(
      `doctor-docs/admin/${id}/${Date.now()}-${safeName}`,
      buf,
      { contentType: ftype || "application/octet-stream", access: "public" },
    );
    if (!result.ok || !result.url) {
      throw new Error(result.error || "Upload returned no URL");
    }
    uploadedUrl = result.url;
  } catch (err) {
    log.error("admin.application.doc_upload_failed", err, { id, key });
    return NextResponse.json(
      { error: "Upload failed. Try again." },
      { status: 502 },
    );
  }

  const updated = updateApplicationDocument(id, key, uploadedUrl, index);
  if (!updated) {
    return NextResponse.json({ error: "Application disappeared mid-write" }, { status: 500 });
  }

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.application.doc_upload_persist_failed", err, { id });
    return NextResponse.json(
      { error: "Document uploaded but the application record didn't persist. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ application: updated });
}

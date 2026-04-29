// EMR files API — upload (multipart), list by patient, delete.
// Files are pushed through files-service to the Hostinger files server
// (category="emr"). Metadata lives in emr-files store; the actual blob
// is accessible at the public files.odudoc.com URL stored on the row.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createEmrFile,
  listFilesForPatient,
  getFileById,
  deleteEmrFileRow,
  reloadFiles,
  resolveClinic,
  canWrite,
  type EmrFile,
} from "@/lib/emr-store";
import { uploadFile, deleteFile } from "@/lib/files-service";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await reloadFiles();
  const patientId = req.nextUrl.searchParams.get("patientId");
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const files = await listFilesForPatient(patientId, scope);
  return NextResponse.json({ files });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "files")) {
    return NextResponse.json({ error: "Your role can't upload files." }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "multipart/form-data required" },
      { status: 415 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const patientId = String(form.get("patientId") || "").trim();
  const label = String(form.get("label") || "").trim();
  const category = (String(form.get("category") || "other") as EmrFile["category"]) || "other";
  const file = form.get("file");
  if (!patientId) {
    return NextResponse.json({ error: "patientId required" }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 }
    );
  }

  let stored;
  try {
    stored = await uploadFile("emr", file, file.name);
  } catch (err) {
    log.error("emr.file.upload_failed", err);
    return NextResponse.json(
      { error: "Could not save file. Please try again." },
      { status: 502 }
    );
  }

  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const row = await createEmrFile({
    ownerEmail,
    uploadedBy: clinic.userEmail,
    patientId,
    category,
    label,
    originalName: file.name,
    storedFilename: stored.filename,
    url: stored.url,
    size: stored.size,
    contentType: file.type || "application/octet-stream",
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.file.persist_failed", err);
    // Clean up the orphan blob — same pattern as careers CV upload.
    try {
      await deleteFile("emr", stored.filename);
    } catch (delErr) {
      log.error("emr.file.orphan_cleanup_failed", delErr);
    }
    return NextResponse.json(
      { error: "EMR service is temporarily unavailable — file not saved." },
      { status: 503 }
    );
  }

  return NextResponse.json({ file: row }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!canWrite(clinic.role, "files")) {
    return NextResponse.json({ error: "Your role can't delete files." }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await reloadFiles();
  const scope = clinic.role === "admin" ? undefined : clinic.ownerEmail;
  const existing = await getFileById(id, scope);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Drop blob first so a successful row delete doesn't strand orphans.
  try {
    await deleteFile("emr", existing.storedFilename);
  } catch (err) {
    log.error("emr.file.blob_delete_failed", err, { filename: existing.storedFilename });
    // Continue — better to clean the row than leave a dangling reference.
  }
  const removed = await deleteEmrFileRow(id, scope);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

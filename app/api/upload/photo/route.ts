// POST /api/upload/photo — V9 §2 photo upload.
//
// Multipart upload of patient or provider photos. The file is stored
// on the VPS blob service (files.odudoc.com) and the public URL is
// returned for the caller to store on the user / patient / doctor row.
//
// V9 §2.1 calls photo upload a "clinical safety feature" — wristband
// identity check, drug-administration ID confirmation, video-consult
// face match. So we treat it as required for any patient or doctor
// record going past trial-mode.
//
// Validations:
//   - JPEG / PNG / WebP only (no SVG — SVG executes JS in old viewers)
//   - 5 MB cap (V9 §2.2.2 says "5 MB. Above this: compressed automatically
//     on device before upload attempt" — that compression is client-side
//     in the apps; this endpoint just rejects anything larger)
//   - Authenticated only
//
// Returns: { url, pathname }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadBlob } from "@/lib/blob";
import { recordEvent } from "@/lib/accountability-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Subjects this endpoint accepts. Determines the storage folder + the
// accountability event subject kind.
type Subject = "self" | "patient" | "doctor" | "entity-logo" | "entity-hero" | "wound";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "expected_multipart" }, { status: 400 });
  }

  const file = form.get("file");
  const subjectRaw = String(form.get("subject") || "self") as Subject;
  const subjectId = String(form.get("subjectId") || session.user.email);

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large", maxBytes: MAX_BYTES }, { status: 413 });
  }
  const contentType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json({ error: "unsupported_type", allowed: Array.from(ALLOWED_TYPES) }, { status: 415 });
  }

  // Role-gate "patient", "doctor", "entity-*" uploads — only admins
  // and clinical roles can upload on behalf of someone else.
  const role = session.user.role;
  if (
    (subjectRaw === "patient" || subjectRaw === "wound") &&
    !["admin", "doctor", "staff", "support"].includes(role || "")
  ) {
    // Patient uploading their OWN photo lands here as subject="self".
    return NextResponse.json({ error: "forbidden_subject" }, { status: 403 });
  }
  if (
    (subjectRaw === "entity-logo" || subjectRaw === "entity-hero" || subjectRaw === "doctor") &&
    !["admin", "support", "doctor", "vendor"].includes(role || "")
  ) {
    return NextResponse.json({ error: "forbidden_subject" }, { status: 403 });
  }

  // Stable folder layout — V9 §2.4 wants per-subject paths so we can
  // enforce retention / deletion cleanly.
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const safeSubjectId = subjectId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const pathname = `photos/${subjectRaw}/${safeSubjectId}/${Date.now()}.${ext}`;

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await uploadBlob(pathname, buf, {
      contentType,
      access: "public",
      addRandomSuffix: true,
    });
    if (!result.ok || !result.url) {
      return NextResponse.json({ error: result.error || "upload_failed" }, { status: 502 });
    }

    // V13 — record the upload as an accountability event so the
    // immutable log shows who attached which photo to whom.
    try {
      await recordEvent({
        category: "data_access",
        action: `photo.upload.${subjectRaw}`,
        actorEmail: session.user.email,
        actorRole: role,
        subjectKind: subjectRaw,
        subjectId,
        summary: `Photo uploaded for ${subjectRaw} ${subjectId} (${(file.size / 1024).toFixed(0)} KB)`,
        after: { url: result.url, pathname: result.pathname, contentType, size: file.size },
      });
    } catch (e) {
      log.warn("photo accountability warn", e);
    }

    return NextResponse.json({ url: result.url, pathname: result.pathname, contentType, size: file.size });
  } catch (e) {
    log.error("photo upload error", e);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}

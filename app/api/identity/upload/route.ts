// POST /api/identity/upload
//
// Authenticated user uploads a government-issued photo ID. We forward
// the file to our blob service (same infra as admin gallery uploads)
// and flip the user's identity.status to "pending" so the admin review
// queue picks it up. Re-upload is allowed after a "rejected" verdict.
//
// Multipart form fields:
//   file     — the ID image / PDF (4 MB cap)
//   docType  — free-form label ("Aadhaar", "Passport", "Driver's License"…)
//
// Returns the updated identity state. Does NOT echo the blob URL back
// to the client — that's admin-only; the user only needs to know the
// submission was accepted.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadBlob } from "@/lib/blob";
import { submitIdentityDocument, findUserById } from "@/lib/users-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string } | undefined;
  if (!sessionUser?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const user = findUserById(sessionUser.id);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  // Don't let a user re-submit while a previous submission is still in
  // the admin review queue. They can re-submit after rejection.
  if (user.identity?.status === "pending") {
    return NextResponse.json(
      { error: "already_pending", message: "Your previous submission is still under review." },
      { status: 409 },
    );
  }
  if (user.identity?.status === "verified") {
    return NextResponse.json(
      { error: "already_verified", message: "Your identity is already verified." },
      { status: 409 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const docTypeRaw = form.get("docType");
    const docType =
      typeof docTypeRaw === "string"
        ? docTypeRaw.trim().slice(0, 60)
        : "";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'file' form field" },
        { status: 400 },
      );
    }
    if (!docType) {
      return NextResponse.json(
        { error: "Missing 'docType' form field" },
        { status: 400 },
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 4MB limit" },
        { status: 413 },
      );
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported type: ${file.type || "unknown"}` },
        { status: 415 },
      );
    }

    const safeName = (file.name || "id").replace(/[^a-zA-Z0-9._-]/g, "_");
    const rand = Math.random().toString(36).slice(2, 8);
    // Namespacing by user id scopes access in the blob listing and
    // makes audit easier.
    const pathname = `identity/${user.id}/${Date.now()}-${rand}/${safeName}`;

    const result = await uploadBlob(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });

    if (!result.ok || !result.url) {
      return NextResponse.json(
        { error: result.error || "Upload failed" },
        { status: 500 },
      );
    }

    const updated = submitIdentityDocument(user.id, {
      docType,
      docUrl: result.url,
      docFilename: safeName,
    });

    return NextResponse.json({
      ok: true,
      status: updated?.identity?.status || "pending",
      submittedAt: updated?.identity?.submittedAt,
    });
  } catch (err) {
    log.error("identity_upload.error", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Admin-only image/file upload endpoint. Accepts multipart form-data
// with a "file" field and an optional "folder" (e.g. "gallery"), forwards
// to the VPS file service via uploadBlob(), and returns the public URL.
//
// Used by admin UIs (gallery, etc.) where we don't want to expose
// FILES_UPLOAD_SECRET to the browser.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadBlob } from "@/lib/blob";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const folderRaw = form.get("folder");
    const folder =
      typeof folderRaw === "string" && folderRaw.trim()
        ? folderRaw.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "admin"
        : "admin";

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'file' form field" },
        { status: 400 }
      );
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File exceeds 8MB limit" },
        { status: 413 }
      );
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported type: ${file.type || "unknown"}` },
        { status: 415 }
      );
    }

    const safeName = (file.name || "upload").replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
    const rand = Math.random().toString(36).slice(2, 8);
    const pathname = `${folder}/${Date.now()}-${rand}/${safeName}`;

    const result = await uploadBlob(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });

    if (!result.ok || !result.url) {
      return NextResponse.json(
        { error: result.error || "Upload failed" },
        { status: 500 }
      );
    }
    return NextResponse.json({
      url: result.url,
      pathname: result.pathname,
      size: result.size,
      contentType: result.contentType,
    });
  } catch (error) {
    log.error("admin_upload.error", error);
    const message =
      error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

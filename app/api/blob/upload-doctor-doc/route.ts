// Server-side upload for doctor application documents.
//
// The browser POSTs the file as multipart form-data; we forward it to
// the VPS file service via uploadBlob(). 4 MB cap because Vercel's
// serverless limits the request body we can relay.

import { uploadBlob } from "@/lib/blob";
import { NextResponse } from "next/server";

import { log } from "@/lib/log";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const form = await request.formData();
    const file = form.get("file");
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
        { error: "File exceeds 4MB limit" },
        { status: 413 }
      );
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported type: ${file.type || "unknown"}` },
        { status: 415 }
      );
    }

    const safeName = (file.name || "document").replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
    const rand = Math.random().toString(36).slice(2, 8);
    const pathname = `doctor-applications/${Date.now()}-${rand}/${safeName}`;

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
    return NextResponse.json({ url: result.url, pathname: result.pathname });
  } catch (error) {
    log.error("blob.upload_failed", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

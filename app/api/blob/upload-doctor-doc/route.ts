// Server-side upload for doctor application documents.
//
// We originally used Vercel Blob's client-upload SDK, but the browser
// PUT to vercel.com/api/blob was returning 400 + CORS errors. Switching
// to a server upload: the browser POSTs the file as multipart form-data
// to this route, and we call put() from the server. No token handshake,
// no CORS. Trade-off: request body is capped by Vercel's serverless
// limit, so we enforce a 4 MB cap.
//
// Env required: BLOB_READ_WRITE_TOKEN (auto-injected when a Blob store
// is connected to the project).

import { put } from "@vercel/blob";
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

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    log.error("console.error", undefined, { args: ["[blob] upload error:", error] });
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

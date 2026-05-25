// Server-side upload for doctor application documents.
//
// The browser POSTs the file as multipart form-data; we forward it to
// the VPS file service via uploadBlob(). 10 MB cap matches the rest
// of the platform (consultation file shares); 4 MB was tripping
// phone-camera photos which are routinely 5-8 MB and silently failing.

import { uploadBlob } from "@/lib/blob";
import { NextResponse } from "next/server";

import { log } from "@/lib/log";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
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
        { error: "File exceeds 10MB limit" },
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

    // Vercel kills the function at maxDuration (60s). Cap the upstream
    // call well below that so a slow VPS produces a structured 504 here
    // instead of letting the platform terminate us mid-response — which
    // the browser sees as a generic "Failed to fetch".
    const result = await uploadBlob(pathname, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
      timeoutMs: 45_000,
    });

    if (!result.ok || !result.url) {
      const timedOut = result.error === "upload timed out";
      return NextResponse.json(
        {
          error: timedOut
            ? "Upload server didn't respond in time. Please try again."
            : result.error || "Upload failed",
        },
        { status: timedOut ? 504 : 502 }
      );
    }
    return NextResponse.json({ url: result.url, pathname: result.pathname });
  } catch (error) {
    log.error("blob.upload_failed", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

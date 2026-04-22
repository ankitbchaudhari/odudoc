import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile, signUrl } from "@/lib/files-service";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// POST /api/prescriptions/upload
//   multipart/form-data with `file` field.
//   Uploads the customer's Rx (image or PDF) to the files-service
//   "prescriptions" bucket. Returns the stored filename + short-lived signed
//   URL so the client can show a preview. The filename is what the cart
//   attaches to the checkout payload — the server treats it as opaque.
//
// Validates: signed-in user, size <= 8MB, type in (pdf, png, jpg, webp).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Please sign in to upload a prescription." }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart upload" }, { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const MAX = 8 * 1024 * 1024;
  if (file.size > MAX) {
    return NextResponse.json({ error: "Prescription must be under 8MB." }, { status: 413 });
  }
  const okTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
  if (file.type && !okTypes.includes(file.type)) {
    return NextResponse.json({ error: "Must be PDF, PNG, JPG, or WEBP." }, { status: 400 });
  }

  try {
    const stored = await uploadFile("prescriptions", file, file.name);
    const preview = await signUrl("prescriptions", stored.filename, 600).catch(() => null);
    return NextResponse.json({
      filename: stored.filename,
      size: stored.size,
      previewUrl: preview,
    });
  } catch (err) {
    log.error("console.error", undefined, { args: ["[prescriptions.upload]", err] });
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}

// Server-side client for the VPS file storage service at files.odudoc.com.
//
// Used by Next.js route handlers running on Vercel. Delegates to lib/blob's
// uploadBlob/deleteBlob so we go through the single, real VPS endpoint
// (POST /upload with the x-upload-secret header) instead of the older
// imagined /upload/<category> + sign endpoints.
//
// Files are served publicly by nginx at https://files.odudoc.com/<pathname>,
// so "signing" is a no-op that just returns the public URL.

import { uploadBlob, deleteBlob } from "@/lib/blob";

const PUBLIC_BASE_URL = (
  process.env.FILES_BASE_URL?.trim() || "https://files.odudoc.com"
).replace(/\/+$/, "");

export type FileCategory =
  | "cvs"
  | "prescriptions"
  | "recordings"
  | "licenses"
  | "emr"
  | "doctor-verification";

export interface UploadResult {
  filename: string; // pathname we store in our DB (e.g. "cvs/169.../name.pdf")
  size: number;
  url: string;
}

function sanitizeName(name: string): string {
  return (name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

/**
 * Upload a file (Blob/File from the browser, or Buffer from the server) to the
 * VPS. Returns the pathname under which it's stored — keep this in the DB —
 * and a public URL suitable for immediate display.
 */
export async function uploadFile(
  category: FileCategory,
  file: Blob | File,
  originalName: string
): Promise<UploadResult> {
  const safe = sanitizeName(originalName);
  const rand = Math.random().toString(36).slice(2, 8);
  const pathname = `${category}/${Date.now()}-${rand}/${safe}`;

  const contentType =
    (file as File).type || "application/octet-stream";

  const result = await uploadBlob(pathname, file, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });

  if (!result.ok || !result.url || !result.pathname) {
    throw new Error(result.error || "Files service upload failed");
  }

  return {
    filename: result.pathname,
    size: result.size ?? (file as File).size ?? 0,
    url: result.url,
  };
}

/**
 * The VPS serves uploaded files publicly via nginx, so there's no real
 * signing step. We just return the stable public URL. Kept as an async
 * function so callers don't need to change.
 */
export async function signUrl(
  _category: FileCategory,
  filename: string,
  _ttlSeconds = 3600
): Promise<string | null> {
  if (!filename) return null;
  const clean = filename.replace(/^\/+/, "");
  return `${PUBLIC_BASE_URL}/${clean}`;
}

/**
 * Best-effort deletion. Used by admin "remove" actions.
 */
export async function deleteFile(
  _category: FileCategory,
  filename: string
): Promise<boolean> {
  const result = await deleteBlob(filename);
  return result.ok;
}

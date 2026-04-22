// Server-side client for the VPS file storage service at files.odudoc.com.
//
// Used by Next.js route handlers running on Vercel. Every request carries the
// shared-secret FILES_API_KEY header. The VPS returns signed, time-limited URLs
// that the admin UI can hand to browsers without exposing the API key.

import { Agent, FormData as UndiciFormData, fetch as undiciFetch } from "undici";

const SERVICE_URL = process.env.FILES_SERVICE_URL || "https://files.odudoc.com";
const API_KEY = process.env.FILES_API_KEY;

// The VPS currently serves a cert issued for odudoc.com (not files.odudoc.com),
// which Node's default fetch rejects. Since requests carry our shared secret
// and target a known host, skip hostname/cert validation for this internal call.
// TODO: issue a proper SAN cert covering files.odudoc.com and drop this agent.
const insecureAgent = new Agent({
  connect: { rejectUnauthorized: false },
});

async function serviceFetch(
  url: string,
  init: Parameters<typeof undiciFetch>[1]
): Promise<Response> {
  // Cast because undici's Response is structurally compatible with the global one.
  return undiciFetch(url, { ...init, dispatcher: insecureAgent }) as unknown as Response;
}

export type FileCategory = "cvs" | "prescriptions" | "recordings" | "licenses";

export interface UploadResult {
  filename: string; // generated server-side name we store in our DB
  size: number;
  url: string; // initial 7-day signed URL (may be re-minted later via signUrl)
}

function requireKey(): string {
  if (!API_KEY) {
    throw new Error(
      "FILES_API_KEY is not set. Add it to .env.local (dev) or Vercel env vars (prod)."
    );
  }
  return API_KEY;
}

/**
 * Upload a file (Blob/File from the browser, or Buffer from the server) to the
 * VPS. Returns the generated filename — store this in the DB — plus a short-lived
 * signed URL useful for immediate display.
 */
export async function uploadFile(
  category: FileCategory,
  file: Blob | File,
  originalName: string
): Promise<UploadResult> {
  const key = requireKey();

  // Re-wrap so the server sees a sensible originalname for extension parsing.
  // Using undici's FormData so it matches the undici fetch dispatcher we use below.
  const fd = new UndiciFormData();
  fd.append("file", file, originalName);

  const res = await serviceFetch(`${SERVICE_URL}/upload/${category}`, {
    method: "POST",
    headers: { "X-API-Key": key },
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Files service upload failed (${res.status}): ${text || res.statusText}`
    );
  }

  const json = (await res.json()) as {
    success: boolean;
    filename: string;
    size: number;
    url: string;
  };
  return { filename: json.filename, size: json.size, url: json.url };
}

/**
 * Mint a fresh signed URL for a previously-uploaded file. Default TTL is 1 hour —
 * plenty for an admin to click through from the table.
 */
export async function signUrl(
  category: FileCategory,
  filename: string,
  ttlSeconds = 3600
): Promise<string | null> {
  const key = requireKey();
  const res = await serviceFetch(
    `${SERVICE_URL}/sign/${category}/${encodeURIComponent(filename)}?ttl=${ttlSeconds}`,
    { method: "POST", headers: { "X-API-Key": key } }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { url: string };
  return json.url;
}

/**
 * Best-effort deletion. Used by admin "remove" actions.
 */
export async function deleteFile(
  category: FileCategory,
  filename: string
): Promise<boolean> {
  const key = requireKey();
  const res = await serviceFetch(
    `${SERVICE_URL}/file/${category}/${encodeURIComponent(filename)}`,
    { method: "DELETE", headers: { "X-API-Key": key } }
  );
  return res.ok;
}

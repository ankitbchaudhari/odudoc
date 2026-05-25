// File storage client. Points at the odudoc-files service on the VPS
// (scripts/vps-files/). Public reads are served by nginx at
// https://files.odudoc.com/<pathname>; writes and deletes go through a
// shared-secret-protected HTTP API.
//
// Same function signatures as the previous Vercel Blob wrapper so every
// caller in the app continues to work unchanged. If the env vars are
// missing we return a skipped stub so local/dev flows don't break.

const BASE_URL = (
  process.env.FILES_BASE_URL?.trim() || "https://files.odudoc.com"
).replace(/\/+$/, "");
const SECRET = process.env.FILES_UPLOAD_SECRET?.trim();

export interface UploadResult {
  ok: boolean;
  url?: string;
  pathname?: string;
  contentType?: string;
  size?: number;
  error?: string;
  skipped?: boolean;
}

export function isBlobConfigured(): boolean {
  return Boolean(SECRET);
}

function withRandomSuffix(pathname: string): string {
  const suffix = "-" + Math.random().toString(36).slice(2, 10);
  const dot = pathname.lastIndexOf(".");
  const slash = pathname.lastIndexOf("/");
  // Only treat a dot as an extension if it's after the final slash.
  if (dot > slash) {
    return pathname.slice(0, dot) + suffix + pathname.slice(dot);
  }
  return pathname + suffix;
}

function toBlob(
  body: Blob | ArrayBuffer | Buffer | string,
  contentType?: string
): Blob {
  if (typeof Blob !== "undefined" && body instanceof Blob) return body;
  if (body instanceof ArrayBuffer) {
    return new Blob([body], contentType ? { type: contentType } : undefined);
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    // Copy into a fresh Uint8Array so TS treats it as a concrete ArrayBuffer
    // BlobPart (Buffer's underlying ArrayBufferLike can be SharedArrayBuffer
    // in newer @types/node, which Blob rejects).
    const copy = new Uint8Array(body.length);
    copy.set(body);
    return new Blob([copy], contentType ? { type: contentType } : undefined);
  }
  return new Blob([body as string], {
    type: contentType || "text/plain",
  });
}

export async function uploadBlob(
  pathname: string,
  body: Blob | ArrayBuffer | Buffer | string,
  opts?: {
    contentType?: string;
    access?: "public";
    addRandomSuffix?: boolean;
    // Abort the upstream call after this many ms. Callers should set this
    // so a hung VPS doesn't hold the Vercel function until Vercel itself
    // kills the connection — which surfaces as a cryptic "Failed to fetch"
    // on the browser instead of a structured error.
    timeoutMs?: number;
    signal?: AbortSignal;
  }
): Promise<UploadResult> {
  if (!SECRET) {
    return {
      ok: true,
      skipped: true,
      url: `blob://stub/${pathname}`,
      pathname,
    };
  }

  // Compose the caller's signal (if any) with a timeout signal, so either
  // an external cancel or the timeout aborts the fetch.
  const timeoutSignal =
    typeof opts?.timeoutMs === "number"
      ? AbortSignal.timeout(opts.timeoutMs)
      : undefined;
  const signal: AbortSignal | undefined =
    opts?.signal && timeoutSignal
      ? // AbortSignal.any (Node 20+) is available in Next.js 14's nodejs runtime.
        AbortSignal.any([opts.signal, timeoutSignal])
      : opts?.signal || timeoutSignal;

  try {
    const finalPath =
      opts?.addRandomSuffix === false ? pathname : withRandomSuffix(pathname);
    const form = new FormData();
    const blob = toBlob(body, opts?.contentType);
    form.append("file", blob, finalPath.split("/").pop() || "upload");
    form.append("path", finalPath);

    const res = await fetch(`${BASE_URL}/upload`, {
      method: "POST",
      headers: { "x-upload-secret": SECRET },
      body: form,
      signal,
    });

    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      url?: string;
      pathname?: string;
      contentType?: string;
      size?: number;
      error?: string;
    };

    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error || `upload HTTP ${res.status}` };
    }
    return {
      ok: true,
      url: json.url,
      pathname: json.pathname,
      contentType: json.contentType,
      size: json.size,
    };
  } catch (e) {
    // AbortError → either the caller cancelled or our own timeout fired.
    // Distinguish "timeout" from "cancelled" by checking which signal aborted.
    if (e instanceof Error && e.name === "AbortError") {
      if (timeoutSignal?.aborted) {
        return { ok: false, error: "upload timed out" };
      }
      return { ok: false, error: "upload cancelled" };
    }
    return { ok: false, error: (e as Error).message };
  }
}

// Accepts either a full https://files.odudoc.com/... URL or a bare pathname.
export async function deleteBlob(
  urlOrPath: string
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!SECRET) return { ok: true, skipped: true };
  try {
    let pathname = urlOrPath;
    try {
      const u = new URL(urlOrPath);
      pathname = u.pathname.replace(/^\/+/, "");
    } catch {
      // Not a URL — treat as path directly.
    }

    const res = await fetch(`${BASE_URL}/delete`, {
      method: "DELETE",
      headers: {
        "x-upload-secret": SECRET,
        "content-type": "application/json",
      },
      body: JSON.stringify({ pathname }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };
    if (!json.ok) return { ok: false, error: json.error || `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function listBlobs(
  prefix?: string
): Promise<
  Array<{ url: string; pathname: string; size: number; uploadedAt: string }>
> {
  if (!SECRET) return [];
  try {
    const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : "";
    const res = await fetch(`${BASE_URL}/list${qs}`, {
      headers: { "x-upload-secret": SECRET },
    });
    const json = (await res.json().catch(() => ({}))) as {
      blobs?: Array<{
        url: string;
        pathname: string;
        size: number;
        uploadedAt: string;
      }>;
    };
    return json.blobs || [];
  } catch {
    return [];
  }
}

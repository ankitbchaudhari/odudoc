// Vercel Blob storage wrapper.
// Uses @vercel/blob. When BLOB_READ_WRITE_TOKEN is absent, returns a stub so
// local/dev flows don't break.

import { put, del, list as blobList, type PutBlobResult } from "@vercel/blob";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN?.trim();

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
  return Boolean(TOKEN);
}

export async function uploadBlob(
  path: string,
  body: Blob | ArrayBuffer | Buffer | string,
  opts?: { contentType?: string; access?: "public"; addRandomSuffix?: boolean },
): Promise<UploadResult> {
  if (!TOKEN) {
    return { ok: true, skipped: true, url: `blob://stub/${path}`, pathname: path };
  }
  try {
    const result: PutBlobResult = await put(path, body as Blob, {
      access: opts?.access || "public",
      contentType: opts?.contentType,
      addRandomSuffix: opts?.addRandomSuffix ?? true,
      token: TOKEN,
    });
    return {
      ok: true,
      url: result.url,
      pathname: result.pathname,
      contentType: result.contentType,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteBlob(urlOrPath: string): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  if (!TOKEN) return { ok: true, skipped: true };
  try {
    await del(urlOrPath, { token: TOKEN });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function listBlobs(prefix?: string): Promise<Array<{ url: string; pathname: string; size: number; uploadedAt: string }>> {
  if (!TOKEN) return [];
  try {
    const res = await blobList({ prefix, token: TOKEN });
    return res.blobs.map((b) => ({
      url: b.url,
      pathname: b.pathname,
      size: b.size,
      uploadedAt: typeof b.uploadedAt === "string" ? b.uploadedAt : b.uploadedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

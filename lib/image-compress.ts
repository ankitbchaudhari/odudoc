// Client-side image compression.
//
// Phone cameras routinely emit 5–10 MB JPEGs that crash the Vercel
// upload route (4.5 MB body cap) and feel sluggish over mobile data.
// This helper takes a File, decodes it through a canvas at a capped
// resolution + quality, and returns a new File well under the limit
// — readable, same orientation, same MIME if possible.
//
// PDFs and other non-image types are returned unchanged; callers
// should still enforce their own absolute size cap for those.
//
// Browser-only — uses Image, OffscreenCanvas / HTMLCanvasElement, and
// URL.createObjectURL. Import only from "use client" components.

export interface CompressOptions {
  /** Longest side in pixels. Default 1920 — high enough for legible
   *  scanned documents, low enough to keep file size in check. */
  maxDimension?: number;
  /** JPEG/WEBP quality 0..1. Default 0.82 (a good compression sweet
   *  spot for photos of documents). */
  quality?: number;
  /** Output MIME — defaults to the input's MIME when it's a JPEG /
   *  WEBP. PNGs are re-encoded as JPEG because PNG compression is
   *  poor for photos and the lossless property is rarely needed for
   *  uploaded documents. */
  preferMime?: "image/jpeg" | "image/webp";
  /** Skip compression when the file is already smaller than this
   *  many bytes. Default 700 KB — avoids re-encoding small files. */
  skipBelowBytes?: number;
}

const IMAGE_MIME_PREFIX = "image/";

function isCompressibleImage(file: File): boolean {
  if (!file.type.startsWith(IMAGE_MIME_PREFIX)) return false;
  // SVG + GIF skip — SVG is already text, GIF is animated and we'd
  // lose frames; both are typically small enough anyway.
  if (file.type === "image/svg+xml" || file.type === "image/gif") return false;
  return true;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e instanceof Event ? new Error("Image decode failed") : (e as Error));
    };
    img.src = url;
  });
}

function pickTargetMime(input: File, prefer?: string): "image/jpeg" | "image/webp" {
  if (prefer === "image/webp" || prefer === "image/jpeg") return prefer;
  if (input.type === "image/webp") return "image/webp";
  // PNG → JPEG; everything else → JPEG (the universal export target).
  return "image/jpeg";
}

function targetExt(mime: string): string {
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** Compress an image file. Returns the original (untouched) when:
 *  - the file isn't an image we can decode (PDF, SVG, GIF, etc.)
 *  - the file is already under `skipBelowBytes`
 *  - the browser can't decode it (returns original unchanged so the
 *    caller's upload still proceeds with the user's original file).
 */
export async function compressImageFile(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const {
    maxDimension = 1920,
    quality = 0.82,
    preferMime,
    skipBelowBytes = 700 * 1024,
  } = opts;

  if (!isCompressibleImage(file)) return file;
  if (file.size <= skipBelowBytes) return file;

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return file;
  }

  const { width: w0, height: h0 } = img;
  if (!w0 || !h0) return file;

  // Scale so the longest side is <= maxDimension. Never upscale.
  const longest = Math.max(w0, h0);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(img, 0, 0, w, h);

  const targetMime = pickTargetMime(file, preferMime);
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, targetMime, quality),
  );
  if (!blob) return file;

  // If the "compressed" output is somehow bigger than the original
  // (small images, weird inputs), keep the original.
  if (blob.size >= file.size) return file;

  const base = file.name.replace(/\.[^.]+$/, "");
  const compressed = new File(
    [blob],
    `${base}.${targetExt(targetMime)}`,
    { type: targetMime, lastModified: Date.now() },
  );
  return compressed;
}

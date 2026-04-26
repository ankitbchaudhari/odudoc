// Mint a short-lived signed URL for fetching a KYC / identity document.
//
// Admin posts { path, applicationId? } and gets back a fully-formed
// fetch URL the browser can open in a new tab. Every mint is logged
// to the blob-access store regardless of whether the admin actually
// follows through with the fetch.
//
// The returned URL is `/api/admin/blob/fetch?token=...`, NOT a direct
// link to files.odudoc.com — that proxy is what gates the actual byte
// stream on a fresh admin-session check. Even if the token leaks, the
// receiver still needs an admin session to download.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { mintToken, pathFromUrlOrPath } from "@/lib/blob-sign";
import { recordAccess } from "@/lib/blob-access-log-store";
import { clientIp } from "@/lib/rate-limit-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  path?: string;
  applicationId?: string;
  ttlSeconds?: number;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const adminEmail = (session?.user as { email?: string } | undefined)?.email || "";
  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const path = pathFromUrlOrPath(body.path || "");
  if (!path) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  // Reject obvious path-traversal attempts. The HMAC keys on the
  // pathname so attempts to climb out wouldn't verify anyway, but
  // failing here is clearer.
  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const token = mintToken({ path, ttlSeconds: body.ttlSeconds });
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";
  const url = `${origin}/api/admin/blob/fetch?token=${encodeURIComponent(token)}`;

  recordAccess({
    kind: "sign",
    path,
    adminEmail,
    ipAddress: clientIp(req),
    userAgent: req.headers.get("user-agent") || undefined,
    applicationId: body.applicationId,
    success: true,
  });

  return NextResponse.json({ url, expiresInSeconds: body.ttlSeconds ?? 300 });
}

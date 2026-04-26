// Authenticated proxy for KYC / identity documents.
//
// Two layers of access control:
//   1. Admin session — caller must have role=admin
//   2. Signed token — caller must present a valid HMAC-signed token
//      minted by /api/admin/blob/sign within the last 5 minutes
//
// Both must pass. Either alone isn't enough: token-only would leak
// to anyone who copies the URL out of the admin's browser; session-
// only would let an admin click a typo into the URL bar and fetch an
// arbitrary path. Together: a fresh admin click, time-limited, audit-
// logged.
//
// On success we stream the bytes from files.odudoc.com (preserving
// content-type) with cache-control no-store so the browser doesn't
// keep a copy. Every fetch is recorded — including failed attempts.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyToken } from "@/lib/blob-sign";
import { recordAccess } from "@/lib/blob-access-log-store";
import { clientIp } from "@/lib/rate-limit-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILES_BASE_URL = (
  process.env.FILES_BASE_URL?.trim() || "https://files.odudoc.com"
).replace(/\/+$/, "");

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const adminEmail = (session?.user as { email?: string } | undefined)?.email || "";
  if (role !== "admin") {
    // Don't even reveal whether the path exists.
    return new NextResponse("Forbidden", { status: 403 });
  }

  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const verified = verifyToken(token);
  if (!verified.ok) {
    recordAccess({
      kind: "fetch",
      path: "(unverified)",
      adminEmail,
      ipAddress: clientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
      success: false,
      reason: verified.reason,
    });
    return new NextResponse(`Invalid or expired link (${verified.reason})`, { status: 401 });
  }

  // Stream the file from the origin. We deliberately don't redirect
  // to files.odudoc.com — that would expose the underlying URL in the
  // browser and bypass the audit-log entry on the actual byte stream.
  const upstream = `${FILES_BASE_URL}/${verified.path}`;
  let res: Response;
  try {
    res = await fetch(upstream, { cache: "no-store" });
  } catch (err) {
    recordAccess({
      kind: "fetch",
      path: verified.path,
      adminEmail,
      ipAddress: clientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
      success: false,
      reason: `upstream_error: ${(err as Error).message}`,
    });
    return new NextResponse("Upstream error", { status: 502 });
  }

  if (!res.ok) {
    recordAccess({
      kind: "fetch",
      path: verified.path,
      adminEmail,
      ipAddress: clientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
      success: false,
      reason: `upstream_${res.status}`,
    });
    return new NextResponse("Document not found", { status: res.status });
  }

  recordAccess({
    kind: "fetch",
    path: verified.path,
    adminEmail,
    ipAddress: clientIp(req),
    userAgent: req.headers.get("user-agent") || undefined,
    success: true,
  });

  const headers = new Headers();
  const ct = res.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const cl = res.headers.get("content-length");
  if (cl) headers.set("content-length", cl);
  // Hard cache-disable so the browser doesn't keep a copy on disk.
  headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
  // Inline display when possible (PDFs / images) so an admin can view
  // without an extra download click.
  headers.set("content-disposition", "inline");

  return new NextResponse(res.body, { status: 200, headers });
}

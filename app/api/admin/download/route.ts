// Admin-only proxy that forces a file download with a Content-Disposition
// header. Needed because cross-origin URLs (e.g. files.odudoc.com) ignore
// the browser's <a download> attribute, so clicking just opens the file.
//
// Usage: /api/admin/download?url=<encoded>&name=<filename>

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Only allow downloading from hosts we own. Keeps the endpoint from being
// turned into a general-purpose fetcher.
const ALLOWED_HOSTS = new Set([
  "files.odudoc.com",
]);

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const urlParam = request.nextUrl.searchParams.get("url");
  const nameParam = request.nextUrl.searchParams.get("name") || "download";
  if (!urlParam) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json(
      { error: `Host not allowed: ${target.hostname}` },
      { status: 400 }
    );
  }

  const upstream = await fetch(target.toString());
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Upstream HTTP ${upstream.status}` },
      { status: 502 }
    );
  }

  // Sanitize the filename so Content-Disposition can't be broken by a
  // newline or quote, and cap its length.
  const safeName = nameParam
    .replace(/[\r\n"\\]/g, "_")
    .slice(0, 120) || "download";

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") || "application/octet-stream"
  );
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${safeName}"`
  );
  headers.set("Cache-Control", "private, no-store");

  return new Response(upstream.body, { status: 200, headers });
}

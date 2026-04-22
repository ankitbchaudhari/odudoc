import { NextRequest, NextResponse } from "next/server";
import { getPageBySlug } from "@/lib/pages-store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const withSlash = decoded.startsWith("/") ? decoded : "/" + decoded;
  const page = getPageBySlug(withSlash);
  if (!page || page.status !== "Published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ page });
}

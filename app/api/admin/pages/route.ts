import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPages, createPage, type PageStatus } from "@/lib/pages-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const pages = listPages({
    search: searchParams.get("search") || undefined,
    status: (searchParams.get("status") as PageStatus | "All" | null) || undefined,
  });
  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  try {
    const page = createPage({
      title,
      slug: slug || title,
      status: body.status === "Published" ? "Published" : "Draft",
      author: typeof body.author === "string" ? body.author : "Admin",
      content: typeof body.content === "string" ? body.content : "",
      seoDescription:
        typeof body.seoDescription === "string" ? body.seoDescription : undefined,
      isCustom: typeof body.isCustom === "boolean" ? body.isCustom : true,
    });
    return NextResponse.json({ page }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

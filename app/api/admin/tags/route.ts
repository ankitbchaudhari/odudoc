import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTags, createTag, TAG_COLORS } from "@/lib/tags-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ tags: listTags(), colors: TAG_COLORS });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : "";
  if (!name.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const tag = createTag({
      name,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

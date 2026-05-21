// POST /api/ppme/[id]/decide — insurer approves or rejects.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decidePpme } from "@/lib/ppme-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const report = await decidePpme(id, {
      email: session.user.email,
      role: session.user.role,
    }, parsed.decision, parsed.note);
    if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}

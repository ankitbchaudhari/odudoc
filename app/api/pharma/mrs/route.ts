// /api/pharma/mrs — V7 §3.5 Medical Representative management.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listMrs, upsertMr } from "@/lib/pharma-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "vendor"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const rows = await listMrs(url.searchParams.get("pharmaCompanyId") || undefined);
  return NextResponse.json({ mrs: rows });
}

const Schema = z.object({
  id: z.string().optional(),
  pharmaCompanyId: z.string().min(1),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(32).optional(),
  territory: z.string().max(200).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "vendor"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const mr = await upsertMr({ ...parsed, status: parsed.status || "active" });
  return NextResponse.json({ mr });
}

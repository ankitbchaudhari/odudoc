// GET /api/pharma/companies — list. POST — admin upsert.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPharmaCompanies, upsertPharmaCompany } from "@/lib/pharma-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ companies: await listPharmaCompanies() });
}

const Schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  country: z.string().length(2),
  taxId: z.string().max(64).optional(),
  websiteUrl: z.string().url().optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support"].includes(session.user.role || "")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const company = await upsertPharmaCompany({ ...parsed, status: parsed.status || "active" });
  return NextResponse.json({ company });
}

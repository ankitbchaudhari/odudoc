// /api/pharma/master — V7 §3.3 universal drug master.
//
// GET ?pharmaCompanyId=&status=&search= — list / search the master.
// POST — contribute a new drug entry. Same pharma updating own entry
//        merges aliases; cross-pharma contributions on an existing INN
//        come in as status=draft until Odudoc medical board reviews.
//
// Distinct from /api/pharma/drugs (legacy pharma-catalogue route).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listDrugs, contributeDrug, type DrugMasterEntry } from "@/lib/pharma-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const rows = await listDrugs({
    pharmaCompanyId: url.searchParams.get("pharmaCompanyId") || undefined,
    status: (url.searchParams.get("status") as DrugMasterEntry["status"]) || undefined,
    search: url.searchParams.get("search") || undefined,
  });
  return NextResponse.json({ drugs: rows });
}

const Schema = z.object({
  inn: z.string().min(2).max(200),
  atcCode: z.string().max(16).optional(),
  schedule: z.enum(["X", "H1", "G", "OTC", "NDPS_X"]).optional(),
  contributedByPharmaId: z.string().min(1),
  aliases: z.array(z.object({
    locale: z.string().min(2).max(10),
    kind: z.enum(["brand", "generic"]),
    localName: z.string().min(1).max(200),
    manufacturerId: z.string().optional(),
  })).min(1).max(50),
  forms: z.array(z.object({ strength: z.string().max(40), form: z.string().max(40) })).max(20).optional(),
  ddiKeywords: z.array(z.string().max(80)).max(50).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "vendor"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;
  const result = await contributeDrug(parsed);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ drug: result.drug }, { status: 201 });
}

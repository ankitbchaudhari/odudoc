// Download the signed consent receipt as JSON. Patient hits this from
// the privacy page; the response is a structured receipt the patient
// can keep as legal proof under DPDP §6.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getConsentForUser,
  buildReceipt,
  markReceiptDownloaded,
} from "@/lib/consent-vault-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { id } = await ctxParam.params;
  const c = getConsentForUser(id, userId);
  if (!c) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const receipt = buildReceipt(c);
  markReceiptDownloaded(id);
  try { await awaitAllFlushesStrict(); } catch { /* receipt download is best-effort */ }
  return new NextResponse(JSON.stringify(receipt, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="consent-receipt-${id}.json"`,
    },
  });
}

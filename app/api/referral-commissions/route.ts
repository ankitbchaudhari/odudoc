// Referral commissions — rules + ledger.
//
// GET ?scope=rules | ledger | summary
// POST → action: create_rule | update_rule | delete_rule |
//                accrue | settle | reverse

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  accrueCommission, createRule, deleteRule, listLedger, listRules,
  reverseEntry, settleEntry, summarizeFor, updateRule,
  ReferralPayer, ReferralScope,
} from "@/lib/referral-commissions/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_PAYERS: ReferralPayer[] = ["pharmacy", "lab", "diagnostic", "insurer", "hospital"];
const VALID_SCOPES: ReferralScope[] = ["consultation", "rx_fulfilment", "lab_order", "policy_sale", "admission"];

function actorKey(session: Awaited<ReturnType<typeof getServerSession>>): string | null {
  return session?.user?.email || (session?.user as { id?: string } | undefined)?.id || null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const key = actorKey(session);
  if (!key) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "summary";
  if (scope === "rules") {
    return NextResponse.json({ rules: listRules({ referrerKey: key }) });
  }
  if (scope === "ledger") {
    return NextResponse.json({ ledger: listLedger({ referrerKey: key, limit: 200 }) });
  }
  return NextResponse.json({
    summary: summarizeFor(key),
    rules: listRules({ referrerKey: key, activeOnly: true }),
    recent: listLedger({ referrerKey: key, limit: 20 }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const key = actorKey(session);
  if (!key) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "create_rule") {
    if (!VALID_PAYERS.includes(body.payerKind) || !VALID_SCOPES.includes(body.scope)) {
      return NextResponse.json({ error: "invalid_payer_or_scope" }, { status: 400 });
    }
    if (!body.payerKey) return NextResponse.json({ error: "missing_payer" }, { status: 400 });
    const r = createRule({
      referrerKey: key,
      referrerKind: body.referrerKind || "doctor",
      payerKey: String(body.payerKey),
      payerKind: body.payerKind,
      scope: body.scope,
      pctOfGross: body.pctOfGross !== undefined ? Number(body.pctOfGross) : undefined,
      flatRupees: body.flatRupees !== undefined ? Number(body.flatRupees) : undefined,
      capRupees: body.capRupees !== undefined ? Number(body.capRupees) : undefined,
      notes: body.notes,
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ rule: r });
  }

  if (action === "update_rule") {
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const updated = updateRule(String(body.id), {
      pctOfGross: body.pctOfGross,
      flatRupees: body.flatRupees,
      capRupees: body.capRupees,
      active: body.active,
      notes: body.notes,
    });
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ rule: updated });
  }

  if (action === "delete_rule") {
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    deleteRule(String(body.id));
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ ok: true });
  }

  if (action === "accrue") {
    if (!body.payerKey || !VALID_SCOPES.includes(body.scope) || !body.transactionRef) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const e = accrueCommission({
      referrerKey: key,
      payerKey: String(body.payerKey),
      scope: body.scope,
      transactionRef: String(body.transactionRef),
      grossRupees: Number(body.grossRupees) || 0,
    });
    return NextResponse.json({ entry: e });
  }

  if (action === "settle") {
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const e = settleEntry(String(body.id), body.notes);
    return NextResponse.json({ entry: e });
  }
  if (action === "reverse") {
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const e = reverseEntry(String(body.id), body.notes);
    return NextResponse.json({ entry: e });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

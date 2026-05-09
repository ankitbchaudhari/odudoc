// Patient opt-in / opt-out per org. Mirrors the action into the
// consent vault so the same record powers the privacy page.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findConversation,
  ensureConversation,
  setOptIn,
} from "@/lib/whatsapp/conversations-store";
import { findUserById } from "@/lib/users-store";
import { getOrganizationById } from "@/lib/organizations-store";
import { recordConsent, revokeVaultConsent, findActiveConsentByPurpose } from "@/lib/consent-vault-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const orgId = String(body.organizationId || "").trim();
  const action = body.action === "opt_out" ? "opt_out" : "opt_in";
  if (!orgId) return NextResponse.json({ error: "missing_org" }, { status: 400 });

  const user = findUserById(userId);
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  const org = getOrganizationById(orgId);
  if (!org) return NextResponse.json({ error: "org_not_found" }, { status: 404 });

  let conv = findConversation(userId, orgId);
  if (!conv) {
    if (!user.phone) return NextResponse.json({ error: "no_phone_on_file" }, { status: 400 });
    conv = ensureConversation({
      patientUserId: userId,
      organizationId: orgId,
      patientPhone: user.phone,
      patientName: user.name,
    });
  }

  if (action === "opt_in") {
    setOptIn(conv.id, "opted_in");
    recordConsent({
      userId,
      purpose: "marketing_whatsapp",
      purposeStatement: `Receive WhatsApp messages from ${org.name} including reminders, lab results, and occasional health tips.`,
      recipientKind: "organization",
      recipientId: orgId,
      recipientName: org.name,
      dataCategories: ["whatsapp_messaging"],
      lawfulBasis: "consent",
    });
  } else {
    setOptIn(conv.id, "opted_out");
    const existing = findActiveConsentByPurpose({
      userId,
      purpose: "marketing_whatsapp",
      recipientId: orgId,
    });
    if (existing) revokeVaultConsent(existing.id, userId, "patient_opt_out");
  }

  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, conversation: conv });
}

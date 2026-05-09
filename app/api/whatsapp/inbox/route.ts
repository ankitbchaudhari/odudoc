// Patient-side inbox — list every WhatsApp conversation across orgs.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listConversationsForPatient,
  patientUnreadCount,
} from "@/lib/whatsapp/conversations-store";
import { getOrganizationById } from "@/lib/organizations-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const list = listConversationsForPatient(userId).map((c) => ({
    ...c,
    orgName: getOrganizationById(c.organizationId)?.name || "(platform)",
  }));
  return NextResponse.json({ conversations: list, unread: patientUnreadCount(userId) });
}

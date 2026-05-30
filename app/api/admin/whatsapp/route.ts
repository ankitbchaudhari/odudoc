// GET /api/admin/whatsapp
//
// Returns the recent WhatsApp / sent.dm delivery log plus aggregate
// stats for the admin dashboard at /admin/whatsapp/delivery.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listWaSends, computeStats } from "@/lib/notifications/wa-delivery-log";
import {
  isWhatsAppCloudConfigured,
  pingWhatsAppCloud,
} from "@/lib/whatsapp-cloud";
import { isSentDmConfigured } from "@/lib/sent-dm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter") || "all";
  const template = url.searchParams.get("template") || undefined;
  const limit = Number(url.searchParams.get("limit") || 100);

  let logs = listWaSends({ limit: 500, template });
  if (filter === "success") logs = logs.filter((l) => l.success);
  else if (filter === "failed") logs = logs.filter((l) => !l.success);
  if (limit > 0) logs = logs.slice(0, limit);

  const stats = computeStats();

  // Surface the distinct template names so the page can render a
  // filter dropdown without having to scan the full log itself.
  const templateSet = new Set<string>();
  for (const r of listWaSends({ limit: 1000 })) templateSet.add(r.template);

  // Provider health snapshot — surfaces which path is wired so an
  // admin can immediately see if Cloud is unreachable / token expired.
  // Skipped (kept cheap) unless the page explicitly asks for it via
  // ?probe=1, since each call hits graph.facebook.com.
  let providers: {
    metaCloud: { configured: boolean; reachable?: boolean; verifiedName?: string; qualityRating?: string; error?: string };
    sentDm: { configured: boolean };
    twilio: { configured: boolean };
  } = {
    metaCloud: { configured: isWhatsAppCloudConfigured() },
    sentDm: { configured: isSentDmConfigured() },
    twilio: {
      configured: Boolean(
        process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_WHATSAPP_FROM,
      ),
    },
  };
  if (url.searchParams.get("probe") === "1" && providers.metaCloud.configured) {
    const ping = await pingWhatsAppCloud();
    providers = {
      ...providers,
      metaCloud: {
        ...providers.metaCloud,
        reachable: ping.ok,
        verifiedName: ping.verifiedName,
        qualityRating: ping.qualityRating,
        error: ping.ok ? undefined : ping.error,
      },
    };
  }

  return NextResponse.json({
    logs,
    stats,
    templates: Array.from(templateSet).sort(),
    providers,
  });
}

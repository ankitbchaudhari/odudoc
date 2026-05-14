// GET /api/admin/whatsapp
//
// Returns the recent WhatsApp / sent.dm delivery log plus aggregate
// stats for the admin dashboard at /admin/whatsapp/delivery.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listWaSends, computeStats } from "@/lib/notifications/wa-delivery-log";

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

  return NextResponse.json({
    logs,
    stats,
    templates: Array.from(templateSet).sort(),
  });
}

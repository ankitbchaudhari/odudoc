// Cross-org analytics for the active org.
//
// One-shot endpoint for the Network Analytics tab. Returns:
//   - per-partner breakdown (counts, conversion, payouts owed/paid)
//   - 90-day timeline (transfers per day, both directions)
//   - top specialties referred (from the transfer reason text — coarse,
//     improves once we tag transfers with a structured specialty code)
//   - aggregate KPIs

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  aggregateByPartner,
  listTransfers,
  reloadTransfers,
} from "@/lib/inter-org-transfers-store";
import { getOrganizationById } from "@/lib/organizations-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    await reloadTransfers();
    const url = new URL(req.url);
    const days = Math.max(1, Math.min(365, parseInt(url.searchParams.get("days") || "90", 10)));
    const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
    const sinceIso = new Date(sinceMs).toISOString();

    // Per-partner aggregate.
    const partners = aggregateByPartner(orgId, sinceIso).map((p) => {
      const org = getOrganizationById(p.partnerId);
      return {
        ...p,
        partnerName: org?.name || "(unknown)",
        partnerCountry: org?.country,
      };
    });

    // 90-day timeline. Bucket by date; outbound + inbound separately.
    const all = listTransfers({ orgId }).filter(
      (t) => new Date(t.requestedAt).getTime() >= sinceMs,
    );
    const byDay = new Map<string, { date: string; outbound: number; inbound: number }>();
    for (let d = 0; d < days; d++) {
      const ts = new Date(sinceMs + d * 24 * 60 * 60 * 1000);
      const key = ts.toISOString().slice(0, 10);
      byDay.set(key, { date: key, outbound: 0, inbound: 0 });
    }
    for (const t of all) {
      const key = t.requestedAt.slice(0, 10);
      const row = byDay.get(key);
      if (!row) continue;
      if (t.fromOrgId === orgId) row.outbound++;
      else if (t.toOrgId === orgId) row.inbound++;
    }
    const timeline = Array.from(byDay.values());

    // Aggregate KPIs.
    const kpis = {
      totalOutbound: partners.reduce((a, p) => a + p.outboundCount, 0),
      totalInbound: partners.reduce((a, p) => a + p.inboundCount, 0),
      totalCompleted: partners.reduce((a, p) => a + p.completedCount, 0),
      totalDeclined: partners.reduce((a, p) => a + p.declinedCount, 0),
      conversionPct: 0,
      payoutOwedMinor: partners.reduce((a, p) => a + p.totalPayoutOwedMinor, 0),
      payoutPaidMinor: partners.reduce((a, p) => a + p.totalPayoutPaidMinor, 0),
      grossMinor: partners.reduce((a, p) => a + p.totalGrossMinor, 0),
      partnerCount: partners.length,
      windowDays: days,
    };
    const decided = kpis.totalCompleted + kpis.totalDeclined;
    kpis.conversionPct =
      decided === 0 ? 0 : Math.round((kpis.totalCompleted / decided) * 100);

    // Coarse specialty heuristic — extract bigrams from the reason
    // text and rank. Replace with a structured specialty tag once the
    // transfer form captures one explicitly.
    const specialtyHits = new Map<string, number>();
    const SPEC_PATTERNS = [
      "cardiology", "cardiac", "neurology", "neuro", "oncology", "tumor",
      "orthopedic", "ortho", "paediatric", "pediatric", "obstetric",
      "gynae", "gynaecology", "urology", "nephrology", "dialysis",
      "pulmonology", "respiratory", "gastro", "ent", "dermatology",
      "psychiatry", "ophthalmology", "trauma", "burns", "icu",
    ];
    for (const t of all) {
      const r = t.reason.toLowerCase();
      for (const p of SPEC_PATTERNS) {
        if (r.includes(p)) {
          specialtyHits.set(p, (specialtyHits.get(p) || 0) + 1);
        }
      }
    }
    const topSpecialties = Array.from(specialtyHits.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      kpis,
      partners,
      timeline,
      topSpecialties,
    });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

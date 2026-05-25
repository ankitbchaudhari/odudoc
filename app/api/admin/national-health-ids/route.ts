// Admin API for the national-health-id catalogue.
//
//   GET  /api/admin/national-health-ids
//     → { base: NationalHealthId[]; merged: NationalHealthId[]; overrides: ... }
//     Returns three views so the admin editor can show: what ships
//     by default, what's currently live (after the admin's edits),
//     and the raw list of overrides for editing.
//
//   PATCH writes happen through the existing /api/admin/settings
//   route — saves a partial `{ nationalHealthIdsOverrides: [...] }`.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NATIONAL_HEALTH_IDS } from "@/lib/national-health-ids";
import { getMergedNationalHealthIds } from "@/lib/national-health-ids-merge";
import { ensureHydrated, getSettings } from "@/lib/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await ensureHydrated();
  // Serialize the regex source so the admin UI can display it for
  // editing. RegExp doesn't survive JSON.stringify cleanly.
  const serialize = (e: (typeof NATIONAL_HEALTH_IDS)[number]) => ({
    ...e,
    format: {
      patternStr: e.format.pattern.source,
      placeholder: e.format.placeholder,
      helpText: e.format.helpText,
    },
  });
  const merged = await getMergedNationalHealthIds();
  return NextResponse.json({
    base: NATIONAL_HEALTH_IDS.map(serialize),
    merged: merged.map(serialize),
    overrides: getSettings().nationalHealthIdsOverrides || [],
  });
}

import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings-store";

export const runtime = "nodejs";

// Public: only the non-sensitive slices the site's public pages need.
export async function GET() {
  const s = getSettings();
  return NextResponse.json({
    common: s.common,
    page: s.page,
    currency: s.currency,
    languages: s.languages.filter((l) => l.enabled),
    socialProviders: s.socialProviders
      .filter((p) => p.enabled)
      .map((p) => ({ id: p.id, name: p.name })),
  });
}

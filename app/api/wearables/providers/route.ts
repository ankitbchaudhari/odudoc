// GET /api/wearables/providers
//
// Tells the client which wearable providers have OAuth credentials
// configured on this deployment. Used by the link-device modal to
// branch between "Connect securely via <Provider>" (redirects to
// /api/wearables/oauth/<provider>/start) and the manual demo link
// (POST /api/wearables/devices with a free-text name).
//
// No auth required — provider availability is environment-wide,
// not per-user.

import { NextResponse } from "next/server";
import { isProviderConfigured } from "@/lib/wearables/oauth-providers";
import type { WearableProvider } from "@/lib/wearables/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL: WearableProvider[] = [
  "fitbit", "google_fit", "garmin", "oura", "whoop",
  "samsung_health", "apple_health", "mi_fit", "manual",
];

export async function GET() {
  const configured: Record<string, boolean> = {};
  for (const p of ALL) configured[p] = isProviderConfigured(p);
  return NextResponse.json({ configured });
}

// Admin FX-rates status + force-refresh endpoint.
//
//   GET  /api/admin/fx-rates
//     → { status: FxStatus, providers: FxProvider[] }
//
//   POST /api/admin/fx-rates
//     → forces a fresh fetch of the USD table (bypasses the 1h cache)
//        and returns the post-fetch status, so the admin UI can show
//        immediate success/failure feedback.
//
// Both are super-admin gated via the existing settings-route auth check.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  FX_PROVIDERS,
  getFxStatus,
  refreshFxRates,
} from "@/lib/currency-convert";
import { ensureHydrated } from "@/lib/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await ensureHydrated();
  return NextResponse.json({
    providers: FX_PROVIDERS,
    status: getFxStatus(),
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await ensureHydrated();
  const result = await refreshFxRates("USD");
  return NextResponse.json({
    providers: FX_PROVIDERS,
    ok: result.ok,
    error: result.error,
    status: result.status,
  });
}

// Begin a wearable OAuth dance. Redirect user to provider.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  buildAuthorizeUrl,
  isProviderConfigured,
} from "@/lib/wearables/oauth-providers";
import type { WearableProvider } from "@/lib/wearables/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ provider: string }> }

export async function GET(req: NextRequest, ctxParam: RouteCtx) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.redirect(new URL("/auth/login?callbackUrl=/dashboard/wearables", req.url));
  }
  const { provider } = await ctxParam.params;
  const p = provider as WearableProvider;
  if (!isProviderConfigured(p)) {
    return NextResponse.redirect(new URL(`/dashboard/wearables?error=${encodeURIComponent(p + "_not_configured")}`, req.url));
  }
  const origin = `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host") || req.headers.get("host")}`;
  const redirectUri = `${origin}/api/wearables/oauth/${p}/callback`;
  const built = buildAuthorizeUrl({ provider: p, userId, redirectUri });
  if (!built) {
    return NextResponse.redirect(new URL(`/dashboard/wearables?error=${encodeURIComponent("provider_unsupported")}`, req.url));
  }
  return NextResponse.redirect(built.url);
}

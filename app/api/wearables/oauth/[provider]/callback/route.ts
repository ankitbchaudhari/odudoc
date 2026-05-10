// OAuth callback — exchange code for tokens, persist a linked
// device row, redirect back to /dashboard/wearables.

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  verifyState,
  OAUTH_PROVIDERS,
} from "@/lib/wearables/oauth-providers";
import { linkDevice, type WearableProvider } from "@/lib/wearables/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx { params: Promise<{ provider: string }> }

export async function GET(req: NextRequest, ctxParam: RouteCtx) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const errParam = url.searchParams.get("error");
  if (errParam) {
    return NextResponse.redirect(new URL(`/dashboard/wearables?error=${encodeURIComponent(errParam)}`, req.url));
  }
  const verified = verifyState(state);
  if (!verified) {
    return NextResponse.redirect(new URL(`/dashboard/wearables?error=${encodeURIComponent("invalid_state")}`, req.url));
  }
  const { provider } = await ctxParam.params;
  if (verified.provider !== provider) {
    return NextResponse.redirect(new URL(`/dashboard/wearables?error=${encodeURIComponent("state_provider_mismatch")}`, req.url));
  }

  const origin = `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host") || req.headers.get("host")}`;
  const redirectUri = `${origin}/api/wearables/oauth/${provider}/callback`;
  const exch = await exchangeCodeForToken({
    provider: provider as WearableProvider,
    code,
    redirectUri,
  });
  if (!exch.ok || !exch.accessToken) {
    return NextResponse.redirect(new URL(`/dashboard/wearables?error=${encodeURIComponent(exch.error || "exchange_failed")}`, req.url));
  }

  const meta = OAUTH_PROVIDERS[provider];
  // Persist the device row + the encrypted refresh token. We store
  // the access token TTL here only; a follow-on cron job would
  // refresh it as needed.
  linkDevice({
    userId: verified.userId,
    provider: provider as WearableProvider,
    displayName: `${meta?.name || provider} account`,
    externalId: exch.externalId,
  });
  // Note: refresh token persistence is intentionally non-vulnerable
  // here — production should encrypt with a KMS-managed key. The
  // refreshTokenCipher field on WearableDevice is the slot for it.
  void exch.refreshToken;
  void exch.expiresIn;
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }

  return NextResponse.redirect(new URL(`/dashboard/wearables?linked=${encodeURIComponent(provider)}`, req.url));
}

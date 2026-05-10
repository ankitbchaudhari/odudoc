// Wearable OAuth provider config.
//
// Every provider declares the OAuth shape we need to build a real
// link. Until creds are added the provider falls into "mock" mode —
// the existing manual-link flow still works, but the proper OAuth
// path is one env var away. When env is present we generate the
// authorize URL + state token + return the callback handler that
// exchanges the code for tokens.
//
// Activation checklist:
//   - Fitbit:    create app at https://dev.fitbit.com → set
//                FITBIT_CLIENT_ID + FITBIT_CLIENT_SECRET. Redirect:
//                https://<host>/api/wearables/oauth/fitbit/callback
//   - Apple Health: requires the iOS HealthKit app — not a
//                browser OAuth. We expose a "deep-link to app" path
//                instead; APPLE_HEALTH_APP_URL points at our scheme.
//   - Google Fit: GOOGLE_FIT_CLIENT_ID + GOOGLE_FIT_CLIENT_SECRET
//                with the fitness.activity.read scope.

import crypto from "node:crypto";
import type { WearableProvider } from "./store";

export interface OAuthProvider {
  id: WearableProvider;
  name: string;
  authUrl?: string;
  tokenUrl?: string;
  scopes?: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  /** When true the link flow goes through this OAuth dance. False
   *  means the provider is configured via a different mechanism
   *  (Apple HealthKit, manual upload). */
  webOauth: boolean;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  fitbit: {
    id: "fitbit", name: "Fitbit", webOauth: true,
    authUrl: "https://www.fitbit.com/oauth2/authorize",
    tokenUrl: "https://api.fitbit.com/oauth2/token",
    scopes: ["activity", "heartrate", "sleep", "weight", "profile", "settings"],
    clientIdEnv: "FITBIT_CLIENT_ID",
    clientSecretEnv: "FITBIT_CLIENT_SECRET",
  },
  google_fit: {
    id: "google_fit", name: "Google Fit", webOauth: true,
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/fitness.activity.read",
      "https://www.googleapis.com/auth/fitness.heart_rate.read",
      "https://www.googleapis.com/auth/fitness.body.read",
      "https://www.googleapis.com/auth/fitness.sleep.read",
    ],
    clientIdEnv: "GOOGLE_FIT_CLIENT_ID",
    clientSecretEnv: "GOOGLE_FIT_CLIENT_SECRET",
  },
  apple_health: {
    id: "apple_health", name: "Apple Health", webOauth: false,
    clientIdEnv: "APPLE_HEALTH_APP_URL", clientSecretEnv: "",
  },
  garmin: {
    id: "garmin", name: "Garmin", webOauth: true,
    authUrl: "https://connect.garmin.com/oauthConfirm",
    tokenUrl: "https://connectapi.garmin.com/oauth-service/oauth/access_token",
    scopes: [],
    clientIdEnv: "GARMIN_CONSUMER_KEY",
    clientSecretEnv: "GARMIN_CONSUMER_SECRET",
  },
};

export function isProviderConfigured(provider: WearableProvider): boolean {
  const p = OAUTH_PROVIDERS[provider];
  if (!p) return false;
  if (!p.webOauth) return Boolean(process.env[p.clientIdEnv]);
  return Boolean(process.env[p.clientIdEnv] && process.env[p.clientSecretEnv]);
}

/** Build the authorize URL + a signed `state` so the callback can
 *  prove the redirect originated here. State is a JWT-shaped token
 *  containing { userId, providerId, nonce, exp }. */
export function buildAuthorizeUrl(input: {
  provider: WearableProvider;
  userId: string;
  redirectUri: string;
}): { url: string; state: string } | null {
  const p = OAUTH_PROVIDERS[input.provider];
  if (!p || !p.webOauth || !p.authUrl) return null;
  const clientId = process.env[p.clientIdEnv];
  if (!clientId) return null;
  const state = signState({ userId: input.userId, provider: input.provider });
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: input.redirectUri,
    scope: (p.scopes || []).join(" "),
    state,
  });
  return { url: `${p.authUrl}?${params.toString()}`, state };
}

interface StatePayload {
  userId: string;
  provider: WearableProvider;
  nonce: string;
  exp: number;
}

const STATE_SECRET = process.env.WEARABLE_STATE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "dev-only-rotate-in-prod";

function signState(input: { userId: string; provider: WearableProvider }): string {
  const payload: StatePayload = {
    userId: input.userId,
    provider: input.provider,
    nonce: crypto.randomBytes(8).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const json = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = crypto.createHmac("sha256", STATE_SECRET).update(json).digest("hex");
  return `${json}.${sig}`;
}

export function verifyState(state: string): StatePayload | null {
  if (!state || !state.includes(".")) return null;
  const [json, sig] = state.split(".");
  const expected = crypto.createHmac("sha256", STATE_SECRET).update(json).digest("hex");
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(json, "base64url").toString("utf-8"));
  } catch { return null; }
  if (payload.exp < Date.now()) return null;
  return payload;
}

/** Exchange the OAuth `code` for an access + refresh token. Real
 *  endpoints; this is the path that runs once env vars are present. */
export async function exchangeCodeForToken(input: {
  provider: WearableProvider;
  code: string;
  redirectUri: string;
}): Promise<{ ok: boolean; accessToken?: string; refreshToken?: string; expiresIn?: number; externalId?: string; error?: string }> {
  const p = OAUTH_PROVIDERS[input.provider];
  if (!p || !p.webOauth || !p.tokenUrl) return { ok: false, error: "unsupported_provider" };
  const clientId = process.env[p.clientIdEnv];
  const clientSecret = process.env[p.clientSecretEnv];
  if (!clientId || !clientSecret) return { ok: false, error: "missing_creds" };
  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      redirect_uri: input.redirectUri,
      client_id: clientId,
    });
    // Fitbit + Google use Basic auth + POST body; Garmin is OAuth1.
    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    if (input.provider === "fitbit" || input.provider === "google_fit") {
      headers.Authorization = "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    } else {
      body.set("client_secret", clientSecret);
    }
    const r = await fetch(p.tokenUrl, { method: "POST", headers, body });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { ok: false, error: `provider_${r.status}:${txt.slice(0, 80)}` };
    }
    const data = await r.json() as { access_token?: string; refresh_token?: string; expires_in?: number; user_id?: string; sub?: string };
    return {
      ok: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      externalId: data.user_id || data.sub,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

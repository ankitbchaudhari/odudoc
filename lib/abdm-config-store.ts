// ABDM integration configuration.
//
// Admins paste their NHA-issued sandbox / production credentials on
// the /admin/abdm settings page. We persist them in app_kv keyed by
// "abdm-config" so they survive Lambda recycles. Phase-1 stubs read
// this config to decide whether to call the real ABDM gateway or
// return a "sandbox not configured" response.
//
// Credentials are sensitive — never log clientSecret, never include
// it in any GET response. The admin UI shows a masked preview only.

import { loadJson, saveJson } from "./persistent-array";

export type AbdmEnvironment = "sandbox" | "production";

export interface AbdmConfig {
  /** Master switch — when false, all ABDM UI hides itself across the
   *  platform regardless of credentials. Lets admin staging-test the
   *  scaffolding without exposing it to real users. */
  enabled: boolean;
  /** Which NHA environment we're talking to. Drives the base URL. */
  environment: AbdmEnvironment;
  /** Override for the gateway URL. Empty means use the canonical
   *  endpoint for the chosen environment. */
  baseUrl?: string;
  /** OAuth client id issued by NHA after sandbox approval. */
  clientId?: string;
  /** OAuth client secret. Never returned in plain over GET — masked
   *  to "••••" + last 4 chars in the admin UI. */
  clientSecret?: string;
  /** "Health Information User" registry id once you pass M1. */
  hiuId?: string;
  /** "Health Information Provider" registry id once you pass M2. */
  hipId?: string;
  /** Last update bookkeeping. */
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_ABDM_CONFIG: AbdmConfig = {
  enabled: false,
  environment: "sandbox",
};

const KEY = "abdm-config";

export async function getAbdmConfig(): Promise<AbdmConfig> {
  const cfg = await loadJson<AbdmConfig>(KEY, DEFAULT_ABDM_CONFIG);
  // Backfill defaults for forward compatibility — older saves may
  // omit fields we add later.
  return { ...DEFAULT_ABDM_CONFIG, ...cfg };
}

export async function saveAbdmConfig(
  patch: Partial<AbdmConfig>,
  adminEmail: string,
): Promise<AbdmConfig> {
  const current = await getAbdmConfig();
  const next: AbdmConfig = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail.toLowerCase(),
  };
  await saveJson(KEY, next);
  return next;
}

/** Public-safe shape — strips clientSecret, exposes a masked preview
 *  so the admin UI can show "configured / not configured" without
 *  ever sending the secret over the wire. */
export interface AbdmConfigPublic
  extends Omit<AbdmConfig, "clientSecret"> {
  clientSecretSet: boolean;
  clientSecretPreview?: string;
}

export function publicShape(cfg: AbdmConfig): AbdmConfigPublic {
  const secret = cfg.clientSecret;
  return {
    enabled: cfg.enabled,
    environment: cfg.environment,
    baseUrl: cfg.baseUrl,
    clientId: cfg.clientId,
    hiuId: cfg.hiuId,
    hipId: cfg.hipId,
    updatedAt: cfg.updatedAt,
    updatedBy: cfg.updatedBy,
    clientSecretSet: typeof secret === "string" && secret.length > 0,
    clientSecretPreview:
      secret && secret.length > 4
        ? "••••" + secret.slice(-4)
        : undefined,
  };
}

export function abdmGatewayUrl(cfg: AbdmConfig): string {
  if (cfg.baseUrl && cfg.baseUrl.trim()) return cfg.baseUrl.trim();
  return cfg.environment === "production"
    ? "https://dev.abdm.gov.in/gateway"
    : "https://dev.abdm.gov.in/gateway"; // sandbox + prod share the dev gateway today
}

/** True when the platform has enough config to reach a real ABDM
 *  gateway. False forces the stub responses across all ABDM
 *  endpoints so dashboards keep working. */
export function isAbdmReady(cfg: AbdmConfig): boolean {
  return (
    cfg.enabled === true &&
    typeof cfg.clientId === "string" &&
    cfg.clientId.length > 0 &&
    typeof cfg.clientSecret === "string" &&
    cfg.clientSecret.length > 0
  );
}

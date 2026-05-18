// Live config propagation channel. Spec v6.0 §21.
//
// In-process pub/sub used to broadcast tenant-config changes to
// connected SSE clients within the same Lambda. Each config write
// (e.g. admin toggles a feature flag, changes a notification
// template, adjusts pricing) calls publishConfigChange() which
// fans out to all open SSE streams for the matching tenant.
//
// Cross-Lambda fanout in production uses a Redis pub/sub bridge —
// this MVP keeps fanout in-memory. Single-Lambda is the common case
// for low-traffic tenants; multi-Lambda configs converge within the
// next 30-second config-version poll the clients run regardless.

type Listener = (payload: ConfigChangeEvent) => void;

export interface ConfigChangeEvent {
  /** Tenant whose config changed. */
  organizationId: string;
  /** Which config domain — "feature_flags", "pricing",
   *  "notification_templates", "branding", etc. Used by clients to
   *  decide which slice of state to invalidate. */
  domain: string;
  /** Free-form payload — caller decides shape; clients negotiate. */
  payload?: unknown;
  /** Server clock when the change was published. */
  at: string;
  /** Monotonic version per tenant — clients store it and only
   *  apply events whose version is greater. */
  version: number;
}

const listeners = new Map<string, Set<Listener>>(); // orgId → listeners
const versionByOrg = new Map<string, number>(); // orgId → last version

export function subscribe(organizationId: string, fn: Listener): () => void {
  let set = listeners.get(organizationId);
  if (!set) {
    set = new Set();
    listeners.set(organizationId, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(organizationId);
  };
}

export function publishConfigChange(input: {
  organizationId: string;
  domain: string;
  payload?: unknown;
}): ConfigChangeEvent {
  const prev = versionByOrg.get(input.organizationId) || 0;
  const version = prev + 1;
  versionByOrg.set(input.organizationId, version);
  const ev: ConfigChangeEvent = {
    organizationId: input.organizationId,
    domain: input.domain,
    payload: input.payload,
    at: new Date().toISOString(),
    version,
  };
  const set = listeners.get(input.organizationId);
  if (set) {
    for (const fn of set) {
      try {
        fn(ev);
      } catch {
        /* listener crashed — keep going */
      }
    }
  }
  return ev;
}

/** Current version a client should latch onto on first connect. */
export function currentVersion(organizationId: string): number {
  return versionByOrg.get(organizationId) || 0;
}

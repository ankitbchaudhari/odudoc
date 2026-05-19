// Cross-Lambda pub/sub abstraction.
//
// Vercel serverless can spawn many concurrent instances. The
// existing live-config-channel.ts uses in-memory Maps which only
// reach subscribers in the SAME Lambda — fine for low-traffic
// tenants, broken for anything bigger.
//
// This module wraps that in-memory channel behind a generic
// publish/subscribe interface and adds a Redis adapter that takes
// over when REDIS_URL is set. The application code calls
// `pubsub.publish()` / `pubsub.subscribe()` once; the adapter
// switch happens here.
//
// In-memory mode is the default. The Redis mode requires the
// `ioredis` package — we import it dynamically so builds without
// the dep don't fail. Production wiring (Upstash / ElastiCache /
// self-hosted) is set via:
//   REDIS_URL=redis://default:<password>@host:port
//
// Schema: every publish has a string channel + a JSON-encodable
// payload. Subscribers get the parsed payload + the channel name
// for routing.

export interface PubSubMessage<T = unknown> {
  channel: string;
  payload: T;
}

export type PubSubListener<T = unknown> = (msg: PubSubMessage<T>) => void;

export interface PubSubAdapter {
  /** Publish a payload on a named channel. Resolves once the
   *  message is queued (NOT when subscribers have processed it). */
  publish(channel: string, payload: unknown): Promise<void>;
  /** Subscribe to a channel pattern. The unsubscribe callback the
   *  caller MUST invoke on teardown — otherwise we leak listeners
   *  in long-lived processes. */
  subscribe(channel: string, fn: PubSubListener): Promise<() => Promise<void>>;
  /** Adapter implementation name for log lines + admin debug. */
  kind: "in_memory" | "redis";
}

// ── In-memory adapter ─────────────────────────────────────────────
function createInMemory(): PubSubAdapter {
  const listeners = new Map<string, Set<PubSubListener>>();
  return {
    kind: "in_memory",
    async publish(channel, payload) {
      const set = listeners.get(channel);
      if (!set) return;
      for (const fn of set) {
        try { fn({ channel, payload }); } catch { /* listener crash isolated */ }
      }
    },
    async subscribe(channel, fn) {
      let set = listeners.get(channel);
      if (!set) { set = new Set(); listeners.set(channel, set); }
      set.add(fn);
      return async () => {
        const s = listeners.get(channel);
        if (!s) return;
        s.delete(fn);
        if (s.size === 0) listeners.delete(channel);
      };
    },
  };
}

// ── Redis adapter (lazy) ──────────────────────────────────────────
//
// We don't statically import ioredis — keeps the bundle slim and
// lets builds without the dep succeed. When REDIS_URL is set and
// ioredis resolves, we wire up two clients (one for pub, one for
// sub — required by node-redis design where a subscribed client
// can't be used for other commands).
async function createRedis(url: string): Promise<PubSubAdapter | null> {
  try {
    // webpackIgnore tells the bundler not to statically resolve this
    // import — ioredis is an optional peer dep that's only present at
    // runtime when REDIS_URL is set. Without the comment, `next build`
    // fails with "Module not found: Can't resolve 'ioredis'".
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ioredis = await import(/* webpackIgnore: true */ "ioredis" as any).catch(() => null);
    if (!ioredis) return null;
    const Redis = ioredis.default || ioredis.Redis || ioredis;
    const pub = new Redis(url);
    const sub = new Redis(url);
    const listeners = new Map<string, Set<PubSubListener>>();

    sub.on("message", (channel: string, raw: string) => {
      let payload: unknown;
      try { payload = JSON.parse(raw); } catch { payload = raw; }
      const set = listeners.get(channel);
      if (!set) return;
      for (const fn of set) {
        try { fn({ channel, payload }); } catch { /* isolated */ }
      }
    });

    return {
      kind: "redis",
      async publish(channel, payload) {
        await pub.publish(channel, JSON.stringify(payload));
      },
      async subscribe(channel, fn) {
        let set = listeners.get(channel);
        if (!set) {
          set = new Set();
          listeners.set(channel, set);
          await sub.subscribe(channel);
        }
        set.add(fn);
        return async () => {
          const s = listeners.get(channel);
          if (!s) return;
          s.delete(fn);
          if (s.size === 0) {
            listeners.delete(channel);
            await sub.unsubscribe(channel);
          }
        };
      },
    };
  } catch {
    return null;
  }
}

// ── Singleton ─────────────────────────────────────────────────────
//
// Lazily resolves to the Redis adapter if REDIS_URL is set AND
// ioredis is installed; otherwise stays in-memory. We cache the
// promise so multiple imports share one adapter.

let adapterPromise: Promise<PubSubAdapter> | null = null;

export function pubsub(): Promise<PubSubAdapter> {
  if (adapterPromise) return adapterPromise;
  adapterPromise = (async () => {
    const url = process.env.REDIS_URL;
    if (url) {
      const r = await createRedis(url);
      if (r) return r;
      // fall through to in-memory if Redis init failed
    }
    return createInMemory();
  })();
  return adapterPromise;
}

// Convenience wrappers so callers don't have to await the adapter
// every time. Use these from clinical-event publishers.
export async function publish(channel: string, payload: unknown): Promise<void> {
  const a = await pubsub();
  await a.publish(channel, payload);
}
export async function subscribe<T = unknown>(channel: string, fn: PubSubListener<T>): Promise<() => Promise<void>> {
  const a = await pubsub();
  return a.subscribe(channel, fn as PubSubListener);
}

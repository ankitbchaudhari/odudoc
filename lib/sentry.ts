// Env-gated Sentry helper.
// Instead of wiring sentry.client/server/edge.config.ts across the app, we
// expose a single `captureException` that dynamically imports @sentry/nextjs
// only when SENTRY_DSN is set. Callers never pay the import cost in dev.

const DSN = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

let initialized = false;
let sentryMod: typeof import("@sentry/nextjs") | null = null;

async function ensureSentry() {
  if (!DSN) return null;
  if (initialized && sentryMod) return sentryMod;
  try {
    sentryMod = await import("@sentry/nextjs");
    if (!initialized) {
      sentryMod.init({
        dsn: DSN,
        tracesSampleRate: 0.1,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      });
      initialized = true;
    }
    return sentryMod;
  } catch {
    return null;
  }
}

export async function captureException(err: unknown, context?: Record<string, unknown>) {
  const s = await ensureSentry();
  if (!s) {
    console.error("[err]", err, context);
    return;
  }
  s.captureException(err, context ? { extra: context } : undefined);
}

export async function captureMessage(msg: string, level: "info" | "warning" | "error" = "info") {
  const s = await ensureSentry();
  if (!s) {
    console.log(`[${level}]`, msg);
    return;
  }
  s.captureMessage(msg, level);
}

export function isSentryConfigured(): boolean {
  return Boolean(DSN);
}

/**
 * Wrap an async route handler so any thrown error is forwarded to Sentry
 * before being re-thrown. The original error propagates unchanged so
 * existing try/catch logic still sees it.
 */
export function withSentry<TArgs extends unknown[], TRet>(
  handler: (...args: TArgs) => Promise<TRet>,
  context?: Record<string, unknown>,
): (...args: TArgs) => Promise<TRet> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (err) {
      await captureException(err, context);
      throw err;
    }
  };
}

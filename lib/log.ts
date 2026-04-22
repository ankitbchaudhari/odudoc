// Structured logging.
//
//   log.info("user.signup", { userId, email });
//   log.warn("stripe.webhook.unmatched_sub", { subId });
//   log.error("email.send_failed", { to, err: (e as Error).message });
//
// Output goes to stdout as a single JSON line per call — Vercel's log UI
// auto-pretty-prints these and makes them filterable. Warnings and errors
// are also forwarded to Sentry when it's configured.
//
// Keep call sites short: the event name is a dot-delimited identifier
// (module.action) and the meta object is free-form. Don't put user-typed
// content directly in the event name — keep it enumerable.

import { captureException, captureMessage } from "./sentry";

type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, event: string, meta?: Record<string, unknown>): void {
  const line = {
    level,
    event,
    ts: new Date().toISOString(),
    env: process.env.VERCEL_ENV || process.env.NODE_ENV,
    region: process.env.VERCEL_REGION,
    ...meta,
  };
  const payload = JSON.stringify(line);
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

export const log = {
  debug(event: string, meta?: Record<string, unknown>) {
    if (process.env.VERCEL_ENV === "production") return; // skip in prod
    emit("debug", event, meta);
  },
  info(event: string, meta?: Record<string, unknown>) {
    emit("info", event, meta);
  },
  warn(event: string, meta?: Record<string, unknown>) {
    emit("warn", event, meta);
    void captureMessage(event, "warning");
  },
  error(event: string, err?: unknown, meta?: Record<string, unknown>) {
    const errMeta = err instanceof Error
      ? { err: err.message, stack: err.stack?.split("\n").slice(0, 5).join("\n") }
      : err !== undefined ? { err: String(err) } : {};
    emit("error", event, { ...errMeta, ...meta });
    if (err instanceof Error) void captureException(err, { event, ...meta });
    else void captureMessage(event, "error");
  },
};

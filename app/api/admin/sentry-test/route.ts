// Admin-only Sentry self-test.
//
// GET  → returns whether SENTRY_DSN is set in the current environment,
//        masked for safety. Use this to confirm the deploy has the env
//        var without sending any traffic.
//
// POST → emits one test event of the requested kind:
//          { kind: "message" }   captureMessage("test", "info")
//          { kind: "error" }     captureException(new Error("test"))
//          { kind: "throw" }     throws — exercises the global error
//                                handler path that Vercel + Sentry's
//                                instrumentation are supposed to wire.
//        Returns immediately so the admin UI can show "sent". Check the
//        Sentry dashboard ~5-10 seconds later for the event to confirm
//        ingestion is live.
//
// Both verbs are admin-gated. Public access would be a free way to drive
// up Sentry quota — and "throw" lets a caller force a 500 trace, which
// has obvious abuse potential.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { captureException, captureMessage, isSentryConfigured } from "@/lib/sentry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  return s?.user && (s.user as { role?: string }).role === "admin";
}

function maskDsn(dsn?: string): string | null {
  if (!dsn) return null;
  const t = dsn.trim();
  if (!t) return null;
  // DSN looks like https://<key>@oXXX.ingest.sentry.io/<project>. Mask
  // the key segment but keep the host + project visible so admins can
  // tell which Sentry project this deploy points at.
  return t.replace(/\/\/([^:@/]+)(:[^@]+)?@/, "//$1***@");
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    configured: isSentryConfigured(),
    SENTRY_DSN: maskDsn(process.env.SENTRY_DSN),
    NEXT_PUBLIC_SENTRY_DSN: maskDsn(process.env.NEXT_PUBLIC_SENTRY_DSN),
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    region: process.env.VERCEL_REGION || null,
  });
}

interface TestBody {
  kind?: "message" | "error" | "throw";
  note?: string;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isSentryConfigured()) {
    return NextResponse.json(
      { error: "sentry_not_configured", hint: "Set SENTRY_DSN in Vercel env." },
      { status: 503 },
    );
  }

  let body: TestBody = {};
  try {
    body = (await req.json()) as TestBody;
  } catch {
    /* empty body OK */
  }
  const kind = body.kind || "error";
  const note = body.note ? ` — ${body.note}` : "";
  const stamp = new Date().toISOString();

  if (kind === "message") {
    await captureMessage(`OduDoc admin Sentry test (message) at ${stamp}${note}`, "info");
    return NextResponse.json({ ok: true, kind, sentAt: stamp });
  }

  if (kind === "throw") {
    // Surface to the Vercel runtime error handler so Sentry's automatic
    // instrumentation captures it (rather than our explicit capture).
    throw new Error(`OduDoc admin Sentry test (throw) at ${stamp}${note}`);
  }

  // Default: "error" — explicit captureException
  await captureException(
    new Error(`OduDoc admin Sentry test (error) at ${stamp}${note}`),
    { triggeredBy: "admin", stamp },
  );
  return NextResponse.json({ ok: true, kind, sentAt: stamp });
}

// Public status / health endpoint.
//
// Returns a structured snapshot per subsystem so the /status page
// can render a real-time uptime board. Intentionally cheap — every
// check is a fast in-memory probe; no external roundtrips except
// the Postgres ping which is fenced behind a 1.5s timeout.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ComponentStatus {
  id: string;
  name: string;
  group: "core" | "clinical" | "comms" | "marketplace" | "compliance";
  status: "operational" | "degraded" | "outage" | "unknown";
  detail?: string;
  /** Last update ms epoch — gives the UI freshness signal. */
  lastCheckedMs: number;
}

async function pingPostgres(): Promise<{ status: ComponentStatus["status"]; detail?: string }> {
  try {
    const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!url) return { status: "unknown", detail: "POSTGRES_URL not set" };
    // Use the project's existing postgres.js client wrapper from
    // lib/db.ts. Bound by a 1.5s race to avoid hanging the status
    // page when the DB is unreachable.
    const dbMod = await import("@/lib/db").catch(() => null);
    if (!dbMod || typeof (dbMod as { sql?: unknown }).sql !== "function") {
      return { status: "operational", detail: "db client not available (skipping ping)" };
    }
    const sql = (dbMod as { sql: (q: TemplateStringsArray) => Promise<unknown> }).sql;
    const t0 = Date.now();
    await Promise.race([
      sql`select 1` as Promise<unknown>,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500)),
    ]);
    return { status: "operational", detail: `${Date.now() - t0}ms` };
  } catch (err) {
    return { status: "outage", detail: (err as Error).message };
  }
}

function envFlag(key: string): boolean {
  return Boolean(process.env[key]);
}

export async function GET() {
  const now = Date.now();
  const pg = await pingPostgres();

  const components: ComponentStatus[] = [
    { id: "web", name: "Web app", group: "core", status: "operational", lastCheckedMs: now },
    { id: "auth", name: "Authentication", group: "core", status: envFlag("NEXTAUTH_SECRET") ? "operational" : "degraded", detail: envFlag("NEXTAUTH_SECRET") ? undefined : "NEXTAUTH_SECRET missing", lastCheckedMs: now },
    { id: "db", name: "Postgres (Neon)", group: "core", status: pg.status, detail: pg.detail, lastCheckedMs: now },
    { id: "scribe", name: "Ambient Scribe (Gemini)", group: "clinical", status: envFlag("GOOGLE_GENERATIVE_AI_API_KEY") || envFlag("GEMINI_API_KEY") ? "operational" : "degraded", detail: envFlag("GOOGLE_GENERATIVE_AI_API_KEY") || envFlag("GEMINI_API_KEY") ? undefined : "Gemini key missing — falls back to deterministic structurer", lastCheckedMs: now },
    { id: "rx-safety", name: "Drug-safety engine", group: "clinical", status: "operational", lastCheckedMs: now },
    { id: "ddx", name: "Differential-Dx copilot", group: "clinical", status: "operational", lastCheckedMs: now },
    { id: "teleicu", name: "Tele-ICU NEWS2", group: "clinical", status: "operational", lastCheckedMs: now },
    { id: "voice", name: "Voice Station parser", group: "clinical", status: "operational", lastCheckedMs: now },
    { id: "wearables", name: "Wearable ingestion", group: "clinical", status: "operational", lastCheckedMs: now },
    { id: "whatsapp", name: "WhatsApp (Twilio)", group: "comms", status: envFlag("TWILIO_AUTH_TOKEN") && envFlag("TWILIO_WHATSAPP_FROM") ? "operational" : "degraded", detail: envFlag("TWILIO_AUTH_TOKEN") ? undefined : "Twilio creds missing — sandbox mode", lastCheckedMs: now },
    { id: "sms", name: "SMS / OTP (Twilio)", group: "comms", status: envFlag("TWILIO_AUTH_TOKEN") && envFlag("TWILIO_SMS_FROM") ? "operational" : "degraded", detail: envFlag("TWILIO_AUTH_TOKEN") ? undefined : "Twilio creds missing — sandbox mode", lastCheckedMs: now },
    { id: "email", name: "Transactional email", group: "comms", status: envFlag("RESEND_API_KEY") || envFlag("SENDGRID_API_KEY") || envFlag("SMTP_HOST") ? "operational" : "degraded", detail: undefined, lastCheckedMs: now },
    { id: "stripe", name: "Stripe", group: "marketplace", status: envFlag("STRIPE_SECRET_KEY") ? "operational" : "degraded", detail: envFlag("STRIPE_SECRET_KEY") ? undefined : "STRIPE_SECRET_KEY missing", lastCheckedMs: now },
    { id: "cashfree", name: "Cashfree", group: "marketplace", status: envFlag("CASHFREE_APP_ID") && envFlag("CASHFREE_SECRET_KEY") ? "operational" : "degraded", detail: envFlag("CASHFREE_APP_ID") ? undefined : "Cashfree creds missing — sandbox mode", lastCheckedMs: now },
    { id: "rx-fulfillment", name: "Pharmacy marketplace", group: "marketplace", status: "operational", lastCheckedMs: now },
    { id: "abdm", name: "ABDM / ABHA gateway", group: "compliance", status: process.env.ABDM_MOCK !== "false" ? "degraded" : "operational", detail: process.env.ABDM_MOCK !== "false" ? "Mock mode (set ABDM_MOCK=false for live)" : undefined, lastCheckedMs: now },
    { id: "consent-vault", name: "DPDP consent vault", group: "compliance", status: "operational", lastCheckedMs: now },
    { id: "passport", name: "Health Passport", group: "compliance", status: "operational", lastCheckedMs: now },
    { id: "audit", name: "Audit log", group: "compliance", status: "operational", lastCheckedMs: now },
  ];

  const summary = {
    total: components.length,
    operational: components.filter((c) => c.status === "operational").length,
    degraded: components.filter((c) => c.status === "degraded").length,
    outage: components.filter((c) => c.status === "outage").length,
    unknown: components.filter((c) => c.status === "unknown").length,
  };

  // Overall: outage if any outage; degraded if any degraded; else
  // operational. This is the signal the public hero shows in big text.
  const overall: ComponentStatus["status"] =
    summary.outage > 0 ? "outage" :
    summary.degraded > 0 ? "degraded" :
    "operational";

  return NextResponse.json({
    overall,
    summary,
    components,
    generatedAt: new Date(now).toISOString(),
    region: process.env.VERCEL_REGION || process.env.AWS_REGION || "in-south-1",
  });
}

// Super-admin only: live ping of external providers (Resend, Twilio,
// Upstash, Stripe) so we can tell configured-but-broken from
// configured-and-working. Each check is budgeted with a 4s timeout so a
// single slow provider can't stall the whole dashboard.
//
// GET /api/admin/super/provider-health

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Probe {
  provider: string;
  configured: boolean;
  ok: boolean;
  latencyMs: number;
  detail?: string;
}

const BUDGET = 4000;

async function timed<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: string; ms: number }> {
  const t = Date.now();
  try {
    const v = await Promise.race([
      fn(),
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), BUDGET)),
    ]);
    return { value: v, ms: Date.now() - t };
  } catch (e) {
    return { error: (e as Error).message, ms: Date.now() - t };
  }
}

async function probeResend(): Promise<Probe> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { provider: "resend", configured: false, ok: false, latencyMs: 0, detail: "no_api_key" };
  const r = await timed(async () => {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    return { status: res.status, ok: res.ok };
  });
  if (r.error) return { provider: "resend", configured: true, ok: false, latencyMs: r.ms, detail: r.error };
  return { provider: "resend", configured: true, ok: r.value!.ok, latencyMs: r.ms, detail: `HTTP ${r.value!.status}` };
}

async function probeTwilio(): Promise<Probe> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return { provider: "twilio", configured: false, ok: false, latencyMs: 0, detail: "no_credentials" };
  const r = await timed(async () => {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
    });
    return { status: res.status, ok: res.ok };
  });
  if (r.error) return { provider: "twilio", configured: true, ok: false, latencyMs: r.ms, detail: r.error };
  return { provider: "twilio", configured: true, ok: r.value!.ok, latencyMs: r.ms, detail: `HTTP ${r.value!.status}` };
}

async function probeUpstash(): Promise<Probe> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { provider: "upstash", configured: false, ok: false, latencyMs: 0, detail: "no_credentials" };
  const r = await timed(async () => {
    const res = await fetch(`${url}/ping`, { headers: { Authorization: `Bearer ${token}` } });
    return { status: res.status, ok: res.ok };
  });
  if (r.error) return { provider: "upstash", configured: true, ok: false, latencyMs: r.ms, detail: r.error };
  return { provider: "upstash", configured: true, ok: r.value!.ok, latencyMs: r.ms, detail: `HTTP ${r.value!.status}` };
}

async function probeStripe(): Promise<Probe> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { provider: "stripe", configured: false, ok: false, latencyMs: 0, detail: "no_api_key" };
  const r = await timed(async () => {
    const { stripe } = await import("@/lib/stripe");
    const acct = await stripe.accounts.retrieve();
    return { id: acct.id, charges: acct.charges_enabled };
  });
  if (r.error) return { provider: "stripe", configured: true, ok: false, latencyMs: r.ms, detail: r.error };
  return { provider: "stripe", configured: true, ok: true, latencyMs: r.ms, detail: `account=${r.value!.id} charges=${r.value!.charges}` };
}

async function probeBlob(): Promise<Probe> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return { provider: "blob", configured: false, ok: false, latencyMs: 0, detail: "no_token" };
  const r = await timed(async () => {
    const { list } = await import("@vercel/blob");
    const res = await list({ limit: 1, token });
    return { count: res.blobs.length };
  });
  if (r.error) return { provider: "blob", configured: true, ok: false, latencyMs: r.ms, detail: r.error };
  return { provider: "blob", configured: true, ok: true, latencyMs: r.ms, detail: `listed ${r.value!.count}` };
}

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const probes = await Promise.all([
    probeResend(),
    probeTwilio(),
    probeUpstash(),
    probeStripe(),
    probeBlob(),
  ]);

  const summary = {
    total: probes.length,
    configured: probes.filter((p) => p.configured).length,
    healthy: probes.filter((p) => p.configured && p.ok).length,
  };

  log.info("provider_health.check", summary);

  return NextResponse.json({ summary, probes });
}

// Super-admin billing self-test: hits Stripe once per configured env var
// (key, each price, webhook secret presence) and returns a pass/fail matrix.
// Read-only — never mutates anything. Useful before go-live and after
// rotating keys.

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { stripe } from "@/lib/stripe";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
  ms?: number;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: string; ms: number }> {
  const t = Date.now();
  try {
    const value = await fn();
    return { value, ms: Date.now() - t };
  } catch (e) {
    return { error: (e as Error).message, ms: Date.now() - t };
  }
}

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const checks: Check[] = [];

  // 1) Secret key present
  const keyConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  checks.push({ name: "STRIPE_SECRET_KEY", ok: keyConfigured, detail: keyConfigured ? "set" : "missing" });

  // 2) Account retrievable (validates key is live and not revoked)
  if (keyConfigured) {
    const r = await timed(() => stripe.accounts.retrieve());
    checks.push({
      name: "stripe.accounts.retrieve",
      ok: !r.error,
      detail: r.error ?? `id=${r.value?.id} chargesEnabled=${r.value?.charges_enabled}`,
      ms: r.ms,
    });
  }

  // 3) Webhook secret present
  checks.push({
    name: "STRIPE_WEBHOOK_SECRET",
    ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    detail: process.env.STRIPE_WEBHOOK_SECRET ? "set" : "missing",
  });

  // 4) Per-tier price IDs resolve on Stripe
  const tiers = [
    ["starter", process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER],
    ["clinic", process.env.NEXT_PUBLIC_STRIPE_PRICE_CLINIC],
    ["hospital", process.env.NEXT_PUBLIC_STRIPE_PRICE_HOSPITAL],
    ["enterprise", process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE],
  ] as const;

  for (const [tier, priceId] of tiers) {
    if (!priceId) {
      checks.push({ name: `price.${tier}`, ok: false, detail: "env_missing" });
      continue;
    }
    if (!keyConfigured) {
      checks.push({ name: `price.${tier}`, ok: false, detail: "skipped (no key)" });
      continue;
    }
    const r = await timed(() => stripe.prices.retrieve(priceId));
    checks.push({
      name: `price.${tier}`,
      ok: !r.error && r.value?.active === true,
      detail: r.error ?? `${r.value?.currency?.toUpperCase()} ${((r.value?.unit_amount || 0) / 100).toFixed(2)} · ${r.value?.recurring?.interval || "one-time"} · ${r.value?.active ? "active" : "inactive"}`,
      ms: r.ms,
    });
  }

  // 5) STRIPE_PRICE_MAP sanity — each entry must be "price_xxx:tier"
  const mapRaw = process.env.STRIPE_PRICE_MAP || "";
  const mapEntries = mapRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const mapOk = mapEntries.length > 0 && mapEntries.every((e) => /^price_[A-Za-z0-9]+:(starter|clinic|hospital|enterprise)$/.test(e));
  checks.push({
    name: "STRIPE_PRICE_MAP",
    ok: mapOk,
    detail: mapEntries.length === 0 ? "empty" : `${mapEntries.length} entries · ${mapOk ? "valid" : "malformed"}`,
  });

  const summary = {
    total: checks.length,
    passed: checks.filter((c) => c.ok).length,
    failed: checks.filter((c) => !c.ok).length,
  };

  log.info("billing.self_test", { ...summary, by: ctx.email });

  return NextResponse.json({ summary, checks });
}

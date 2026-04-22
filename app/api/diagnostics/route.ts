// Super-admin diagnostic endpoint. Reports which external providers are
// configured. Surfaces masked env keys so you can tell "the key is set" vs
// "the key is missing" without leaking secrets.
//
// Requires super-admin. Regular org users get 403.

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { isSmsConfigured } from "@/lib/sms";
import { isBlobConfigured } from "@/lib/blob";
import { isSentryConfigured } from "@/lib/sentry";
import { isRateLimitConfigured } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mask(val: string | undefined): string {
  if (!val) return "—";
  if (val.length <= 8) return "***";
  return `${val.slice(0, 4)}…${val.slice(-4)}`;
}

function hasVar(name: string): boolean {
  const v = process.env[name];
  return Boolean(v && v.trim());
}

export async function GET() {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const resendKey = process.env.RESEND_API_KEY;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  return NextResponse.json({
    providers: {
      postgres: { configured: hasVar("DATABASE_URL") || hasVar("POSTGRES_URL") },
      email: {
        provider: "resend",
        configured: Boolean(resendKey),
        keyMask: mask(resendKey),
      },
      sms: {
        provider: "twilio",
        configured: isSmsConfigured(),
        accountSidMask: mask(twilioSid),
        whatsappConfigured: hasVar("TWILIO_WHATSAPP_FROM"),
      },
      blob: {
        provider: "vercel",
        configured: isBlobConfigured(),
        tokenMask: mask(blobToken),
      },
      stripe: {
        configured: Boolean(stripeSecret),
        keyMask: mask(stripeSecret),
        webhookSecret: hasVar("STRIPE_WEBHOOK_SECRET"),
        prices: {
          starter: hasVar("NEXT_PUBLIC_STRIPE_PRICE_STARTER"),
          clinic: hasVar("NEXT_PUBLIC_STRIPE_PRICE_CLINIC"),
          hospital: hasVar("NEXT_PUBLIC_STRIPE_PRICE_HOSPITAL"),
          enterprise: hasVar("NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE"),
        },
        priceMap: hasVar("STRIPE_PRICE_MAP"),
      },
      sentry: { configured: isSentryConfigured() },
      rateLimit: { provider: "upstash", configured: isRateLimitConfigured() },
    },
    maintenanceMode: process.env.MAINTENANCE_MODE === "1",
    deployment: {
      id: process.env.VERCEL_DEPLOYMENT_ID || null,
      env: process.env.VERCEL_ENV || process.env.NODE_ENV,
      region: process.env.VERCEL_REGION || null,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
    },
    runtime: {
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    },
  });
}

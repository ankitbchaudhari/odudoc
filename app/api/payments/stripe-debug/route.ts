import { NextResponse } from 'next/server';

export const runtime = "nodejs";

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  const results: Record<string, unknown> = {
    keyLen: key.length,
    keyPrefix: key.slice(0, 8),
    node: process.version,
    httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy || null,
    httpProxy: process.env.HTTP_PROXY || process.env.http_proxy || null,
    noProxy: process.env.NO_PROXY || process.env.no_proxy || null,
  };

  // Test 1: raw fetch to api.stripe.com
  try {
    const t0 = Date.now();
    const r = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${key}` },
    });
    const body = await r.text();
    results.rawFetch = {
      ok: r.ok,
      status: r.status,
      ms: Date.now() - t0,
      bodyPreview: body.slice(0, 200),
    };
  } catch (e: unknown) {
    const err = e as { message?: string; cause?: { code?: string; message?: string } };
    results.rawFetch = {
      error: err.message,
      causeCode: err.cause?.code,
      causeMessage: err.cause?.message,
    };
  }

  // Test 2: DNS resolution
  try {
    const dns = await import('node:dns/promises');
    const t0 = Date.now();
    const addrs = await dns.lookup('api.stripe.com', { all: true });
    results.dns = { addrs, ms: Date.now() - t0 };
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string };
    results.dns = { error: err.message, code: err.code };
  }

  return NextResponse.json(results);
}

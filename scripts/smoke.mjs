// Post-deploy smoke test. Hits critical public endpoints and reports any
// that 500 or time out. Does NOT require auth — exercises the surface an
// unauthenticated visitor could reach.
//
// Usage:
//   BASE=https://www.odudoc.com node scripts/smoke.mjs
//   BASE=http://localhost:3000 node scripts/smoke.mjs    (local)

const BASE = process.env.BASE || "https://www.odudoc.com";
const TIMEOUT_MS = 10_000;

// Public endpoints we expect to always succeed with 200 (or documented 3xx/4xx).
const checks = [
  { path: "/", expect: 200 },
  { path: "/corporate", expect: 200 },
  { path: "/auth/login", expect: 200 },
  { path: "/auth/register", expect: 200 },
  { path: "/api/health", expect: [200, 404] },              // if you have one
  { path: "/api/webhooks/stripe", method: "POST", expect: 400 },   // should reject unsigned
  { path: "/api/webhooks/resend", method: "POST", expect: [200, 400, 403] },
  { path: "/api/webhooks/twilio/status", method: "POST", expect: [200, 403] },
  // Tenant routes — should 401/403/redirect, never 500
  { path: "/api/hospital/patients", expect: [401, 403, 302, 307, 308] },
  { path: "/api/hospital/appointments", expect: [401, 403, 302, 307, 308] },
  { path: "/api/hospital/billing/plans", expect: [200, 401, 403] },
  { path: "/hospital", expect: [200, 302, 307, 308] },
  { path: "/admin/super", expect: [200, 302, 307, 308, 401, 403] },
];

const results = [];
for (const c of checks) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  const url = `${BASE}${c.path}`;
  const method = c.method || "GET";
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      redirect: "manual",
      signal: ac.signal,
      headers: method === "POST" ? { "content-type": "application/json" } : {},
      body: method === "POST" ? "{}" : undefined,
    });
    const ms = Date.now() - started;
    const expect = Array.isArray(c.expect) ? c.expect : [c.expect];
    const ok = expect.includes(res.status);
    results.push({ ok, method, path: c.path, status: res.status, ms, expected: c.expect });
  } catch (e) {
    const ms = Date.now() - started;
    results.push({ ok: false, method, path: c.path, error: e.name === "AbortError" ? "timeout" : e.message, ms });
  } finally {
    clearTimeout(t);
  }
}

let failed = 0;
for (const r of results) {
  const tag = r.ok ? "✓" : "✗";
  if (!r.ok) failed++;
  const status = r.error ? r.error : r.status;
  const ms = `${r.ms}ms`.padStart(7);
  console.log(`${tag} ${r.method.padEnd(4)} ${String(status).padEnd(10)} ${ms}  ${r.path}`);
}

console.log(`\n${results.length - failed}/${results.length} passed`);
if (failed > 0) process.exit(1);

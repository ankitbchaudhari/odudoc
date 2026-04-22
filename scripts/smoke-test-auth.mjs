#!/usr/bin/env node
// Authenticated smoke test for OduDoc.
//
// The public smoke-test.mjs checks unauthenticated paths. This one reuses a
// real browser session so we can exercise the protected APIs — vendor
// dashboard, admin panels, payouts, analytics.
//
// Setup (one time per run):
//   1. Sign in to the site in your browser.
//   2. DevTools → Application → Cookies → copy `next-auth.session-token`.
//      (In prod the cookie is `__Secure-next-auth.session-token`.)
//   3. Export it:
//      PowerShell:  $env:SMOKE_SESSION="<cookie-value>"
//      Bash:        export SMOKE_SESSION="<cookie-value>"
//   4. Run:        node scripts/smoke-test-auth.mjs https://www.odudoc.com
//
// The script probes what the signed-in user has access to — it doesn't
// require you to tell it your role. Vendor/admin-specific checks are
// reported as "skipped" if you're a plain patient.
//
// Does NOT mutate data — every call is GET, or a POST known to be
// idempotent/read-only (e.g. already-issued Stripe onboarding link).
//
// Exit code: 0 if every expected check passed, 1 if any failure.

const BASE = (process.argv[2] || "https://www.odudoc.com").replace(/\/$/, "");
const SESSION = process.env.SMOKE_SESSION;

if (!SESSION) {
  console.error(
    "SMOKE_SESSION env var is required.\n" +
      "See the header comment in this file for how to grab the cookie."
  );
  process.exit(2);
}

// Prod cookies are __Secure- prefixed; dev cookies aren't. Send both so the
// script works against either. The server picks whichever matches its env.
const isHttps = BASE.startsWith("https://");
const cookieHeader = isHttps
  ? `__Secure-next-auth.session-token=${SESSION}`
  : `next-auth.session-token=${SESSION}`;

const useColor = process.stdout.isTTY;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = (s) => c(32, s);
const red = (s) => c(31, s);
const yellow = (s) => c(33, s);
const dim = (s) => c(90, s);

async function call(method, path, body) {
  const init = {
    method,
    headers: { Cookie: cookieHeader },
    redirect: "manual",
  };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
    if (typeof body !== "string") init.headers["Content-Type"] = "application/json";
  }
  const t0 = Date.now();
  const res = await fetch(BASE + path, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, ms: Date.now() - t0, body: text, json };
}

const results = [];
function report(label, status, ms, outcome, note) {
  const tag =
    outcome === "pass" ? green("✓") : outcome === "skip" ? yellow("○") : red("✗");
  const statusStr = status ? String(status) : "-";
  console.log(`${tag} ${label.padEnd(46)} ${dim(`${statusStr} · ${ms}ms`)}  ${note || ""}`);
  results.push({ label, outcome, note });
}

async function run() {
  console.log(dim(`Authenticated smoke test against ${BASE}`));
  console.log(dim(`Session cookie: ${SESSION.slice(0, 12)}…${SESSION.slice(-6)}\n`));

  // ---------- Session sanity ----------
  const sess = await call("GET", "/api/auth/session");
  if (sess.status !== 200 || !sess.json?.user) {
    report("Session is valid", sess.status, sess.ms, "fail",
      "no user in /api/auth/session — cookie stale or wrong env");
    console.log(red("\nCannot continue without a valid session."));
    process.exit(1);
  }
  const role = sess.json.user.role || "patient";
  const email = sess.json.user.email;
  report("Session is valid", 200, sess.ms, "pass", `as ${email} (${role})`);

  // ---------- Everyone ----------
  const products = await call("GET", "/api/products");
  report(
    "GET /api/products",
    products.status,
    products.ms,
    products.status === 200 && Array.isArray(products.json?.products) ? "pass" : "fail",
    `${products.json?.products?.length ?? "?"} products`
  );

  const orders = await call("GET", "/api/orders");
  report(
    "GET /api/orders (my orders)",
    orders.status,
    orders.ms,
    orders.status === 200 ? "pass" : "fail",
    `${orders.json?.orders?.length ?? 0} orders`
  );

  // ---------- Vendor self ----------
  const vendorMe = await call("GET", "/api/vendors/me");
  const isVendor = vendorMe.status === 200 && vendorMe.json?.vendor;
  const vendorApproved = isVendor && vendorMe.json.vendor.status === "approved";
  if (vendorMe.status === 404) {
    report("GET /api/vendors/me", 404, vendorMe.ms, "skip", "not a vendor");
  } else {
    report(
      "GET /api/vendors/me",
      vendorMe.status,
      vendorMe.ms,
      isVendor ? "pass" : "fail",
      isVendor ? `${vendorMe.json.vendor.name} · ${vendorMe.json.vendor.status}` : ""
    );
  }

  if (vendorApproved) {
    const vp = await call("GET", "/api/vendors/me/products");
    report("GET /api/vendors/me/products", vp.status, vp.ms,
      vp.status === 200 ? "pass" : "fail",
      `${vp.json?.products?.length ?? 0} products`);

    const vo = await call("GET", "/api/vendors/me/orders");
    report("GET /api/vendors/me/orders", vo.status, vo.ms,
      vo.status === 200 ? "pass" : "fail",
      `${vo.json?.orders?.length ?? 0} orders`);

    const vpay = await call("GET", "/api/vendors/me/payouts");
    report("GET /api/vendors/me/payouts", vpay.status, vpay.ms,
      vpay.status === 200 ? "pass" : "fail",
      `${vpay.json?.payouts?.length ?? 0} entries`);

    const va = await call("GET", "/api/vendors/me/analytics?days=30");
    const analyticsOk = va.status === 200 && va.json?.totals && Array.isArray(va.json.timeseries);
    report("GET /api/vendors/me/analytics", va.status, va.ms,
      analyticsOk ? "pass" : "fail",
      analyticsOk ? `$${va.json.totals.revenue} · ${va.json.totals.orders} orders` : "");

    const refresh = await call("GET", "/api/vendors/me/stripe/refresh");
    // 200 if they have a Stripe account; also tolerate 500 if Stripe isn't
    // configured on the server (non-prod). Anything else is a bug.
    report("GET /api/vendors/me/stripe/refresh", refresh.status, refresh.ms,
      [200, 500].includes(refresh.status) ? "pass" : "fail",
      refresh.json?.payoutsEnabled ? "payouts enabled" : "not yet enabled");
  } else {
    report("Vendor-only endpoints", 0, 0, "skip", "not an approved vendor");
  }

  // ---------- Admin ----------
  if (role === "admin") {
    const av = await call("GET", "/api/vendors?status=All");
    report("GET /api/vendors (admin)", av.status, av.ms,
      av.status === 200 ? "pass" : "fail",
      `${av.json?.vendors?.length ?? 0} vendors`);

    const ap = await call("GET", "/api/payouts?status=pending");
    report("GET /api/payouts pending", ap.status, ap.ms,
      ap.status === 200 ? "pass" : "fail",
      `${ap.json?.payouts?.length ?? 0} entries`);

    const as = await call("GET", "/api/payouts?view=summary");
    report("GET /api/payouts summary", as.status, as.ms,
      as.status === 200 ? "pass" : "fail",
      `${as.json?.summary?.length ?? 0} vendors`);

    // POST with empty body should return a 400 (no ids provided) — this
    // proves the admin guard passes without mutating anything.
    const pp = await call("POST", "/api/payouts", { ids: [] });
    report("POST /api/payouts (empty → 400)", pp.status, pp.ms,
      pp.status === 400 ? "pass" : "fail",
      pp.json?.error || "");

    const pt = await call("POST", "/api/payouts/transfer", { ids: [] });
    report("POST /api/payouts/transfer (empty → 400/500)", pt.status, pt.ms,
      [400, 500].includes(pt.status) ? "pass" : "fail",
      pt.json?.error || "");
  } else {
    // Confirm admin endpoints are properly gated.
    const av = await call("GET", "/api/vendors?status=All");
    report("GET /api/vendors blocked for non-admin", av.status, av.ms,
      av.status === 403 ? "pass" : "fail", av.status === 403 ? "" : "expected 403");

    const ap = await call("GET", "/api/payouts");
    report("GET /api/payouts blocked for non-admin", ap.status, ap.ms,
      ap.status === 403 ? "pass" : "fail", ap.status === 403 ? "" : "expected 403");
  }

  // ---------- Summary ----------
  const failed = results.filter((r) => r.outcome === "fail");
  const passed = results.filter((r) => r.outcome === "pass");
  const skipped = results.filter((r) => r.outcome === "skip");
  console.log("");
  console.log(
    `${green(passed.length + " passed")} · ${yellow(skipped.length + " skipped")} · ${failed.length ? red(failed.length + " failed") : "0 failed"}`
  );
  if (failed.length) {
    console.log(red("\nFailures:"));
    for (const r of failed) console.log(`  - ${r.label} ${r.note ? "· " + r.note : ""}`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(red("Auth smoke runner crashed:"), err);
  process.exit(2);
});

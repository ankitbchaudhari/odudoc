#!/usr/bin/env node
// Public-surface smoke test for OduDoc.
//
// Walks through the GET endpoints and pages a user or a bot would hit without
// auth, plus a handful of POST endpoints that should reject unauthenticated
// calls with a 401/403. Does NOT mutate any real data.
//
// Usage:
//   node scripts/smoke-test.mjs [base-url]
//   node scripts/smoke-test.mjs https://www.odudoc.com
//   node scripts/smoke-test.mjs http://localhost:3000
//
// Exit code: 0 if every check passed, 1 otherwise.

const BASE = (process.argv[2] || "https://www.odudoc.com").replace(/\/$/, "");

// ANSI colors — degrade gracefully when piped.
const useColor = process.stdout.isTTY;
const c = (code, s) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = (s) => c(32, s);
const red = (s) => c(31, s);
const yellow = (s) => c(33, s);
const dim = (s) => c(90, s);

/**
 * @typedef {Object} Check
 * @property {string} name
 * @property {string} method
 * @property {string} path
 * @property {number | number[]} expect      HTTP status(es) that count as OK
 * @property {(body: string, res: Response) => string | null} [assert]
 *           Optional content-level assertion. Return null for pass, string for fail reason.
 * @property {any} [body]                    JSON body for POST
 */

/** @type {Check[]} */
const checks = [
  // ---------- Public pages (HTML) ----------
  { name: "Home", method: "GET", path: "/", expect: 200, assert: html("OduDoc") },
  { name: "About", method: "GET", path: "/about", expect: 200, assert: html("Leadership Team") },
  { name: "Shop", method: "GET", path: "/shop", expect: 200, assert: html("Shop") },
  { name: "Cart", method: "GET", path: "/cart", expect: 200 },
  { name: "Checkout", method: "GET", path: "/checkout", expect: 200 },
  { name: "Sell / vendor signup", method: "GET", path: "/sell", expect: 200 },
  { name: "Blog index", method: "GET", path: "/blog", expect: 200 },
  { name: "Careers", method: "GET", path: "/careers", expect: 200 },
  { name: "Contact", method: "GET", path: "/contact", expect: 200 },
  { name: "Help", method: "GET", path: "/help", expect: 200 },
  { name: "Privacy", method: "GET", path: "/privacy", expect: 200 },
  { name: "Find Doctors", method: "GET", path: "/doctors", expect: 200 },
  { name: "Login page", method: "GET", path: "/auth/login", expect: 200 },

  // ---------- Public APIs ----------
  {
    name: "API: /api/products",
    method: "GET",
    path: "/api/products",
    expect: 200,
    assert: json((d) => (Array.isArray(d.products) ? null : "expected {products:[]}")),
  },

  // ---------- Auth-gated APIs should 401/403 without a session ----------
  { name: "Guard: /api/orders (GET)", method: "GET", path: "/api/orders", expect: [401, 403] },
  { name: "Guard: /api/vendors/me", method: "GET", path: "/api/vendors/me", expect: [401, 403, 404] },
  { name: "Guard: /api/vendors/me/orders", method: "GET", path: "/api/vendors/me/orders", expect: [401, 403, 404] },
  { name: "Guard: /api/vendors/me/payouts", method: "GET", path: "/api/vendors/me/payouts", expect: [401, 403, 404] },
  { name: "Guard: /api/vendors/me/analytics", method: "GET", path: "/api/vendors/me/analytics", expect: [401, 403, 404] },
  { name: "Guard: /api/payouts (admin)", method: "GET", path: "/api/payouts", expect: [401, 403] },
  { name: "Guard: /api/vendors (admin)", method: "GET", path: "/api/vendors", expect: [401, 403] },

  // ---------- Upload endpoints: wrong method / no body should fail gracefully ----------
  {
    name: "Rx upload rejects non-multipart",
    method: "POST",
    path: "/api/prescriptions/upload",
    expect: [400, 401, 403, 415],
  },
  {
    name: "Stripe onboard rejects unauth",
    method: "POST",
    path: "/api/vendors/me/stripe/onboard",
    expect: [401, 403, 404],
  },
  {
    name: "Stripe Connect webhook rejects missing signature",
    method: "POST",
    path: "/api/webhooks/stripe-connect",
    expect: [400],
    body: { fake: true },
  },

  // ---------- 404 sanity ----------
  { name: "404 for unknown route", method: "GET", path: "/definitely-does-not-exist-xyz", expect: 404 },
];

function html(needle) {
  return (body) =>
    body.toLowerCase().includes(needle.toLowerCase())
      ? null
      : `response HTML missing "${needle}"`;
}

function json(fn) {
  return (body) => {
    try {
      return fn(JSON.parse(body));
    } catch (e) {
      return `invalid JSON: ${e.message}`;
    }
  };
}

function statusOk(status, expect) {
  return Array.isArray(expect) ? expect.includes(status) : status === expect;
}

async function run() {
  console.log(dim(`Smoke test against ${BASE}\n`));

  const results = [];
  const started = Date.now();

  for (const check of checks) {
    const url = BASE + check.path;
    const init = { method: check.method, headers: {} };
    if (check.body !== undefined) {
      init.body = JSON.stringify(check.body);
      init.headers["Content-Type"] = "application/json";
    }

    const t0 = Date.now();
    let status = 0;
    let body = "";
    let err = null;
    try {
      const res = await fetch(url, init);
      status = res.status;
      body = await res.text();
      if (statusOk(status, check.expect)) {
        if (check.assert) {
          const why = check.assert(body, res);
          if (why) err = why;
        }
      } else {
        const expectStr = Array.isArray(check.expect) ? check.expect.join("|") : check.expect;
        err = `expected ${expectStr}, got ${status}`;
      }
    } catch (e) {
      err = `network: ${e.message}`;
    }
    const ms = Date.now() - t0;
    results.push({ check, ms, status, err });

    const label = `${check.method.padEnd(4)} ${check.path}`.padEnd(50);
    if (!err) {
      console.log(`${green("✓")} ${label} ${dim(`${status} · ${ms}ms`)}  ${check.name}`);
    } else {
      console.log(`${red("✗")} ${label} ${dim(`${status || "-"} · ${ms}ms`)}  ${check.name}`);
      console.log(`    ${red(err)}`);
      if (body && body.length < 200 && !body.startsWith("<")) {
        console.log(`    ${dim(body.trim())}`);
      }
    }
  }

  const took = Date.now() - started;
  const failed = results.filter((r) => r.err);
  console.log("");
  console.log(
    `${results.length - failed.length}/${results.length} passed ${dim(`(${took}ms total)`)}`
  );

  if (failed.length) {
    console.log(red(`\n${failed.length} failure(s):`));
    for (const r of failed) {
      console.log(`  - [${r.check.method} ${r.check.path}] ${r.err}`);
    }
    process.exit(1);
  } else {
    console.log(green("All smoke checks passed."));
  }
}

run().catch((err) => {
  console.error(red("Smoke runner crashed:"), err);
  process.exit(2);
});

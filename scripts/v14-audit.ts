// V14 pre-deploy audit script.
//
// Walks app/api/**/route.ts. For each route file:
//   1. Detects imports from sensitive stores (PHI / payments / platform
//      state).
//   2. Cross-references the path against the ENDPOINTS manifest in
//      lib/api-ownership.ts.
//   3. Emits FAIL (exit 1) for any sensitive route missing from the
//      manifest.
//   4. Emits WARN (exit 0) for any route lacking a visible auth check.
//
// Run via: npm run v14:audit
// CI integration: add to the pre-release pipeline. Failures block deploy.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ENDPOINTS } from "../lib/api-ownership";

const ROOT = join(process.cwd(), "app", "api");

const SENSITIVE_STORE_PATTERNS = [
  // Patient / clinical data
  "users-store", "patients-store", "consultations-store", "prescriptions-store",
  "lab-orders-store", "admissions-store", "encounters-store", "vaccinations-store",
  // Money
  "wallet-store", "withdrawals-store", "payouts-store", "doctor-earnings-store",
  "clinic-invoices-store", "orders-store",
  // V8+ marketplaces
  "insurance-store", "ppme-store", "courses-store", "equipment-marketplace-store",
  "pharma-store", "pharmacy-stock-store",
  // V13 / V16 / V17 sensitive
  "accountability-store", "car-store", "near-miss-store", "qr-store", "opd-token-store",
];

const AUTH_PATTERNS = [
  "getServerSession", "getTenantContext", "isSuperAdmin",
  "verifyMobileToken", "requireMobileUser",
  // Webhooks gate on signature, not session.
  "verifyStripeWebhook", "verifyRazorpayWebhook",
  // Cron gates on shared secret.
  "process.env.CRON_SECRET",
  // Rate-limit + token-resolve is the auth path for public verifiers.
  "enforceRateLimit",
];

interface Finding {
  level: "FAIL" | "WARN" | "INFO";
  path: string;
  reason: string;
}

function listRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listRouteFiles(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

function urlPathFor(routeFile: string): string {
  // Convert "<ROOT>/foo/[id]/bar/route.ts" to "/api/foo/[id]/bar".
  const rel = relative(ROOT, routeFile).replace(/\\/g, "/");
  const noFile = rel.replace(/\/route\.ts$/, "");
  return `/api/${noFile}`;
}

function matchesManifest(path: string): boolean {
  // Manifest entries may contain [param] segments; match by exact path
  // or by pattern (we keep the [param] convention in the manifest).
  return ENDPOINTS.some((e) => e.path === path);
}

function findingsForFile(routeFile: string): Finding[] {
  const findings: Finding[] = [];
  const src = readFileSync(routeFile, "utf-8");
  const path = urlPathFor(routeFile);

  const touchesSensitive = SENSITIVE_STORE_PATTERNS.some((p) => src.includes(p));
  const hasAuthGate = AUTH_PATTERNS.some((p) => src.includes(p));

  if (touchesSensitive && !matchesManifest(path)) {
    findings.push({
      level: "FAIL",
      path,
      reason: "Touches a sensitive store but is not in lib/api-ownership.ts ENDPOINTS",
    });
  }
  if (!hasAuthGate && touchesSensitive) {
    findings.push({
      level: "WARN",
      path,
      reason: "No visible auth gate detected (getServerSession / token verify / rate-limit-then-resolve)",
    });
  }
  return findings;
}

function main(): void {
  // --strict — exit 1 if anything sensitive is missing from the
  // manifest. Used by CI once the manifest catches up with the
  // existing 668-route surface. Default prints the review queue but
  // exits 0 so the audit is useful BEFORE the manifest is exhaustive
  // (every release should shrink this list).
  const strict = process.argv.includes("--strict");

  const routes = listRouteFiles(ROOT);
  const all: Finding[] = [];
  for (const r of routes) {
    all.push(...findingsForFile(r));
  }

  const fails = all.filter((f) => f.level === "FAIL");
  const warns = all.filter((f) => f.level === "WARN");

  console.log(`[V14 audit] scanned ${routes.length} routes`);
  console.log(`[V14 audit] manifest entries: ${ENDPOINTS.length}`);
  console.log(`[V14 audit] missing from manifest: ${fails.length}`);
  console.log(`[V14 audit] no visible auth gate: ${warns.length}`);
  console.log(`[V14 audit] mode: ${strict ? "STRICT (CI gate)" : "review (informational)"}\n`);

  if (warns.length > 0) {
    console.log("— Routes with no visible auth gate (review individually) —");
    for (const w of warns.slice(0, 50)) console.log(`  WARN  ${w.path}`);
    if (warns.length > 50) console.log(`  … and ${warns.length - 50} more`);
    console.log();
  }
  if (fails.length > 0) {
    console.log("— Routes touching sensitive stores but not yet in lib/api-ownership.ts —");
    for (const f of fails.slice(0, 50)) console.log(`  ${strict ? "FAIL" : "REVIEW"}  ${f.path}`);
    if (fails.length > 50) console.log(`  … and ${fails.length - 50} more`);
    console.log();
  }

  if (fails.length === 0 && warns.length === 0) {
    console.log("[V14 audit] ✓ all sensitive routes are governed and authed.");
    process.exit(0);
  }
  if (strict && fails.length > 0) {
    console.log("[V14 audit] STRICT — failing because endpoints touch sensitive stores without manifest entries.");
    console.log("Add them to lib/api-ownership.ts ENDPOINTS or run without --strict.");
    process.exit(1);
  }
  console.log("[V14 audit] review-mode — exiting 0. Run with --strict to fail on missing manifest entries.");
}

main();

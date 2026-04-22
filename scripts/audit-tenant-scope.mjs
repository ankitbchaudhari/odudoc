// Scan hospital stores for likely tenant-leak bugs.
//
// Heuristic: any .filter / .find / .findIndex / .some / .every / .map /
// .reduce callback that inspects a field but never touches organizationId
// in the same expression could be returning data across tenants.
//
// We're deliberately noisy — flag false positives and review them. Better to
// hand-eyeball 200 safe matches than miss 1 real leak.

import fs from "node:fs";
import path from "node:path";

const STORE_DIRS = [path.resolve("lib/hospital"), path.resolve("lib")];
const SKIP_FILES = new Set([
  "persistent-array.ts", "audit.ts", "tenant.ts", "auth.ts", "db.ts",
  "email.ts", "sms.ts", "blob.ts", "sentry.ts", "rate-limit.ts",
  "rate-limit-helpers.ts", "stripe.ts", "i18n.ts", "data.ts",
  "auth-context.tsx", "cart-context.tsx", "language-context.tsx",
  "countries.ts",
]);

const findings = [];

function scanFile(file) {
  if (!file.endsWith(".ts")) return;
  const base = path.basename(file);
  if (SKIP_FILES.has(base)) return;
  const src = fs.readFileSync(file, "utf8");
  // Skip files that don't even have an organizationId field — not tenant-scoped yet.
  if (!src.includes("organizationId")) return;

  const lines = src.split("\n");
  const arrayMethodRe = /\.(filter|find|findIndex|some|every|map|reduce)\s*\(/;

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (!arrayMethodRe.test(ln)) continue;
    // Only consider lines that actually compare a field of the iteratee
    // (i.e. there's a `.organizationId` or a bare id field access).
    // Look at the next 3 lines for the callback body.
    const chunk = lines.slice(i, i + 4).join(" ");
    if (!/=>/.test(chunk) && !/function/.test(chunk)) continue;
    if (/organizationId/.test(chunk)) continue;           // good — scoped
    if (/\.slice\(|\.sort\(|\.reduce\(/.test(ln) && !/=>/.test(ln)) continue; // noise
    // Detect common patterns that strongly suggest tenant scope is missing:
    // .filter((r) => r.something === ...) with no orgId anywhere in the callback
    findings.push({
      file: path.relative(process.cwd(), file),
      line: i + 1,
      code: ln.trim().slice(0, 140),
    });
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else scanFile(full);
  }
}

for (const d of STORE_DIRS) if (fs.existsSync(d)) walk(d);

// Report
console.log(`Tenant-scope audit: ${findings.length} suspicious callsites`);
console.log("=".repeat(80));
const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}
for (const [file, hits] of byFile) {
  console.log(`\n${file}  (${hits.length})`);
  for (const h of hits.slice(0, 10)) console.log(`  L${h.line}: ${h.code}`);
  if (hits.length > 10) console.log(`  … ${hits.length - 10} more`);
}

fs.writeFileSync(
  path.resolve("scripts/tenant-scope-report.json"),
  JSON.stringify(findings, null, 2),
);
console.log(`\nFull report: scripts/tenant-scope-report.json`);

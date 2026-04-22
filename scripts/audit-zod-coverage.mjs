// Scans hospital route handlers and flags mutating routes (POST/PUT/PATCH)
// that consume req.json() WITHOUT running it through parseJson(... Schema).
// Writes a JSON report to scripts/zod-coverage-report.json.

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "E:/odudoc/app/api/hospital";
const report = { total: 0, validated: 0, unvalidated: [], noBody: 0 };

async function walk(dir) {
  for (const name of await readdir(dir)) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) { await walk(p); continue; }
    if (!p.endsWith("route.ts")) continue;
    const src = await readFile(p, "utf8");
    // Consider every mutating method in this file.
    const mutators = src.match(/export async function (POST|PUT|PATCH)\b/g) || [];
    if (mutators.length === 0) continue;

    const usesParseJson = /parseJson\(\s*(?:req|request)\s*,/.test(src);
    const readsBodyRaw = /(req|request)\.json\(\)/.test(src) && !usesParseJson;
    if (!usesParseJson && !readsBodyRaw) { report.noBody++; continue; }

    report.total++;
    if (usesParseJson) report.validated++;
    else report.unvalidated.push(p.replace(/\\/g, "/"));
  }
}

await walk(ROOT);
await writeFile("E:/odudoc/scripts/zod-coverage-report.json", JSON.stringify(report, null, 2));
console.log(`zod-coverage: ${report.validated}/${report.total} routes validated (${Math.round(report.validated / Math.max(1, report.total) * 100)}%) · ${report.unvalidated.length} unvalidated · ${report.noBody} no-body`);

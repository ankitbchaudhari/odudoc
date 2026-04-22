// Pass `req` to requireActiveBilling() so CSRF origin check runs on all
// mutating hospital routes. Only touches files whose handler parameter
// is named `req` (the 99-route convention).

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const ROOT = "E:/odudoc/app/api/hospital";
let changed = 0;
let skipped = 0;

async function walk(dir) {
  const entries = await readdir(dir);
  for (const name of entries) {
    const p = join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) { await walk(p); continue; }
    if (!p.endsWith("route.ts")) continue;

    const src = await readFile(p, "utf8");
    if (!src.includes("requireActiveBilling()")) continue;
    if (!/\((?:\s*req\s*:\s*NextRequest[^)]*|\s*req\s*:[^)]+)\)/.test(src)) {
      // Handler doesn't name the param `req` — leave alone.
      skipped++;
      continue;
    }
    const next = src.replace(/requireActiveBilling\(\)/g, "requireActiveBilling(req)");
    if (next !== src) {
      await writeFile(p, next);
      changed++;
    }
  }
}

await walk(ROOT);
console.log(`wire-csrf: modified ${changed} files, skipped ${skipped}`);

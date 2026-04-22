// Ensure every hospital API route that calls requireActiveBilling also
// imports it from @/lib/tenant.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("app/api/hospital");
const SKIP_DIRS = new Set(["billing", "audit-log"]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!SKIP_DIRS.has(entry.name)) out.push(...walk(full)); }
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

let modified = 0;
for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("requireActiveBilling")) continue;
  const importRe = /import\s*\{\s*([^}]+?)\s*\}\s*from\s*"@\/lib\/tenant"\s*;/;
  const m = src.match(importRe);
  if (!m) continue;
  const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
  if (names.includes("requireActiveBilling")) continue;
  names.push("requireActiveBilling");
  const rebuilt = `import { ${names.join(", ")} } from "@/lib/tenant";`;
  src = src.replace(importRe, rebuilt);
  fs.writeFileSync(file, src, "utf8");
  modified++;
}
console.log(`Fixed imports in ${modified} files.`);

// One-shot script: in every hospital API route, swap `requireOrg()` calls
// inside POST/PATCH/PUT/DELETE handlers for `requireActiveBilling()` and
// import it. GET handlers stay on `requireOrg()` (read-only is always
// allowed, even for past_due orgs).
//
// Skips:
//   - app/api/hospital/billing/**  (these ARE the billing endpoints)
//   - app/api/hospital/audit-log/** (read-only anyway)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("app/api/hospital");
const SKIP_DIRS = new Set(["billing", "audit-log"]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      out.push(...walk(full));
    } else if (entry.name === "route.ts") {
      out.push(full);
    }
  }
  return out;
}

let modified = 0;
for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, "utf8");
  const orig = src;

  // Parse blocks: find each "export async function (POST|PATCH|PUT|DELETE)" up to the matching handler end.
  const re = /export async function (POST|PATCH|PUT|DELETE)\s*\(/g;
  let match;
  const handlerStarts = [];
  while ((match = re.exec(src))) handlerStarts.push(match.index);
  if (handlerStarts.length === 0) continue;

  // For each mutation handler, locate its body and swap requireOrg() -> requireActiveBilling()
  // We do this by walking braces starting from the opening brace of the function.
  const mutationRanges = [];
  for (const start of handlerStarts) {
    const openBrace = src.indexOf("{", start);
    if (openBrace === -1) continue;
    let depth = 0;
    let i = openBrace;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") { depth--; if (depth === 0) { i++; break; } }
    }
    mutationRanges.push([openBrace, i]);
  }

  // Rewrite range-by-range, last-first so offsets stay valid
  mutationRanges.sort((a, b) => b[0] - a[0]);
  for (const [s, e] of mutationRanges) {
    const block = src.slice(s, e);
    const replaced = block.replace(/requireOrg\(\)/g, "requireActiveBilling()");
    if (replaced !== block) {
      src = src.slice(0, s) + replaced + src.slice(e);
    }
  }

  if (src !== orig) {
    // Ensure requireActiveBilling is imported
    if (!src.includes("requireActiveBilling")) {
      src = src.replace(
        /from "@\/lib\/tenant";/,
        (m) => m, // placeholder
      );
      src = src.replace(
        /import\s*\{([^}]*)\}\s*from\s*"@\/lib\/tenant";/,
        (_m, names) => {
          const list = names.split(",").map((s) => s.trim()).filter(Boolean);
          if (!list.includes("requireActiveBilling")) list.push("requireActiveBilling");
          return `import { ${list.join(", ")} } from "@/lib/tenant";`;
        },
      );
    }
    fs.writeFileSync(file, src, "utf8");
    modified++;
    console.log("updated", path.relative(process.cwd(), file));
  }
}

console.log(`Modified ${modified} files.`);

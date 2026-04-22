// One-shot: in every hospital API POST/PATCH/PUT/DELETE handler, inject a
// generic audit() call at the top of the try block so we always get a row
// saying "user X did action Y on module Z" even if the per-route logic
// doesn't bother. The route can still call audit() again with more detail.
//
// Strategy: we DON'T parse — we just add a line right after the
// `const { ctx, orgId } = await requireActiveBilling();` pattern, or after
// `const { orgId } = await requireActiveBilling();` by destructuring ctx too.

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

function moduleNameFor(file) {
  // .../app/api/hospital/<module>/[more]/route.ts → <module>
  const rel = path.relative(path.resolve("app/api/hospital"), file).replace(/\\/g, "/");
  return rel.split("/")[0];
}

let modified = 0;
for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, "utf8");
  const orig = src;
  const mod = moduleNameFor(file);

  // Walk handlers: POST/PATCH/PUT/DELETE
  const re = /export async function (POST|PATCH|PUT|DELETE)\s*\(/g;
  const actionByMethod = { POST: "create", PATCH: "update", PUT: "update", DELETE: "delete" };
  let m;
  const edits = []; // {at, insert}
  while ((m = re.exec(src))) {
    const method = m[1];
    const handlerStart = m.index;
    const openBrace = src.indexOf("{", handlerStart);
    if (openBrace === -1) continue;
    // Find end of body
    let depth = 0;
    let i = openBrace;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") { depth--; if (depth === 0) { i++; break; } }
    }
    const body = src.slice(openBrace, i);

    // Skip if this handler already has an audit() call
    if (/\baudit\s*\(/.test(body)) continue;

    // Must use requireActiveBilling and destructure orgId
    // Look for lines of shape:
    //   const { ctx, orgId } = await requireActiveBilling();
    //   const { orgId, ctx } = await requireActiveBilling();
    //   const { orgId } = await requireActiveBilling();
    const destructRe = /const\s*\{\s*([^}]+)\s*\}\s*=\s*await\s+requireActiveBilling\(\);/;
    const dm = body.match(destructRe);
    if (!dm) continue;
    const bindings = dm[1].split(",").map((s) => s.trim()).filter(Boolean);

    // Ensure ctx is destructured (rewrite if needed)
    let newDestruct = null;
    if (!bindings.includes("ctx")) {
      const newBindings = ["ctx", ...bindings];
      newDestruct = `const { ${newBindings.join(", ")} } = await requireActiveBilling();`;
    }

    // Find insertion point: right after the destructure line
    const lineStart = openBrace + body.indexOf(dm[0]);
    const lineEnd = lineStart + dm[0].length;

    if (newDestruct) {
      edits.push({ at: lineStart, length: dm[0].length, insert: newDestruct });
    }

    const audit = `\n    audit(ctx, { action: "${actionByMethod[method]}", entityType: "${mod}", module: "${mod}" });`;
    edits.push({ at: lineEnd, length: 0, insert: audit });
  }

  if (edits.length === 0) continue;

  edits.sort((a, b) => b.at - a.at);
  for (const e of edits) {
    src = src.slice(0, e.at) + e.insert + src.slice(e.at + e.length);
  }

  // Ensure audit is imported
  if (!/from "@\/lib\/audit"/.test(src)) {
    // insert after the tenant import line
    src = src.replace(
      /(import[^;]+from\s*"@\/lib\/tenant";)/,
      `$1\nimport { audit } from "@/lib/audit";`,
    );
  }

  if (src !== orig) {
    fs.writeFileSync(file, src, "utf8");
    modified++;
  }
}

console.log(`Audit-instrumented ${modified} files.`);

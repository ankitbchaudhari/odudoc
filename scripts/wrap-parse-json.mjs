// Wraps `const body = await req.json()` (and request.json variants) with
// parseJson() + a permissive z.record(z.any()) schema, so malformed JSON
// returns 400 instead of a 500 with a stack. Only touches files that are
// in the zod-coverage-report's "unvalidated" list.
//
// This is NOT real per-field validation — it's a safety net. Each route
// can later be upgraded to a real schema by the feature author who knows
// the correct field types.

import { readFile, writeFile } from "node:fs/promises";

const REPORT = JSON.parse(await readFile("E:/odudoc/scripts/zod-coverage-report.json", "utf8"));
const files = REPORT.unvalidated;
let modified = 0;
const skipped = [];

const BODY_RE = /(const|let)\s+(\w+)\s*=\s*await\s+(req|request)\.json\(\)\s*;/g;

for (const file of files) {
  let src = await readFile(file, "utf8");

  // 1. Ensure import has parseJson + z.
  const validateImport = /import\s*\{([^}]*)\}\s*from\s*["']@\/lib\/validate["'];?/;
  const m = src.match(validateImport);
  const needs = ["parseJson", "z"];
  if (m) {
    const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    const toAdd = needs.filter((n) => !names.includes(n));
    if (toAdd.length > 0) {
      const merged = [...names, ...toAdd].join(", ");
      src = src.replace(validateImport, `import { ${merged} } from "@/lib/validate";`);
    }
  } else {
    // Insert after the first import block.
    const lastImport = [...src.matchAll(/^import[^;]+;\s*$/gm)].pop();
    if (!lastImport) { skipped.push([file, "no_imports"]); continue; }
    const pos = lastImport.index + lastImport[0].length;
    src = src.slice(0, pos) + `\nimport { parseJson, z } from "@/lib/validate";` + src.slice(pos);
  }

  // 2. Replace each `const body = await req.json();` site.
  let replaced = 0;
  src = src.replace(BODY_RE, (_match, kind, name, reqName) => {
    replaced++;
    return `const __parsed_${replaced} = await parseJson(${reqName}, z.record(z.any()));\n    if (__parsed_${replaced} instanceof NextResponse) return __parsed_${replaced};\n    ${kind} ${name}: Record<string, any> = __parsed_${replaced};`;
  });

  if (replaced === 0) { skipped.push([file, "no_body_match"]); continue; }
  await writeFile(file, src);
  modified++;
}

console.log(`wrap-parse-json: modified ${modified} files · skipped ${skipped.length}`);
if (skipped.length > 0) {
  console.log("Skipped:");
  for (const [f, why] of skipped.slice(0, 10)) console.log(`  ${why.padEnd(16)} ${f}`);
}

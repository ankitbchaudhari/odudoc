// Make every `unlink*ForPatient` function trigger a persistent-array flush
// by appending a no-op splice call before its closing brace. Our wrapped
// splice method auto-flushes — this guarantees the in-place mutations above
// it hit the DB even though direct property assignments don't auto-flush.
//
// Strategy: find each `export function unlink...ForPatient(...)` header, walk
// brace depth to locate the function's closing brace, and insert
// `  ARR.splice(ARR.length, 0);\n` immediately before it. We detect ARR by
// scanning the body for `for (const X of ARR)` or `for (let i = 0; i < ARR.length; i++)`.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("lib/hospital");

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

let modified = 0;
for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, "utf8");
  if (!/unlink\w*ForPatient/.test(src)) continue;

  const headerRe = /export\s+function\s+unlink\w*ForPatient\s*\([^)]*\)\s*:\s*\w+\s*\{/g;
  const edits = [];
  let m;
  while ((m = headerRe.exec(src))) {
    const openBrace = m.index + m[0].length - 1;
    // Walk to closing brace
    let depth = 0;
    let i = openBrace;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) break; }
      else if (c === '/' && src[i + 1] === '/') {
        while (i < src.length && src[i] !== '\n') i++;
      } else if (c === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i += 1;
      } else if (c === '"' || c === "'" || c === '`') {
        const quote = c;
        i++;
        while (i < src.length) {
          if (src[i] === '\\') { i += 2; continue; }
          if (src[i] === quote) break;
          if (quote === '`' && src[i] === '$' && src[i + 1] === '{') {
            // Skip template expression — recurse on braces
            let td = 1; i += 2;
            while (i < src.length && td > 0) {
              if (src[i] === '{') td++;
              else if (src[i] === '}') td--;
              i++;
            }
            continue;
          }
          i++;
        }
      }
    }
    const closeBrace = i;
    const body = src.slice(openBrace + 1, closeBrace);

    // Skip if an explicit flush-trigger was already added
    if (/\/\/ flush:auto-unlink/.test(body)) continue;

    // Find the store array name referenced by a for-loop in the body
    let arrName = null;
    let mm;
    const forOfRe = /for\s*\(\s*const\s+\w+\s+of\s+(\w+)\s*\)/g;
    while ((mm = forOfRe.exec(body))) { arrName = mm[1]; break; }
    if (!arrName) {
      const forIRe = /for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*(\w+)\.length/g;
      while ((mm = forIRe.exec(body))) { arrName = mm[1]; break; }
    }
    if (!arrName) continue;

    // Compute indentation of the closing brace line for tidy insertion
    const lineStart = src.lastIndexOf('\n', closeBrace) + 1;
    const indent = src.slice(lineStart, closeBrace).match(/^\s*/)[0];
    const insert = `${indent}  // flush:auto-unlink\n${indent}  ${arrName}.splice(${arrName}.length, 0);\n`;
    edits.push({ at: closeBrace, insert });
  }

  if (edits.length === 0) continue;
  edits.sort((a, b) => b.at - a.at);
  for (const e of edits) src = src.slice(0, e.at) + e.insert + src.slice(e.at);
  fs.writeFileSync(file, src, "utf8");
  modified++;
  console.log(`${path.relative(process.cwd(), file)} +${edits.length}`);
}
console.log(`\nDone. Modified ${modified} files.`);

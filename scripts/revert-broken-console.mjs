// Reverse the migrate-console.mjs transform for files that broke typecheck.
// Restores the original console.* call form.
import { readFile, writeFile } from "node:fs/promises";

const files = [
  "app/api/admin/doctor-applications/route.ts",
  "app/api/bookings/free/route.ts",
  "app/api/careers/applications/route.ts",
  "app/api/doctors/register/route.ts",
  "app/api/orders/[id]/route.ts",
  "app/api/orders/route.ts",
  "app/api/payments/induspays/webhook/route.ts",
  "app/api/referrals/notify/route.ts",
  "app/api/vendors/[id]/status/route.ts",
  "app/api/vendors/route.ts",
  "app/api/withdrawals/[id]/route.ts",
];

for (const f of files) {
  let s = await readFile(f, "utf8");
  const before = s;
  // log.error("[...] msg:", err); form (single-line) → console.error(...)
  // For broken files the migration got as far as log.error("...:",err); but broke outer closers.
  // We only revert migrations that still carry the marker strings (indicating incomplete restoration).
  // Simpler: revert ALL log.X that look like migrated console forms in these files.

  // The migrated shape (even when broken): log.LEVEL("console.X", ...arg-list... );
  // In broken cases, arg-list contains a `)` from outer caller + stray `]`/`}`.
  //
  // We restore by finding `log.LEVEL("console.X",` and the matching close,
  // capturing the inner args, and re-emitting `console.X(ARGS)`.

  s = restoreCalls(s);

  if (s !== before) { await writeFile(f, s); console.log("reverted", f); }
  else console.log("no-change", f);
}

function restoreCalls(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const m = src.slice(i).match(/log\.(error|warn|info)\("console\.(error|warn|log|info)",/);
    if (!m) { out.push(src.slice(i)); break; }
    const start = i + m.index;
    out.push(src.slice(i, start));
    // Find matching `);` — walk forward counting parens / brackets / braces, tracking strings.
    let j = start + m[0].length;
    let depth = 1; // we're inside the log.LEVEL( ... ) call
    let inStr = null;
    while (j < src.length && depth > 0) {
      const c = src[j];
      if (inStr) {
        if (c === "\\" && j + 1 < src.length) { j += 2; continue; }
        if (c === inStr) inStr = null;
        j++; continue;
      }
      if (c === '"' || c === "'" || c === "`") { inStr = c; j++; continue; }
      if (c === "(" || c === "[" || c === "{") { depth++; j++; continue; }
      if (c === ")" || c === "]" || c === "}") { depth--; j++; if (depth === 0) break; continue; }
      j++;
    }
    // j points just after the closing ) of log.LEVEL(...)
    const callText = src.slice(start, j);
    // Extract the arguments after "console.X",
    // Find the first top-level comma after the leading "console.X" marker.
    const head = callText.indexOf('",');
    let rest = callText.slice(head + 2, -1); // drop trailing )
    // If error form: strip leading `undefined,` then `{ args: [ ... ] }`
    // If warn/info form: strip leading `{ args: [ ... ] }`
    const origLevel = m[2]; // "error"|"warn"|"log"|"info"
    // Unwrap { args: [ X ] } → X (may have stray extras from original breakage)
    const argMatch = rest.match(/\{\s*args:\s*\[([\s\S]*)\]\s*\}\s*$/);
    let argsInner;
    if (argMatch) argsInner = argMatch[1];
    else {
      // fall back: just keep rest
      argsInner = rest;
    }
    // Trim
    argsInner = argsInner.trim();
    // Trim trailing `)` that may have been captured from original outer call
    // (and matching closer elsewhere). We preserve as-is to restore original.
    // Consume trailing `; ` from captured
    // Emit `console.X(ARGS)` WITHOUT trailing semicolon — we'll re-add based on what followed.
    // If the original call ended with `;` it was part of what we consumed in `)` loop; but
    // our loop broke on depth===0, so we only consumed up to and including the matching `)`.
    // Check if next char is `;` and include it.
    let tail = "";
    if (src[j] === ";") { tail = ";"; j++; }
    const restored = `console.${origLevel}(${argsInner})${tail}`;
    out.push(restored);
    i = j;
  }
  return out.join("");
}

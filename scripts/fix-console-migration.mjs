// Fix the multi-line breakages from migrate-console.mjs.
// Pattern to fix: ...log.LEVEL("console.X", [undefined,]? { args: [ARGS) NEWLINES ] });
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

// Matches error: log.error("console.error", undefined, { args: [...) \n... ] });
const errPat = /log\.error\("console\.error",\s*undefined,\s*\{\s*args:\s*\[([\s\S]*?)\)\s*\n[\s\S]*?\]\s*\}\);/g;
// warn/info/log: log.LEVEL("console.X", { args: [...) \n... ] });
const wiPat = /log\.(warn|info)\("console\.(?:warn|log|info)",\s*\{\s*args:\s*\[([\s\S]*?)\)\s*\n[\s\S]*?\]\s*\}\);/g;

for (const f of files) {
  let s = await readFile(f, "utf8");
  const before = s;
  s = s.replace(errPat, (_m, args) => {
    const parts = splitTop(args);
    const msg = parts[0]?.trim() || '"error"';
    const err = parts[1]?.trim();
    const rest = parts.slice(2).map(x => x.trim()).filter(Boolean);
    const tail = rest.length ? `, { extra: [${rest.join(", ")}] }` : "";
    return `log.error(${msg}, ${err || "undefined"}${tail});`;
  });
  s = s.replace(wiPat, (_m, lvl, args) => {
    const parts = splitTop(args);
    const msg = parts[0]?.trim() || '"event"';
    const rest = parts.slice(1).map(x => x.trim()).filter(Boolean);
    const tail = rest.length ? `, { extra: [${rest.join(", ")}] }` : "";
    return `log.${lvl}(${msg}${tail});`;
  });
  if (s !== before) {
    await writeFile(f, s);
    console.log("fixed", f);
  } else {
    console.log("no-match", f);
  }
}

function splitTop(s) {
  const out = [];
  let depth = 0, cur = "", inStr = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      cur += c;
      if (c === "\\" && i + 1 < s.length) { cur += s[++i]; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = c; cur += c; continue; }
    if (c === "(" || c === "[" || c === "{") { depth++; cur += c; continue; }
    if (c === ")" || c === "]" || c === "}") { depth--; cur += c; continue; }
    if (c === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

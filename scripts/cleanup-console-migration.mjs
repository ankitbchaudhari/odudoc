// Second pass: rewrite the ugly log.X("console.Y", ..., { args: [...] }) form
// into a proper log.X(event, err?, meta?) shape.
//
// log.error("console.error", undefined, { args: [STR, ERR, ...EXTRA] });
//   → log.error(STR, ERR, EXTRA ? { extra: [EXTRA] } : undefined);
//
// log.warn("console.warn", { args: [STR, ...REST] });
//   → log.warn(STR, REST ? { extra: [REST] } : undefined);
//
// log.info("console.log"/"console.info", { args: [STR, ...REST] });
//   → log.info(STR, REST ? { extra: [REST] } : undefined);
//
// Works on one-line forms only. Leaves multi-line broken cases alone.
import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const raw = execSync(`grep -rl "log\\.\\(error\\|warn\\|info\\)(\\\"console\\." --include="*.ts" lib app/api`, { encoding: "utf8" });
const files = raw.trim().split("\n").filter(Boolean);

let touched = 0;
for (const f of files) {
  let s = await readFile(f, "utf8");
  const before = s;

  // error form with undefined,
  s = s.replace(
    /log\.error\("console\.error",\s*undefined,\s*\{\s*args:\s*\[([^\[\]\n]*?)\]\s*\}\)/g,
    (_m, argsStr) => {
      const parts = splitTop(argsStr);
      const msg = parts[0]?.trim() || '"error"';
      if (parts.length < 2) return `log.error(${msg})`;
      const err = parts[1].trim();
      if (parts.length === 2) return `log.error(${msg}, ${err})`;
      const extra = parts.slice(2).map(p => p.trim()).join(", ");
      return `log.error(${msg}, ${err}, { extra: [${extra}] })`;
    },
  );

  // warn/info form
  s = s.replace(
    /log\.(warn|info)\("console\.(?:warn|log|info)",\s*\{\s*args:\s*\[([^\[\]\n]*?)\]\s*\}\)/g,
    (_m, lvl, argsStr) => {
      const parts = splitTop(argsStr);
      const msg = parts[0]?.trim() || '"event"';
      if (parts.length < 2) return `log.${lvl}(${msg})`;
      const extra = parts.slice(1).map(p => p.trim()).join(", ");
      return `log.${lvl}(${msg}, { extra: [${extra}] })`;
    },
  );

  if (s !== before) { await writeFile(f, s); touched++; }
}
console.log("cleanup-console:", touched, "files");

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

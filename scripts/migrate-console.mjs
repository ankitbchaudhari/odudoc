// Replace console.* with log.* in lib/ and app/api/.
// Skips the logger files themselves and known intentional dev-prints.
import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";

const raw = execSync(`grep -rl "console\\." --include="*.ts" lib app/api`, { encoding: "utf8" });
const files = raw.trim().split("\n").filter(Boolean);

const SKIP = new Set([
  "lib/log.ts",
  "lib/sentry.ts",
  "lib/db.ts",
  "lib/otp-store.ts",
]);

let touched = 0;
for (const f of files) {
  const rel = f.replace(/\\/g, "/");
  if (SKIP.has(rel)) continue;
  let src = await readFile(f, "utf8");
  if (!/console\.(log|warn|error|info)/.test(src)) continue;
  const before = src;

  const hasImport = /from\s+["']@\/lib\/log["']/.test(src) || /from\s+["']\.\/log["']/.test(src);
  if (!hasImport) {
    const imp = rel.startsWith("lib/") ? "./log" : "@/lib/log";
    const matches = [...src.matchAll(/^import[^;]+;\s*$/gm)];
    if (matches.length) {
      const last = matches[matches.length - 1];
      const pos = last.index + last[0].length;
      src = src.slice(0, pos) + `\nimport { log } from "${imp}";` + src.slice(pos);
    }
  }

  src = src.replace(/console\.error\(([^;]*?)\);/g, (_m, args) =>
    `log.error("console.error", undefined, { args: [${args}] });`
  );
  src = src.replace(/console\.warn\(([^;]*?)\);/g, (_m, args) =>
    `log.warn("console.warn", { args: [${args}] });`
  );
  src = src.replace(/console\.log\(([^;]*?)\);/g, (_m, args) =>
    `log.info("console.log", { args: [${args}] });`
  );
  src = src.replace(/console\.info\(([^;]*?)\);/g, (_m, args) =>
    `log.info("console.info", { args: [${args}] });`
  );

  if (src !== before) { await writeFile(f, src); touched++; }
}
console.log("migrate-console:", touched, "files");

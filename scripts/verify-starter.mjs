#!/usr/bin/env node
// Keeps `npm run new` honest: scaffolds the starter into a throwaway copy of the repo and runs the
// same gate a real new video must pass. Nothing in this repo is written.
//   node scripts/verify-starter.mjs             # static gate (npm test)
//   node scripts/verify-starter.mjs --browser   # full gate (npm run verify)
// Copies only what a build needs (scripts/, src/shared/, src/templates/, package.json) into a
// mkdtemp dir, runs scripts/new-video.mjs + scripts/verify-all.mjs there, then deletes that dir.
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BROWSER = process.argv.includes("--browser");
const SLUG = "starter-check";
const tmp = mkdtempSync(join(tmpdir(), "mdv-starter-"));
let code = 0;
try {
  for (const p of ["scripts", "src/shared", "src/templates", "package.json"]) {
    cpSync(join(ROOT, p), join(tmp, p), { recursive: true, filter: (f) => !f.includes("__pycache__") });
  }
  execFileSync("node", [join(tmp, "scripts", "new-video.mjs"), SLUG, "Starter Check"], { cwd: tmp, stdio: ["ignore", "pipe", "inherit"] });
  // the scaffold's own gate, with the starter's slug; its output already reads PASS/FAIL per check
  const out = execFileSync("node", [join(tmp, "scripts", "verify-all.mjs"), ...(BROWSER ? ["--browser"] : []), SLUG], { cwd: tmp, encoding: "utf8" });
  // a new video must also be WARN-free (no meta.advisory), so any WARN is a starter regression
  if (/^\s*WARN /m.test(out)) { console.log(out); console.log("FAIL  starter: scaffold has WARN lines"); code = 1; }
  else console.log(`PASS  starter: untouched \`npm run new\` scaffold passes ${BROWSER ? "the full" : "the static"} gate`);
} catch (e) {
  console.log(`${e.stdout ?? ""}`.trim());
  console.log("FAIL  starter: `npm run new` scaffold does not pass the gate (src/templates/starter or src/shared/stage.js)");
  code = 1;
} finally {
  rmSync(tmp, { recursive: true, force: true }); // the mkdtemp dir created above, nothing else
}
process.exit(code);

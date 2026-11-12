#!/usr/bin/env node
// Proves verify-video.mjs fails on broken builds (a check that never fails proves nothing).
//   node scripts/test-verifiers.mjs
// Copies one built video into a temp root, applies one defect at a time, and requires
// verify-video.mjs to exit 1 with the expected message. The unmutated copy must pass.
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SLUG = "k8s-disaster-recovery"; // port-only, inlined GSAP + player, timing-only marks

const CASES = [
  { name: "unmutated copy passes", mutate: (h) => h, expect: null },
  { name: "wall-clock API in own script", mutate: (h) => h.replace("const REVEAL =", "const NOW = Date.now(); const REVEAL ="), expect: "uses Date.now" },
  { name: "mark nothing consumes", mutate: (h) => h.replace(/(["'`])s1-fail\1/g, '"zz-gone"').replace(/id="s1-fail"/g, 'id="zz-gone"'), expect: "mark s1-fail drives nothing" },
  { name: "GSAP missing", mutate: (h) => h.replace(/<script>\/\* inlined assets\/gsap\.min\.js \*\/[\s\S]*?<\/script>/, ""), expect: "GSAP neither inlined" },
  { name: "network URL", mutate: (h) => h.replace("</body>", '<img src="https://cdn.example.com/x.png"></body>'), expect: "references a network URL" },
  { name: "wrong root duration", mutate: (h) => h.replace(/(<div id="root"[^>]*data-duration=")[\d.]+/, "$1999"), expect: "root duration is not" },
];

let bad = 0;
for (const c of CASES) {
  const tmp = mkdtempSync(join(tmpdir(), "mdv-test-"));
  try {
    cpSync(join(ROOT, "videos", SLUG), join(tmp, "videos", SLUG), { recursive: true });
    const file = join(tmp, "videos", SLUG, "index.html");
    const before = readFileSync(file, "utf8");
    const after = c.mutate(before);
    if (c.expect && after === before) { console.log(`FAIL  ${c.name}: mutation did not apply`); bad++; continue; }
    writeFileSync(file, after);
    let code = 0, out = "";
    try {
      out = execFileSync("node", [join(ROOT, "scripts", "verify-video.mjs"), SLUG, "--root", tmp], { stdio: ["ignore", "pipe", "pipe"] }).toString();
    } catch (e) { code = e.status; out = `${e.stdout}${e.stderr}`; }
    const ok = c.expect ? code === 1 && out.includes(c.expect) : code === 0;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}${ok ? "" : `\n      exit ${code}: ${out.trim().split("\n").slice(0, 4).join(" | ")}`}`);
    if (!ok) bad++;
  } finally {
    rmSync(tmp, { recursive: true, force: true }); // temp copy made above
  }
}
console.log(bad ? `\n${bad} verifier self-test(s) failed` : `\nverify-video.mjs catches all ${CASES.length - 1} injected defects`);
process.exit(bad ? 1 : 0);

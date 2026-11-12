#!/usr/bin/env node
// One gate for every video in src/. Exit 1 if any check fails for any slug.
//   node scripts/verify-all.mjs                 # static: freshness + verify-video (no browser)
//   node scripts/verify-all.mjs --browser       # + verify_reel.py, its --self-test, headless player,
//                                               #   hyperframes check, seam-gate (if installed)
//   node scripts/verify-all.mjs --browser eks   # only the named slug(s)
//
// freshness: rebuilds each slug into a temp dir and requires the committed videos/ output to be
// byte-identical, so a template edit without a rebuild (or a hand edit of a built file) fails.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const BROWSER = args.includes("--browser");
const NOT_VIDEOS = new Set(["shared", "templates"]);
const all = readdirSync(join(ROOT, "src")).filter(
  (d) => !NOT_VIDEOS.has(d) && existsSync(join(ROOT, "src", d, "story.mjs")),
);
const picked = args.filter((a) => !a.startsWith("--"));
for (const s of picked) if (!all.includes(s)) { console.error(`unknown slug ${s} (have: ${all.join(", ")})`); process.exit(2); }
const slugs = picked.length ? picked : all;

const HF = ["--yes", "hyperframes@0.9.37", "check"];
const SEAM_GATE = join(homedir(), ".claude", "skills", "motion-doctrine", "scripts", "seam-gate.mjs");
// files build-video.mjs writes; everything else in videos/<dir>/ (audio, snapshots) is not generated
const GENERATED = ["index.html", "SCRIPT.md", "ledger.json", "meta.json", "hyperframes.json", "assets/gsap.min.js", "assets/player.js", "assets/stage.js"];

const results = [];
// hyperframes check output is mostly progress lines: keep each ✗ finding and its first detail line
const hfErrors = (lines) => lines.flatMap((l, i) => (/✗/.test(l) ? [l, lines[i + 1] ?? ""].map((x) => x.slice(0, 240)) : []));
const run = (slug, name, cmd, argv, cwd = ROOT, pick = (lines) => lines.slice(-25)) => {
  try {
    const out = execFileSync(cmd, argv, { cwd, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }).toString();
    const warn = out.split("\n").filter((l) => l.startsWith("WARN "));
    results.push({ slug, name, ok: true, warn });
  } catch (e) {
    const lines = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim().split("\n");
    const out = (pick(lines).length ? pick(lines) : lines.slice(-25)).join("\n");
    results.push({ slug, name, ok: false, out });
  }
};
const skip = (slug, name, why) => results.push({ slug, name, ok: true, skipped: why });

for (const slug of slugs) {
  const { meta } = await import(pathToFileURL(join(ROOT, "src", slug, "story.mjs")).href);
  const wanted = meta.formats ?? ["land", "port"];
  const dirs = ["land", "port"].filter((f) => wanted.includes(f)).map((f) => (wanted.length === 1 || f === "land" ? slug : `${slug}-reel`));
  const portDir = wanted.includes("port") ? dirs[dirs.length - 1] : null;

  // 1. freshness
  const tmp = mkdtempSync(join(tmpdir(), `mdv-${slug}-`));
  try {
    execFileSync("node", [join(ROOT, "scripts", "build-video.mjs"), slug, "--out", tmp], { stdio: ["ignore", "pipe", "pipe"] });
    const stale = [];
    for (const d of dirs) for (const f of GENERATED) {
      const fresh = join(tmp, "videos", d, f), committed = join(ROOT, "videos", d, f);
      if (!existsSync(fresh)) { if (existsSync(committed)) stale.push(`${d}/${f} (no longer generated)`); continue; }
      if (!existsSync(committed) || !readFileSync(fresh).equals(readFileSync(committed))) stale.push(`${d}/${f}`);
    }
    results.push(stale.length
      ? { slug, name: "fresh", ok: false, out: `built output differs from src — run: node scripts/build-video.mjs ${slug}\n  ${stale.join("\n  ")}` }
      : { slug, name: "fresh", ok: true });
  } catch (e) {
    results.push({ slug, name: "fresh", ok: false, out: `${e.stderr ?? e.message}`.trim() });
  } finally {
    rmSync(tmp, { recursive: true, force: true }); // temp dir created above, nothing else
  }

  // 2. static invariants
  run(slug, "verify-video", "node", [join(ROOT, "scripts", "verify-video.mjs"), slug]);
  if (!BROWSER) continue;

  // 3. browser checks
  if (portDir) {
    // meta.advisory: layout checks this video predates; they report WARN instead of failing
    const ADVISORY_KINDS = ["wires", "labels", "balance"];
    const advisory = meta.advisory ?? [];
    // only videos that predate these checks may opt out; a new video fixes its layout instead
    const LEGACY = ["eks", "k8s-api-gateway", "k8s-disaster-recovery", "k8s-pod-scheduling"];
    const unknown = advisory.filter((k) => !ADVISORY_KINDS.includes(k));
    if (advisory.length && !LEGACY.includes(slug)) results.push({ slug, name: "verify_reel", ok: false, out: `meta.advisory is only for the pre-2026-11-12 videos (${LEGACY}); fix the layout instead` });
    else if (unknown.length) results.push({ slug, name: "verify_reel", ok: false, out: `meta.advisory: unknown kind(s) ${unknown} (allowed: ${ADVISORY_KINDS})` });
    else {
      const adv = advisory.length ? ["--advisory", advisory.join(",")] : [];
      run(slug, "verify_reel", "python3", [join(ROOT, "scripts", "verify_reel.py"), portDir, ...adv]);
      run(slug, "verify_reel --self-test", "python3", [join(ROOT, "scripts", "verify_reel.py"), portDir, "--self-test", ...adv]);
    }
  } else skip(slug, "verify_reel", "no 9:16 format");
  run(slug, "headless player", "python3", [join(ROOT, "scripts", "headless_check.py"), slug]);
  for (const d of dirs) run(slug, `hyperframes check ${d}`, "npx", HF, join(ROOT, "videos", d), hfErrors);
  const ledger = join(ROOT, "videos", dirs[0], "ledger.json");
  if (!existsSync(ledger)) skip(slug, "seam-gate", "no ledger.json (meta.seams unset)");
  else if (!existsSync(SEAM_GATE)) skip(slug, "seam-gate", `not installed at ${SEAM_GATE}`);
  else run(slug, "seam-gate", "node", [SEAM_GATE, "verify", "--ledger", "ledger.json", "--project", "."], join(ROOT, "videos", dirs[0]),
    (lines) => lines.filter((l) => /■|FAIL|SEAM GATE/.test(l)));
}

let failed = 0, warned = 0;
for (const r of results) {
  const mark = r.skipped ? "SKIP" : r.ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${r.slug.padEnd(24)} ${r.name}${r.skipped ? `  (${r.skipped})` : ""}`);
  if (!r.ok) { failed++; console.log("      " + r.out.replace(/\n/g, "\n      ")); }
  if (r.warn?.length) { warned += r.warn.length; console.log("      " + r.warn.join("\n      ")); }
}
console.log(`\n${results.length - failed}/${results.length} checks passed across ${slugs.length} video(s)${BROWSER ? "" : " (static only; add --browser for layout/render checks)"}${warned ? `; ${warned} advisory layout warning(s), see docs/PIPELINE_FEATURES.md` : ""}`);
process.exit(failed ? 1 : 0);

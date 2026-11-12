#!/usr/bin/env node
// Scaffold a new explainer from src/templates/starter and build it.
//   npm run new <slug> "<Title>" [-- --brand "K8S · TOPIC"]
//   node scripts/new-video.mjs <slug> "<Title>" [--brand "K8S · TOPIC"]
// Writes src/<slug>/{story.mjs,template.html} and contents/<slug>.md (only if missing), then builds
// videos/<slug>/. Refuses to touch an existing src/<slug>/. The starter passes `npm run verify <slug>`
// as generated: edit story.mjs (narration, facts) and template.html (cards, wires) from there.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const brand = flag("--brand");
const [slug, title] = args;
const usage = 'usage: npm run new <slug> "<Title>" [-- --brand "K8S · TOPIC"]';
if (!slug || !title) { console.error(usage); process.exit(2); }
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { console.error(`slug must be kebab-case (a-z, 0-9, -): ${slug}`); process.exit(2); }
if (["shared", "templates"].includes(slug)) { console.error(`reserved name: ${slug}`); process.exit(2); }
const srcDir = join(ROOT, "src", slug);
if (existsSync(srcDir)) { console.error(`src/${slug}/ already exists; refusing to overwrite`); process.exit(1); }
// a 9:16-only video writes videos/<slug>/: never land on another video's output (e.g. <old>-reel)
if (existsSync(join(ROOT, "videos", slug))) { console.error(`videos/${slug}/ already exists (another video's output?); pick another slug`); process.exit(1); }
if (/\{\{|\}\}|@@/.test(title + (brand ?? ""))) { console.error("title/brand must not contain {{, }} or @@ (template token syntax)"); process.exit(2); }

// story.mjs is JS source: escape the title for a double-quoted string; template.html: HTML-escape
const jsStr = (s) => JSON.stringify(s).slice(1, -1);
const html = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const BRAND = brand ?? title.toUpperCase();
// function replacers: a plain replacement string would expand $&, $' and $$ in the title
const fill = (text, esc) => text.replaceAll("@@SLUG@@", () => slug).replaceAll("@@TITLE@@", () => esc(title)).replaceAll("@@BRAND@@", () => esc(BRAND));

const starter = join(ROOT, "src", "templates", "starter");
mkdirSync(srcDir, { recursive: true });
writeFileSync(join(srcDir, "story.mjs"), fill(readFileSync(join(starter, "story.mjs"), "utf8"), jsStr));
writeFileSync(join(srcDir, "template.html"), fill(readFileSync(join(starter, "template.html"), "utf8"), html));

const brief = join(ROOT, "contents", `${slug}.md`);
const wroteBrief = !existsSync(brief);
if (wroteBrief) {
  mkdirSync(dirname(brief), { recursive: true });
  // same sections as the brief contract in .skills/motion-devops-creator/SKILL.md (Directory Contract)
  writeFileSync(brief, `# ${title}\n\n` +
    "Research brief for the explainer (.skills/universal-tech-researcher or devops-deep-researcher).\n" +
    "Request: see docs/NEW_CONCEPT_REQUEST.md for what the requester supplies.\n\n" +
    ["The why (the production failure this fixes)", "Architecture personas (components and who owns them)",
     "Packet flows (the 3-6 step lifecycle)", "Disaster scenarios (what breaks, what the viewer sees)",
     "CLI fixes (exact commands and their output)", "Comparison table (this vs. the alternative)",
     "Sources (official docs checked, with dates)"].map((h) => `## ${h}\n\nTODO\n\n`).join(""));
}

try {
  execFileSync("node", [join(ROOT, "scripts", "build-video.mjs"), slug], { stdio: "inherit" });
} catch {
  // leave nothing half-made: remove exactly what this run created, so the command can be re-run
  rmSync(srcDir, { recursive: true, force: true });
  if (wroteBrief) rmSync(brief, { force: true });
  rmSync(join(ROOT, "videos", slug), { recursive: true, force: true }); // checked absent above
  console.error(`build failed; removed src/${slug}/${wroteBrief ? ` and contents/${slug}.md` : ""}`);
  process.exit(1);
}
console.log(`\nscaffolded ${slug}:
  src/${slug}/story.mjs       narration, [[marks]], meta (total, seams, wps)
  src/${slug}/template.html   cards, wires, timeline (helpers: src/shared/stage.js)
  contents/${slug}.md         research brief
next: edit both, rebuild with  node scripts/build-video.mjs ${slug}
done means:                    node scripts/verify-all.mjs --browser ${slug}   (all PASS, no WARN)`);

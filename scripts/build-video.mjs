#!/usr/bin/env node
// Builds both formats of a video from src/<slug>/{story.mjs,template.html}.
//   node scripts/build-video.mjs k8s-pod-scheduling
//   node scripts/build-video.mjs k8s-pod-scheduling --out /tmp/x   (writes /tmp/x/videos/...)
// Outputs:
//   videos/<slug>/index.html        16:9  1920x1080
//   videos/<slug>-reel/index.html   9:16  1080x1920
//   videos/<slug>/SCRIPT.md         timed storyboard + subtitles
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { computeTiming } from "./lib/timing.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
if (!slug) {
  console.error("usage: node scripts/build-video.mjs <slug>");
  process.exit(2);
}
const oi = process.argv.indexOf("--out");
const OUT = oi > 0 ? resolve(process.argv[oi + 1]) : ROOT;
const srcDir = join(ROOT, "src", slug);
const { meta, scenes, say = [] } = await import(pathToFileURL(join(srcDir, "story.mjs")).href);
const template = readFileSync(join(srcDir, "template.html"), "utf8");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const { timing, allCues } = computeTiming(meta, scenes);

// ---- 3. emit cue markup ----
const sayText = (s) => say.reduce((acc, [re, rep]) => acc.replace(re, rep), s);
const cueHtml = allCues
  .map((c, k) => {
    const id = `cue-${String(k + 1).padStart(2, "0")}`;
    const text = c.words.map((w) => w.w).join(" ");
    const spans = c.words
      .map((w) => `<span class="w${w.kw ? " kw" : ""}" data-t="${w.t}">${esc(w.w)}</span>`)
      .join(" ");
    return `        <p id="${id}" class="cue clip" data-start="${c.start}" data-duration="${c.duration}" data-track-index="20" data-say="${esc(sayText(text))}">${spans}</p>`;
  })
  .join("\n");

// ---- 4. fill both formats ----
// meta.formats: ["land","port"] (default) or a single format. A single-format video
// writes straight to videos/<slug>/. meta.inline: true inlines GSAP + player into
// index.html so the file is self-contained. meta.gsap: repo-relative GSAP build.
const ALL_FORMATS = [
  { fmt: "land", w: 1920, h: 1080, label: "16:9" },
  { fmt: "port", w: 1080, h: 1920, label: "9:16" },
];
const wanted = meta.formats ?? ["land", "port"];
const formats = ALL_FORMATS.filter((f) => wanted.includes(f.fmt)).map((f) => ({
  ...f,
  dir: join(OUT, "videos", wanted.length === 1 || f.fmt === "land" ? slug : `${slug}-reel`),
}));
if (!formats.length) throw new Error(`meta.formats matched nothing: ${wanted}`);
// One GSAP build for every video: the vendored pin (verify_reel.py checks the runtime version
// against it). meta.gsap may override; a missing override is an error, never a silent fallback.
const VENDOR_GSAP = "src/shared/vendor/gsap-3.12.5.min.js";
const gsapSrc = join(ROOT, meta.gsap ?? VENDOR_GSAP);
if (!existsSync(gsapSrc)) throw new Error(`gsap build not found: ${gsapSrc}`);
// function replacer: library source contains `$&`-style sequences that String.replace would expand
const inlineScript = (html, src, file) => {
  const tag = `<script src="${src}"></script>`;
  if (!html.includes(tag)) throw new Error(`inline: ${tag} not found in template`);
  const code = readFileSync(file, "utf8");
  if (/<\/script/i.test(code)) throw new Error(`inline: ${file} contains </script`);
  return html.replace(tag, () => `<script>/* inlined ${src} */\n${code}\n</script>`);
};

for (const f of formats) {
  let html = template
    .replaceAll("{{FMT}}", f.fmt)
    .replaceAll("{{W}}", String(f.w))
    .replaceAll("{{H}}", String(f.h))
    .replaceAll("{{FORMAT_LABEL}}", f.label)
    .replaceAll("{{TOTAL}}", String(meta.total))
    .replaceAll("{{ACCENT}}", () => meta.accent)
    .replaceAll("{{TITLE}}", () => esc(meta.title)) // function: no $& expansion
    .replaceAll("{{CUES}}", cueHtml)
    .replaceAll("{{TIMING_JSON}}", JSON.stringify(timing.reveals))
    // axis: the incoming seam direction from meta.seams, so templates and ledger.json agree
    .replaceAll("{{SCENES_JSON}}", JSON.stringify(timing.scenes.map(({ id, start, duration }, i) =>
      (meta.seams && i > 0 ? { id, start, duration, axis: meta.seams[id] ?? "x" } : { id, start, duration }))));
  for (const s of timing.scenes) {
    html = html.replaceAll(`{{${s.id.toUpperCase()}_START}}`, String(s.start)).replaceAll(`{{${s.id.toUpperCase()}_DUR}}`, String(s.duration));
  }
  const left = html.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (left) throw new Error(`unfilled tokens in template: ${[...new Set(left)]}`);
  // the player only requests a narration track that exists (audio is synthesized, never built,
  // so look in the real videos/ tree even when --out writes elsewhere)
  const narration = "assets/audio/narration.mp3";
  if (existsSync(join(ROOT, "videos", f.dir.split("/").pop(), narration))) {
    if (!html.includes("</head>")) throw new Error("template has no </head> for the narration meta");
    html = html.replace("</head>", `  <meta name="narration" content="${narration}" />\n  </head>`);
  }
  const playerSrc = join(ROOT, "src", "shared", "player.js");
  // shared scene runtime: shipped only to templates that load it (starter and its scaffolds)
  const stageSrc = join(ROOT, "src", "shared", "stage.js");
  const usesStage = html.includes('<script src="assets/stage.js"></script>');
  if (meta.inline) {
    html = inlineScript(html, "assets/gsap.min.js", gsapSrc);
    if (usesStage) html = inlineScript(html, "assets/stage.js", stageSrc);
    html = inlineScript(html, "assets/player.js", playerSrc);
  }
  mkdirSync(join(f.dir, "assets"), { recursive: true });
  writeFileSync(join(f.dir, "index.html"), html);
  if (!meta.inline) {
    copyFileSync(gsapSrc, join(f.dir, "assets", "gsap.min.js"));
    copyFileSync(playerSrc, join(f.dir, "assets", "player.js"));
    if (usesStage) copyFileSync(stageSrc, join(f.dir, "assets", "stage.js"));
  }
  writeFileSync(join(f.dir, "hyperframes.json"), JSON.stringify({ paths: { assets: "assets" }, authoringSkill: "hyperframes" }, null, 2) + "\n");
  writeFileSync(join(f.dir, "meta.json"), JSON.stringify({ id: f.dir.split("/").pop(), name: `${meta.title} (${f.label})` }, null, 2) + "\n");
}

// ---- 4b. seam ledger (motion-doctrine Seam Gate) from the real cut times ----
// meta.seams: { <incoming scene id>: "y" } overrides the default leftward x seam.
if (meta.seams) {
  const seams = timing.scenes.slice(1).map((s, i) => {
    const prev = timing.scenes[i];
    const axis = meta.seams[s.id] ?? "x";
    return {
      id: `${prev.id}→${s.id}`, cut: s.start, technique: `cut-the-curve ${axis === "y" ? "UP" : "LEFT"}`,
      exit: { selector: `#${prev.id}-cam`, axis, dir: -1 }, entry: { selector: `#${s.id}-cam`, axis, dir: -1 },
    };
  });
  writeFileSync(join(formats[0].dir, "ledger.json"), JSON.stringify({ fps: 30, seams }, null, 2) + "\n");
}

// ---- 5. storyboard doc ----
const tc = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
let md = `# ${meta.title} — timed script\n\nGenerated by \`node scripts/build-video.mjs ${slug}\` from \`src/${slug}/story.mjs\`. Do not edit by hand.\n\n`;
md += `Rate ${meta.wps} words/s · lead ${meta.lead}s · pad ${meta.pad}s · runtime ${meta.total}s\n\n`;
md += `| Scene | Chapter | Start | Duration | Words |\n|---|---|---|---|---|\n`;
for (const s of timing.scenes) md += `| ${s.id} | ${s.chapter} | ${tc(s.start)} | ${s.duration.toFixed(2)}s | ${s.words} |\n`;
md += `\n## Reveal marks (element appears on the spoken word)\n\n| Mark | Time |\n|---|---|\n`;
for (const [id, tm] of Object.entries(timing.reveals)) md += `| \`${id}\` | ${tc(tm)} |\n`;
md += `\n## Subtitles\n\n| Cue | In | Out | Text |\n|---|---|---|---|\n`;
allCues.forEach((c, k) => {
  md += `| ${k + 1} | ${tc(c.start)} | ${tc(c.start + c.duration)} | ${c.words.map((w) => w.w).join(" ").replace(/\|/g, "\\|")} |\n`;
});
writeFileSync(join(formats[0].dir, "SCRIPT.md"), md);

const words = timing.scenes.reduce((a, s) => a + s.words, 0);
console.log(JSON.stringify({ slug, words, scenes: timing.scenes.map(({ id, start, duration, words }) => ({ id, start, duration, words })), cues: allCues.length, reveals: Object.keys(timing.reveals).length }, null, 1));

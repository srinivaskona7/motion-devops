#!/usr/bin/env node
// Builds both formats of a video from src/<slug>/{story.mjs,template.html}.
//   node scripts/build-video.mjs k8s-pod-scheduling
// Outputs:
//   videos/<slug>/index.html        16:9  1920x1080
//   videos/<slug>-reel/index.html   9:16  1080x1920
//   videos/<slug>/SCRIPT.md         timed storyboard + subtitles
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
if (!slug) {
  console.error("usage: node scripts/build-video.mjs <slug>");
  process.exit(2);
}
const srcDir = join(ROOT, "src", slug);
const { meta, scenes, say } = await import(pathToFileURL(join(srcDir, "story.mjs")).href);
const template = readFileSync(join(srcDir, "template.html"), "utf8");

const MARK = /\[\[([\w-]+)(?:\|([^\]]+))?\]\]/g;
const r2 = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- 1. tokenise narration into words, keyword flags and reveal marks ----
function tokenise(text) {
  const words = []; // {w, kw}
  const marks = {}; // id -> word index
  let pending = []; // marks waiting for the next spoken word
  const pushPlain = (chunk) => {
    // punctuation glued to a keyword ("[[x|apply]],") belongs to that word
    const glue = chunk.match(/^[^\s]+/);
    if (glue && words.length && !pending.length) {
      words[words.length - 1].w += glue[0];
      chunk = chunk.slice(glue[0].length);
    }
    for (const w of chunk.split(/\s+/).filter(Boolean)) {
      for (const id of pending) marks[id] = words.length;
      pending = [];
      words.push({ w, kw: false });
    }
  };
  const setMark = (id, k) => {
    if (id in marks) throw new Error(`duplicate mark ${id}`);
    marks[id] = k;
  };
  let cursor = 0;
  let match;
  MARK.lastIndex = 0;
  while ((match = MARK.exec(text))) {
    pushPlain(text.slice(cursor, match.index));
    const [, id, spoken] = match;
    if (spoken) {
      setMark(id, words.length);
      for (const p of pending) setMark(p, words.length);
      pending = [];
      for (const w of spoken.split(/\s+/).filter(Boolean)) words.push({ w, kw: true });
    } else {
      if (id in marks || pending.includes(id)) throw new Error(`duplicate mark ${id}`);
      pending.push(id);
    }
    cursor = match.index + match[0].length;
  }
  pushPlain(text.slice(cursor));
  if (pending.length) throw new Error(`dangling marks ${pending}`);
  return { words, marks };
}

// ---- 2. timing ----
let t = 0;
const timing = { scenes: [], reveals: {}, total: meta.total };
const allCues = [];
for (const [i, sc] of scenes.entries()) {
  const { words, marks } = tokenise(sc.narration);
  const start = t;
  const wordT = (k) => r2(start + meta.lead + k / meta.wps);
  let dur = meta.lead + words.length / meta.wps + meta.pad;
  const isLast = i === scenes.length - 1;
  const s = { id: sc.id, chapter: sc.chapter, start: r2(start), words: words.length };
  for (const [id, k] of Object.entries(marks)) {
    if (id in timing.reveals) throw new Error(`mark ${id} reused across scenes`);
    timing.reveals[id] = wordT(k);
  }
  // cues
  let cue = [];
  const cues = [];
  words.forEach((wd, k) => {
    cue.push({ ...wd, t: wordT(k) });
    const endsSentence = /[.?!]$/.test(wd.w);
    const softBreak = /[,;:]$/.test(wd.w) && cue.length >= 9;
    if (endsSentence || softBreak || cue.length >= 13) {
      cues.push(cue);
      cue = [];
    }
  });
  if (cue.length) cues.push(cue);
  s.cues = cues;
  timing.scenes.push(s);
  t = start + dur;
  if (isLast) {
    if (t > meta.total + 0.001) {
      throw new Error(`narration overruns target: ${r2(t)}s > ${meta.total}s, trim words`);
    }
    dur = meta.total - start;
    t = meta.total;
  }
  s.duration = r2(dur);
}
// cue windows: until the next cue in the scene, else last word + 1.1s (inside the scene)
for (const s of timing.scenes) {
  const end = s.start + s.duration;
  s.cues.forEach((c, k) => {
    const next = s.cues[k + 1];
    const cs = r2(c[0].t - 0.12);
    const ce = next ? r2(next[0].t - 0.12) : r2(Math.min(c[c.length - 1].t + 1.3, end - 0.6));
    allCues.push({ scene: s.id, start: cs, duration: r2(ce - cs), words: c });
  });
}

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
  dir: join(ROOT, "videos", wanted.length === 1 || f.fmt === "land" ? slug : `${slug}-reel`),
}));
if (!formats.length) throw new Error(`meta.formats matched nothing: ${wanted}`);
const gsapSrc = [
  meta.gsap && join(ROOT, meta.gsap),
  join(ROOT, "node_modules", "gsap", "dist", "gsap.min.js"),
].filter(Boolean).find(existsSync);
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
    .replaceAll("{{ACCENT}}", meta.accent)
    .replaceAll("{{TITLE}}", esc(meta.title))
    .replaceAll("{{CUES}}", cueHtml)
    .replaceAll("{{TIMING_JSON}}", JSON.stringify(timing.reveals))
    .replaceAll("{{SCENES_JSON}}", JSON.stringify(timing.scenes.map(({ id, start, duration }) => ({ id, start, duration }))));
  for (const s of timing.scenes) {
    html = html.replaceAll(`{{${s.id.toUpperCase()}_START}}`, String(s.start)).replaceAll(`{{${s.id.toUpperCase()}_DUR}}`, String(s.duration));
  }
  const left = html.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (left) throw new Error(`unfilled tokens in template: ${[...new Set(left)]}`);
  if (!gsapSrc) throw new Error("gsap not found: run npm install");
  const playerSrc = join(ROOT, "src", "shared", "player.js");
  if (meta.inline) {
    html = inlineScript(html, "assets/gsap.min.js", gsapSrc);
    html = inlineScript(html, "assets/player.js", playerSrc);
  }
  mkdirSync(join(f.dir, "assets"), { recursive: true });
  writeFileSync(join(f.dir, "index.html"), html);
  if (!meta.inline) {
    copyFileSync(gsapSrc, join(f.dir, "assets", "gsap.min.js"));
    copyFileSync(playerSrc, join(f.dir, "assets", "player.js"));
  }
  writeFileSync(join(f.dir, "hyperframes.json"), JSON.stringify({ paths: { assets: "assets" }, authoringSkill: "hyperframes" }, null, 2) + "\n");
  writeFileSync(join(f.dir, "meta.json"), JSON.stringify({ id: f.dir.split("/").pop(), name: `${meta.title} (${f.label})` }, null, 2) + "\n");
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

#!/usr/bin/env node
// Static invariants for a built video. Fails loudly; exit 1 on any violation.
//   node scripts/verify-video.mjs <slug> [--root <dir-containing-videos/>]
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
const ri = process.argv.indexOf("--root");
const OUT = ri > 0 ? resolve(process.argv[ri + 1]) : ROOT;
const { meta, scenes } = await import(pathToFileURL(join(ROOT, "src", slug, "story.mjs")).href);

const fails = [];
const must = (cond, msg) => { if (!cond) fails.push(msg); };

// ids that the narration promises will appear on screen when spoken
const spokenIds = scenes.flatMap((s) => [...s.narration.matchAll(/\[\[([\w-]+)\|/g)].map((m) => m[1]));
const allMarks = scenes.flatMap((s) => [...s.narration.matchAll(/\[\[([\w-]+)/g)].map((m) => m[1]));

for (const [dir, w, h] of [[slug, 1920, 1080], [`${slug}-reel`, 1080, 1920]]) {
  const base = join(OUT, "videos", dir);
  const file = join(base, "index.html");
  if (!existsSync(file)) { fails.push(`${dir}: index.html missing`); continue; }
  const html = readFileSync(file, "utf8");
  const tag = `${dir}:`;
  const rootTag = html.match(/<div id="root"[^>]*>/)?.[0] ?? "";
  must(rootTag.includes('data-composition-id="main"'), `${tag} root is not composition "main"`);
  must(rootTag.includes(`data-duration="${meta.total}"`), `${tag} root duration is not ${meta.total}s`);
  must(rootTag.includes(`data-width="${w}"`) && rootTag.includes(`data-height="${h}"`), `${tag} root is not ${w}x${h}`);
  must(/window\.__timelines\["main"\]\s*=\s*tl/.test(html), `${tag} timeline not registered as __timelines["main"]`);
  must(!/\{\{[A-Z0-9_]+\}\}/.test(html), `${tag} unfilled template tokens`);
  must(existsSync(join(base, "assets", "gsap.min.js")), `${tag} assets/gsap.min.js missing`);
  must(!/cdn\.|https?:\/\/(?!www\.w3\.org)/.test(html.replace(/<!--[\s\S]*?-->/g, "")), `${tag} references a network URL`);

  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  for (const id of spokenIds) must(ids.has(id), `${tag} narration names #${id} but no such element`);
  const reveal = JSON.parse(html.match(/const REVEAL = (\{.*?\});/)?.[1] ?? "{}");
  for (const id of allMarks) must(id in reveal, `${tag} mark ${id} has no reveal time`);
  for (const m of html.matchAll(/data-on="([^"]+)"/g)) must(m[1] in reveal, `${tag} wire waits on unknown mark ${m[1]}`);

  // scenes tile the runtime with no gaps
  const sc = JSON.parse(html.match(/const SCENES = (\[.*?\]);/)?.[1] ?? "[]");
  let t = 0;
  for (const s of sc) {
    must(Math.abs(s.start - t) < 0.002, `${tag} scene ${s.id} starts at ${s.start}, expected ${t.toFixed(3)}`);
    t = s.start + s.duration;
  }
  must(Math.abs(t - meta.total) < 0.002, `${tag} scenes end at ${t}, expected ${meta.total}`);

  // captions: ordered, non-overlapping, inside the film, every word timed inside its cue
  const cues = [...html.matchAll(/<p id="(cue-\d+)" class="cue clip" data-start="([\d.]+)" data-duration="([\d.]+)"[^>]*>(.*?)<\/p>/g)]
    .map((m) => ({ id: m[1], s: +m[2], d: +m[3], body: m[4] }));
  must(cues.length > 0, `${tag} no caption cues`);
  let prevEnd = 0, prevSentenceEnd = true;
  for (const c of cues) {
    must(c.d > 0.3, `${tag} ${c.id} shows for only ${c.d}s`);
    must(c.s >= prevEnd - 0.001, `${tag} ${c.id} overlaps the cue before it`);
    must(c.s + c.d <= meta.total, `${tag} ${c.id} runs past the end`);
    for (const w of c.body.matchAll(/data-t="([\d.]+)"/g)) must(+w[1] >= c.s && +w[1] < c.s + c.d, `${tag} ${c.id} word at ${w[1]}s outside its cue`);
    const words = (c.body.match(/class="w/g) || []).length;
    must(words >= 3 || prevSentenceEnd, `${tag} ${c.id} is a ${words}-word orphan tail`);
    prevSentenceEnd = /[.?!]<\/span>$/.test(c.body);
    prevEnd = c.s + c.d;
  }

  // the render contract: nothing wall-clock or random in anything the composition loads
  const scripts = [html, existsSync(join(base, "assets", "player.js")) ? readFileSync(join(base, "assets", "player.js"), "utf8") : ""];
  for (const src of scripts) {
    for (const bad of ["Date.now", "Math.random", "setTimeout", "setInterval", "requestAnimationFrame", "performance.now", "repeat: -1"]) {
      must(!src.includes(bad), `${tag} uses ${bad}`);
    }
  }
}

// narration pacing: words / speaking window must equal the configured rate
const words = scenes.reduce((a, s) => a + s.narration.replace(/\[\[[\w-]+\|([^\]]+)\]\]/g, "$1").replace(/\[\[[\w-]+\]\]/g, "").split(/\s+/).filter(Boolean).length, 0);
const minRuntime = words / meta.wps + scenes.length * (meta.lead + meta.pad);
must(minRuntime <= meta.total, `narration needs ${minRuntime.toFixed(1)}s at ${meta.wps} w/s, runtime is ${meta.total}s`);

if (fails.length) {
  console.error(`FAIL ${slug}: ${fails.length} violation(s)\n - ` + fails.join("\n - "));
  process.exit(1);
}
console.log(`PASS ${slug}: both formats, ${words} words, ${spokenIds.length} spoken reveals, ${allMarks.length} marks, runtime ${meta.total}s`);

#!/usr/bin/env node
// Renders a motion-devops video at 1080p, 1440p (2K), or 4K.
// Usage:
//   node scripts/render-video.mjs <slug> [1080|1440|4k] [portrait|landscape]
//
// Examples:
//   node scripts/render-video.mjs k8s-disaster-recovery 1080
//   node scripts/render-video.mjs k8s-disaster-recovery 4k portrait
//   node scripts/render-video.mjs k8s-pod-scheduling 1440 landscape

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
const resArg = (process.argv[3] || "1080").toLowerCase();
const modeArg = (process.argv[4] || "").toLowerCase();

if (!slug) {
  console.error("Usage: node scripts/render-video.mjs <slug> [1080|1440|4k] [portrait|landscape]");
  process.exit(1);
}

const videoDir = join(ROOT, "videos", slug);
if (!existsSync(videoDir)) {
  console.log(`Video directory not found at videos/${slug}. Running build-video.mjs first...`);
  const build = spawnSync("node", [join(ROOT, "scripts", "build-video.mjs"), slug], { stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

// orientation comes from the built composition itself (works for <slug> and <slug>-reel folders)
const html = readFileSync(join(videoDir, "index.html"), "utf8");
const rootTag = html.match(/<div id="root"[^>]*>/)?.[0] ?? "";
const w = +(rootTag.match(/data-width="(\d+)"/)?.[1] ?? 0), h = +(rootTag.match(/data-height="(\d+)"/)?.[1] ?? 0);
if (!w || !h) {
  console.error(`videos/${slug}/index.html has no root data-width/data-height`);
  process.exit(1);
}
let isPortrait = h > w;

if (modeArg === "landscape") isPortrait = false;
if (modeArg === "portrait") isPortrait = true;

let preset = "portrait";
let label = "1080p";

if (resArg === "4k" || resArg === "2160") {
  preset = isPortrait ? "portrait-4k" : "landscape-4k";
  label = "4K";
} else if (resArg === "1440" || resArg === "2k") {
  preset = isPortrait ? "portrait-1440p" : "landscape-1440p";
  label = "1440p";
} else {
  preset = isPortrait ? "portrait" : "landscape";
  label = "1080p";
}

const rendersDir = join(ROOT, "renders", slug);
mkdirSync(rendersDir, { recursive: true });
const outputFile = join(rendersDir, `${slug}-${label.toLowerCase()}.mp4`);

console.log("\n🎬 HYPERFRAMES VIDEO EXPORT");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📹 Video Slug:   ${slug}`);
console.log(`📺 Preset:       ${preset} (${label})`);
console.log(`📐 Aspect Ratio: ${isPortrait ? "9:16 Vertical" : "16:9 Landscape"}`);
console.log(`🎯 Output:       ${outputFile}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const cmd = "hyperframes";
const args = ["render", videoDir, `--resolution=${preset}`, `-o`, outputFile];

const child = spawnSync(cmd, args, { stdio: "inherit" });
if (child.status === 0) {
  console.log(`\n✅ Render complete: file://${outputFile}\n`);
} else {
  console.error(`\n❌ Render failed with exit code ${child.status}\n`);
  process.exit(child.status ?? 1);
}

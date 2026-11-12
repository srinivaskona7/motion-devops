#!/usr/bin/env node
// Exports high-bitrate transparent WebM or ProRes 4444 with Alpha for
// professional video editing suites (Final Cut Pro, DaVinci Resolve, Premiere Pro, After Effects).
//
// Usage:
//   node scripts/export-prores.mjs <slug> [mov|webm] [portrait|landscape]

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
const format = (process.argv[3] || "mov").toLowerCase();
const modeArg = (process.argv[4] || "").toLowerCase();

if (!slug) {
  console.error("Usage: node scripts/export-prores.mjs <slug> [mov|webm] [portrait|landscape]");
  process.exit(1);
}

const videoDir = join(ROOT, "videos", slug);
if (!existsSync(videoDir)) {
  console.log(`Video directory not found at videos/${slug}. Running build-video.mjs first...`);
  const build = spawnSync("node", [join(ROOT, "scripts", "build-video.mjs"), slug], { stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

let isPortrait = true;
const storyPath = join(ROOT, "src", slug, "story.mjs");
if (existsSync(storyPath)) {
  try {
    const { meta } = await import(pathToFileURL(storyPath).href);
    if (meta?.formats?.length === 1 && meta.formats[0] === "land") isPortrait = false;
  } catch (e) {}
}

if (modeArg === "landscape") isPortrait = false;
if (modeArg === "portrait") isPortrait = true;

const res = isPortrait ? "portrait-4k" : "landscape-4k";
const ext = format === "webm" ? "webm" : "mov";
const rendersDir = join(ROOT, "renders", slug);
mkdirSync(rendersDir, { recursive: true });
const outputFile = join(rendersDir, `${slug}-prores-alpha.${ext}`);

console.log("\n🎞️  PRO VIDEO EDITING ASSET EXPORT (ProRes 4444 / Alpha)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📹 Slug:        ${slug}`);
console.log(`🎬 Format:      ${ext.toUpperCase()} with Alpha Transparency`);
console.log(`📐 Resolution:  ${res}`);
console.log(`🎯 Output:      ${outputFile}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const args = [
  "render",
  videoDir,
  `--resolution=${res}`,
  `--format=${ext}`,
  "--quality=delivery",
  "-o",
  outputFile
];

const child = spawnSync("hyperframes", args, { stdio: "inherit" });
if (child.status === 0) {
  console.log(`\n✅ Pro export complete: file://${outputFile}\nReady to drag into Premiere Pro, DaVinci Resolve, or Final Cut Pro.\n`);
} else {
  console.error(`\n❌ Pro export failed with exit code ${child.status}\n`);
  process.exit(child.status ?? 1);
}

#!/usr/bin/env node
// Generates YouTube Shorts / Reels / LinkedIn Cover thumbnails from a video.
// Usage:
//   node scripts/generate-thumbnails.mjs <slug> [timestamp_seconds]
//
// Examples:
//   node scripts/generate-thumbnails.mjs k8s-disaster-recovery
//   node scripts/generate-thumbnails.mjs k8s-disaster-recovery 14.5

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];
const atTime = process.argv[3] || "0";

if (!slug) {
  console.error("Usage: node scripts/generate-thumbnails.mjs <slug> [timestamp_seconds]");
  process.exit(1);
}

const videoDir = join(ROOT, "videos", slug);
if (!existsSync(videoDir)) {
  console.log(`Video directory not found at videos/${slug}. Running build-video.mjs first...`);
  const build = spawnSync("node", [join(ROOT, "scripts", "build-video.mjs"), slug], { stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const thumbsDir = join(ROOT, "renders", slug, "thumbnails");
mkdirSync(thumbsDir, { recursive: true });

console.log("\n📸 GENERATING HIGH-RESOLUTION THUMBNAILS");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📹 Slug:        ${slug}`);
console.log(`⏱️  Timestamp:   ${atTime}s (Frame 0 Hook)`);
console.log(`🎯 Destination: ${thumbsDir}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// 1. Snapshot primary hook frame (Frame 0) and specified keyframe
const snapshotArgs = [
  "snapshot",
  videoDir,
  `--output=${thumbsDir}`,
  `--at=${atTime},9.5,16.5,35.0`,
  "--no-end"
];

const snapRun = spawnSync("hyperframes", snapshotArgs, { stdio: "inherit" });
if (snapRun.status === 0) {
  console.log(`\n✅ High-res frames captured in: file://${thumbsDir}\n`);
} else {
  console.error(`\n❌ Thumbnail snapshot failed with code ${snapRun.status}\n`);
  process.exit(snapRun.status ?? 1);
}

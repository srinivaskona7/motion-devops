#!/usr/bin/env node
// Renders the visual canvas to MP4, then muxes the high-fidelity VoiceStudio cloned audio.
// Usage:
//   node scripts/render-with-audio.mjs <slug> [1080|1440|4k] [portrait|landscape]

import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2] || "k8s-api-gateway";
const resArg = (process.argv[3] || "1080").toLowerCase();
const modeArg = (process.argv[4] || "portrait").toLowerCase();

const rendersDir = join(ROOT, "renders", slug);
mkdirSync(rendersDir, { recursive: true });

console.log("\n🎬 RENDERING VIDEO WITH CLONED AUDIO");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📹 Slug:        ${slug}`);
console.log(`📺 Resolution:  ${resArg}`);
console.log(`📐 Aspect:      ${modeArg}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Step 1: Render video frames via render-video.mjs
console.log("Step 1: Rendering visual video stream...");
const renderRes = spawnSync("node", [join(ROOT, "scripts", "render-video.mjs"), slug, resArg, modeArg], { stdio: "inherit" });
if (renderRes.status !== 0) {
  console.error("Visual render failed.");
  process.exit(1);
}

const label = (resArg === "4k" || resArg === "2160") ? "4k" : (resArg === "1440" || resArg === "2k") ? "1440p" : "1080p";
const rawVideo = join(rendersDir, `${slug}-${label}.mp4`);
const audioFile = join(ROOT, "videos", slug, "assets", "audio", "narration.mp3");
const finalOutput = join(rendersDir, `${slug}-${label}-with-voice.mp4`);

if (!existsSync(audioFile)) {
  console.log(`⚠️ Cloned audio not found at ${audioFile}. Synthesizing now...`);
  spawnSync("node", [join(ROOT, "scripts", "synthesize-cloned-audio.mjs"), slug, "51c11ae3"], { stdio: "inherit" });
}

console.log("\nStep 2: Muxing cloned audio track with video...");
const mux = spawnSync("/opt/homebrew/bin/ffmpeg", [
  "-i", rawVideo,
  "-i", audioFile,
  "-c:v", "copy",
  "-c:a", "aac",
  "-b:a", "192k",
  "-shortest",
  finalOutput,
  "-y"
], { stdio: "inherit" });

if (mux.status === 0) {
  console.log(`\n🎉 FINAL VIDEO WITH YOUR CLONED VOICE READY:`);
  console.log(`file://${finalOutput}\n`);
} else {
  console.error("❌ Audio muxing failed.");
  process.exit(1);
}

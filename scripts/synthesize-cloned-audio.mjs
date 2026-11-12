#!/usr/bin/env node
// Synthesizes voice audio for each scene in src/<slug>/story.mjs
// using VoiceStudio API with cloned voice profile '51c11ae3' (Devops).
// Outputs to videos/<slug>/assets/audio/scene-s*.wav and videos/<slug>/assets/audio/narration.mp3
//
// Usage:
//   node scripts/synthesize-cloned-audio.mjs <slug> [voice_id]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2] || "k8s-api-gateway";
const voiceId = process.argv[3] || "51c11ae3"; // Cloned "Devops" profile

const srcDir = join(ROOT, "src", slug);
const storyPath = join(srcDir, "story.mjs");

if (!existsSync(storyPath)) {
  console.error(`Story not found at src/${slug}/story.mjs`);
  process.exit(1);
}

const { meta, scenes, say } = await import(pathToFileURL(storyPath).href);

const audioDir = join(ROOT, "videos", slug, "assets", "audio");
mkdirSync(audioDir, { recursive: true });

console.log("\n🎙️  SYNTHESIZING CLONED VOICE NARRATION");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📹 Slug:        ${slug}`);
console.log(`🗣️  Voice ID:    ${voiceId} (Devops Clone)`);
console.log(`📁 Audio Dir:   ${audioDir}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

function prepareSpokenText(text) {
  let clean = text.replace(/\[\[[\w-]+(?:\|([^\]]+))?\]\]/g, (_, txt) => txt || "");
  clean = clean.replace(/\s+/g, " ").trim();
  if (Array.isArray(say)) {
    for (const [re, replacement] of say) {
      clean = clean.replace(re, replacement);
    }
  }
  return clean;
}

const sceneFiles = [];

for (let i = 0; i < scenes.length; i++) {
  const scene = scenes[i];
  const spoken = prepareSpokenText(scene.narration);
  const outFile = join(audioDir, `${scene.id}.wav`);
  console.log(`[Scene ${scene.id}] (${scene.chapter}) Synthesizing...`);
  console.log(`  "${spoken}"`);

  const res = await fetch("http://127.0.0.1:3900/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "tts-1",
      voice: voiceId,
      input: spoken,
      response_format: "wav"
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`  ❌ Failed: HTTP ${res.status} - ${errText}`);
    process.exit(1);
  }

  const arrayBuffer = await res.arrayBuffer();
  writeFileSync(outFile, Buffer.from(arrayBuffer));
  console.log(`  ✅ Saved: ${outFile}`);
  sceneFiles.push(outFile);
}

// Concatenate all scenes into a master narration track
const listFile = join(audioDir, "concat.txt");
const masterAudio = join(audioDir, "narration.mp3");
writeFileSync(listFile, sceneFiles.map((f) => `file '${f}'`).join("\n"));

console.log("\nCombining scene audio into master narration track...");
const ffmpeg = spawnSync("/opt/homebrew/bin/ffmpeg", [
  "-f", "concat",
  "-safe", "0",
  "-i", listFile,
  "-c:a", "libmp3lame",
  "-b:a", "192k",
  masterAudio,
  "-y"
], { stdio: "inherit" });

if (ffmpeg.status === 0) {
  console.log(`\n🎉 Cloned Voice Narration Ready: file://${masterAudio}\n`);
} else {
  console.error("\n❌ FFmpeg concatenation failed\n");
}

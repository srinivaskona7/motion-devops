#!/usr/bin/env node
// Synthesizes voice audio for each scene in src/<slug>/story.mjs
// using VoiceStudio API with cloned voice profile '51c11ae3' (Devops).
// Each scene WAV is padded with lead + pad silence so the concatenated
// narration.mp3 matches the video timeline exactly (per-scene sync).
//
// Usage:
//   node scripts/synthesize-cloned-audio.mjs <slug> [voice_id]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
import { computeTiming } from "./lib/timing.mjs";

const slug = process.argv[2];
if (!slug) {
  console.error("usage: node scripts/synthesize-cloned-audio.mjs <slug> [voice_id]");
  process.exit(2);
}
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

console.log("\n🎙️  SYNTHESIZING CLONED VOICE NARRATION (synced to timeline)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`📹 Slug:        ${slug}`);
console.log(`🗣️  Voice ID:    ${voiceId} (Devops Clone)`);
console.log(`📁 Audio Dir:   ${audioDir}`);
console.log(`⏱️  Total:       ${meta.total}s (${scenes.length} scenes)`);
console.log(`📊 Pacing:      ${meta.wps} wps · lead ${meta.lead}s · pad ${meta.pad}s`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

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

// ffmpeg path
const FFMPEG = process.env.FFMPEG || "ffmpeg"; // on PATH (brew/apt), or set FFMPEG

// Create a silent WAV of `duration` seconds at 24kHz mono (matching TTS output)
function makeSilentWav(outPath, duration) {
  const res = spawnSync(FFMPEG, [
    "-f", "lavfi", "-i", `anullsrc=r=24000:cl=mono`,
    "-t", duration.toString(),
    "-c:a", "pcm_s16le",
    outPath,
    "-y"
  ], { stdio: "pipe" });
  if (res.status !== 0) {
    console.error(`  ❌ Failed to create silent WAV: ${res.stderr?.toString() || "unknown"}`);
    process.exit(1);
  }
}

// Get WAV duration in seconds
function getWavDuration(path) {
  const res = spawnSync(FFPROBE, [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    path
  ], { stdio: "pipe" });
  return parseFloat(res.stdout.toString().trim()) || 0;
}

const FFPROBE = process.env.FFPROBE || "ffprobe";

// scene windows come from the same module build-video.mjs uses, so audio and picture cannot drift
const plannedScenes = computeTiming(meta, scenes).timing.scenes;


const sceneFiles = [];
const overruns = [];
let totalPadded = 0;

for (let i = 0; i < scenes.length; i++) {
  const scene = scenes[i];
  const visualScene = plannedScenes[i];
  const spoken = prepareSpokenText(scene.narration);
  const rawWav = join(audioDir, `${scene.id}-raw.wav`);
  const outFile = join(audioDir, `${scene.id}.wav`);
  console.log(`[Scene ${scene.id}] (${scene.chapter}) Synthesizing...`);
  console.log(`  "${spoken}"`);

  // --- Step 1: Synthesize spoken audio ---
  const res = await fetch("http://127.0.0.1:3900/v1/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "tts-1",
      voice: voiceId,
      input: spoken,
      response_format: "wav",
      steps: 32,
      speed: 0.90 // Calm educational pace
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`  ❌ Failed: HTTP ${res.status} - ${errText}`);
    process.exit(1);
  }

  const arrayBuffer = await res.arrayBuffer();
  writeFileSync(rawWav, Buffer.from(arrayBuffer));

  const spokenDur = getWavDuration(rawWav);
  const lead = meta.lead;
  // Pad is dynamically calculated so each scene exactly fills its visual duration!
  const targetDur = visualScene.duration;
  const pad = targetDur - lead - spokenDur;
  if (pad < 0.05) {
    // a scene whose voice outlasts its picture shifts every later scene: refuse, never drift
    overruns.push(`${scene.id}: voice ${spokenDur.toFixed(2)}s + lead ${lead}s > scene ${targetDur.toFixed(2)}s`);
    continue;
  }

  console.log(`  📊 spoken=${spokenDur.toFixed(3)}s lead=${lead}s pad=${pad.toFixed(3)}s targetDur=${targetDur.toFixed(3)}s`);

  // --- Step 2: Pad with lead silence + spoken + trailing silence ---
  const silentLead = join(audioDir, `${scene.id}-silent-lead.wav`);
  const silentPad = join(audioDir, `${scene.id}-silent-pad.wav`);
  makeSilentWav(silentLead, lead);
  makeSilentWav(silentPad, pad);

  const padList = join(audioDir, `${scene.id}-pad-concat.txt`);
  writeFileSync(padList, [
    `file '${silentLead}'`,
    `file '${rawWav}'`,
    `file '${silentPad}'`
  ].join("\n"));

  const padRes = spawnSync(FFMPEG, [
    "-f", "concat", "-safe", "0",
    "-i", padList,
    "-c:a", "copy",
    outFile,
    "-y"
  ], { stdio: "pipe" });

  if (padRes.status !== 0) {
    console.error(`  ❌ Failed to pad scene audio: ${padRes.stderr?.toString() || "unknown"}`);
    process.exit(1);
  }

  const paddedDur = getWavDuration(outFile);
  totalPadded += paddedDur;
  console.log(`  ✅ Saved: ${outFile} (${paddedDur.toFixed(3)}s)`);

  sceneFiles.push(outFile);

  // Cleanup intermediates
  for (const f of [rawWav, silentLead, silentPad, padList]) {
    if (existsSync(f)) { const { unlinkSync } = await import("node:fs"); unlinkSync(f); }
  }
}

if (overruns.length) {
  console.error(`\n❌ Voice overruns the timeline (narration.mp3 not written):\n  ${overruns.join("\n  ")}\n` +
    `   Lower meta.wps in src/${slug}/story.mjs (longer scenes) or trim those scenes' words, rebuild, re-synthesize.`);
  process.exit(1);
}

// --- Step 3: Concatenate all padded scenes into master narration.mp3 ---
const listFile = join(audioDir, "concat.txt");
const masterAudio = join(audioDir, "narration.mp3");
writeFileSync(listFile, sceneFiles.map((f) => `file '${f}'`).join("\n"));

console.log("\nCombining padded scene audio into master narration track...");
const ffmpeg = spawnSync(FFMPEG, [
  "-f", "concat",
  "-safe", "0",
  "-i", listFile,
  "-c:a", "libmp3lame",
  "-b:a", "192k",
  masterAudio,
  "-y"
], { stdio: "inherit" });

if (ffmpeg.status === 0) {
  let masterDur = getWavDuration(masterAudio);
  console.log(`\n🎉 Cloned Voice Narration Ready: file://${masterAudio}`);
  console.log(`   Master duration: ${masterDur.toFixed(3)}s (target: ${meta.total}s)`);

  // Pad with silence if audio is shorter than video timeline (keeps sync perfect)
  if (masterDur < meta.total - 0.05) {
    const padDur = meta.total - masterDur;
    const padded = join(audioDir, "narration-padded.mp3");
    const padRes = spawnSync(FFMPEG, [
      "-i", masterAudio,
      "-af", `apad=pad_dur=${padDur.toFixed(3)}`,
      "-c:a", "libmp3lame",
      "-b:a", "192k",
      padded,
      "-y"
    ], { stdio: "pipe" });
    if (padRes.status === 0) {
      const { renameSync } = await import("node:fs");
      renameSync(padded, masterAudio);
      masterDur = getWavDuration(masterAudio);
      console.log(`   Padded with ${padDur.toFixed(3)}s silence → ${masterDur.toFixed(3)}s`);
    } else {
      console.error(`   ❌ Failed to pad master audio: ${padRes.stderr?.toString() || "unknown"}`);
      process.exitCode = 1;
    }
  }
  if (Math.abs(masterDur - meta.total) > 0.1) {
    console.error(`   ❌ Master audio is ${masterDur.toFixed(3)}s, video is ${meta.total}s (>0.1s drift)`);
    process.exitCode = 1;
  }
  console.log(`   Rebuild so the player picks up the track: node scripts/build-video.mjs ${slug}`);
} else {
  console.error("\n❌ FFmpeg concatenation failed\n");
  process.exitCode = 1;
}

// Cleanup concat list
if (existsSync(listFile)) { const { unlinkSync } = await import("node:fs"); unlinkSync(listFile); }

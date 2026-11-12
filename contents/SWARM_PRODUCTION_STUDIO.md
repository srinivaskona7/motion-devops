# DevOps Motion Studio — 5-Agent Autonomous Production Team

A specialized team of 5 collaborative AI agents designed to research, write, animate, voice-clone, and master pro-grade DevOps motion explainers in `motion-devops`.

---

## 👥 The 5-Agent Studio Roster

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COORDINATOR / EXECUTIVE PRODUCER                 │
│                 (Orchestrates workflow, gates, reviews)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
┌───▼─────────────────────┐   ┌─────▼───────────────────┐   ┌───────▼─────────────────────┐
│ 1. PRINCIPAL RESEARCHER │   │ 2. SCRIPTWRITER & POET  │   │ 3. MOTION DIRECTOR & GSAP   │
│ & DISTRIBUTED SYSTEMS   │   │ (KodeKloud storytelling,│   │ (Human-cursor, 2.5D stages, │
│ ARCHITECT               │   │ token markers, hooks)   │   │ SVG glowing packet streams) │
└───┬─────────────────────┘   └─────┬───────────────────┘   └───────┬─────────────────────┘
    │                               │                               │
    └───────────────────────────────┼───────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
┌───▼─────────────────────────────────────┐   ┌─────────────────────▼─────────────────────┐
│ 4. AUDIO ENGINEER & VOICE INTELLIGENCE  │   │ 5. PRO MASTERING & SUBTITLE QC EDITOR     │
│ (VoiceStudio clone 51c11ae3, silences,  │   │ (Headless Playwright audit, 0-overlap,    │
│ TTS pronunciations, waveform mixing)    │   │ 1080p/4K ProRes render, thumbnails)       │
└─────────────────────────────────────────┘   └───────────────────────────────────────────┘
```

---

## 🎭 Roles & Responsibilities

### Agent 1: Principal Systems Researcher & Architect (`architect`)
- **Owns**: `contents/<slug>.md`
- **Output**:
  - The breaking point / outage root cause ("Why" 100k req/sec breaks).
  - RBAC and role segregation matrix (Provider vs Platform vs Dev).
  - Precise CLI diagnostic commands and failure modes (`AttachmentNotPermitted`, `CrashLoopBackOff`).
  - Strict technical fact verification against Kubernetes/Istio/eBPF upstream docs.

### Agent 2: Narrative Scriptwriter & Storyboarder (`scriptwriter`)
- **Owns**: `src/<slug>/story.mjs`
- **Output**:
  - High-retention visual hook in the first 2 seconds (Frame 0 headline).
  - Strict educational tempo: **1.75 Words Per Second** (`wps: 1.75`, `lead: 1.0s`, `pad: 1.4s`).
  - Staged reveal tokens `[[element-id|Spoken words]]` tied to exact phrases.
  - Pronunciation phonetics in `say` (e.g. `HTTPRoute`, `GatewayClass`, `CSI`).

### Agent 3: Motion Director & GSAP Animator (`animator`)
- **Owns**: `src/<slug>/template.html` & `src/shared/cursor.js`
- **Output**:
  - KodeKloud-style structural boxes (`cluster · prod` dashed boundary with badge).
  - Human-like oversized cursor (`human-cursor`) entering from off-screen (`top: 115%`) to point, asymmetric tap (`scale: 0.82`), and trigger UI actions before drifting aside.
  - Glowing SVG bezier wires with moving packet beads (Emerald `#22c55e`, Amber `#f59e0b`, Crimson `#f43f5e`).
  - Strict **Zero-Overlap Transitions**: Full fade + blur out of previous diagrams before new layers reveal.

### Agent 4: Audio Engineer & Voice Intelligence (`audio`)
- **Owns**: `videos/<slug>/assets/audio/` & `scripts/synthesize-cloned-audio.mjs`
- **Output**:
  - Connects to local VoiceStudio API (`http://127.0.0.1:3900/v1/audio/speech`).
  - Synthesizes each scene using your cloned profile **`Devops` (`51c11ae3`)**.
  - Trims dead air / lead & tail silences.
  - Concatenates into `narration.mp3` with 192kbps stereo master quality.

### Agent 5: Pro Mastering, Subtitles & QC Editor (`editor`)
- **Owns**: Headless test suite, Thumbnail studio & Video exports.
- **Output**:
  - Compiles self-contained player: `node scripts/build-video.mjs <slug>`.
  - Runs headless 200+ frame layout audit: `python3 scripts/verify_reel.py <slug>` ensuring 0 overlapping boxes.
  - Generates click-ready social cover thumbnails: `node scripts/generate-thumbnails.mjs <slug>`.
  - Exports 1080p, 1440p, and 4K MP4 videos muxed with voice: `node scripts/render-with-audio.mjs <slug> 1080`.
  - Exports ProRes 4444 with Alpha for pro editing suites: `node scripts/export-prores.mjs <slug> mov`.
  - Commits and pushes over SSH to `origin main`.

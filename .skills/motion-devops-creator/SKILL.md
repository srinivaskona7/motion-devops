---
name: motion-devops-creator
description: End-to-end DevOps motion explainer generator for motion-devops repository. Researches concepts into contents/<slug>.md, creates storyboards and templates in src/<slug>, builds interactive HTML videos in videos/<slug>, verifies layout, and renders 1080p, 1440p, and 4K MP4 videos via HyperFrames.
---

# Motion DevOps Creator Skill

This skill governs the complete workflow for generating, testing, and rendering high-production DevOps motion videos inside this repository:
`/Users/sr20536224wipro.com/Documents/Github-apple/srinew/motion-devops`

---

## 1. Directory Contract

Every topic is defined by a clean URL-friendly `<slug>` (e.g. `k8s-api-gateway`, `istio-ambient-mesh`, `ebpf-cilium-tracing`):

1. **`contents/<slug>.md`**: The exhaustive pedagogical brief (The "Why", Architecture personas, Packet flows, Disaster scenarios, CLI fixes, Comparison tables).
2. **`src/<slug>/story.mjs`**: The timing source of truth: scenes, narration, word markers (`[[id|Word]]`), TTS pronunciations, and runtime duration.
3. **`src/<slug>/template.html`**: HTML/CSS/SVG scene layout (9:16 vertical `1080x1920` or 16:9 landscape `1920x1080`), dark theme `#070a13`, glassmorphic cards, glowing SVG packet streams, and interactive scrubbing HUD.
4. **`videos/<slug>/index.html`**: Self-contained compiled video player (with GSAP bundled inline).
5. **`videos/<slug>/SCRIPT.md`**: Generated timed subtitles & narration transcript.
6. **`renders/<slug>/`**: Exported MP4 videos (1080p, 1440p, 4K).

---

## 2. Standard Commands

### Step A: Build HTML Video
Compile from `src/<slug>` into `videos/<slug>/index.html`:
```bash
node scripts/build-video.mjs <slug>
```

### Step B: Interactive HTML Verification
Open the compiled video in Google Chrome / default browser to preview interactively:
```bash
open videos/<slug>/index.html
```
- Toggle Play/Pause: `Spacebar` or click anywhere on screen.
- Autoplay on load: append `?autoplay=1` (e.g. `open "videos/<slug>/index.html?autoplay=1"`).
- Scrub timeline: drag the bottom slider or tap `Left/Right` arrow keys.

### Step C: Headless Verification & Integrity Gate
Run layout and console error auditing:
```bash
node scripts/verify-video.mjs <slug>
# or full HyperFrames check
cd videos/<slug> && hyperframes check
```

### Step D: Render MP4 Videos (1080p, 1440p, 4K)
Render the HTML composition to high-bitrate MP4 using the installed `hyperframes` engine:

#### 1. Vertical 9:16 Reels / Shorts (1080x1920 default)
```bash
# 1080p Vertical (1080x1920)
npm run render:1080 <slug>
# Or direct command:
hyperframes render videos/<slug> --resolution portrait -o renders/<slug>/<slug>-1080p.mp4

# 1440p 2K Vertical (1440x2560)
npm run render:1440 <slug>
# Or direct command:
hyperframes render videos/<slug> --resolution portrait-1440p -o renders/<slug>/<slug>-1440p.mp4

# 4K UHD Vertical (2160x3840)
npm run render:4k <slug>
# Or direct command:
hyperframes render videos/<slug> --resolution portrait-4k -o renders/<slug>/<slug>-4k.mp4
```

#### 2. Landscape 16:9 Desktop / YouTube (1920x1080 default)
```bash
# 1080p Landscape (1920x1080)
hyperframes render videos/<slug> --resolution landscape -o renders/<slug>/<slug>-1080p.mp4

# 1440p 2K Landscape (2560x1440)
hyperframes render videos/<slug> --resolution landscape-1440p -o renders/<slug>/<slug>-1440p.mp4

# 4K UHD Landscape (3840x2160)
hyperframes render videos/<slug> --resolution landscape-4k -o renders/<slug>/<slug>-4k.mp4
```

---

#### 3. Professional Video Editing Software Assets (ProRes 4444 / Alpha Transparency)
For importing directly into **Final Cut Pro**, **DaVinci Resolve**, **Adobe Premiere Pro**, or **After Effects**:
```bash
# Export Apple ProRes 4444 with transparent alpha channel:
node scripts/export-prores.mjs <slug> mov

# Export transparent WebM overlay:
node scripts/export-prores.mjs <slug> webm
```
This enables editing against custom B-roll, 3D backgrounds, or talking-head creator footage without color keying.

---

## 4. Anti-Overlap & Pedagogical Storytelling Laws

To avoid clumsy pacing, ghost overlays, and floating elements:
1. **Calibrated Narration Rate**: Strictly set `wps: 1.7` to `1.8` (words per second). Never exceed 1.85 wps. Explaining distributed systems requires pauses for visual registration.
2. **Hard Transition Zero-Overlap**: When revealing overlay cards or summaries (e.g. `Three Layers of DR`), the previous diagram must fully fade out (`opacity: 0`, `filter: blur(8px)`) rather than remaining at semi-transparent opacity.
3. **Contextual Boundaries**: Every pod and process must reside within a labeled structural card (e.g. `cluster · prod`, `namespace: payments`, or `control-plane`).
4. **Dramatic Comma**: Always leave a **0.3s to 0.6s stillness** between typing a CLI command and the terminal response popping.
5. **Moving Traffic Logic**: All packet beads must travel along visible SVG guide wires with state-specific colors (`ok: #22c55e`, `canary: #f59e0b`, `fail: #f43f5e`).

---

## 5. Git Push Invariant (Mandatory)
Authentication is pre-configured via SSH (`git@github.com:...`).
Always commit and push using:
```bash
git add contents/ src/ videos/ scripts/
git commit -m "feat(<slug>): add concept brief and motion video"
git push origin main
```
Never run `gh auth login` or switch remote to HTTPS.

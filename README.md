# motion-devops 🎥

Production-grade, frame-seekable HyperFrames motion graphics for deep DevOps concepts. Built for 9:16 vertical reels (Shorts, Instagram, TikTok) and 16:9 cinematic explainers.

---

## 🛠️ The DevOps Motion Workflow

```
┌─────────────────────────────────┐
│ 1. CONCEPT RESEARCH             │ -> contents/<slug>.md
│    Pedagogical brief & failure  │
├─────────────────────────────────┤
│ 2. STORYBOARD & MARKERS         │ -> src/<slug>/story.mjs
│    Token timing & TTS rules     │
├─────────────────────────────────┤
│ 3. 9:16 HTML/SVG COMPOSITION   │ -> src/<slug>/template.html
│    Glassmorphic cards & packets │
├─────────────────────────────────┤
│ 4. COMPILE & PLAY               │ -> videos/<slug>/index.html
│    Standalone zero-dep player   │
├─────────────────────────────────┤
│ 5. EXPORT MP4 (1080 / 1440 / 4K)│ -> renders/<slug>/<slug>-*.mp4
└─────────────────────────────────┘
```

---

## 🚀 Quick Start Commands

### 1. Compile HTML Video
Compile any concept from `src/<slug>` to `videos/<slug>/index.html`:
```bash
node scripts/build-video.mjs <slug>
# Example:
node scripts/build-video.mjs k8s-disaster-recovery
```

### 2. Verify and Play Interactive Video in Browser
Open the compiled player in Chrome or your default browser:
```bash
# Open interactive player
open videos/<slug>/index.html

# Open with autoplay enabled:
open "videos/<slug>/index.html?autoplay=1"
```
*Keyboard controls:*
- `Spacebar`: Toggle Play / Pause.
- `Left / Right Arrows`: Step backward / forward 1 second.
- `0-9`: Jump to 0%, 10%, ... 90% of the timeline.

### 3. Verify Layout and Console Health
```bash
node scripts/verify-video.mjs <slug>
```

### 4. Render to High-Quality MP4 (1080p, 1440p, 4K)
Uses the dedicated `render-video.mjs` wrapper around HyperFrames:

```bash
# 1080p (1080x1920 for vertical, 1920x1080 for landscape)
node scripts/render-video.mjs <slug> 1080

# 1440p / 2K
node scripts/render-video.mjs <slug> 1440

# 4K UHD (2160x3840 for vertical, 3840x2160 for landscape)
node scripts/render-video.mjs <slug> 4k
```
All outputs are saved cleanly to `renders/<slug>/`.

---

## 🤖 Running with AI Agents (OpenCode / Claude / Gemini)

The repository includes a dedicated in-repo skill at `.skills/motion-devops-creator/SKILL.md` (and synced to `~/.claude/skills/`, `~/.gemini/config/skills/`, `~/.agents/skills/`).

Whenever you start an agent session, specify:
1. **Topic**: e.g., *"Kubernetes API Gateway vs Ingress"*, *"Istio Ambient Mesh"*, or *"eBPF XDP Packet Filtering"*
2. **Slug**: e.g., `k8s-api-gateway`
3. **Runtime**: e.g., `60s` or `90s`
4. **Format**: `portrait` (9:16) or `landscape` (16:9)

The agent will write the deep research into `contents/<slug>.md`, build the video into `videos/<slug>/index.html`, and push directly to GitHub over SSH.
